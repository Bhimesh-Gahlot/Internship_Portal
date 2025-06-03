from extensions import db
from datetime import datetime

class Internship(db.Model):
    __tablename__ = 'internships'
    
    id = db.Column(db.Integer, primary_key=True)
    registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=False)
    company_name = db.Column(db.String(100), nullable=False)
    internship_type = db.Column(db.String(20), nullable=False)  # 'in-house' or 'external'
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    stipend = db.Column(db.Float, nullable=True)
    location = db.Column(db.String(100), nullable=True)
    hr_contact = db.Column(db.String(100), nullable=True)
    hr_email = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship with Student
    student = db.relationship('Student', backref=db.backref('student_internship', uselist=False), foreign_keys=[registration_number])
    
    def __repr__(self):
        return f"<Internship {self.id}: {self.company_name}>"
    
    def to_dict(self):
        student = self.student
        return {
            'id': self.id,
            'registration_number': self.registration_number,
            'student_name': student.name if student else None,
            'company_name': self.company_name,
            'internship_type': self.internship_type,
            'start_date': self.start_date.strftime('%Y-%m-%d') if self.start_date else None,
            'end_date': self.end_date.strftime('%Y-%m-%d') if self.end_date else None,
            'stipend': self.stipend,
            'location': self.location,
            'hr_contact': self.hr_contact,
            'hr_email': self.hr_email,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        } 