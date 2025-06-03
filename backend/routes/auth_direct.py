from flask import Blueprint, request, jsonify
from models.user import User
from flask_cors import cross_origin
import traceback
from flask_jwt_extended import create_access_token
from datetime import timedelta

# Create a new blueprint with a different URL prefix
bp = Blueprint('auth_direct', __name__, url_prefix='/auth-direct')

@bp.route('/login', methods=['POST'])
@cross_origin()
def login():
    try:
        print("Direct login attempt received")
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        print(f"Login data: {data}")
        
        # Direct database query
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        # Simple query to get the user
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 401
        
        print(f"Found user: {user.id}, password stored: {user.password[:5]}...")
        
        # Simple password check
        if user.password != password:
            return jsonify({'error': 'Invalid password'}), 401
        
        # Create a simple token
        expires = timedelta(hours=24)
        token = create_access_token(
            identity=user.id,
            expires_delta=expires, 
            additional_claims={'role': user.role}
        )
        
        print(f"Token created: {token[:10]}...")
        
        # Return a simple response
        response = {
            'access_token': token,
            'token': token, 
            'user_id': user.id,
            'role': user.role,
            'message': 'Login successful'
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print("Login error in direct route:", str(e))
        traceback.print_exc()
        # Return a more descriptive error
        error_details = {
            'error': str(e),
            'type': str(type(e).__name__),
            'trace': traceback.format_exc()
        }
        return jsonify(error_details), 500 