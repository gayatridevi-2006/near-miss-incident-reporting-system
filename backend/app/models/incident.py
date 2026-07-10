from datetime import datetime
from app.database import db

class Incident(db.Model):
    __tablename__ = 'incidents'
    
    incident_id = db.Column(db.Integer, primary_key=True)
    incident_number = db.Column(db.String(50), unique=True, nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    reported_by = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.department_id', ondelete='CASCADE'), nullable=False)
    location = db.Column(db.String(150), nullable=False)
    equipment_involved = db.Column(db.String(100), nullable=True)
    incident_type = db.Column(db.String(50), nullable=False)  # "Unsafe Act", "Unsafe Condition", etc.
    potential_severity = db.Column(db.String(20), default='Low', nullable=False)
    status = db.Column(db.String(50), default='Pending', nullable=False)
    reported_date = db.Column(db.DateTime, default=datetime.utcnow)
    photograph_path = db.Column(db.String(255), nullable=True)
    
    # HOD Investigation and Closure fields
    probable_cause = db.Column(db.Text, nullable=True)
    root_cause = db.Column(db.Text, nullable=True)
    immediate_action = db.Column(db.Text, nullable=True)
    preventive_action = db.Column(db.Text, nullable=True)
    severity = db.Column(db.String(20), nullable=True)
    priority = db.Column(db.String(20), nullable=True)
    investigation_remarks = db.Column(db.Text, nullable=True)
    verification_remarks = db.Column(db.Text, nullable=True)
    closed_by = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)
    closed_date = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    reporter = db.relationship('User', foreign_keys=[reported_by], back_populates='reported_incidents')
    closer = db.relationship('User', foreign_keys=[closed_by], backref='closed_incidents')
    department = db.relationship('Department', back_populates='incidents')
    reviews = db.relationship('IncidentReview', back_populates='incident', cascade='all, delete-orphan', lazy=True)
    corrective_actions = db.relationship('CorrectiveAction', back_populates='incident', cascade='all, delete-orphan', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.incident_id,
            'incident_number': self.incident_number,
            'title': self.title,
            'description': self.description,
            'reported_by': self.reported_by,
            'reporter_name': self.reporter.name if self.reporter else None,
            'department_id': self.department_id,
            'department_name': self.department.department_name if self.department else None,
            'department_code': self.department.department_code if self.department else None,
            'location': self.location,
            'equipment_involved': self.equipment_involved,
            'unsafe_act_or_condition': self.incident_type,
            'potential_severity': self.potential_severity,
            'status': self.status,
            'reported_at': self.reported_date.isoformat() if self.reported_date else None,
            'photograph_path': self.photograph_path,
            'probable_cause': self.probable_cause,
            'root_cause': self.root_cause,
            'immediate_action': self.immediate_action,
            'preventive_action': self.preventive_action,
            'severity': self.severity,
            'priority': self.priority,
            'investigation_remarks': self.investigation_remarks,
            'verification_remarks': self.verification_remarks,
            'closed_by': self.closed_by,
            'closed_by_name': self.closer.name if self.closer else None,
            'closed_date': self.closed_date.isoformat() if self.closed_date else None,
            'action_items': [item.to_dict() for item in self.corrective_actions] if self.corrective_actions else []
        }
