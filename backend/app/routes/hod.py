from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db
from app.models.user import User
from app.models.incident import Incident
from app.models.corrective_action import CorrectiveAction
from app.models.department import Department
from app.models.registration_request import RegistrationRequest
from app.models.audit_log import AuditLog
from app.utils.auth_helpers import log_audit, role_required
from datetime import datetime
import csv
import io

hod_bp = Blueprint('hod', __name__)

@hod_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@role_required('HOD')
def get_hod_dashboard():
    current_user_id = int(get_jwt_identity())
    hod = User.query.get(current_user_id)
    if not hod or not hod.department_id:
        return jsonify({"message": "HOD user or department not found"}), 404
        
    dept_id = hod.department_id
    
    # KPI counts:
    # 1. Total Pending Incidents (Forwarded by Safety Officer to HOD, or reviewed)
    total_pending = Incident.query.filter_by(department_id=dept_id, status='Forwarded').count()
    # 2. Incidents Under Investigation
    under_investigation = Incident.query.filter_by(department_id=dept_id, status='Under Investigation').count()
    # 3. Corrective Actions Pending
    actions_pending = CorrectiveAction.query.join(Incident).filter(
        Incident.department_id == dept_id,
        CorrectiveAction.action_status.in_(['Not Started', 'In Progress'])
    ).count()
    # 4. Closed Incidents
    closed_incidents = Incident.query.filter_by(department_id=dept_id, status='Closed').count()
    
    # Recent lists
    recent_incidents = Incident.query.filter_by(department_id=dept_id).order_by(Incident.reported_date.desc()).limit(5).all()
    pending_registrations = RegistrationRequest.query.filter_by(department_id=dept_id, request_status='Pending').order_by(RegistrationRequest.created_at.desc()).limit(5).all()
    
    recent_actions = CorrectiveAction.query.join(Incident).filter(
        Incident.department_id == dept_id
    ).order_by(CorrectiveAction.action_id.desc()).limit(5).all()
    
    recently_closed = Incident.query.filter_by(department_id=dept_id, status='Closed').order_by(Incident.closed_date.desc()).limit(5).all()
    
    return jsonify({
        "kpis": {
            "total_pending_incidents": total_pending,
            "incidents_under_investigation": under_investigation,
            "corrective_actions_pending": actions_pending,
            "closed_incidents": closed_incidents
        },
        "recent_incidents": [inc.to_dict() for inc in recent_incidents],
        "pending_registrations": [req.to_dict() for req in pending_registrations],
        "recent_corrective_actions": [act.to_dict() for act in recent_actions],
        "recently_closed_incidents": [inc.to_dict() for inc in recently_closed]
    }), 200

@hod_bp.route('/incidents', methods=['GET'])
@jwt_required()
@role_required('HOD')
def get_hod_incidents():
    current_user_id = int(get_jwt_identity())
    hod = User.query.get(current_user_id)
    if not hod or not hod.department_id:
        return jsonify({"message": "HOD user or department not found"}), 404
        
    dept_id = hod.department_id
    query = Incident.query.filter_by(department_id=dept_id)
    
    # Search
    search = request.args.get('search', '').strip()
    if search:
        query = query.filter(
            (Incident.title.like(f"%{search}%")) |
            (Incident.description.like(f"%{search}%")) |
            (Incident.incident_number.like(f"%{search}%"))
        )
        
    # Filters
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)
        
    priority = request.args.get('priority')
    if priority:
        query = query.filter_by(priority=priority)
        
    severity = request.args.get('severity')
    if severity:
        query = query.filter_by(severity=severity)
        
    incident_type = request.args.get('incident_type')
    if incident_type:
        query = query.filter_by(incident_type=incident_type)
        
    location = request.args.get('location')
    if location:
        query = query.filter_by(location=location)
        
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if start_date:
        try:
            query = query.filter(Incident.reported_date >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            query = query.filter(Incident.reported_date <= datetime.fromisoformat(end_date))
        except ValueError:
            pass
            
    # Order & Paginate
    query = query.order_by(Incident.reported_date.desc())
    
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        "incidents": [inc.to_dict() for inc in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages
    }), 200

@hod_bp.route('/incidents/<int:incident_id>', methods=['GET'])
@jwt_required()
@role_required('HOD', 'Safety_Officer', 'Admin', 'Employee')
def get_incident_details(incident_id):
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    incident = Incident.query.get_or_404(incident_id)
    
    # HOD department restriction
    if user.role == 'HOD' and incident.department_id != user.department_id:
        return jsonify({"message": "Forbidden: HOD can only view incidents in their own department"}), 403
        
    # Get reviews and history (audit logs)
    reviews = [rev.to_dict() for rev in incident.reviews]
    
    # Fetch AuditLogs associated with this incident
    # We filter audit log details containing the incident number
    audit_logs = AuditLog.query.filter(
        AuditLog.details.like(f"%{incident.incident_number}%")
    ).order_by(AuditLog.created_at.desc()).all()
    
    result = incident.to_dict()
    result['reviews'] = reviews
    result['audit_logs'] = [log.to_dict() for log in audit_logs]
    
    return jsonify(result), 200

@hod_bp.route('/incidents/<int:incident_id>/investigation', methods=['POST'])
@jwt_required()
@role_required('HOD')
def save_investigation(incident_id):
    current_user_id = int(get_jwt_identity())
    hod = User.query.get(current_user_id)
    incident = Incident.query.get_or_404(incident_id)
    
    if incident.department_id != hod.department_id:
        return jsonify({"message": "Forbidden: HOD can only investigate incidents from their own department"}), 403
        
    if incident.status == 'Closed':
        return jsonify({"message": "Closed incidents are read-only"}), 400
        
    data = request.get_json() or {}
    probable_cause = data.get('probable_cause')
    root_cause = data.get('root_cause')
    immediate_action = data.get('immediate_action')
    preventive_action = data.get('preventive_action')
    severity = data.get('severity')
    priority = data.get('priority')
    remarks = data.get('investigation_remarks')
    
    if not all([probable_cause, root_cause, immediate_action, preventive_action, severity, priority]):
        return jsonify({"message": "Mandatory investigation fields are missing"}), 400
        
    incident.probable_cause = probable_cause
    incident.root_cause = root_cause
    incident.immediate_action = immediate_action
    incident.preventive_action = preventive_action
    incident.severity = severity
    incident.priority = priority
    incident.investigation_remarks = remarks
    incident.status = 'Under Investigation'
    
    db.session.commit()
    
    log_audit(action="Incident Investigated", user_id=hod.user_id, details=f"HOD logged investigation details for incident: {incident.incident_number}")
    
    return jsonify({
        "message": "Investigation details recorded successfully",
        "incident": incident.to_dict()
    }), 200

@hod_bp.route('/incidents/<int:incident_id>/assign-action', methods=['POST'])
@jwt_required()
@role_required('HOD')
def assign_corrective_action(incident_id):
    current_user_id = int(get_jwt_identity())
    hod = User.query.get(current_user_id)
    incident = Incident.query.get_or_404(incident_id)
    
    if incident.department_id != hod.department_id:
        return jsonify({"message": "Forbidden: HOD can only assign actions for incidents in their own department"}), 403
        
    if incident.status == 'Closed':
        return jsonify({"message": "Closed incidents are read-only"}), 400
        
    data = request.get_json() or {}
    assigned_to_id = data.get('assigned_to')
    assigned_dept_id = data.get('assigned_department')
    target_date_str = data.get('target_completion_date')
    remarks = data.get('implementation_remarks')
    action_text = data.get('corrective_action') or incident.root_cause or "Corrective Action"
    
    if not all([assigned_to_id, assigned_dept_id, target_date_str]):
        return jsonify({"message": "Missing required fields: assigned_to, assigned_department, target_completion_date are required"}), 400
        
    employee = User.query.get(assigned_to_id)
    dept = Department.query.get(assigned_dept_id)
    if not employee or not dept:
        return jsonify({"message": "Invalid employee or department selected"}), 400
        
    # Department restriction: HOD can only assign corrective actions within their assigned department
    if employee.department_id != hod.department_id:
        return jsonify({"message": "Forbidden: HOD can only assign corrective actions to employees of their own department"}), 403
        
    try:
        target_date = datetime.fromisoformat(target_date_str.replace('Z', ''))
    except ValueError:
        return jsonify({"message": "Invalid target completion date format"}), 400
        
    action = CorrectiveAction(
        incident_id=incident.incident_id,
        root_cause=incident.root_cause or "Investigation root cause",
        corrective_action=action_text,
        responsible_person=employee.user_id,
        assigned_department=dept.department_id,
        target_completion_date=target_date,
        action_status='Not Started',
        implementation_remarks=remarks,
        status='Pending'
    )
    db.session.add(action)
    
    incident.status = 'Corrective Action Assigned'
    db.session.commit()
    
    log_audit(action="CAPA Assigned", user_id=hod.user_id, details=f"HOD assigned corrective action to '{employee.name}' for incident '{incident.incident_number}'")
    
    return jsonify({
        "message": "Corrective action assigned successfully",
        "action": action.to_dict(),
        "incident": incident.to_dict()
    }), 200

@hod_bp.route('/corrective-actions/<int:action_id>/progress', methods=['POST'])
@jwt_required()
def update_action_progress(action_id):
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    action = CorrectiveAction.query.get_or_404(action_id)
    
    # Authorized: assigned employee, HOD of the department, or Admin
    incident = action.incident
    if not incident:
        return jsonify({"message": "Incident not found"}), 404
        
    is_authorized = (
        action.responsible_person == current_user_id or 
        (user.role == 'HOD' and incident.department_id == user.department_id) or
        user.role == 'Admin'
    )
    if not is_authorized:
        return jsonify({"message": "Forbidden: You are not authorized to update progress for this action"}), 403
        
    data = request.get_json() or {}
    progress_status = data.get('action_status')
    remarks = data.get('implementation_remarks')
    
    if progress_status not in ['Not Started', 'In Progress', 'Completed']:
        return jsonify({"message": "Invalid status value"}), 400
        
    action.action_status = progress_status
    if remarks:
        action.implementation_remarks = remarks
        
    if progress_status == 'Completed':
        action.completion_date = datetime.utcnow()
        action.status = 'Completed' # UI sync
        # Check if all other action items for this incident are completed
        all_completed = True
        for act in incident.corrective_actions:
            if act.action_status != 'Completed' and act.action_id != action_id:
                all_completed = False
                break
        if all_completed:
            incident.status = 'Implementation Completed'
    else:
        incident.status = 'Implementation In Progress'
        
    db.session.commit()
    
    log_audit(action="CAPA Progress Updated", user_id=user.user_id, details=f"Action ID {action_id} progress updated to '{progress_status}'")
    
    return jsonify({
        "message": "Progress updated successfully",
        "action": action.to_dict(),
        "incident_status": incident.status
    }), 200

@hod_bp.route('/incidents/<int:incident_id>/verify-closure', methods=['POST'])
@jwt_required()
@role_required('HOD')
def verify_and_close_incident(incident_id):
    current_user_id = int(get_jwt_identity())
    hod = User.query.get(current_user_id)
    incident = Incident.query.get_or_404(incident_id)
    
    if incident.department_id != hod.department_id:
        return jsonify({"message": "Forbidden: HOD can only verify and close incidents in their own department"}), 403
        
    if incident.status == 'Closed':
        return jsonify({"message": "Incident is already closed and is read-only"}), 400
        
    # Check if all corrective actions are Completed
    for act in incident.corrective_actions:
        if act.action_status != 'Completed':
            return jsonify({"message": "Cannot close incident: Not all corrective actions are completed"}), 400
            
    data = request.get_json() or {}
    remarks = data.get('verification_remarks')
    doc_path = data.get('supporting_document_path') or ""
    
    if not remarks:
        return jsonify({"message": "Verification remarks are required"}), 400
        
    incident.verification_remarks = remarks
    if doc_path:
        incident.photograph_path = doc_path
    incident.status = 'Closed'
    incident.closed_by = hod.user_id
    incident.closed_date = datetime.utcnow()
    
    db.session.commit()
    
    log_audit(action="Incident Closed", user_id=hod.user_id, details=f"HOD verified and closed incident: {incident.incident_number}")
    
    return jsonify({
        "message": "Incident verified and closed successfully",
        "incident": incident.to_dict()
    }), 200

@hod_bp.route('/reports', methods=['GET'])
@jwt_required()
@role_required('HOD')
def get_hod_reports_data():
    current_user_id = int(get_jwt_identity())
    hod = User.query.get(current_user_id)
    if not hod or not hod.department_id:
        return jsonify({"message": "HOD user or department not found"}), 404
        
    dept_id = hod.department_id
    report_type = request.args.get('report_type', 'Near Miss Incident Report')
    
    query = Incident.query.filter_by(department_id=dept_id)
    
    # Filters
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)
    severity = request.args.get('severity')
    if severity:
        query = query.filter_by(severity=severity)
    priority = request.args.get('priority')
    if priority:
        query = query.filter_by(priority=priority)
    incident_type = request.args.get('incident_type')
    if incident_type:
        query = query.filter_by(incident_type=incident_type)
    location = request.args.get('location')
    if location:
        query = query.filter_by(location=location)
        
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if start_date:
        try:
            query = query.filter(Incident.reported_date >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            query = query.filter(Incident.reported_date <= datetime.fromisoformat(end_date))
        except ValueError:
            pass
            
    # Tailor based on Report Type
    if report_type == 'Open Incidents Report':
        query = query.filter(Incident.status != 'Closed')
    elif report_type == 'Closed Incidents Report':
        query = query.filter_by(status='Closed')
        
    incidents = query.order_by(Incident.reported_date.desc()).all()
    
    return jsonify({
        "report_type": report_type,
        "department_name": hod.department.department_name if hod.department else "Unknown",
        "generated_by": hod.name,
        "generated_at": datetime.utcnow().isoformat(),
        "incidents": [inc.to_dict() for inc in incidents]
    }), 200

@hod_bp.route('/reports/export/excel', methods=['GET'])
@jwt_required()
@role_required('HOD')
def export_hod_reports_excel():
    current_user_id = int(get_jwt_identity())
    hod = User.query.get(current_user_id)
    if not hod or not hod.department_id:
        return Response("Unauthorized", status=401)
        
    dept_id = hod.department_id
    report_type = request.args.get('report_type', 'Near Miss Incident Report')
    
    query = Incident.query.filter_by(department_id=dept_id)
    
    # Filter parsing...
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)
    severity = request.args.get('severity')
    if severity:
        query = query.filter_by(severity=severity)
    priority = request.args.get('priority')
    if priority:
        query = query.filter_by(priority=priority)
    incident_type = request.args.get('incident_type')
    if incident_type:
        query = query.filter_by(incident_type=incident_type)
    location = request.args.get('location')
    if location:
        query = query.filter_by(location=location)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if start_date:
        try: query = query.filter(Incident.reported_date >= datetime.fromisoformat(start_date))
        except ValueError: pass
    if end_date:
        try: query = query.filter(Incident.reported_date <= datetime.fromisoformat(end_date))
        except ValueError: pass
        
    if report_type == 'Open Incidents Report':
        query = query.filter(Incident.status != 'Closed')
    elif report_type == 'Closed Incidents Report':
        query = query.filter_by(status='Closed')
        
    incidents = query.order_by(Incident.reported_date.desc()).all()
    
    # Write CSV output
    output = io.StringIO()
    writer = csv.writer(output)
    
    # ERP Headers
    writer.writerow(["RINL - VIZAG STEEL PLANT"])
    writer.writerow([f"Report Title: {report_type}"])
    writer.writerow([f"Department: {hod.department.department_name if hod.department else 'N/A'}"])
    writer.writerow([f"Generated By: {hod.name}"])
    writer.writerow([f"Generated Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"])
    writer.writerow([])
    
    # Table headers
    writer.writerow([
        "Incident Number", "Title", "Incident Type", "Location", 
        "Reported Date", "Severity", "Priority", "Status", 
        "Root Cause", "Corrective Action"
    ])
    
    for inc in incidents:
        ca_descriptions = "; ".join([act.corrective_action for act in inc.corrective_actions])
        writer.writerow([
            inc.incident_number,
            inc.title,
            inc.incident_type,
            inc.location,
            inc.reported_date.strftime('%Y-%m-%d') if inc.reported_date else '',
            inc.severity or 'N/A',
            inc.priority or 'N/A',
            inc.status,
            inc.root_cause or 'N/A',
            ca_descriptions or 'N/A'
        ])
        
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=safety_report_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
    return response

@hod_bp.route('/reports/export/pdf', methods=['GET'])
@jwt_required()
@role_required('HOD')
def export_hod_reports_pdf():
    # Return HTML that has custom styling to print perfectly as PDF in the browser (print view layout)
    # The requirement asks for standard PDF export. Serves clean print layout html.
    current_user_id = int(get_jwt_identity())
    hod = User.query.get(current_user_id)
    if not hod or not hod.department_id:
        return Response("Unauthorized", status=401)
        
    dept_id = hod.department_id
    report_type = request.args.get('report_type', 'Near Miss Incident Report')
    
    query = Incident.query.filter_by(department_id=dept_id)
    
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)
    severity = request.args.get('severity')
    if severity:
        query = query.filter_by(severity=severity)
    priority = request.args.get('priority')
    if priority:
        query = query.filter_by(priority=priority)
    incident_type = request.args.get('incident_type')
    if incident_type:
        query = query.filter_by(incident_type=incident_type)
    location = request.args.get('location')
    if location:
        query = query.filter_by(location=location)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if start_date:
        try: query = query.filter(Incident.reported_date >= datetime.fromisoformat(start_date))
        except ValueError: pass
    if end_date:
        try: query = query.filter(Incident.reported_date <= datetime.fromisoformat(end_date))
        except ValueError: pass
        
    if report_type == 'Open Incidents Report':
        query = query.filter(Incident.status != 'Closed')
    elif report_type == 'Closed Incidents Report':
        query = query.filter_by(status='Closed')
        
    incidents = query.order_by(Incident.reported_date.desc()).all()
    
    # Generate HTML content
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
            <!-- SVG Logo -->
            <svg class="logo-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#2E7D32" strokeWidth="3.5" />
                <circle cx="50" cy="50" r="39" fill="none" stroke="#2E7D32" strokeWidth="1.5" />
                <rect x="42" y="32" width="16" height="30" fill="none" stroke="#2E7D32" strokeWidth="4" />
                <line x1="36" y1="32" x2="64" y2="32" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
                <line x1="36" y1="62" x2="64" y2="62" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" />
                <circle cx="50" cy="47" r="16" fill="#2E7D32" />
                <rect x="47" y="38" width="6" height="18" fill="#FFFFFF" rx="1" />
                <rect x="43" y="38" width="14" height="3" fill="#FFFFFF" rx="0.5" />
                <rect x="43" y="53" width="14" height="3" fill="#FFFFFF" rx="0.5" />
            </svg>
            <div class="header-text">
                <div class="header-title">RASHTRIYA ISPAT NIGAM LIMITED (RINL)</div>
                <div class="header-subtitle">VIZAG STEEL PLANT - SAFETY DEPARTMENT</div>
            </div>
        </div>

        <div class="report-title">{report_type}</div>

        <table class="meta-table">
            <tr>
                <td class="meta-label">Department:</td>
                <td>{hod.department.department_name if hod.department else 'N/A'}</td>
                <td class="meta-label">Date Generated:</td>
                <td>{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</td>
            </tr>
            <tr>
                <td class="meta-label">Generated By:</td>
                <td>{hod.name} (HOD)</td>
                <td class="meta-label">Record Count:</td>
                <td>{len(incidents)} Incidents</td>
            </tr>
        </table>

        <table class="data-table">
            <thead>
                <tr>
                    <th>Ref Number</th>
                    <th>Incident Title</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Reported Date</th>
                    <th>Severity</th>
                    <th>Priority</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for inc in incidents:
        html_content += f"""
                <tr>
                    <td><b>{inc.incident_number}</b></td>
                    <td>{inc.title}</td>
                    <td>{inc.incident_type}</td>
                    <td>{inc.location}</td>
                    <td>{inc.reported_date.strftime('%Y-%m-%d') if inc.reported_date else ''}</td>
                    <td>{inc.severity or 'N/A'}</td>
                    <td>{inc.priority or 'N/A'}</td>
                    <td>{inc.status}</td>
                </tr>
        """
        
    html_content += f"""
            </tbody>
        </table>

        <div class="footer">
            RINL - Vizag Steel Plant Near Miss Incident Reporting & Management System. Confidentially Generated. Page 1 of 1.
        </div>
    </body>
    </html>
    """
    
    return Response(html_content, mimetype="text/html")
