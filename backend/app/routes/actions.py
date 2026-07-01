from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
from app.database import db
from app.models.corrective_action import CorrectiveAction
from app.models.incident import Incident
from app.models.user import User
from app.utils.auth_helpers import role_required, log_audit

actions_bp = Blueprint('actions', __name__)

@actions_bp.route('', methods=['POST'])
@jwt_required()
@role_required('Safety_Officer', 'HOD', 'Admin')
def propose_action():
    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    
    incident_id = data.get('incident_id')
    description = data.get('description')
    action_type = data.get('action_type') # 'Corrective' or 'Preventive'
    assigned_to_id = data.get('assigned_to_id')
    target_date_str = data.get('target_date') # YYYY-MM-DD
    root_cause = data.get('root_cause') or "Identified safety near-miss hazard."
    
    if not all([incident_id, description, action_type, target_date_str]):
        return jsonify({"message": "Missing required fields for action item"}), 400
        
    incident = Incident.query.get_or_404(incident_id)
    
    # Enforce department isolation for HOD and Safety Officer
    claims = get_jwt()
    role = claims.get('role')
    user = User.query.get(current_user_id)
    if role in ['HOD', 'Safety_Officer'] and incident.department_id != user.department_id:
        return jsonify({"message": "Access denied: Incident is outside your department"}), 403
    
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400
        
    # Create corrective action
    action = CorrectiveAction(
        incident_id=incident_id,
        root_cause=root_cause,
        corrective_action=description,
        responsible_person=assigned_to_id,
        closure_date=target_date,
        action_type=action_type,
        status='Pending'
    )
    
    db.session.add(action)
    
    # Auto-escalate incident status if it is still in initial phase
    if incident.status in ['Pending', 'Under_Investigation']:
        incident.status = 'Action_Proposed'
        
    db.session.commit()
    
    log_audit(
        action="Proposed CAPA Action",
        user_id=current_user_id,
        details=f"Proposed CAPA '{action_type}' (ID: {action.action_id}) for incident '{incident.title}'"
    )
    
    return jsonify(action.to_dict()), 201

@actions_bp.route('', methods=['GET'])
@jwt_required()
def get_actions():
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    query = CorrectiveAction.query
    
    # Restrict actions visibility
    if role == 'Employee':
        query = query.filter_by(responsible_person=current_user_id)
    elif role in ['HOD', 'Safety_Officer']:
        # Filter action items associated with incidents in the user's department
        query = query.join(Incident).filter(Incident.department_id == user.department_id)
    # Admin can retrieve all CAPAs
    
    actions = query.order_by(CorrectiveAction.action_id.desc()).all()
    return jsonify([act.to_dict() for act in actions]), 200

@actions_bp.route('/<int:action_id>/status', methods=['PUT'])
@jwt_required()
def update_action_status(action_id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    data = request.get_json() or {}
    new_status = data.get('status')
    closure_remarks = data.get('closure_remarks')
    
    if not new_status or new_status not in ['Pending', 'In_Progress', 'Completed']:
        return jsonify({"message": "Invalid status value"}), 400
        
    action = CorrectiveAction.query.get_or_404(action_id)
    user = User.query.get(current_user_id)
    incident = action.incident
    
    # Only allow updates if the user is the assignee, or has authority in the department
    if role == 'Employee' and action.responsible_person != current_user_id:
        return jsonify({"message": "Access denied: You are not assigned to this action item"}), 403
    elif role in ['HOD', 'Safety_Officer'] and incident.department_id != user.department_id:
        return jsonify({"message": "Access denied: Action item is outside your department"}), 403
        
    action.status = new_status
    if closure_remarks:
        action.closure_remarks = closure_remarks
        
    db.session.commit()
    
    log_audit(
        action="Updated CAPA Status",
        user_id=current_user_id,
        details=f"Updated status of Action ID: {action.action_id} to '{new_status}'"
    )
    
    return jsonify(action.to_dict()), 200

@actions_bp.route('/<int:action_id>/approve', methods=['PUT'])
@jwt_required()
@role_required('HOD', 'Admin')
def approve_action_closure(action_id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    action = CorrectiveAction.query.get_or_404(action_id)
    user = User.query.get(current_user_id)
    incident = action.incident
    
    # Enforce department isolation for HOD
    if role == 'HOD' and incident.department_id != user.department_id:
        return jsonify({"message": "Access denied: Incident is outside your department"}), 403
        
    # CAPA must be completed before HOD/Admin approval
    if action.status != 'Completed':
        return jsonify({"message": "Action must be marked as 'Completed' before approval"}), 400
        
    action.status = 'Approved'
    
    # Check if all action items for the incident are approved. If so, mark incident as Resolved
    all_actions = CorrectiveAction.query.filter_by(incident_id=incident.incident_id).all()
    if all(act.status == 'Approved' for act in all_actions):
        incident.status = 'Resolved'
        
    db.session.commit()
    
    log_audit(
        action="Approved CAPA Closure",
        user_id=current_user_id,
        details=f"Approved and closed CAPA ID: {action.action_id}. Incident status updated to '{incident.status}'."
    )
    
    return jsonify(action.to_dict()), 200
