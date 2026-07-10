from datetime import datetime
from app.database import db

class Department(db.Model):
    __tablename__ = 'departments'
    
    department_id = db.Column(db.Integer, primary_key=True)
    department_name = db.Column(db.String(100), unique=True, nullable=False)
    department_code = db.Column(db.String(10), unique=True, nullable=False)
    status = db.Column(db.String(20), default='Active', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    users = db.relationship('User', back_populates='department', lazy=True)
    incidents = db.relationship('Incident', back_populates='department', lazy=True)
    registration_requests = db.relationship('RegistrationRequest', back_populates='department', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.department_id,
            'name': self.department_name,
            'code': self.department_code,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
