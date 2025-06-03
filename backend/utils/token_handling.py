from flask import request, jsonify
from functools import wraps
import pymysql

def get_token_from_header():
    """Extract token from Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    return auth_header.split(' ')[1]

def parse_token(token):
    """Parse our custom token format: token:user_id:role:session_id"""
    if not token or not token.startswith('token:'):
        return None
    
    parts = token.split(':')
    if len(parts) < 3:
        return None
    
    try:
        # Return user_id, role, and session_id if available
        return {
            'user_id': int(parts[1]),
            'role': parts[2],
            'session_id': parts[3] if len(parts) > 3 else None
        }
    except (ValueError, IndexError):
        return None

def verify_token(token=None):
    """Verify the token by connecting to the database and checking the user exists"""
    if token is None:
        token = get_token_from_header()
    
    token_data = parse_token(token)
    if not token_data:
        return None
    
    # Connect to database and verify the user exists with the correct role
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Get user by id and role
        cursor.execute(
            "SELECT * FROM users WHERE id = %s AND role = %s", 
            (token_data['user_id'], token_data['role'])
        )
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            return None
        
        return token_data
    
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        return None

def token_required(f):
    """Decorator to check if a valid token is present"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token_data = verify_token()
        
        if not token_data:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Add the token data to the request for other functions to use
        request.token_data = token_data
        
        return f(*args, **kwargs)
    
    return decorated

def role_required(required_role):
    """Decorator factory to check if user has the required role"""
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated_function(*args, **kwargs):
            # token_required already added token_data to the request
            token_data = request.token_data
            
            if token_data['role'] != required_role:
                return jsonify({'error': f'{required_role.capitalize()} access required'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Create role-specific decorators
admin_required = role_required('admin')
mentor_required = role_required('mentor')
student_required = role_required('student') 