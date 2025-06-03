from extensions import db
from datetime import datetime

class Evaluation(db.Model):
    """Evaluation model for storing student evaluations by mentors"""
    __tablename__ = 'evaluations'

    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentors.id'))
    evaluation_type = db.Column(db.String(20))
    marks = db.Column(db.Float)
    feedback = db.Column(db.Text)
    remarks = db.Column(db.Text)
    date = db.Column(db.DateTime)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=False)
    
    # Relationships
    student = db.relationship('Student', backref='evaluations')
    mentor = db.relationship('Mentor', backref='evaluations')
    
    def __repr__(self):
        return f"<Evaluation {self.id} - Type: {self.evaluation_type}>"
    
    def to_dict(self):
        """Convert evaluation to dictionary"""
        return {
            'id': self.id,
            'mentor_id': self.mentor_id,
            'evaluation_type': self.evaluation_type,
            'marks': self.marks,
            'feedback': self.feedback,
            'remarks': self.remarks,
            'date': self.date.strftime('%Y-%m-%d %H:%M:%S') if self.date else None,
            'submitted_at': self.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if self.submitted_at else None,
            'registration_number': self.registration_number
        } 