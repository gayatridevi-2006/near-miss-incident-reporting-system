from datetime import datetime
from app.database import db

class RegistrationRequest(db.Model):
    __tablename__ = 'registration_requests'
    
    request_id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(30), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    mobile_number = db.Column(db.String(20), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.department_id', ondelete='CASCADE'), nullable=False)
    user_type = db.Column(db.String(30), nullable=False) # 'Employee', 'Trainee', 'Intern', 'Contractor'
    password_hash = db.Column(db.String(255), nullable=False)
    request_status = db.Column(db.String(20), default='Pending', nullable=False) # 'Pending', 'Approved', 'Rejected'
    hod_remarks = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship: HOD -> Registration Requests
    hod_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    department = db.relationship('Department', back_populates='registration_requests')
    hod = db.relationship('User', foreign_keys=[hod_id], back_populates='reviewed_requests')
    
    def to_dict(self):
        return {
            'request_id': self.request_id,
            'employee_id': self.employee_id,
            'full_name': self.full_name,
            'email': self.email,
            'mobile_number': self.mobile_number,
            'department_id': self.department_id,
            'department_name': self.department.department_name if self.department else None,
            'department_code': self.department.department_code if self.department else None,
            'user_type': self.user_type,
            'request_status': self.request_status,
            'hod_remarks': self.hod_remarks,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'hod_name': self.hod.name if self.hod else None
        }
