from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import get_jwt_identity
from functools import wraps
from models.user import User
from models.student import Student
from models.mentor import Mentor
from models.internship import Internship
from models.mentor_assignment import MentorAssignment
from models.evaluation import Evaluation
from extensions import db
from utils.access_control import mentor_required, token_required
from flask_cors import cross_origin
import datetime
import pymysql
import sys

# This is a fixed version of the student creation endpoint

@token_required
def create_student_fixed():
    """Fixed implementation of the create_student endpoint to handle 422 errors"""
    # Handle preflight OPTIONS request first
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response
        
    try:
        # Get mentor_id from token
        user_id = request.token_data['user_id']
        role = request.token_data['role']
        
        # Check if user has mentor role
        if role != 'mentor':
            return jsonify({'error': 'Mentor access required'}), 403
        
        # Get the mentor record
        mentor = Mentor.query.filter_by(user_id=user_id).first()
        if not mentor:
            return jsonify({"error": "Mentor profile not found"}), 404
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Log the received data for debugging
        print(f"Received data: {data}")
        
        # Check required fields
        required_fields = ['email', 'first_name', 'last_name', 'registration_number', 'batch']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        # Check if registration number is already in use
        existing_student = Student.query.filter_by(registration_number=data['registration_number']).first()
        if existing_student:
            return jsonify({'error': 'Registration number already in use'}), 400
        
        # Check if user with this email already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        
        # Create connection directly to database for more controlled operations
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal',
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        
        try:
            cursor = conn.cursor()
            
            if existing_user:
                user_id = existing_user.id
                print(f"Using existing user with ID: {user_id}")
            else:
                # Create new user
                print("Creating new user")
                password = data.get('password', 'changeme123')
                password_hash = User.generate_password_hash(password)
                
                cursor.execute("""
                    INSERT INTO users (email, first_name, last_name, role, password)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    data['email'],
                    data['first_name'],
                    data['last_name'],
                    'student',
                    password_hash
                ))
                user_id = cursor.lastrowid
                print(f"Created new user with ID: {user_id}")
            
            # Create student record
            full_name = f"{data['first_name']} {data['last_name']}"
            print(f"Creating student with name: {full_name}")
            
            cursor.execute("""
                INSERT INTO students (user_id, name, registration_number, batch, mentor_id)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                user_id,
                full_name,
                data['registration_number'],
                data['batch'],
                mentor.id
            ))
            student_id = cursor.lastrowid
            print(f"Created student with ID: {student_id}")
            
            # Create mentor assignment
            cursor.execute("""
                INSERT INTO mentor_assignments (mentor_id, registration_number)
                VALUES (%s, %s)
            """, (
                mentor.id,
                data['registration_number']
            ))
            assignment_id = cursor.lastrowid
            print(f"Created mentor assignment with ID: {assignment_id}")
            
            # Commit the transaction
            conn.commit()
            print("Transaction committed successfully")
            
            # Return success response
            return jsonify({
                'message': 'Student created and assigned successfully',
                'student': {
                    'id': student_id,
                    'name': full_name,
                    'email': data['email'],
                    'registration_number': data['registration_number'],
                    'batch': data['batch']
                }
            }), 201
            
        except Exception as db_error:
            conn.rollback()
            print(f"Database error: {str(db_error)}")
            return jsonify({"error": f"Database error: {str(db_error)}"}), 500
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Error creating student: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to create student: {str(e)}"}), 500

# Instructions to implement this:
# 1. Add this function to your mentor_routes.py
# 2. Replace your existing create_student route with:
#
# @bp.route('/students', methods=['POST', 'OPTIONS'])
# @token_required
# def create_student():
#     return create_student_fixed()
