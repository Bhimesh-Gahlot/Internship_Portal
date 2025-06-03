from flask import Flask
from models import db, User
from werkzeug.security import generate_password_hash

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def create_admin_user():
    with app.app_context():
        # Check if user already exists
        existing_user = User.query.filter_by(email='bhimeshgahlot3@gmail.com').first()
        if existing_user:
            print("Admin user already exists!")
            return

        # Create new admin user
        admin_user = User(
            email='bhimeshgahlot3@gmail.com',
            role='admin'
        )
        admin_user.password_hash = generate_password_hash('yoyobheemsa')
        
        # Add to database
        db.session.add(admin_user)
        db.session.commit()
        print("Admin user created successfully!")

if __name__ == '__main__':
    create_admin_user() 