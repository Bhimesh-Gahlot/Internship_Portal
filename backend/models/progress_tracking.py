from extensions import db
from datetime import datetime

class ProgressTracking(db.Model):
    __tablename__ = 'progress_tracking'
    
    id = db.Column(db.Integer, primary_key=True)
    phase = db.Column(db.String(50))
    week = db.Column(db.Integer)
    completion_percentage = db.Column(db.Integer)
    status = db.Column(db.String(20))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=False)

    def __repr__(self):
        return f"<Progress Week {self.week} - Phase {self.phase}>"

    def to_dict(self):
        return {
            'id': self.id,
            'phase': self.phase,
            'week': self.week,
            'completion_percentage': self.completion_percentage,
            'status': self.status,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
            'registration_number': self.registration_number
        } 