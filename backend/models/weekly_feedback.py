from extensions import db
from datetime import datetime

class WeeklyFeedback(db.Model):
    """Model for weekly feedback from mentors to students"""
    __tablename__ = 'weekly_feedback'
    
    id = db.Column(db.Integer, primary_key=True)
    registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentors.id'), nullable=False)
    week = db.Column(db.Integer, nullable=False)
    feedback = db.Column(db.Text, nullable=False)
    completion_percentage = db.Column(db.Integer, nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Define unique constraint for registration_number, mentor_id, and week
    __table_args__ = (
        db.UniqueConstraint('registration_number', 'mentor_id', 'week', name='unique_weekly_feedback'),
    )
    
    # Relationships
    mentor = db.relationship('Mentor', backref=db.backref('feedbacks_given', lazy=True))
    
    def __repr__(self):
        return f"<WeeklyFeedback Week {self.week} for Student {self.registration_number}>"
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'registration_number': self.registration_number,
            'mentor_id': self.mentor_id,
            'week': self.week,
            'feedback': self.feedback,
            'completion_percentage': self.completion_percentage,
            'submitted_at': self.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if self.submitted_at else None
        } 