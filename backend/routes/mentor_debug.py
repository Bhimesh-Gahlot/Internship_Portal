from flask import Blueprint, request, jsonify
from models import Student, Mentor, MentorAssignment, User
from extensions import db
import datetime
from flask_cors import cross_origin

debug_bp = Blueprint('mentor_debug', __name__, url_prefix='/mentor/debug')

# Add a debug endpoint to find orphaned users
@debug_bp.route('/orphaned-users', methods=['GET'])
@cross_origin(origins="*")
def find_orphaned_users():
    """Debug endpoint to find users without corresponding student profiles"""
    try:
        # Find users with 'student' role
        student_users = User.query.filter_by(role='student').all()
        
        orphaned_users = []
        for user in student_users:
            # Check if user has a student profile
            student = Student.query.filter_by(user_id=user.id).first()
            if not student:
                orphaned_users.append({
                    'id': user.id,
                    'email': user.email,
                    'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(user, 'created_at') and user.created_at else None
                })
        
        return jsonify({
            'message': f'Found {len(orphaned_users)} orphaned users',
            'orphaned_users': orphaned_users
        }), 200
        
    except Exception as e:
        print(f"Error finding orphaned users: {str(e)}")
        return jsonify({"message": f"Failed to find orphaned users: {str(e)}"}), 500

# Add an endpoint to fix orphaned users by creating student profiles
@debug_bp.route('/fix-orphaned-user/<int:user_id>', methods=['POST'])
@cross_origin(origins="*")
def fix_orphaned_user(user_id):
    """Create a student profile for an orphaned user and assign to the current mentor"""
    try:
        # For development, use a default mentor ID
        mentor = Mentor.query.first()
        if not mentor:
            return jsonify({"message": "No mentors found in the system."}), 404
        
        # Find the user
        orphaned_user = User.query.get(user_id)
        if not orphaned_user:
            return jsonify({"message": "User not found."}), 404
        
        if orphaned_user.role != 'student':
            return jsonify({"message": "User is not a student."}), 400
        
        # Check if user already has a student profile
        existing_student = Student.query.filter_by(user_id=orphaned_user.id).first()
        if existing_student:
            return jsonify({"message": "User already has a student profile."}), 400
        
        # Get data from request
        data = request.get_json()
        if not data:
            return jsonify({"message": "No data provided."}), 400
        
        # Required fields
        required_fields = ['name', 'registration_number', 'batch']
        for field in required_fields:
            if field not in data:
                return jsonify({"message": f"Missing required field: {field}"}), 400
        
        # Check if registration number already exists
        existing_student = Student.query.filter_by(registration_number=data['registration_number']).first()
        if existing_student:
            return jsonify({"message": "A student with this registration number already exists."}), 400
        
        # Create the student profile
        student = Student(
            user_id=orphaned_user.id,
            name=data['name'],
            registration_number=data['registration_number'],
            batch=data['batch']
        )
        
        db.session.add(student)
        db.session.flush()  # Get the student ID
        
        # Assign the student to the mentor
        assignment = MentorAssignment(
            mentor_id=mentor.id,
            student_id=student.id
        )
        
        db.session.add(assignment)
        db.session.commit()
    
        return jsonify({
            "message": "Student profile created and assigned to you.",
            "student": {
                "id": student.id,
                "user_id": orphaned_user.id,
                "name": student.name,
                "email": orphaned_user.email,
                "registration_number": student.registration_number,
                "batch": student.batch
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error fixing orphaned user: {str(e)}")
        return jsonify({"message": f"Failed to fix orphaned user: {str(e)}"}), 500 