from extensions import db
from datetime import datetime

class MentorFeedback(db.Model):
    __tablename__ = 'mentor_feedback'
    
    id = db.Column(db.Integer, primary_key=True)
    registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentors.id'), nullable=False)
    title = db.Column(db.String(100), nullable=True)
    feedback_text = db.Column(db.Text, nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 rating
    category = db.Column(db.String(50), nullable=True)  # e.g., 'performance', 'report', 'presentation'
    improvement_areas = db.Column(db.Text, nullable=True)
    strengths = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    mentor = db.relationship('Mentor', backref=db.backref('feedback_given', lazy=True))
    
    def __repr__(self):
        return f"<MentorFeedback {self.id}: for Student {self.registration_number}>"
    
    def to_dict(self):
        """Convert to dictionary with error checking for missing columns"""
        result = {'id': self.id}
        
        # Add fields with error checking
        for field, attr in [
            ('registration_number', 'registration_number'),
            ('mentor_id', 'mentor_id'),
            ('title', 'title'),
            ('feedback_text', 'feedback_text'),
            ('rating', 'rating'),
            ('category', 'category'),
            ('improvement_areas', 'improvement_areas'),
            ('strengths', 'strengths')
        ]:
            try:
                result[field] = getattr(self, attr)
            except (AttributeError, Exception) as e:
                print(f"Warning: Could not access {field} in MentorFeedback: {str(e)}")
                result[field] = None
        
        # Handle date fields separately
        try:
            result['created_at'] = self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        except (AttributeError, Exception):
            result['created_at'] = None
            
        try:
            result['updated_at'] = self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        except (AttributeError, Exception):
            result['updated_at'] = None
            
        return result 