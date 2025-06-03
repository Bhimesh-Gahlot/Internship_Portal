from extensions import db
from datetime import datetime

class Student(db.Model):
    __tablename__ = 'students'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    name = db.Column(db.String(100))
    registration_number = db.Column(db.String(20), unique=True)
    batch = db.Column(db.String(20))
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentors.id'))
    department = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    profile_picture = db.Column(db.String(255))
    section = db.Column(db.String(20))
    program = db.Column(db.String(100))
    blood_group = db.Column(db.String(10))
    date_of_birth = db.Column(db.Date)
    hostel_name = db.Column(db.String(100))
    hostel_block = db.Column(db.String(50))
    hostel_room_no = db.Column(db.String(20))
    has_muj_alumni = db.Column(db.Boolean, default=False)

    # Relationships
    user = db.relationship('User', backref='student_profile')
    mentor = db.relationship('Mentor', backref='students')
    progress = db.relationship('ProgressTracking', backref='student', lazy=True)
    mentor_feedbacks = db.relationship('MentorFeedback', backref='student', lazy=True)
    weekly_feedbacks = db.relationship('WeeklyFeedback', backref='student', lazy=True)

    def __repr__(self):
        return f"<Student {self.registration_number}>"

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'registration_number': self.registration_number,
            'batch': self.batch,
            'mentor_id': self.mentor_id,
            'department': self.department,
            'phone': self.phone,
            'address': self.address,
            'profile_picture': self.profile_picture,
            'section': self.section,
            'program': self.program,
            'blood_group': self.blood_group,
            'date_of_birth': self.date_of_birth.strftime('%Y-%m-%d') if self.date_of_birth else None,
            'hostel_name': self.hostel_name,
            'hostel_block': self.hostel_block,
            'hostel_room_no': self.hostel_room_no,
            'has_muj_alumni': self.has_muj_alumni
        }
