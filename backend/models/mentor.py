from extensions import db

class Mentor(db.Model):
    __tablename__ = 'mentors'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    designation = db.Column(db.String(100))
    max_students = db.Column(db.Integer)
    phone = db.Column(db.String(20), nullable=True)
    
    # Relationship with User
    user = db.relationship('User', backref='mentor_profile') 