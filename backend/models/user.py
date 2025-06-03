from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    role = db.Column(db.String(20))

    def __repr__(self):
        return f"<User {self.email}>"

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': self.role
        }
        
    def set_password(self, password):
        """Set password hash for the user"""
        self.password = generate_password_hash(password)
        
    def check_password(self, password):
        """Check if the provided password matches the hash"""
        return check_password_hash(self.password, password)