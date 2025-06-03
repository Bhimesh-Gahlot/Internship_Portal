from extensions import db
from datetime import datetime

class Report(db.Model):
    __tablename__ = 'reports'
    
    id = db.Column(db.Integer, primary_key=True)
    report_type = db.Column(db.String(20), nullable=False)  # monthly/final
    submission_date = db.Column(db.DateTime, nullable=False)
    report_file_path = db.Column(db.String(255))
    presentation_file_path = db.Column(db.String(255))
    marks = db.Column(db.Float)
    remarks = db.Column(db.Text)
    registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=False)
    
    # Relationship with Student
    student = db.relationship('Student', backref=db.backref('student_reports', lazy=True))
    
    def __repr__(self):
        return f"<Report {self.id} - Type: {self.report_type}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'report_type': self.report_type,
            'submission_date': self.submission_date.strftime('%Y-%m-%d %H:%M:%S') if self.submission_date else None,
            'report_file_path': self.report_file_path,
            'presentation_file_path': self.presentation_file_path,
            'marks': self.marks,
            'remarks': self.remarks,
            'registration_number': self.registration_number
        } 