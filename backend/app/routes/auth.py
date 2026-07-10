from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.database import db
from app.models.user import User
from app.models.department import Department
from app.models.registration_request import RegistrationRequest
from app.supabase_client import get_supabase
from app.utils.auth_helpers import log_audit, role_required
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

USER_SELECT = (
    "user_id, employee_id, name, email, password, role, mobile_number, department_id, "
    "status, first_login, temporary_password, password_reset_required, created_by, "
    "password_changed_at, created_at"
)

DEPARTMENT_SELECT = "department_id, department_name, department_code"


def _supabase_client():
    return get_supabase()


def _fetch_supabase_user_by(field_name, field_value):
    response = _supabase_client().table("users").select(USER_SELECT).eq(field_name, field_value).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def _fetch_supabase_department(department_id):
    if department_id is None:
        return None

    response = _supabase_client().table("departments").select(DEPARTMENT_SELECT).eq("department_id", department_id).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def _supabase_user_to_dict(user_row, department_row=None):
    if not user_row:
        return None

    return {
        'id': user_row.get('user_id'),
        'employee_id': user_row.get('employee_id'),
        'username': user_row.get('employee_id'),
        'name': user_row.get('name'),
        'first_name': user_row.get('name'),
        'last_name': '',
        'email': user_row.get('email'),
        'mobile_number': user_row.get('mobile_number'),
        'role': user_row.get('role'),
        'department_id': user_row.get('department_id'),
        'department': (department_row or {}).get('department_name'),
        'department_code': (department_row or {}).get('department_code'),
        'status': user_row.get('status'),
        'first_login': user_row.get('first_login'),
        'temporary_password': user_row.get('temporary_password'),
        'password_reset_required': user_row.get('password_reset_required'),
        'created_by': user_row.get('created_by'),
        'password_changed_at': user_row.get('password_changed_at'),
        'created_at': user_row.get('created_at'),
    }


def _update_supabase_user(user_id, updates):
    return _supabase_client().table("users").update(updates).eq("user_id", user_id).execute()

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    employee_id = data.get('username') or data.get('employee_id')
    password = data.get('password')
    
    if not employee_id or not password:
        return jsonify({"message": "Employee ID and password are required"}), 400
        
    user = _fetch_supabase_user_by("employee_id", employee_id)
    if not user or not check_password_hash(user.get("password", ""), password):
        log_audit(action="Login Failed", details=f"Failed login attempt for Employee ID: {employee_id}")
        return jsonify({"message": "Invalid credentials"}), 401
        
    if user.get('status') != 'Active':
        return jsonify({"message": "Your account has been deactivated. Please contact the Administrator."}), 403
        
    # Generate JWT with custom identity (user ID) and additional claims (role, name)
    department = _fetch_supabase_department(user.get('department_id'))
    additional_claims = {
        "role": user.get('role'),
        "first_name": user.get('name'),
        "last_name": "",
        "department": department.get('department_name') if department else None
    }
    
    access_token = create_access_token(identity=str(user.get('user_id')), additional_claims=additional_claims)
    
    log_audit(action="Login Success", user_id=user.get('user_id'), details=f"User logged in successfully with role: {user.get('role')}")
    
    return jsonify({
        "access_token": access_token,
        "first_login": user.get('first_login'),
        "user": _supabase_user_to_dict(user, department)
    }), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    
    employee_id = data.get('employee_id') or data.get('username')
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    role = data.get('role', 'Employee')
    department_id = data.get('department_id')
    mobile_number = data.get('mobile_number')
    
    if not all([employee_id, email, password, name]):
        return jsonify({"message": "Missing required fields"}), 400
        
    if User.query.filter_by(employee_id=employee_id).first():
        return jsonify({"message": "Employee ID already registered"}), 409
        
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 409
        
    # Validate department exists if department_id is passed
    if department_id:
        dept = Department.query.get(department_id)
        if not dept:
            return jsonify({"message": "Invalid department selected"}), 400
            
    # Validate role is valid
    if role not in ['Admin', 'Employee', 'Safety_Officer', 'HOD', 'Trainee', 'Intern', 'Contractor', 'General_Manager', 'Plant_Head', 'Senior_Management']:
        return jsonify({"message": "Invalid user role specified"}), 400
        
    user = User(
        employee_id=employee_id,
        email=email,
        name=name,
        role=role,
        department_id=department_id,
        mobile_number=mobile_number
    )
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    log_audit(action="User Registered", details=f"Created user: {employee_id} with role: {role}")
    
    return jsonify({
        "message": "User registered successfully",
        "user": user.to_dict()
    }), 201

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    current_user_id = int(get_jwt_identity())
    user = _fetch_supabase_user_by("user_id", current_user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    department = _fetch_supabase_department(user.get('department_id'))
    return jsonify(_supabase_user_to_dict(user, department)), 200

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
@role_required('Admin', 'Safety_Officer', 'HOD')
def list_users():
    current_user_id = int(get_jwt_identity())
    current_user = User.query.get(current_user_id)
    if not current_user:
        return jsonify({"message": "User not found"}), 404
        
    if current_user.role == 'HOD':
        # HOD can only view users (employees / safety officers) in their department
        users = User.query.filter_by(department_id=current_user.department_id).order_by(User.name).all()
    else:
        # Admins and Safety Officers can view all users
        users = User.query.order_by(User.name).all()
        
    return jsonify([u.to_dict() for u in users]), 200

@auth_bp.route('/users', methods=['POST'])
@jwt_required()
@role_required('Admin')
def admin_create_user():
    from datetime import datetime
    from app.utils.auth_helpers import generate_temp_password, send_account_created_email
    
    current_admin_id = int(get_jwt_identity())
    data = request.get_json() or {}
    employee_id = (data.get('employee_id') or data.get('username', '')).strip()
    email = data.get('email', '').strip()
    name = data.get('name', '').strip()
    role = data.get('role', 'Employee')
    department_id = data.get('department_id')
    mobile_number = data.get('mobile_number', '').strip()
    
    if not all([employee_id, email, name, department_id]):
        return jsonify({"message": "Missing required fields: employee_id, email, name, and department_id are required"}), 400
        
    if User.query.filter_by(employee_id=employee_id).first():
        return jsonify({"message": "Employee ID already exists"}), 409
        
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 409
        
    # Validate department exists
    dept = Department.query.get(department_id)
    if not dept:
        return jsonify({"message": "Selected department does not exist"}), 400
        
    # Validate role is valid
    if role not in ['Admin', 'Employee', 'Safety_Officer', 'HOD', 'Trainee', 'Intern', 'Contractor', 'General_Manager', 'Plant_Head', 'Senior_Management']:
        return jsonify({"message": "Invalid user role specified"}), 400
        
    # Automatic Temporary Password Generation
    temp_password = generate_temp_password(role=role, employee_id=employee_id)
    
    user = User(
        employee_id=employee_id,
        email=email,
        name=name,
        role=role,
        department_id=department_id,
        mobile_number=mobile_number or None,
        status='Active',
        first_login=True,
        temporary_password=True,
        password_reset_required=True,
        created_by=current_admin_id,
        created_at=datetime.utcnow()
    )
    user.set_password(temp_password)
    
    db.session.add(user)
    db.session.commit()
    
    log_audit(action="User Created", details=f"Admin created user '{name}' ({employee_id}) with role '{role}' in department '{dept.department_name}'", user_id=current_admin_id)
    log_audit(action="Temporary Password Generated", details=f"Generated temporary password for user '{name}' ({employee_id})", user_id=current_admin_id)
    
    # Attempt to send email
    email_sent = False
    try:
        send_account_created_email(
            user_email=email,
            name=name,
            employee_id=employee_id,
            temp_password=temp_password,
            role=role,
            department=dept.department_name
        )
        log_audit(action="Email Sent", details=f"Sent credential email to {email}", user_id=current_admin_id)
        email_sent = True
    except Exception as e:
        log_audit(action="Email Failed", details=f"Failed to email credentials to {email}: {str(e)}", user_id=current_admin_id)
        
    response_data = {
        "user": user.to_dict(),
        "email_sent": email_sent
    }
    if not email_sent:
        response_data["temporary_password"] = temp_password
        
    return jsonify(response_data), 201

@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@role_required('Admin')
def admin_update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    
    # Check if target user is an Admin
    # Admin cannot edit employee personal info, only status and password reset!
    # Wait, the prompt says: "Administrator must NOT: Approve employee registration requests, edit employee personal information except account status"
    # This means the administrator can edit other fields (role, department, status, password) of HODs/Safety Officers, but for Employees, Trainees, Interns, and Contractors, they should not edit personal details (like name/email).
    
    email = data.get('email', '').strip()
    name = data.get('name', '').strip()
    role = data.get('role', '').strip()
    department_id = data.get('department_id')
    status = data.get('status', '').strip()
    password = data.get('password', '') # optional
    
    if not all([email, name, role, department_id, status]):
        return jsonify({"message": "Missing required fields: email, name, role, department_id, and status are required"}), 400
        
    if status not in ['Active', 'Inactive']:
        return jsonify({"message": "Invalid status. Must be Active or Inactive"}), 400
        
    if role not in ['Admin', 'Employee', 'Safety_Officer', 'HOD', 'Trainee', 'Intern', 'Contractor', 'General_Manager', 'Plant_Head', 'Senior_Management']:
        return jsonify({"message": "Invalid user role specified"}), 400
        
    # Enforce rule: Admin cannot edit Employee/Trainee/Intern/Contractor personal details (name, email)
    if user.role in ['Employee', 'Trainee', 'Intern', 'Contractor']:
        if name != user.name or email != user.email:
            return jsonify({"message": "Forbidden: Administrator cannot edit personal information (Name/Email) of Employees, Trainees, Interns, or Contractors."}), 403
            
    # Check unique email (excluding current user)
    email_conflict = User.query.filter(User.email == email, User.user_id != user_id).first()
    if email_conflict:
        return jsonify({"message": "Email already registered by another user"}), 409
        
    # Validate department exists
    dept = Department.query.get(department_id)
    if not dept:
        return jsonify({"message": "Selected department does not exist"}), 400
        
    old_name = user.name
    old_email = user.email
    old_role = user.role
    old_dept_id = user.department_id
    old_status = user.status
    
    user.name = name
    user.email = email
    user.role = role
    user.department_id = department_id
    user.status = status
    
    if password:
        user.set_password(password)
        
    db.session.commit()
    
    # Audit log
    details = f"Admin updated user ID {user_id} ({user.employee_id}): "
    changes = []
    if old_name != name:
        changes.append(f"name '{old_name}' -> '{name}'")
    if old_email != email:
        changes.append(f"email '{old_email}' -> '{email}'")
    if old_role != role:
        changes.append(f"role '{old_role}' -> '{role}'")
    if old_dept_id != department_id:
        changes.append(f"department_id '{old_dept_id}' -> '{department_id}'")
    if old_status != status:
        changes.append(f"status '{old_status}' -> '{status}'")
    if password:
        changes.append("password reset")
        
    if changes:
        details += ", ".join(changes)
        log_audit(action="User Updated", details=details)
        
    return jsonify(user.to_dict()), 200

# NEW REGISTER REQUEST ENDPOINTS

@auth_bp.route('/register-request', methods=['POST'])
def register_request():
    data = request.get_json() or {}
    employee_id = data.get('employee_id', '').strip()
    name = data.get('full_name', '').strip()
    email = data.get('email', '').strip()
    mobile_number = data.get('mobile_number', '').strip()
    department_id = data.get('department_id')
    user_type = data.get('user_type', '').strip()
    password = data.get('password', '')
    
    if not all([employee_id, name, email, mobile_number, department_id, user_type, password]):
        return jsonify({"message": "All fields are required"}), 400
        
    if user_type not in ['Employee', 'Trainee', 'Intern', 'Contractor']:
        return jsonify({"message": "Invalid registration user type specified"}), 400
        
    # Check Employee ID uniqueness in users table and pending registration_requests
    if User.query.filter_by(employee_id=employee_id).first():
        return jsonify({"message": "Employee ID is already registered"}), 409
        
    if RegistrationRequest.query.filter_by(employee_id=employee_id, request_status='Pending').first():
        return jsonify({"message": "A pending registration request already exists for this Employee ID"}), 409
        
    # Check Email uniqueness in users table and pending registration_requests
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email is already registered"}), 409
        
    if RegistrationRequest.query.filter_by(email=email, request_status='Pending').first():
        return jsonify({"message": "A pending registration request already exists for this Email"}), 409
        
    # Validate department exists
    dept = Department.query.get(department_id)
    if not dept or dept.status != 'Active':
        return jsonify({"message": "Invalid or inactive department selected"}), 400
        
    # Hash password
    password_hash = generate_password_hash(password)
    
    req = RegistrationRequest(
        employee_id=employee_id,
        full_name=name,
        email=email,
        mobile_number=mobile_number,
        department_id=department_id,
        user_type=user_type,
        password_hash=password_hash,
        request_status='Pending'
    )
    db.session.add(req)
    db.session.commit()
    
    log_audit(action="Registration Requested", details=f"Registration request submitted for ID: {employee_id}, Name: {name}, Department: {dept.department_name}")
    
    return jsonify({
        "message": "Your registration request has been submitted successfully and is awaiting HOD approval.",
        "request": req.to_dict()
    }), 201

@auth_bp.route('/registration-requests/status', methods=['GET'])
def check_request_status():
    employee_id = request.args.get('employee_id', '').strip()
    email = request.args.get('email', '').strip()
    
    if not employee_id or not email:
        return jsonify({"message": "Employee ID and Email are required parameters"}), 400
        
    req = RegistrationRequest.query.filter_by(employee_id=employee_id, email=email).order_by(RegistrationRequest.created_at.desc()).first()
    if not req:
        # Check if already approved and registered
        user = User.query.filter_by(employee_id=employee_id, email=email).first()
        if user:
            return jsonify({
                "request_id": 0,
                "employee_id": employee_id,
                "full_name": user.name,
                "email": email,
                "mobile_number": user.mobile_number,
                "department_id": user.department_id,
                "department_name": user.department.department_name if user.department else None,
                "user_type": user.role,
                "request_status": "Approved",
                "hod_remarks": "Account activated successfully.",
                "created_at": user.created_at.isoformat() if user.created_at else None
            }), 200
        return jsonify({"message": "No registration request found for the given details"}), 404
        
    return jsonify(req.to_dict()), 200

@auth_bp.route('/registration-requests', methods=['GET'])
@jwt_required()
def list_registration_requests():
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    status_filter = request.args.get('status', 'Pending')
    
    if user.role == 'HOD':
        if not user.department_id:
            return jsonify([]), 200
        reqs = RegistrationRequest.query.filter_by(department_id=user.department_id, request_status=status_filter).order_by(RegistrationRequest.created_at.desc()).all()
        return jsonify([r.to_dict() for r in reqs]), 200
        
    elif user.role == 'Admin':
        reqs = RegistrationRequest.query.filter_by(request_status=status_filter).order_by(RegistrationRequest.created_at.desc()).all()
        return jsonify([r.to_dict() for r in reqs]), 200
        
    else:
        return jsonify({"message": "Forbidden: Only HOD or Admin can view registration requests"}), 403

@auth_bp.route('/registration-requests/<int:request_id>/approve', methods=['POST'])
@jwt_required()
@role_required('HOD')
def approve_registration_request(request_id):
    current_user_id = int(get_jwt_identity())
    hod = User.query.get(current_user_id)
    if not hod:
        return jsonify({"message": "HOD user not found"}), 404
        
    req = RegistrationRequest.query.get(request_id)
    if not req:
        return jsonify({"message": "Registration request not found"}), 404
        
    if req.request_status != 'Pending':
        return jsonify({"message": f"Cannot approve request in status: {req.request_status}"}), 400
        
    if req.department_id != hod.department_id:
        return jsonify({"message": "Forbidden: HOD can only approve requests for their own department"}), 403
        
    if User.query.filter_by(employee_id=req.employee_id).first():
        req.request_status = 'Rejected'
        req.hod_remarks = 'Employee ID already registered.'
        req.hod_id = hod.user_id
        db.session.commit()
        return jsonify({"message": "Employee ID already exists. Request auto-rejected."}), 409
        
    if User.query.filter_by(email=req.email).first():
        req.request_status = 'Rejected'
        req.hod_remarks = 'Email already registered.'
        req.hod_id = hod.user_id
        db.session.commit()
        return jsonify({"message": "Email already exists. Request auto-rejected."}), 409
        
    data = request.get_json() or {}
    remarks = data.get('remarks', '').strip()
    
    req.request_status = 'Approved'
    req.hod_remarks = remarks or 'Approved'
    req.hod_id = hod.user_id
    
    new_user = User(
        employee_id=req.employee_id,
        name=req.full_name,
        email=req.email,
        mobile_number=req.mobile_number,
        role=req.user_type,
        department_id=req.department_id,
        status='Active',
        first_login=False,
        temporary_password=False
    )
    new_user.password = req.password_hash
    
    db.session.add(new_user)
    db.session.commit()
    
    log_audit(action="Registration Approved", user_id=hod.user_id, details=f"HOD approved registration request for {req.full_name} ({req.employee_id}) as {req.user_type}")
    
    return jsonify({"message": "Registration request approved successfully and user account created."}), 200

@auth_bp.route('/registration-requests/<int:request_id>/reject', methods=['POST'])
@jwt_required()
@role_required('HOD')
def reject_registration_request(request_id):
    current_user_id = int(get_jwt_identity())
    hod = User.query.get(current_user_id)
    if not hod:
        return jsonify({"message": "HOD user not found"}), 404
        
    req = RegistrationRequest.query.get(request_id)
    if not req:
        return jsonify({"message": "Registration request not found"}), 404
        
    if req.request_status != 'Pending':
        return jsonify({"message": f"Cannot reject request in status: {req.request_status}"}), 400
        
    if req.department_id != hod.department_id:
        return jsonify({"message": "Forbidden: HOD can only reject requests for their own department"}), 403
        
    data = request.get_json() or {}
    remarks = data.get('remarks', '').strip()
    
    if not remarks:
        return jsonify({"message": "Rejection remarks are required"}), 400
        
    req.request_status = 'Rejected'
    req.hod_remarks = remarks
    req.hod_id = hod.user_id
    
    db.session.commit()
    
    log_audit(action="Registration Rejected", user_id=hod.user_id, details=f"HOD rejected registration request for {req.full_name} ({req.employee_id}) with remarks: {remarks}")
    
    return jsonify({"message": "Registration request has been rejected."}), 200

@auth_bp.route('/create-hod', methods=['POST'])
@jwt_required()
@role_required('Admin')
def create_hod():
    data = request.get_json() or {}
    employee_id = data.get('employee_id', '').strip()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    mobile_number = data.get('mobile_number', '').strip()
    department_id = data.get('department_id')
    password = data.get('password', '')
    
    if not all([employee_id, name, email, department_id, password]):
        return jsonify({"message": "Missing required fields"}), 400
        
    if User.query.filter_by(employee_id=employee_id).first():
        return jsonify({"message": "Employee ID already registered"}), 409
        
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409
        
    dept = Department.query.get(department_id)
    if not dept:
        return jsonify({"message": "Invalid department selected"}), 400
        
    user = User(
        employee_id=employee_id,
        email=email,
        name=name,
        role='HOD',
        department_id=department_id,
        mobile_number=mobile_number or None,
        status='Active'
    )
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    log_audit(action="HOD Created", details=f"Admin created HOD: {name} ({employee_id}) in department: {dept.department_name}")
    
    return jsonify(user.to_dict()), 201

@auth_bp.route('/create-safety-officer', methods=['POST'])
@jwt_required()
@role_required('Admin')
def create_safety_officer():
    data = request.get_json() or {}
    employee_id = data.get('employee_id', '').strip()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    mobile_number = data.get('mobile_number', '').strip()
    department_id = data.get('department_id')
    password = data.get('password', '')
    
    if not all([employee_id, name, email, department_id, password]):
        return jsonify({"message": "Missing required fields"}), 400
        
    if User.query.filter_by(employee_id=employee_id).first():
        return jsonify({"message": "Employee ID already registered"}), 409
        
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409
        
    dept = Department.query.get(department_id)
    if not dept:
        return jsonify({"message": "Invalid department selected"}), 400
        
    user = User(
        employee_id=employee_id,
        email=email,
        name=name,
        role='Safety_Officer',
        department_id=department_id,
        mobile_number=mobile_number or None,
        status='Active'
    )
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    log_audit(action="Safety Officer Created", details=f"Admin created Safety Officer: {name} ({employee_id}) in department: {dept.department_name}")
    
    return jsonify(user.to_dict()), 201

@auth_bp.route('/users/<int:user_id>/activate', methods=['POST'])
@jwt_required()
@role_required('Admin')
def activate_user(user_id):
    user = User.query.get_or_404(user_id)
    user.status = 'Active'
    db.session.commit()
    
    log_audit(action="User Activated", details=f"Admin activated user account for: {user.name} ({user.employee_id})")
    
    return jsonify(user.to_dict()), 200

@auth_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@jwt_required()
@role_required('Admin')
def deactivate_user(user_id):
    user = User.query.get_or_404(user_id)
    user.status = 'Inactive'
    db.session.commit()
    
    log_audit(action="User Deactivated", details=f"Admin deactivated user account for: {user.name} ({user.employee_id})")
    
    return jsonify(user.to_dict()), 200

@auth_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
@role_required('Admin')
def reset_password(user_id):
    from datetime import datetime
    from app.utils.auth_helpers import generate_temp_password, send_account_created_email
    
    user = User.query.get_or_404(user_id)
    current_admin_id = int(get_jwt_identity())
    
    # Generate new readable temporary password
    temp_password = generate_temp_password(role=user.role, employee_id=user.employee_id)
    user.set_password(temp_password)
    user.first_login = True
    user.temporary_password = True
    user.password_reset_required = True
    db.session.commit()
    
    log_audit(action="Password Reset", details=f"Admin reset password for user: {user.name} ({user.employee_id})", user_id=current_admin_id)
    log_audit(action="Temporary Password Generated", details=f"Generated temporary password for user: {user.name} ({user.employee_id})", user_id=current_admin_id)
    
    # Attempt to send email
    email_sent = False
    try:
        dept_name = user.department.department_name if user.department else "Unassigned"
        send_account_created_email(
            user_email=user.email,
            name=user.name,
            employee_id=user.employee_id,
            temp_password=temp_password,
            role=user.role,
            department=dept_name
        )
        log_audit(action="Email Sent", details=f"Sent credential email to {user.email}", user_id=current_admin_id)
        email_sent = True
    except Exception as e:
        log_audit(action="Email Failed", details=f"Failed to email credentials to {user.email}: {str(e)}", user_id=current_admin_id)
        
    response_data = {
        "message": "Password reset successfully.",
        "email_sent": email_sent
    }
    if not email_sent:
        response_data["temporary_password"] = temp_password
        
    return jsonify(response_data), 200

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@role_required('Admin')
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    current_admin_id = int(get_jwt_identity())
    
    # Validation checks for user deletion
    if not user.first_login:
        return jsonify({"message": "This user cannot be deleted because historical records exist. Please deactivate or archive the account instead."}), 400
        
    if len(user.reported_incidents) > 0:
        return jsonify({"message": "This user cannot be deleted because historical records exist. Please deactivate or archive the account instead."}), 400
        
    if len(user.reviews_done) > 0:
        return jsonify({"message": "This user cannot be deleted because historical records exist. Please deactivate or archive the account instead."}), 400
        
    if len(user.assigned_actions) > 0:
        return jsonify({"message": "This user cannot be deleted because historical records exist. Please deactivate or archive the account instead."}), 400
        
    if len(user.audit_logs) > 0:
        return jsonify({"message": "This user cannot be deleted because historical records exist. Please deactivate or archive the account instead."}), 400
        
    db.session.delete(user)
    db.session.commit()
    
    log_audit(action="User Deleted", details=f"Admin deleted user: {user.name} ({user.employee_id})", user_id=current_admin_id)
    
    return jsonify({"message": "User deleted successfully."}), 200

@auth_bp.route('/users/<int:user_id>/archive', methods=['POST'])
@jwt_required()
@role_required('Admin')
def archive_user(user_id):
    user = User.query.get_or_404(user_id)
    current_admin_id = int(get_jwt_identity())
    
    user.status = 'Archived'
    db.session.commit()
    
    log_audit(action="User Archived", details=f"Admin archived user: {user.name} ({user.employee_id})", user_id=current_admin_id)
    
    return jsonify(user.to_dict()), 200

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = int(get_jwt_identity())
    user = _fetch_supabase_user_by("user_id", current_user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    mobile_number = data.get('mobile_number', '').strip()
    
    if not email or not mobile_number:
        return jsonify({"message": "Email and Mobile Number are required"}), 400
        
    email_conflict = _fetch_supabase_user_by("email", email)
    if email_conflict and email_conflict.get('user_id') != current_user_id:
        return jsonify({"message": "Email address already registered by another account"}), 409
        
    _update_supabase_user(current_user_id, {"email": email, "mobile_number": mobile_number})
    user = _fetch_supabase_user_by("user_id", current_user_id)
    
    log_audit(action="Profile Updated", details=f"User {user.get('name')} ({user.get('employee_id')}) updated profile details")
    
    department = _fetch_supabase_department(user.get('department_id'))
    return jsonify(_supabase_user_to_dict(user, department)), 200

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    current_user_id = int(get_jwt_identity())
    user = _fetch_supabase_user_by("user_id", current_user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    data = request.get_json() or {}
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({"message": "Current password and new password are required"}), 400
        
    if not check_password_hash(user.get('password', ''), current_password):
        return jsonify({"message": "Invalid current password"}), 401
        
    _update_supabase_user(current_user_id, {"password": generate_password_hash(new_password)})
    
    log_audit(action="Password Changed", details=f"User {user.get('name')} ({user.get('employee_id')}) changed their password")
    
    return jsonify({"message": "Password updated successfully"}), 200

@auth_bp.route('/first-login-change-password', methods=['POST'])
@jwt_required()
def first_login_change_password():
    import re
    from datetime import datetime
    current_user_id = int(get_jwt_identity())
    user = _fetch_supabase_user_by("user_id", current_user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    data = request.get_json() or {}
    temp_password = data.get('temporary_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')
    
    if not temp_password or not new_password or not confirm_password:
        return jsonify({"message": "All fields are required"}), 400
        
    if new_password != confirm_password:
        return jsonify({"message": "New password and confirm password do not match"}), 400
        
    if not check_password_hash(user.get('password', ''), temp_password):
        return jsonify({"message": "Incorrect temporary password"}), 401
        
    if len(new_password) < 8:
        return jsonify({"message": "Password must be at least 8 characters long"}), 400
    if not re.search(r"[A-Z]", new_password):
        return jsonify({"message": "Password must contain at least one uppercase letter"}), 400
    if not re.search(r"[a-z]", new_password):
        return jsonify({"message": "Password must contain at least one lowercase letter"}), 400
    if not re.search(r"[0-9]", new_password):
        return jsonify({"message": "Password must contain at least one digit"}), 400
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", new_password):
        return jsonify({"message": "Password must contain at least one special character"}), 400
        
    _update_supabase_user(current_user_id, {
        "password": generate_password_hash(new_password),
        "first_login": False,
        "temporary_password": False,
        "password_reset_required": False,
        "password_changed_at": datetime.utcnow().isoformat(),
    })
    user = _fetch_supabase_user_by("user_id", current_user_id)
    
    log_audit(action="First Login Completed", user_id=user.get('user_id'), details=f"User {user.get('name')} ({user.get('employee_id')}) completed first login security setup")
    log_audit(action="Password Changed", user_id=user.get('user_id'), details=f"User {user.get('name')} ({user.get('employee_id')}) changed temporary password successfully")
    
    department = _fetch_supabase_department(user.get('department_id'))
    additional_claims = {
        "role": user.get('role'),
        "first_name": user.get('name'),
        "last_name": "",
        "department": department.get('department_name') if department else None
    }
    access_token = create_access_token(identity=str(user.get('user_id')), additional_claims=additional_claims)
    
    return jsonify({
        "message": "Password changed successfully",
        "access_token": access_token,
        "user": _supabase_user_to_dict(user, department)
    }), 200
