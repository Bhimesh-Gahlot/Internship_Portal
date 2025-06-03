from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    temp_password = db.Column(db.String(128))
    
    # Relationships
    mentor = db.relationship('Mentor', backref='user', uselist=False)
    student = db.relationship('Student', backref='user', uselist=False)

class Mentor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    department = db.Column(db.String(100))
    specialization = db.Column(db.String(100))
    
    # Relationship with students
    students = db.relationship('Student', backref='mentor_rel')

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    roll_number = db.Column(db.String(20), unique=True)
    batch = db.Column(db.String(20))
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentor.id'), nullable=True)

class PasswordChangeLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    changed_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id])
    changed_by = db.relationship('User', foreign_keys=[changed_by_id]) 