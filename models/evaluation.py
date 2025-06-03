from db import db
import datetime

class Evaluation(db.Model):
    """Evaluation model for storing student evaluations by mentors"""
    __tablename__ = 'evaluations'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentors.id'), nullable=False)
    evaluation_type = db.Column(db.String(20), nullable=False)  # synopsis, mte, ete
    marks = db.Column(db.Float, nullable=False)
    feedback = db.Column(db.Text, nullable=False)
    remarks = db.Column(db.Text, nullable=True)
    date = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    student = db.relationship('Student', backref=db.backref('evaluations', lazy=True))
    mentor = db.relationship('Mentor', backref=db.backref('evaluations', lazy=True))
    
    def __init__(self, student_id, mentor_id, evaluation_type, marks, feedback, remarks=None, date=None):
        self.student_id = student_id
        self.mentor_id = mentor_id
        self.evaluation_type = evaluation_type
        self.marks = marks
        self.feedback = feedback
        self.remarks = remarks
        self.date = date if date else datetime.datetime.utcnow()
    
    def to_dict(self):
        """Convert evaluation to dictionary"""
        return {
            'id': self.id,
            'student_id': self.student_id,
            'mentor_id': self.mentor_id,
            'evaluation_type': self.evaluation_type,
            'marks': self.marks,
            'feedback': self.feedback,
            'remarks': self.remarks,
            'date': self.date.strftime('%Y-%m-%d %H:%M:%S') if self.date else None
        } 