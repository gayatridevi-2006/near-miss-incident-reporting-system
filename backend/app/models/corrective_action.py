from datetime import datetime
from app.database import db

class CorrectiveAction(db.Model):
    __tablename__ = 'corrective_actions'
    
    action_id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey('incidents.incident_id', ondelete='CASCADE'), nullable=False)
    root_cause = db.Column(db.Text, nullable=False)
    corrective_action = db.Column(db.Text, nullable=False)
    responsible_person = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)
    closure_date = db.Column(db.DateTime, nullable=True)
    
    # Target columns for HOD workflows
    assigned_department = db.Column(db.Integer, db.ForeignKey('departments.department_id', ondelete='SET NULL'), nullable=True)
    target_completion_date = db.Column(db.DateTime, nullable=True)
    action_status = db.Column(db.String(50), default='Not Started', nullable=False) # 'Not Started', 'In Progress', 'Completed'
    completion_date = db.Column(db.DateTime, nullable=True)
    implementation_remarks = db.Column(db.Text, nullable=True)
    
    # UI compatibility attributes
    action_type = db.Column(db.String(50), default='Corrective', nullable=False) # 'Corrective', 'Preventive'
    status = db.Column(db.String(50), default='Pending', nullable=False) # 'Pending', 'In_Progress', 'Completed', 'Approved'
    closure_remarks = db.Column(db.Text, nullable=True)
    
    # Relationships
    incident = db.relationship('Incident', back_populates='corrective_actions')
    responsible = db.relationship('User', back_populates='assigned_actions')
    assigned_dept = db.relationship('Department')
    
    def to_dict(self):
        return {
            'id': self.action_id,
            'incident_id': self.incident_id,
            'incident_title': self.incident.title if self.incident else None,
            'incident_number': self.incident.incident_number if self.incident else None,
            'root_cause': self.root_cause,
            'description': self.corrective_action,
            'assigned_to_id': self.responsible_person,
            'assigned_to_name': self.responsible.name if self.responsible else 'Unassigned',
            'target_date': self.closure_date.isoformat() if self.closure_date else None,
            'assigned_department_id': self.assigned_department,
            'assigned_department_name': self.assigned_dept.department_name if self.assigned_dept else None,
            'target_completion_date': self.target_completion_date.isoformat() if self.target_completion_date else None,
            'action_status': self.action_status,
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'implementation_remarks': self.implementation_remarks,
            'action_type': self.action_type,
            'status': self.status,
            'closure_remarks': self.closure_remarks
        }
