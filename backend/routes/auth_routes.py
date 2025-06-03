from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from ..models import db, User, MentorProfile, StudentProfile
from functools import wraps

load_dotenv()

bp = Blueprint('auth', __name__, url_prefix='/auth')

JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'fallback_secret_key_for_development')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token is missing or invalid!'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

# Login endpoint
@bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Email and password are required'}), 400
            
        user = User.query.filter_by(email=data.get('email')).first()
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
            
        if check_password_hash(user.password, data.get('password')):
            # Generate JWT token
            token = create_token(user.id, user.role)
            
            # Return with consistent field names
            return jsonify({
                'message': 'Login successful',
                'access_token': token,
                'token': token,  # Include both field names for compatibility
                'user_id': user.id,
                'id': user.id,  # Include both field names for compatibility
                'user_role': user.role,
                'role': user.role  # Include both field names for compatibility
            }), 200
        else:
            return jsonify({'message': 'Invalid password'}), 401
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'message': 'Login failed'}), 500

# Create token function
def create_token(user_id, role, expires_delta=None):
    if expires_delta is None:
        expires_delta = timedelta(hours=1)  # Default 1 hour expiration
    
    expires = datetime.utcnow() + expires_delta
    
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': expires
    }
    
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')

# Token refresh endpoint
@bp.route('/refresh', methods=['POST'])
@token_required
def refresh_token(current_user):
    try:
        # Get the current user's information
        user_id = current_user.id
        role = current_user.role
        
        # Create a new token with a fresh expiration time
        new_token = create_token(user_id, role)
        
        return jsonify({
            'message': 'Token refreshed successfully',
            'access_token': new_token,
            'user_id': user_id,
            'user_role': role
        }), 200
    except Exception as e:
        print(f"Error in refresh token: {e}")
        return jsonify({'message': 'Failed to refresh token'}), 500

# Register endpoint
@bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        
        if not data:
            return jsonify({'message': 'No input data provided'}), 400
            
        # Check required fields
        if not all(k in data for k in ['email', 'password', 'role']):
            return jsonify({'message': 'Missing required fields'}), 400
            
        # Check if user already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'message': 'User already exists'}), 409
            
        # Create new user
        hashed_password = generate_password_hash(data['password'])
        new_user = User(
            email=data['email'],
            password=hashed_password,
            role=data['role']
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Handle role-specific profiles if needed
        if data['role'] == 'mentor' and 'mentor_info' in data:
            mentor_info = data['mentor_info']
            new_mentor = MentorProfile(
                user_id=new_user.id,
                name=mentor_info.get('name', ''),
                department=mentor_info.get('department', ''),
                designation=mentor_info.get('designation', ''),
                max_students=mentor_info.get('max_students', 5)
            )
            db.session.add(new_mentor)
            db.session.commit()
        
        elif data['role'] == 'student' and 'student_info' in data:
            student_info = data['student_info']
            new_student = StudentProfile(
                user_id=new_user.id,
                name=student_info.get('name', ''),
                registration_number=student_info.get('registration_number', ''),
                batch=student_info.get('batch', '')
            )
            db.session.add(new_student)
            db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': new_user.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {e}")
        return jsonify({'message': 'Registration failed', 'error': str(e)}), 500 