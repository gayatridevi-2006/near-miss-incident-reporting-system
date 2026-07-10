from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from app.database import db
from app.models.audit_log import AuditLog
from app.supabase_client import get_supabase

def role_required(*roles):
    """
    Decorator to restrict access to endpoints based on user roles.
    Example: @role_required('Admin', 'Safety_Officer')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role")
            
            if user_role not in roles:
                return jsonify({"message": f"Forbidden: '{user_role}' does not have permission to access this resource"}), 403
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def log_audit(action, details=None, user_id=None):
    """
    Utility function to log system actions for audit compliance.
    """
    try:
        # Resolve user_id from current request if not explicitly provided
        if not user_id:
            try:
                verify_jwt_in_request(optional=True)
                identity = get_jwt_identity()
                user_id = int(identity) if identity is not None else None
            except:
                pass
                
        ip_address = request.remote_addr if request else '127.0.0.1'

        payload = {
            "user_id": user_id,
            "action": action,
            "details": details,
            "ip_address": ip_address,
        }

        try:
            client = get_supabase()
            client.table("audit_logs").insert(payload).execute()
            return
        except Exception as supabase_error:
            print(f"Supabase audit log write failed, falling back to SQLAlchemy: {supabase_error}")
        
        log = AuditLog(
            user_id=user_id,
            action=action,
            details=details,
            ip_address=ip_address
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Failed to record audit log: {str(e)}")

def generate_temp_password(role='Employee', employee_id=''):
    role_prefixes = {
        'Employee': 'Emp',
        'Trainee': 'Train',
        'Intern': 'Intern',
        'Contractor': 'Cont',
        'Safety_Officer': 'Safe',
        'Safety Officer': 'Safe',
        'HOD': 'HOD',
        'Admin': 'Admin',
        'Administrator': 'Admin'
    }
    clean_role = str(role).strip()
    prefix = role_prefixes.get(clean_role, 'User')
    
    # Extract digits from employee_id
    digits = ''.join(c for c in str(employee_id) if c.isdigit())
    if len(digits) >= 4:
        suffix = digits[-4:]
    elif len(digits) > 0:
        suffix = digits.zfill(4)
    else:
        suffix = '1234'
        
    return f"{prefix}@{suffix}"

def send_account_created_email(user_email, name, employee_id, temp_password, role, department):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    import os

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    
    subject = "Near Miss Incident Reporting System - Account Created"
    body = f"""Dear {name},

Your account has been created successfully.

Employee ID:
{employee_id}

Temporary Password:
{temp_password}

Role:
{role}

Department:
{department}

For security reasons, you must change your password during your first login.

Regards,
IT & ERP Department
Vizag Steel Plant"""

    if not smtp_user:
        raise Exception("SMTP credentials not configured in environment variables")

    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = user_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    with smtplib.SMTP(smtp_host, smtp_port, timeout=5) as server:
        if smtp_port == 587:
            server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
