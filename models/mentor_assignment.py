from db import db
import datetime

class MentorAssignment(db.Model):
    """Model for storing mentor to student assignments"""
    __tablename__ = 'mentor_assignments'

    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentors.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    
    # Add a unique constraint to ensure a student isn't assigned to multiple mentors
    __table_args__ = (
        db.UniqueConstraint('student_id', name='unique_student_assignment'),
    )
    
    def __init__(self, mentor_id, student_id):
        self.mentor_id = mentor_id
        self.student_id = student_id
    
    def to_dict(self):
        """Convert assignment to dictionary"""
        return {
            'id': self.id,
            'mentor_id': self.mentor_id,
            'student_id': self.student_id
        } 