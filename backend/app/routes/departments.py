from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.database import db
from app.models.department import Department
from app.utils.auth_helpers import role_required, log_audit

departments_bp = Blueprint('departments', __name__)

@departments_bp.route('', methods=['GET'])
def get_departments():
    depts = Department.query.order_by(Department.department_name).all()
    return jsonify([d.to_dict() for d in depts]), 200

@departments_bp.route('', methods=['POST'])
@jwt_required()
@role_required('Admin')
def create_department():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    code = data.get('code', '').strip().upper()
    
    if not name or not code:
        return jsonify({"message": "Department name and code are required"}), 400
        
    if len(name) < 2 or len(name) > 100:
        return jsonify({"message": "Department name must be between 2 and 100 characters"}), 400
        
    if len(code) < 2 or len(code) > 10:
        return jsonify({"message": "Department code must be between 2 and 10 characters"}), 400
        
    if Department.query.filter_by(department_name=name).first():
        return jsonify({"message": "Department name already exists"}), 409
        
    if Department.query.filter_by(department_code=code).first():
        return jsonify({"message": "Department code already exists"}), 409
        
    dept = Department(department_name=name, department_code=code, status='Active')
    db.session.add(dept)
    db.session.commit()
    
    log_audit(action="Department Created", details=f"Created department '{name}' ({code})")
    
    return jsonify(dept.to_dict()), 201

@departments_bp.route('/<int:department_id>', methods=['PUT'])
@jwt_required()
@role_required('Admin')
def update_department(department_id):
    dept = Department.query.get_or_404(department_id)
    data = request.get_json() or {}
    
    name = data.get('name', '').strip()
    code = data.get('code', '').strip().upper()
    status = data.get('status', '').strip()
    
    if not name or not code or not status:
        return jsonify({"message": "Department name, code, and status are required"}), 400
        
    if len(name) < 2 or len(name) > 100:
        return jsonify({"message": "Department name must be between 2 and 100 characters"}), 400
        
    if len(code) < 2 or len(code) > 10:
        return jsonify({"message": "Department code must be between 2 and 10 characters"}), 400
        
    if status not in ['Active', 'Inactive']:
        return jsonify({"message": "Invalid status. Must be Active or Inactive"}), 400
        
    # Unique constraint check (excluding current department id)
    name_conflict = Department.query.filter(
        Department.department_name == name, 
        Department.department_id != department_id
    ).first()
    if name_conflict:
        return jsonify({"message": "Another department with this name already exists"}), 409
        
    code_conflict = Department.query.filter(
        Department.department_code == code, 
        Department.department_id != department_id
    ).first()
    if code_conflict:
        return jsonify({"message": "Another department with this code already exists"}), 409
        
    old_name = dept.department_name
    old_code = dept.department_code
    old_status = dept.status
    
    dept.department_name = name
    dept.department_code = code
    dept.status = status
    
    db.session.commit()
    
    # Audit log
    details = f"Updated department ID {department_id}: "
    changes = []
    if old_name != name:
        changes.append(f"name '{old_name}' -> '{name}'")
    if old_code != code:
        changes.append(f"code '{old_code}' -> '{code}'")
    if old_status != status:
        changes.append(f"status '{old_status}' -> '{status}'")
        
    if changes:
        details += ", ".join(changes)
        log_audit(action="Department Updated", details=details)
        
    return jsonify(dept.to_dict()), 200
