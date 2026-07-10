from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.database import db

class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(30), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    mobile_number = db.Column(db.String(20), nullable=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.department_id', ondelete='SET NULL'), nullable=True)
    status = db.Column(db.String(20), default='Active', nullable=False)
    first_login = db.Column(db.Boolean, default=True, nullable=False)
    temporary_password = db.Column(db.Boolean, default=True, nullable=False)
    password_reset_required = db.Column(db.Boolean, default=True, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)
    password_changed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    department = db.relationship('Department', back_populates='users')
    reported_incidents = db.relationship('Incident', foreign_keys='Incident.reported_by', back_populates='reporter', lazy=True)
    
    # New relationships for reviews and corrective actions
    reviews_done = db.relationship('IncidentReview', back_populates='reviewer', lazy=True)
    assigned_actions = db.relationship('CorrectiveAction', back_populates='responsible', lazy=True)
    
    audit_logs = db.relationship('AuditLog', back_populates='user', lazy=True)
    reviewed_requests = db.relationship('RegistrationRequest', foreign_keys='RegistrationRequest.hod_id', back_populates='hod', lazy=True)
    
    def set_password(self, pwd):
        self.password = generate_password_hash(pwd)
        
    def check_password(self, pwd):
        return check_password_hash(self.password, pwd)
        
    def to_dict(self):
        return {
            'id': self.user_id,
            'employee_id': self.employee_id,
            'username': self.employee_id,
            'name': self.name,
            'first_name': self.name,
            'last_name': '',
            'email': self.email,
            'mobile_number': self.mobile_number,
            'role': self.role,
            'department_id': self.department_id,
            'department': self.department.department_name if self.department else None,
            'department_code': self.department.department_code if self.department else None,
            'status': self.status,
            'first_login': self.first_login,
            'temporary_password': self.temporary_password,
            'password_reset_required': self.password_reset_required,
            'created_by': self.created_by,
            'password_changed_at': self.password_changed_at.isoformat() if self.password_changed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
