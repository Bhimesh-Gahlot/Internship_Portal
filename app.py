from flask import Flask, render_template, redirect, url_for, flash, request
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash, generate_password_hash
from models import db, User, Mentor, Student, PasswordChangeLog
from flask_jwt_extended import JWTManager
from routes.mentor_routes import mentor_bp
from routes.admin_routes import admin_bp
from routes.student_routes import student_bp
from admin import init_admin
import logging
import string
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'jwt-secret-key'  # Change this in production
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 1 day

# Initialize extensions
db.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
jwt = JWTManager(app)

# Initialize admin
admin = init_admin(app)

# Register blueprints
app.register_blueprint(mentor_bp, url_prefix='/mentor')
app.register_blueprint(admin_bp, url_prefix='/admin')
app.register_blueprint(student_bp, url_prefix='/student')

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page or url_for('index'))
        
        flash('Invalid username or password')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/admin/password-display/<int:user_id>')
@login_required
def password_display(user_id):
    logger.debug(f"Password display requested for user_id: {user_id}")
    if not current_user.is_admin:
        logger.warning(f"Unauthorized access attempt by {current_user.username}")
        flash('Unauthorized access', 'danger')
        return redirect(url_for('index'))
    
    user = User.query.get(user_id)
    if not user or not user.temp_password:
        logger.warning(f"Password info not available for user_id: {user_id}")
        flash('Password information not available', 'error')
        return redirect(url_for('admin.index'))
    
    logger.info(f"Displaying password for user: {user.username}")
    password = user.temp_password
    # Clear the temporary password after viewing
    user.temp_password = None
    db.session.commit()
    
    return render_template('admin/password_display.html', user=user, password=password)

@app.route('/test-password-reset/<int:user_id>')
@login_required
def test_password_reset(user_id):
    if not current_user.is_admin:
        flash('Unauthorized access', 'danger')
        return redirect(url_for('index'))
    
    user = User.query.get(user_id)
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('index'))
    
    # Generate a secure random password
    password_length = 12
    password_chars = string.ascii_letters + string.digits + "!@#$%^&*()"
    new_password = ''.join(random.choice(password_chars) for i in range(password_length))
    
    # Hash the password and save
    user.password_hash = generate_password_hash(new_password)
    user.temp_password = new_password
    
    # Log the password change
    log_entry = PasswordChangeLog(
        user=user,
        changed_by=current_user
    )
    db.session.add(log_entry)
    db.session.commit()
    
    return f"""
    <h1>Password Reset Test</h1>
    <p>Username: {user.username}</p>
    <p>New password: <code style="background-color: #ffffcc; padding: 5px;">{new_password}</code></p>
    <p><a href="/admin/">Back to Admin</a></p>
    """

# Create database tables
@app.before_first_request
def create_tables():
    db.create_all()
    
    # Create admin user if none exists
    if not User.query.filter_by(is_admin=True).first():
        admin_user = User(
            username='admin',
            email='admin@example.com',
            password_hash=generate_password_hash('admin'),
            is_admin=True
        )
        db.session.add(admin_user)
        db.session.commit()

if __name__ == '__main__':
    app.run(debug=True) 