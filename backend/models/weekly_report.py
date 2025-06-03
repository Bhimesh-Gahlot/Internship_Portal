from extensions import db
from datetime import datetime

class WeeklyReport(db.Model):
    __tablename__ = 'weekly_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    week_number = db.Column(db.Integer, nullable=False)
    report_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=False)
    
    # Relationship with Student
    student = db.relationship('Student', backref=db.backref('student_weekly_reports', lazy=True))
    
    # Ensure one report per week per student
    __table_args__ = (
        db.UniqueConstraint('registration_number', 'week_number', name='unique_student_week_report'),
    )
    
    def __repr__(self):
        return f"<WeeklyReport Week {self.week_number}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'week_number': self.week_number,
            'report_text': self.report_text,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
            'registration_number': self.registration_number
        } 