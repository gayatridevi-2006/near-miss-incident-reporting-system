from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
from app.database import db
from app.models.incident import Incident
from app.models.user import User
from app.utils.auth_helpers import role_required, log_audit

incidents_bp = Blueprint('incidents', __name__)

@incidents_bp.route('', methods=['POST'])
@jwt_required()
def report_incident():
    import os
    import uuid
    from flask import current_app
    
    current_user_id = int(get_jwt_identity())
    
    # Try request.form for multipart form data, fallback to json
    is_multipart = request.content_type and 'multipart/form-data' in request.content_type
    if is_multipart:
        data = request.form
    else:
        data = request.get_json() or {}
    
    title = data.get('title')
    description = data.get('description')
    incident_date_str = data.get('incident_date')
    department_id_raw = data.get('department_id')
    location = data.get('location')
    equipment_involved = data.get('equipment_involved')
    unsafe_act_or_condition = data.get('unsafe_act_or_condition')
    potential_severity = data.get('potential_severity')
    
    if not all([title, description, incident_date_str, department_id_raw, location, unsafe_act_or_condition, potential_severity]):
        return jsonify({"message": "Missing required incident fields"}), 400
        
    try:
        department_id = int(department_id_raw)
    except (ValueError, TypeError):
        return jsonify({"message": "Invalid department ID"}), 400
        
    try:
        incident_date = datetime.fromisoformat(incident_date_str)
    except ValueError:
        try:
            # Fallback for some formats
            incident_date = datetime.strptime(incident_date_str, "%Y-%m-%dT%H:%M")
        except ValueError:
            incident_date = datetime.utcnow()
            
    # Handle optional photograph upload
    photograph_path = None
    if 'photograph' in request.files:
        file = request.files['photograph']
        if file and file.filename != '':
            filename = file.filename
            ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
            allowed_exts = current_app.config.get('ALLOWED_EXTENSIONS', {'png', 'jpg', 'jpeg', 'gif', 'webp'})
            
            if ext not in allowed_exts:
                return jsonify({"message": f"Unsupported file type. Allowed extensions: {', '.join(allowed_exts)}"}), 400
                
            unique_filename = f"{uuid.uuid4().hex}_{int(datetime.utcnow().timestamp())}.{ext}"
            upload_dir = current_app.config.get('UPLOAD_FOLDER')
            if not upload_dir:
                upload_dir = os.path.join(current_app.root_path, 'static', 'uploads')
                
            os.makedirs(upload_dir, exist_ok=True)
            file_dest = os.path.join(upload_dir, unique_filename)
            file.save(file_dest)
            photograph_path = unique_filename
            
    # Generate unique, sequential incident number for the current year
    current_year = datetime.utcnow().year
    prefix = f"NM-{current_year}-"
    count = Incident.query.filter(Incident.incident_number.like(f"{prefix}%")).count()
    next_num = count + 1
    incident_number = f"{prefix}{next_num:06d}"
        
    incident = Incident(
        incident_number=incident_number,
        title=title,
        description=description,
        reported_by=current_user_id,
        department_id=department_id,
        location=location,
        equipment_involved=equipment_involved,
        incident_type=unsafe_act_or_condition,
        potential_severity=potential_severity,
        reported_date=incident_date,
        photograph_path=photograph_path,
        status='Pending'
    )
    
    db.session.add(incident)
    db.session.commit()
    
    log_audit(action="Reported Incident", user_id=current_user_id, details=f"Reported incident '{title}' ({incident_number}) in department ID: {department_id}")
    
    return jsonify(incident.to_dict()), 201

@incidents_bp.route('', methods=['GET'])
@jwt_required()
def get_incidents():
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    query = Incident.query
    
    # Apply visibility filters based on roles
    if role == 'Employee':
        # Employees can only view their own reports
        query = query.filter_by(reported_by=current_user_id)
    elif role in ['HOD', 'Safety_Officer']:
        # HODs and Safety Officers view incidents related to their own department
        if user.department_id:
            query = query.filter_by(department_id=user.department_id)
        else:
            return jsonify([]), 200
    # Admins can view all incidents
    
    incidents = query.order_by(Incident.reported_date.desc()).all()
    return jsonify([inc.to_dict() for inc in incidents]), 200

@incidents_bp.route('/<int:incident_id>', methods=['GET'])
@jwt_required()
def get_incident_by_id(incident_id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    user = User.query.get(current_user_id)
    incident = Incident.query.get_or_404(incident_id)
    
    # Enforce access permissions
    if role == 'Employee' and incident.reported_by != current_user_id:
        return jsonify({"message": "Access denied: You did not report this incident"}), 403
    elif role in ['HOD', 'Safety_Officer'] and incident.department_id != user.department_id:
        return jsonify({"message": "Access denied: This incident is outside your department"}), 403
        
    return jsonify(incident.to_dict()), 200

@incidents_bp.route('/<int:incident_id>/status', methods=['PUT'])
@jwt_required()
@role_required('Safety_Officer', 'HOD', 'Admin')
def update_incident_status(incident_id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    data = request.get_json() or {}
    new_status = data.get('status')
    
    if not new_status or new_status not in ['Pending', 'Under_Investigation', 'Action_Proposed', 'Resolved', 'Closed']:
        return jsonify({"message": "Invalid status value"}), 400
        
    incident = Incident.query.get_or_404(incident_id)
    user = User.query.get(current_user_id)
    
    # HOD and Safety Officer can only change status of incidents in their department
    if role in ['HOD', 'Safety_Officer'] and incident.department_id != user.department_id:
        return jsonify({"message": "Access denied: Incident is outside your department"}), 403
        
    old_status = incident.status
    incident.status = new_status
    db.session.commit()
    
    log_audit(
        action="Updated Incident Status",
        user_id=current_user_id,
        details=f"Updated status of incident '{incident.title}' (ID: {incident.incident_id}) from '{old_status}' to '{new_status}'"
    )
    
    return jsonify(incident.to_dict()), 200
