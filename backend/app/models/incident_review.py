from datetime import datetime
from app.database import db

class IncidentReview(db.Model):
    __tablename__ = 'incident_reviews'
    
    review_id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey('incidents.incident_id', ondelete='CASCADE'), nullable=False)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    comments = db.Column(db.Text, nullable=False)
    review_status = db.Column(db.String(50), nullable=False) # 'Needs Action', 'Approved', 'Rejected'
    review_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    incident = db.relationship('Incident', back_populates='reviews')
    reviewer = db.relationship('User', back_populates='reviews_done')
    
    def to_dict(self):
        return {
            'review_id': self.review_id,
            'incident_id': self.incident_id,
            'reviewed_by': self.reviewed_by,
            'reviewer_name': self.reviewer.name if self.reviewer else None,
            'comments': self.comments,
            'review_status': self.review_status,
            'review_date': self.review_date.isoformat() if self.review_date else None
        }
