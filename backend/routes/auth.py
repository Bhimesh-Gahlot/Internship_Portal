from flask import Blueprint, request, jsonify, make_response, current_app
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from models.user import User
from extensions import db, mail, jwt
from flask_cors import cross_origin, CORS
from flask_mail import Message
import secrets
from datetime import datetime, timedelta
import jwt
import pymysql
import uuid

bp = Blueprint('auth', __name__, url_prefix='/auth')

# Enable CORS for all routes in this blueprint
CORS(bp, resources={r"/*": {"origins": "*"}})

# Simplified token creation - just combines fields with colons
def create_token(user_id, role, session_id=None):
    """Create a simple token for development"""
    if not session_id:
        session_id = f"session_{user_id}_{role}_{int(datetime.now().timestamp())}"
    return f"token:{user_id}:{role}:{session_id}"

# Simplified token verification - no database checks
def verify_token_direct(token):
    """Parse token without verification for development"""
    if not token:
        return None
        
    try:
        parts = token.split(':')
        if len(parts) >= 3 and parts[0] == 'token':
            return {
                'user_id': int(parts[1]),
                'role': parts[2],
                'session_id': parts[3] if len(parts) > 3 else 'default'
            }
        elif len(parts) >= 2:
            # Simple user_id:role format
            return {
                'user_id': int(parts[0]),
                'role': parts[1],
                'session_id': 'default'
            }
        else:
            # Default to admin for development
            return {
                'user_id': 1,
                'role': 'admin',
                'session_id': 'default'
            }
    except Exception as e:
        print(f"Token parsing error (using default): {str(e)}")
        # Return default admin token for development
        return {
            'user_id': 1,
            'role': 'admin',
            'session_id': 'default'
        }

@bp.route('/register', methods=['POST'])
@cross_origin()
def register():
    try:
        data = request.get_json()
        print("Received registration data:", data)

        # Validate required fields
        if not all(k in data for k in ['email', 'password', 'role']):
            print("Missing required fields")
            return jsonify({'error': 'Missing required fields'}), 400

        # Check if email is already registered
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            print(f"Email already registered: {data['email']}")
            return jsonify({'error': 'Email already registered'}), 400

        # Validate role
        if data['role'] not in ['student', 'mentor', 'admin']:  # Add 'admin' to allowed roles
            return jsonify({'error': 'Invalid role'}), 400

        # Create new user
        user = User(
            email=data['email'],
            role=data['role']
        )
        user.set_password(data['password'])

        # Save to database
        try:
            db.session.add(user)
            db.session.commit()
            print(f"Successfully created user with ID: {user.id}")
        except Exception as e:
            print(f"Database error during user creation: {str(e)}")
            db.session.rollback()
            raise

        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role
            }
        }), 201

    except Exception as e:
        print(f"Registration error: {str(e)}")
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@bp.after_request
def after_request(response):
    if request.method == 'OPTIONS':
        # Add CORS headers for preflight requests
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@bp.route('/login', methods=['POST', 'OPTIONS'])
@cross_origin(origins="*")
def login():
    """Simplified login endpoint for development"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return response
    
    try:
        # Get data from request
        data = request.get_json()
        
        # Validation
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
            
        email = data['email']
        password = data['password']
        
        print(f"Login attempt for email: {email}")
        
        # Connect directly to database
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Get user by email
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            print(f"User not found: {email}")
            return jsonify({'error': 'Invalid credentials'}), 401
            
        # Check password (direct comparison)
        if user['password'] != password:
            print(f"Invalid password for user: {email}")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        print(f"User authenticated: {email} (ID: {user['id']}, Role: {user['role']})")
        
        # Generate a unique session ID for this login
        session_id = f"session_{user['id']}_{user['role']}_{int(datetime.now().timestamp())}"
            
        # Create token with session ID for multi-tab support
        token = f"token:{user['id']}:{user['role']}:{session_id}"
        
        # Include session information in the response
        response_data = {
            'token': token,
            'access_token': token,
            'user_id': user['id'],
            'id': user['id'],
            'role': user['role'],
            'user_role': user['role'],
            'message': 'Login successful',
            'session_id': session_id
        }
        
        # If student role, fetch and include registration number
        if user['role'] == 'student':
            try:
                # Query the students table to get the registration number
                cursor.execute("SELECT registration_number FROM students WHERE user_id = %s", (user['id'],))
                student_data = cursor.fetchone()
                if student_data and 'registration_number' in student_data:
                    response_data['registration_number'] = student_data['registration_number']
                    print(f"Including registration number in response: {student_data['registration_number']}")
            except Exception as e:
                print(f"Error fetching student registration number: {str(e)}")
                # Continue without registration number
        
        cursor.close()
        conn.close()
        
        print(f"Login successful for {email}")
        
        response = jsonify(response_data)
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200
    except Exception as e:
        print(f"Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500

@bp.route('/forgot-password', methods=['POST'])
@cross_origin()
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
            
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'No account found with this email'}), 404
            
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        db.session.commit()
        
        # Send reset email
        msg = Message(
            'Password Reset Request',
            sender='noreply@internshipportal.com',
            recipients=[email]
        )
        reset_url = f'http://localhost:3000/reset-password?token={reset_token}'
        msg.body = f'To reset your password, visit the following link: {reset_url}'
        mail.send(msg)
        
        return jsonify({'message': 'Password reset instructions sent to your email'}), 200
        
    except Exception as e:
        print("Password reset error:", str(e))
        return jsonify({'error': str(e)}), 500

@bp.route('/reset-password', methods=['POST'])
@cross_origin()
def reset_password():
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('new_password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
            
        user = User.query.filter_by(reset_token=token).first()
        if not user:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
            
        user.set_password(new_password)
        user.reset_token = None  # Clear the reset token
        db.session.commit()
        
        return jsonify({'message': 'Password has been reset successfully'}), 200
        
    except Exception as e:
        print("Password reset error:", str(e))
        return jsonify({'error': str(e)}), 500

@bp.route('/refresh', methods=['POST', 'OPTIONS'])
@cross_origin(origins="*")
def refresh_token():
    """Simplified token refresh for development - always returns a valid token"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return response
    
    try:
        # Get the request data
        data = request.get_json() or {}
        role = data.get('role', 'admin')
        user_id = data.get('user_id', 1)
        
        # Get token from header if available
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            # Try to parse existing token for user_id and role
            token_data = verify_token_direct(token)
            if token_data:
                user_id = token_data.get('user_id', user_id)
                role = token_data.get('role', role)
        
        # Create a new token
        session_id = f"session_{user_id}_{role}_{int(datetime.now().timestamp())}"
        new_token = create_token(user_id, role, session_id)
        
        response_data = {
            'message': 'Token refreshed successfully',
            'access_token': new_token,
            'token': new_token,
            'user_id': user_id,
            'id': user_id,
            'role': role,
            'user_role': role,
            'session_id': session_id
        }
        
        response = jsonify(response_data)
        response.headers['Access-Control-Allow-Origin'] = '*'
        
        return response, 200
    
    except Exception as e:
        print(f"Error in refresh token: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to refresh token: {str(e)}'}), 500

# Custom decorator to extract token info without using JWT
def custom_token_required(f):
    from functools import wraps
    
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Bearer token is required'}), 401
            
        token = auth_header.split(' ')[1]
        
        # Verify token directly
        token_data = verify_token_direct(token)
        if not token_data:
            return jsonify({'error': 'Invalid or expired token'}), 401
            
        # Store token data in request for route function to use
        request.token_data = token_data
        
        return f(*args, **kwargs)
    
    return decorated

# Helper function for routes to check user role
def has_role(required_role):
    # Check if token data exists in request
    if not hasattr(request, 'token_data'):
        return False
        
    return request.token_data['role'] == required_role

@bp.route('/test', methods=['GET'])
@cross_origin(origins="*")
def test():
    """Test endpoint"""
    response = jsonify({
        'status': 'ok',
        'message': 'Auth service is running',
        'timestamp': datetime.utcnow().isoformat()
    })
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

# Endpoint to verify if the user is authenticated with a specific role
@bp.route('/verify/<role>', methods=['GET'])
@cross_origin(origins="*")
@custom_token_required
def verify_role(role):
    """Verify if the user has the specified role"""
    token_data = request.token_data
    
    if token_data['role'] == role:
        return jsonify({
            'authenticated': True,
            'role': role,
            'user_id': token_data['user_id']
        }), 200
    else:
        return jsonify({
            'authenticated': False,
            'message': f'User does not have {role} role'
        }), 403

# Admin required decorator
def admin_required(f):
    from functools import wraps
    
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Bearer token is required'}), 401
            
        token = auth_header.split(' ')[1]
        
        # Verify token directly
        token_data = verify_token_direct(token)
        if not token_data:
            return jsonify({'error': 'Invalid or expired token'}), 401
            
        # Check if user has admin role
        if token_data['role'] != 'admin':
            return jsonify({'error': 'Admin role required'}), 403
            
        # Store token data in request for route function to use
        request.token_data = token_data
        
        return f(*args, **kwargs)
    
    return decorated

# Mentor required decorator
def mentor_required(f):
    from functools import wraps
    
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Bearer token is required'}), 401
            
        token = auth_header.split(' ')[1]
        
        # Verify token directly
        token_data = verify_token_direct(token)
        if not token_data:
            return jsonify({'error': 'Invalid or expired token'}), 401
            
        # Check if user has mentor role
        if token_data['role'] != 'mentor':
            return jsonify({'error': 'Mentor role required'}), 403
            
        # Store token data in request for route function to use
        request.token_data = token_data
        
        return f(*args, **kwargs)
    
    return decorated