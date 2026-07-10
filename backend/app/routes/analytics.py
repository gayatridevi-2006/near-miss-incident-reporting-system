from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import func
from app.database import db
from app.models.incident import Incident
from app.models.department import Department
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.corrective_action import CorrectiveAction
from app.models.registration_request import RegistrationRequest
from app.utils.auth_helpers import log_audit, role_required
from datetime import datetime, timedelta
import csv
import io

analytics_bp = Blueprint('analytics', __name__)

# Helper to apply filters to incident queries dynamically
def apply_filters(query, model=Incident):
    # Parse date range
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if start_date:
        try:
            query = query.filter(model.reported_date >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            query = query.filter(model.reported_date <= datetime.fromisoformat(end_date))
        except ValueError:
            pass

    # Parse department
    dept_id = request.args.get('department_id')
    if dept_id:
        query = query.filter(model.department_id == int(dept_id))

    # Parse status
    status = request.args.get('status')
    if status:
        query = query.filter(model.status == status)

    # Parse severity
    severity = request.args.get('severity')
    if severity:
        query = query.filter((model.potential_severity == severity) | (model.severity == severity))

    # Parse incident category
    category = request.args.get('incident_category') or request.args.get('incident_type')
    if category:
        query = query.filter(model.incident_type == category)

    # Parse location
    loc = request.args.get('location')
    if loc:
        query = query.filter(model.location.like(f"%{loc}%"))

    # Parse user type (role of reporter)
    user_type = request.args.get('user_type')
    if user_type:
        query = query.filter(model.reported_by.in_(
            db.session.query(User.user_id).filter(User.role == user_type)
        ))

    return query

# Helper to log filter usage if filters are present
def log_filters_if_present():
    active_filters = []
    for param in ['start_date', 'end_date', 'department_id', 'status', 'severity', 'incident_category', 'incident_type', 'location', 'user_type']:
        val = request.args.get(param)
        if val:
            active_filters.append(f"{param}={val}")
    if active_filters:
        log_audit("Filter Usage", f"Dashboard statistics filtered by: {', '.join(active_filters)}")

# Helper to calculate percentage change
def get_monthly_change(current_count, previous_count):
    if previous_count == 0:
        return 100.0 if current_count > 0 else 0.0
    return round(((current_count - previous_count) / previous_count) * 100.0, 1)

def make_kpi(title, value, current_val, prev_val, icon, invert_trend=False):
    change = get_monthly_change(current_val, prev_val)
    if change > 0:
        trend = "up"
        color = "danger" if invert_trend else "success"
    elif change < 0:
        trend = "down"
        color = "success" if invert_trend else "danger"
    else:
        trend = "flat"
        color = "info"
    
    return {
        "title": title,
        "value": value,
        "change": change,
        "trend": trend,
        "color": color,
        "icon": icon
    }


# Retain the legacy dashboard endpoint for backwards compatibility with safety officer & employee views
@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    incident_query = Incident.query
    if role == 'Employee':
        incident_query = incident_query.filter_by(reported_by=current_user_id)
    elif role in ['HOD', 'Safety_Officer']:
        if user.department_id:
            incident_query = incident_query.filter_by(department_id=user.department_id)
        else:
            return jsonify({
                "total_count": 0, "pending_count": 0, "investigating_count": 0,
                "action_count": 0, "resolved_count": 0, "closed_count": 0,
                "severity_stats": {}, "unsafe_stats": {}, "department_stats": {},
                "recent_incidents": [], "audit_logs": []
            }), 200
            
    total_count = incident_query.count()
    pending_count = incident_query.filter_by(status='Pending').count()
    investigating_count = incident_query.filter_by(status='Under_Investigation').count()
    action_count = incident_query.filter_by(status='Action_Proposed').count()
    resolved_count = incident_query.filter_by(status='Resolved').count()
    closed_count = incident_query.filter_by(status='Closed').count()
    
    severity_results = db.session.query(
        Incident.potential_severity, func.count(Incident.incident_id)
    ).filter(Incident.incident_id.in_([i.incident_id for i in incident_query.all()])).group_by(Incident.potential_severity).all()
    
    severity_stats = {str(sev): count for sev, count in severity_results}
    for level in ['Low', 'Medium', 'High', 'Critical']:
        if level not in severity_stats:
            severity_stats[level] = 0
            
    type_results = db.session.query(
        Incident.incident_type, func.count(Incident.incident_id)
    ).filter(Incident.incident_id.in_([i.incident_id for i in incident_query.all()])).group_by(Incident.incident_type).all()
    
    unsafe_stats = {str(utype): count for utype, count in type_results}
    for utype in ['Unsafe Act', 'Unsafe Condition', 'Both']:
        if utype not in unsafe_stats:
            unsafe_stats[utype] = 0
            
    dept_stats = {}
    if role == 'Admin':
        dept_results = db.session.query(
            Department.department_name, func.count(Incident.incident_id)
        ).join(Incident).group_by(Department.department_name).all()
        dept_stats = {dept: count for dept, count in dept_results}
    elif role in ['HOD', 'Safety_Officer'] and user.department_id:
        dept_results = db.session.query(
            Department.department_name, func.count(Incident.incident_id)
        ).join(Incident).filter(Incident.department_id == user.department_id).group_by(Department.department_name).all()
        dept_stats = {dept: count for dept, count in dept_results}
        
    recent_incidents = incident_query.order_by(Incident.reported_date.desc()).limit(5).all()
    
    audit_logs_data = []
    if role == 'Admin':
        audit_logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(10).all()
        audit_logs_data = [log.to_dict() for log in audit_logs]
        
    return jsonify({
        "total_count": total_count,
        "pending_count": pending_count,
        "investigating_count": investigating_count,
        "action_count": action_count,
        "resolved_count": resolved_count,
        "closed_count": closed_count,
        "severity_stats": severity_stats,
        "unsafe_stats": unsafe_stats,
        "department_stats": dept_stats,
        "recent_incidents": [inc.to_dict() for inc in recent_incidents],
        "audit_logs": audit_logs_data
    }), 200


# 1. Dashboard Summary Endpoints for Management
@analytics_bp.route('/summary', methods=['GET'])
@jwt_required()
@role_required('Admin', 'Safety_Officer', 'HOD', 'General_Manager', 'Plant_Head', 'Senior_Management')
def get_dashboard_summary():
    log_filters_if_present()
    
    # Calculate Date Boundaries for monthly comparison
    now = datetime.utcnow()
    this_month_start = datetime(now.year, now.month, 1)
    prev_month_end = this_month_start - timedelta(seconds=1)
    prev_month_start = datetime(prev_month_end.year, prev_month_end.month, 1)
    
    # Get base filtered incident queries
    filtered_query = apply_filters(Incident.query)
    total_incidents = filtered_query.count()
    
    # Query monthly breakdowns for trends
    curr_month_incidents = apply_filters(Incident.query.filter(Incident.reported_date >= this_month_start)).count()
    prev_month_incidents = apply_filters(Incident.query.filter(Incident.reported_date >= prev_month_start, Incident.reported_date < this_month_start)).count()
    
    # Open / Closed Status
    open_incidents = apply_filters(Incident.query.filter(Incident.status != 'Closed')).count()
    curr_month_open = apply_filters(Incident.query.filter(Incident.reported_date >= this_month_start, Incident.status != 'Closed')).count()
    prev_month_open = apply_filters(Incident.query.filter(Incident.reported_date >= prev_month_start, Incident.reported_date < this_month_start, Incident.status != 'Closed')).count()
    
    closed_incidents = apply_filters(Incident.query.filter(Incident.status == 'Closed')).count()
    curr_month_closed = apply_filters(Incident.query.filter(Incident.closed_date >= this_month_start, Incident.status == 'Closed')).count()
    prev_month_closed = apply_filters(Incident.query.filter(Incident.closed_date >= prev_month_start, Incident.closed_date < this_month_start, Incident.status == 'Closed')).count()

    pending_review = apply_filters(Incident.query.filter_by(status='Pending')).count()
    curr_pending = apply_filters(Incident.query.filter(Incident.reported_date >= this_month_start, Incident.status == 'Pending')).count()
    prev_pending = apply_filters(Incident.query.filter(Incident.reported_date >= prev_month_start, Incident.reported_date < this_month_start, Incident.status == 'Pending')).count()
    
    under_investigation = apply_filters(Incident.query.filter_by(status='Under Investigation')).count()
    curr_investigating = apply_filters(Incident.query.filter(Incident.reported_date >= this_month_start, Incident.status == 'Under Investigation')).count()
    prev_investigating = apply_filters(Incident.query.filter(Incident.reported_date >= prev_month_start, Incident.reported_date < this_month_start, Incident.status == 'Under Investigation')).count()

    # Corrective actions stats
    actions_query = CorrectiveAction.query.join(Incident)
    actions_query = apply_filters(actions_query, model=Incident)
    actions_pending = actions_query.filter(CorrectiveAction.action_status != 'Completed').count()
    
    curr_actions_pending = actions_query.filter(CorrectiveAction.target_completion_date >= this_month_start, CorrectiveAction.action_status != 'Completed').count()
    prev_actions_pending = actions_query.filter(CorrectiveAction.target_completion_date >= prev_month_start, CorrectiveAction.target_completion_date < this_month_start, CorrectiveAction.action_status != 'Completed').count()
    
    # Overdue incidents
    overdue_query = db.session.query(Incident.incident_id).join(CorrectiveAction).filter(
        CorrectiveAction.target_completion_date < datetime.utcnow(),
        CorrectiveAction.action_status != 'Completed'
    )
    overdue_incidents = apply_filters(overdue_query, model=Incident).distinct().count()
    
    # Total Departments and Users (constant across filter sets)
    total_depts = Department.query.count()
    total_users = User.query.count()
    
    # Unique employees reporting
    reporter_query = db.session.query(Incident.reported_by)
    total_reporters = apply_filters(reporter_query).distinct().count()
    
    # Incident Closure Rate
    curr_month_closure_rate = round((curr_month_closed / curr_month_incidents * 100.0), 1) if curr_month_incidents > 0 else 100.0
    prev_month_closure_rate = round((prev_month_closed / prev_month_incidents * 100.0), 1) if prev_month_incidents > 0 else 100.0
    
    # Avg Resolution Time (for closed incidents)
    closed_list = apply_filters(Incident.query.filter(Incident.status == 'Closed', Incident.closed_date != None)).all()
    if closed_list:
        durations = [(i.closed_date - i.reported_date).total_seconds() / 86400.0 for i in closed_list]
        avg_res_time = round(sum(durations) / len(durations), 1)
    else:
        avg_res_time = 0.0
        
    kpis = [
        make_kpi("Total Near Miss Incidents", total_incidents, curr_month_incidents, prev_month_incidents, "AlertTriangle", invert_trend=True),
        make_kpi("Open Incidents", open_incidents, curr_month_open, prev_month_open, "Clock", invert_trend=True),
        make_kpi("Pending Review", pending_review, curr_pending, prev_pending, "Activity", invert_trend=True),
        make_kpi("Under Investigation", under_investigation, curr_investigating, prev_investigating, "Eye", invert_trend=True),
        make_kpi("Corrective Actions Pending", actions_pending, curr_actions_pending, prev_actions_pending, "CheckSquare", invert_trend=True),
        make_kpi("Closed Incidents", closed_incidents, curr_month_closed, prev_month_closed, "CheckCircle", invert_trend=False),
        make_kpi("Overdue Incidents", overdue_incidents, 0, 0, "AlertTriangle", invert_trend=True), # Overdue is absolute
        {
            "title": "Total Departments",
            "value": total_depts,
            "change": 0.0,
            "trend": "flat",
            "color": "info",
            "icon": "Building"
        },
        {
            "title": "Total Registered Users",
            "value": total_users,
            "change": 0.0,
            "trend": "flat",
            "color": "info",
            "icon": "Users"
        },
        {
            "title": "Reporting Employees",
            "value": total_reporters,
            "change": 0.0,
            "trend": "flat",
            "color": "info",
            "icon": "User"
        },
        {
            "title": "Monthly Incident Count",
            "value": curr_month_incidents,
            "change": get_monthly_change(curr_month_incidents, prev_month_incidents),
            "trend": "up" if curr_month_incidents > prev_month_incidents else "down" if curr_month_incidents < prev_month_incidents else "flat",
            "color": "danger" if curr_month_incidents > prev_month_incidents else "success",
            "icon": "Calendar"
        },
        {
            "title": "Monthly Closure Rate",
            "value": f"{curr_month_closure_rate}%",
            "change": get_monthly_change(curr_month_closure_rate, prev_month_closure_rate),
            "trend": "up" if curr_month_closure_rate > prev_month_closure_rate else "down" if curr_month_closure_rate < prev_month_closure_rate else "flat",
            "color": "success" if curr_month_closure_rate > prev_month_closure_rate else "danger",
            "icon": "CheckCircle"
        },
        {
            "title": "Avg Resolution Time",
            "value": f"{avg_res_time} Days",
            "change": 0.0,
            "trend": "flat",
            "color": "info",
            "icon": "Clock"
        }
    ]
    
    return jsonify(kpis), 200


# 2. Charts Data Endpoints for Recharts
@analytics_bp.route('/incident-stats', methods=['GET'])
@jwt_required()
@role_required('Admin', 'Safety_Officer', 'HOD', 'General_Manager', 'Plant_Head', 'Senior_Management')
def get_incident_charts_stats():
    log_filters_if_present()
    
    # Status breakdown
    status_query = apply_filters(db.session.query(Incident.status, func.count(Incident.incident_id))).group_by(Incident.status).all()
    status_distribution = [{"name": s, "value": c} for s, c in status_query]
    
    # Category breakdown (incident_type)
    category_query = apply_filters(db.session.query(Incident.incident_type, func.count(Incident.incident_id))).group_by(Incident.incident_type).all()
    category_distribution = [{"name": cat or "Other", "value": c} for cat, c in category_query]
    
    # Severity breakdown (potential_severity)
    severity_query = apply_filters(db.session.query(Incident.potential_severity, func.count(Incident.incident_id))).group_by(Incident.potential_severity).all()
    severity_distribution = [{"name": sev, "value": c} for sev, c in severity_query]
    
    return jsonify({
        "status_distribution": status_distribution,
        "category_distribution": category_distribution,
        "severity_distribution": severity_distribution
    }), 200


@analytics_bp.route('/department-stats', methods=['GET'])
@jwt_required()
@role_required('Admin', 'Safety_Officer', 'HOD', 'General_Manager', 'Plant_Head', 'Senior_Management')
def get_department_charts_stats():
    log_filters_if_present()
    
    # Department-wise incident counts
    dept_query = apply_filters(db.session.query(
        Department.department_name, func.count(Incident.incident_id)
    ).join(Incident, Department.department_id == Incident.department_id)).group_by(Department.department_name).all()
    
    department_stats = [{"department": dept, "incidents": count} for dept, count in dept_query]
    top_10_departments = sorted(department_stats, key=lambda x: x["incidents"], reverse=True)[:10]
    
    # Corrective action completion status by department
    ca_query = db.session.query(
        Department.department_name,
        CorrectiveAction.action_status,
        func.count(CorrectiveAction.action_id)
    ).join(Incident, CorrectiveAction.incident_id == Incident.incident_id)\
     .join(Department, Incident.department_id == Department.department_id)
    
    ca_results = apply_filters(ca_query, model=Incident).group_by(Department.department_name, CorrectiveAction.action_status).all()
    
    ca_map = {}
    for dept_name, action_status, count in ca_results:
        if dept_name not in ca_map:
            ca_map[dept_name] = {"department": dept_name, "Completed": 0, "In Progress": 0, "Pending": 0}
        
        if action_status == 'Completed':
            ca_map[dept_name]["Completed"] += count
        elif action_status == 'In Progress':
            ca_map[dept_name]["In Progress"] += count
        else:
            ca_map[dept_name]["Pending"] += count
            
    corrective_action_stats = list(ca_map.values())
    
    # Employee reporting activity
    emp_query = apply_filters(db.session.query(
        Department.department_name,
        func.count(func.distinct(Incident.reported_by))
    ).join(Incident, Department.department_id == Incident.department_id)).group_by(Department.department_name).all()
    
    employee_reporting_activity = [{"department": dept, "active_employees": count} for dept, count in emp_query]
    
    return jsonify({
        "department_statistics": department_stats,
        "top_10_departments": top_10_departments,
        "corrective_action_stats": corrective_action_stats,
        "employee_reporting_activity": employee_reporting_activity
    }), 200


@analytics_bp.route('/monthly-trends', methods=['GET'])
@jwt_required()
@role_required('Admin', 'Safety_Officer', 'HOD', 'General_Manager', 'Plant_Head', 'Senior_Management')
def get_monthly_trends():
    log_filters_if_present()
    
    now = datetime.utcnow()
    incidents = apply_filters(Incident.query).all()
    
    # Initialise the last 12 calendar months
    trends = {}
    for i in range(11, -1, -1):
        month_dt = now - timedelta(days=i*30)
        month_str = month_dt.strftime('%b %Y')
        month_key = month_dt.strftime('%Y-%m')
        trends[month_key] = {
            "month": month_str,
            "key": month_key,
            "incidents": 0,
            "open": 0,
            "closed": 0
        }
        
    for inc in incidents:
        r_key = inc.reported_date.strftime('%Y-%m')
        if r_key in trends:
            trends[r_key]["incidents"] += 1
            if inc.status != 'Closed':
                trends[r_key]["open"] += 1
        
        if inc.status == 'Closed' and inc.closed_date:
            c_key = inc.closed_date.strftime('%Y-%m')
            if c_key in trends:
                trends[c_key]["closed"] += 1
                
    monthly_trends = sorted(trends.values(), key=lambda x: x["key"])
    
    # User registrations trends
    users = User.query.all()
    user_trends = {}
    for i in range(11, -1, -1):
        month_dt = now - timedelta(days=i*30)
        month_str = month_dt.strftime('%b %Y')
        month_key = month_dt.strftime('%Y-%m')
        user_trends[month_key] = {
            "month": month_str,
            "key": month_key,
            "registrations": 0
        }
        
    for u in users:
        if u.created_at:
            u_key = u.created_at.strftime('%Y-%m')
            if u_key in user_trends:
                user_trends[u_key]["registrations"] += 1
                
    registration_trends = sorted(user_trends.values(), key=lambda x: x["key"])
    
    return jsonify({
        "monthly_incident_trends": monthly_trends,
        "monthly_open_closed_trends": monthly_trends, # same dataset, represented with open vs closed values
        "monthly_user_registrations": registration_trends
    }), 200


# 3. Notification Center
@analytics_bp.route('/notifications', methods=['GET'])
@jwt_required()
@role_required('Admin', 'Safety_Officer', 'HOD', 'General_Manager', 'Plant_Head', 'Senior_Management')
def get_dashboard_notifications():
    log_filters_if_present()
    
    pending_incidents = apply_filters(Incident.query.filter_by(status='Pending')).all()
    
    overdue_actions = CorrectiveAction.query.join(Incident).filter(
        CorrectiveAction.target_completion_date < datetime.utcnow(),
        CorrectiveAction.action_status != 'Completed'
    )
    overdue_actions = apply_filters(overdue_actions, model=Incident).all()
    
    pending_registrations = RegistrationRequest.query.filter_by(request_status='Pending').all()
    
    high_priority = apply_filters(Incident.query.filter(
        (Incident.priority == 'High') | (Incident.potential_severity == 'Critical')
    )).all()
    
    # Recently closed incidents (last 10 days)
    recent_closed = apply_filters(Incident.query.filter(
        Incident.status == 'Closed',
        Incident.closed_date >= (datetime.utcnow() - timedelta(days=10))
    )).all()
    
    return jsonify({
        "pending_incidents": {
            "count": len(pending_incidents),
            "items": [inc.to_dict() for inc in pending_incidents[:10]]
        },
        "overdue_actions": {
            "count": len(overdue_actions),
            "items": [act.to_dict() for act in overdue_actions[:10]]
        },
        "pending_registrations": {
            "count": len(pending_registrations),
            "items": [r.to_dict() for r in pending_registrations[:10]]
        },
        "high_priority_incidents": {
            "count": len(high_priority),
            "items": [inc.to_dict() for inc in high_priority[:10]]
        },
        "recently_closed_incidents": {
            "count": len(recent_closed),
            "items": [inc.to_dict() for inc in recent_closed[:10]]
        }
    }), 200


# 4. Reports Generation Preview
@analytics_bp.route('/reports', methods=['GET'])
@jwt_required()
@role_required('Admin', 'Safety_Officer', 'HOD', 'General_Manager', 'Plant_Head', 'Senior_Management')
def get_reports():
    report_type = request.args.get('report_type', 'Executive Summary Report')
    log_audit("Report Download", f"User viewed/generated report: {report_type}")
    
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    data = {
        "report_type": report_type,
        "department_name": user.department.department_name if user.department else "All Departments",
        "generated_by": user.name,
        "generated_at": datetime.utcnow().isoformat()
    }
    
    if report_type == "User Activity Report":
        # Details of user logins, reporting counts, action completions
        users_query = User.query
        dept_id = request.args.get('department_id')
        if dept_id:
            users_query = users_query.filter_by(department_id=int(dept_id))
            
        users_data = []
        for u in users_query.all():
            r_count = Incident.query.filter_by(reported_by=u.user_id).count()
            c_count = CorrectiveAction.query.filter_by(responsible_person=u.user_id, action_status='Completed').count()
            users_data.append({
                "employee_id": u.employee_id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "department": u.department.department_name if u.department else "N/A",
                "status": u.status,
                "incidents_reported": r_count,
                "actions_completed": c_count,
                "created_at": u.created_at.isoformat() if u.created_at else None
            })
        data["users"] = users_data
        
    elif report_type == "Registration Approval Report":
        req_query = RegistrationRequest.query
        dept_id = request.args.get('department_id')
        if dept_id:
            req_query = req_query.filter_by(department_id=int(dept_id))
        status = request.args.get('status')
        if status:
            req_query = req_query.filter_by(request_status=status)
            
        data["requests"] = [r.to_dict() for r in req_query.all()]
        
    elif report_type == "Corrective Action Report":
        ca_query = CorrectiveAction.query.join(Incident)
        ca_query = apply_filters(ca_query, model=Incident)
        data["corrective_actions"] = [act.to_dict() for act in ca_query.all()]
        
    elif report_type == "Department Performance Report":
        perf_data = []
        for d in Department.query.all():
            total = Incident.query.filter_by(department_id=d.department_id).count()
            closed = Incident.query.filter_by(department_id=d.department_id, status='Closed').count()
            rate = round((closed / total) * 100.0, 1) if total > 0 else 100.0
            
            closed_inc = Incident.query.filter_by(department_id=d.department_id, status='Closed').all()
            if closed_inc:
                durations = [(i.closed_date - i.reported_date).total_seconds() / 86400.0 for i in closed_inc]
                avg_res = round(sum(durations) / len(durations), 1)
            else:
                avg_res = 0.0
                
            perf_data.append({
                "department_name": d.department_name,
                "total_incidents": total,
                "closed_incidents": closed,
                "closure_rate": rate,
                "avg_resolution_time": avg_res
            })
        data["performance"] = perf_data
        
    else:
        # Incident-based reports
        query = Incident.query
        query = apply_filters(query)
        
        if report_type == "Monthly Safety Report":
            now = datetime.utcnow()
            this_month_start = datetime(now.year, now.month, 1)
            query = query.filter(Incident.reported_date >= this_month_start)
            
        incidents = query.order_by(Incident.reported_date.desc()).all()
        data["incidents"] = [inc.to_dict() for inc in incidents]
        
    return jsonify(data), 200


# 5. Export as Excel (CSV Payload)
@analytics_bp.route('/export/excel', methods=['GET'])
@jwt_required()
def export_excel():
    report_type = request.args.get('report_type', 'Executive Summary Report')
    log_audit("Excel Export", f"User downloaded Excel/CSV for report: {report_type}")
    
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["RINL - VIZAG STEEL PLANT"])
    writer.writerow([f"Report: {report_type}"])
    writer.writerow([f"Generated By: {user.name}"])
    writer.writerow([f"Generated Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC"])
    writer.writerow([])
    
    if report_type == "User Activity Report":
        writer.writerow(["Employee ID", "Name", "Email", "Role", "Department", "Status", "Incidents Reported", "Corrective Actions Completed"])
        users_query = User.query
        dept_id = request.args.get('department_id')
        if dept_id:
            users_query = users_query.filter_by(department_id=int(dept_id))
        for u in users_query.all():
            r_count = Incident.query.filter_by(reported_by=u.user_id).count()
            c_count = CorrectiveAction.query.filter_by(responsible_person=u.user_id, action_status='Completed').count()
            writer.writerow([u.employee_id, u.name, u.email, u.role, u.department.department_name if u.department else "N/A", u.status, r_count, c_count])
            
    elif report_type == "Registration Approval Report":
        writer.writerow(["Employee ID", "Full Name", "Email", "Mobile", "Department", "User Type", "Request Status", "HOD Remarks", "Created At"])
        req_query = RegistrationRequest.query
        dept_id = request.args.get('department_id')
        if dept_id:
            req_query = req_query.filter_by(department_id=int(dept_id))
        status = request.args.get('status')
        if status:
            req_query = req_query.filter_by(request_status=status)
        for r in req_query.all():
            writer.writerow([r.employee_id, r.full_name, r.email, r.mobile_number, r.department.department_name if r.department else "N/A", r.user_type, r.request_status, r.hod_remarks or '', r.created_at.strftime('%Y-%m-%d') if r.created_at else ''])
            
    elif report_type == "Corrective Action Report":
        writer.writerow(["Action ID", "Incident Ref", "Incident Title", "Root Cause", "Corrective Action", "Responsible Person", "Assigned Dept", "Target Date", "Status"])
        ca_query = CorrectiveAction.query.join(Incident)
        ca_query = apply_filters(ca_query, model=Incident)
        for act in ca_query.all():
            writer.writerow([act.action_id, act.incident.incident_number, act.incident.title, act.root_cause, act.corrective_action, act.responsible.name if act.responsible else 'Unassigned', act.assigned_dept.department_name if act.assigned_dept else 'N/A', act.target_completion_date.strftime('%Y-%m-%d') if act.target_completion_date else '', act.action_status])
            
    elif report_type == "Department Performance Report":
        writer.writerow(["Department Name", "Total Incidents", "Closed Incidents", "Closure Rate (%)", "Avg Resolution Time (Days)"])
        for d in Department.query.all():
            total = Incident.query.filter_by(department_id=d.department_id).count()
            closed = Incident.query.filter_by(department_id=d.department_id, status='Closed').count()
            rate = round((closed / total) * 100.0, 1) if total > 0 else 100.0
            closed_inc = Incident.query.filter_by(department_id=d.department_id, status='Closed').all()
            avg_res = round(sum([(i.closed_date - i.reported_date).total_seconds() / 86400.0 for i in closed_inc]) / len(closed_inc), 1) if closed_inc else 0.0
            writer.writerow([d.department_name, total, closed, rate, avg_res])
            
    else:
        writer.writerow(["Incident Number", "Title", "Type", "Location", "Reported Date", "Severity", "Priority", "Status"])
        query = Incident.query
        query = apply_filters(query)
        if report_type == "Monthly Safety Report":
            now = datetime.utcnow()
            this_month_start = datetime(now.year, now.month, 1)
            query = query.filter(Incident.reported_date >= this_month_start)
        for inc in query.all():
            writer.writerow([inc.incident_number, inc.title, inc.incident_type, inc.location, inc.reported_date.strftime('%Y-%m-%d') if inc.reported_date else '', inc.severity or inc.potential_severity or 'Low', inc.priority or 'Low', inc.status])
            
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={report_type.lower().replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
    return response


# 6. Export as HTML Print Layout (PDF helper)
@analytics_bp.route('/export/pdf', methods=['GET'])
@jwt_required()
def export_pdf():
    report_type = request.args.get('report_type', 'Executive Summary Report')
    log_audit("PDF Export", f"User generated PDF layout for report: {report_type}")
    
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    # Query data based on type
    if report_type == "User Activity Report":
        users_query = User.query
        dept_id = request.args.get('department_id')
        if dept_id:
            users_query = users_query.filter_by(department_id=int(dept_id))
        records = [
            f"<tr><td>{u.employee_id}</td><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.department.department_name if u.department else 'N/A'}</td><td>{u.status}</td><td>{Incident.query.filter_by(reported_by=u.user_id).count()}</td></tr>"
            for u in users_query.all()
        ]
        table_headers = "<th>Employee ID</th><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Incidents Reported</th>"
        
    elif report_type == "Registration Approval Report":
        req_query = RegistrationRequest.query
        dept_id = request.args.get('department_id')
        if dept_id:
            req_query = req_query.filter_by(department_id=int(dept_id))
        records = [
            f"<tr><td>{r.employee_id}</td><td>{r.full_name}</td><td>{r.email}</td><td>{r.department.department_name if r.department else 'N/A'}</td><td>{r.user_type}</td><td>{r.request_status}</td><td>{r.created_at.strftime('%Y-%m-%d') if r.created_at else ''}</td></tr>"
            for r in req_query.all()
        ]
        table_headers = "<th>Employee ID</th><th>Full Name</th><th>Email</th><th>Department</th><th>User Type</th><th>Status</th><th>Requested Date</th>"
        
    elif report_type == "Corrective Action Report":
        ca_query = CorrectiveAction.query.join(Incident)
        ca_query = apply_filters(ca_query, model=Incident)
        records = [
            f"<tr><td>{act.incident.incident_number}</td><td>{act.corrective_action}</td><td>{act.responsible.name if act.responsible else 'Unassigned'}</td><td>{act.assigned_dept.department_name if act.assigned_dept else 'N/A'}</td><td>{act.target_completion_date.strftime('%Y-%m-%d') if act.target_completion_date else ''}</td><td>{act.action_status}</td></tr>"
            for act in ca_query.all()
        ]
        table_headers = "<th>Incident Ref</th><th>Action Details</th><th>Responsible</th><th>Department</th><th>Target Date</th><th>Status</th>"
        
    elif report_type == "Department Performance Report":
        records = []
        for d in Department.query.all():
            total = Incident.query.filter_by(department_id=d.department_id).count()
            closed = Incident.query.filter_by(department_id=d.department_id, status='Closed').count()
            rate = round((closed / total) * 100.0, 1) if total > 0 else 100.0
            closed_inc = Incident.query.filter_by(department_id=d.department_id, status='Closed').all()
            avg_res = round(sum([(i.closed_date - i.reported_date).total_seconds() / 86400.0 for i in closed_inc]) / len(closed_inc), 1) if closed_inc else 0.0
            records.append(f"<tr><td><b>{d.department_name}</b></td><td>{total}</td><td>{closed}</td><td>{rate}%</td><td>{avg_res} Days</td></tr>")
        table_headers = "<th>Department Name</th><th>Total Incidents</th><th>Closed Incidents</th><th>Closure Rate</th><th>Avg Resolution Time</th>"
        
    else:
        # Incident reports
        query = Incident.query
        query = apply_filters(query)
        if report_type == "Monthly Safety Report":
            now = datetime.utcnow()
            this_month_start = datetime(now.year, now.month, 1)
            query = query.filter(Incident.reported_date >= this_month_start)
            
        records = [
            f"<tr><td><b>{inc.incident_number}</b></td><td>{inc.title}</td><td>{inc.incident_type}</td><td>{inc.location}</td><td>{inc.reported_date.strftime('%Y-%m-%d') if inc.reported_date else ''}</td><td>{inc.severity or inc.potential_severity or 'Low'}</td><td>{inc.status}</td></tr>"
            for inc in query.all()
        ]
        table_headers = "<th>Ref Number</th><th>Incident Title</th><th>Type</th><th>Location</th><th>Reported Date</th><th>Severity</th><th>Status</th>"
        
    records_html = "\n".join(records) if records else "<tr><td colspan='10' style='text-align:center;'>No matching records found.</td></tr>"
    
    html_content = f"""
    <html>
    <head>
        <title>{report_type}</title>
        <style>
            body {{ font-family: Arial, sans-serif; color: #333; margin: 30px; }}
            .header-container {{ display: flex; align-items: center; border-bottom: 3px double #1565C0; padding-bottom: 10px; margin-bottom: 20px; }}
            .logo-svg {{ width: 80px; height: 80px; margin-right: 20px; }}
            .header-text {{ flex-grow: 1; }}
            .header-title {{ font-size: 20px; font-weight: bold; color: #1565C0; margin: 0; }}
            .header-subtitle {{ font-size: 16px; color: #2E7D32; margin: 5px 0 0 0; }}
            .report-title {{ font-size: 22px; font-weight: bold; text-align: center; margin: 20px 0; color: #000; text-transform: uppercase; }}
            .meta-table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }}
            .meta-table td {{ padding: 6px; border: 1px solid #ddd; }}
            .meta-label {{ font-weight: bold; background-color: #f2f2f2; width: 25%; }}
            .data-table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
            .data-table th, .data-table td {{ border: 1px solid #999; padding: 8px; text-align: left; }}
            .data-table th {{ background-color: #1565C0; color: #ffffff; font-weight: bold; }}
            .data-table tr:nth-child(even) {{ background-color: #f9f9f9; }}
            .footer {{ border-top: 1px solid #1565C0; padding-top: 10px; margin-top: 40px; text-align: center; font-size: 11px; color: #666; }}
            @media print {{
                .no-print {{ display: none; }}
                body {{ margin: 0; }}
            }}
        </style>
    </head>
    <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; background-color: #2E7D32; color: white; border: none; font-weight: bold; cursor: pointer; border-radius: 4px;">Print / Save as PDF</button>
        </div>
        
        <div class="header-container">
            <svg class="logo-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#2E7D32" strokeWidth="3.5" />
                <circle cx="50" cy="50" r="39" fill="none" stroke="#2E7D32" strokeWidth="1.5" />
                <rect x="42" y="32" width="16" height="30" fill="none" stroke="#2E7D32" strokeWidth="4" />
                <line x1="36" y1="32" x2="64" y2="32" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
                <line x1="36" y1="62" x2="64" y2="62" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
                <circle cx="50" cy="47" r="16" fill="#2E7D32" />
                <rect x="47" y="38" width="6" height="18" fill="#FFFFFF" rx="1" />
            </svg>
            <div class="header-text">
                <div class="header-title">RASHTRIYA ISPAT NIGAM LIMITED (RINL)</div>
                <div class="header-subtitle">VIZAG STEEL PLANT - SAFETY DEPARTMENT</div>
            </div>
        </div>

        <div class="report-title">{report_type}</div>

        <table class="meta-table">
            <tr>
                <td class="meta-label">Generated By:</td>
                <td>{user.name}</td>
                <td class="meta-label">Date Generated:</td>
                <td>{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</td>
            </tr>
            <tr>
                <td class="meta-label">Department Scope:</td>
                <td>{user.department.department_name if user.department else 'Plant-wide'}</td>
                <td class="meta-label">Record Count:</td>
                <td>{len(records)} items</td>
            </tr>
        </table>

        <table class="data-table">
            <thead>
                <tr>
                    {table_headers}
                </tr>
            </thead>
            <tbody>
                {records_html}
            </tbody>
        </table>

        <div class="footer">
            RINL - Vizag Steel Plant Near Miss Incident Reporting & Management System. Confidentially Generated. Page 1 of 1.
        </div>
    </body>
    </html>
    """
    
    return Response(html_content, mimetype="text/html")
