from extensions import db
from datetime import datetime

class MentorAssignment(db.Model):
    """Model for storing mentor to student assignments"""
    __tablename__ = 'mentor_assignments'

    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentors.id'), nullable=False)
    registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=False)
    
    # Define unique constraint for mentor_id and registration_number
    __table_args__ = (
        db.UniqueConstraint('mentor_id', 'registration_number', name='unique_mentor_student'),
    )
    
    # Relationships
    mentor = db.relationship('Mentor', backref=db.backref('student_assignments', lazy=True))
    student = db.relationship('Student', foreign_keys=[registration_number], backref=db.backref('mentor_assignment_ref', uselist=False))
    
    def __repr__(self):
        return f"<MentorAssignment: Mentor {self.mentor_id} assigned to Student {self.registration_number}>"
    
    def to_dict(self):
        """Convert assignment to dictionary"""
        return {
            'id': self.id,
            'mentor_id': self.mentor_id,
            'registration_number': self.registration_number
        }