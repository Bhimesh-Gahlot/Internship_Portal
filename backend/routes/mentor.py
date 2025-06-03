from flask import Blueprint, request, jsonify
from models import Student, Mentor, MentorAssignment, User
from extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from routes.auth import mentor_required
import datetime

mentor_bp = Blueprint('mentor', __name__, url_prefix='/mentor')

@mentor_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@mentor_required
def mentor_dashboard():
    mentor_id = get_jwt_identity()
    mentor = Mentor.query.get(mentor_id)
    
    if not mentor:
        return jsonify({'error': 'Mentor not found'}), 404
    
    return jsonify({
        'mentor': {
            'id': mentor.id,
            'name': mentor.name,
            'email': mentor.email,
            'department': mentor.department
        }
    }), 200

@mentor_bp.route('/students', methods=['GET'])
# @jwt_required()
# @mentor_required
def get_students():
    mentor_id = 1  # Default mentor ID for development
    # mentor_id = get_jwt_identity()
    
    # Find all mentor assignments for this mentor
    assignments = MentorAssignment.query.filter_by(mentor_id=mentor_id).all()
    
    students = []
    for assignment in assignments:
        student = Student.query.filter_by(registration_number=assignment.registration_number).first()
        if student:
            # Get email from the User model
            user = User.query.get(student.user_id) if student.user_id else None
            email = user.email if user else None
            
            # Check if internship_status attribute exists or provide default
            internship_status = getattr(student, 'internship_status', 'Not Started')
            
            students.append({
                'id': student.id,
                'name': student.name,
                'email': email,
                'registration_number': student.registration_number,
                'batch': student.batch,
                'internship_status': internship_status,
                'assignment_id': assignment.id,
                'assignment_date': datetime.datetime.now().strftime('%Y-%m-%d')
            })
    
    return jsonify({
        'students': students,
        'count': len(students)
    }), 200

@mentor_bp.route('/students/<registration_number>', methods=['GET'])
@jwt_required()
@mentor_required
def get_student(registration_number):
    mentor_id = get_jwt_identity()
    
    # Check if student is assigned to this mentor
    assignment = MentorAssignment.query.filter_by(
        mentor_id=mentor_id, 
        registration_number=registration_number
    ).first()
    
    if not assignment:
        return jsonify({'error': 'Student not assigned to this mentor'}), 403
    
    student = Student.query.filter_by(registration_number=registration_number).first()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    return jsonify({
        'student': {
            'id': student.id,
            'name': student.name,
            'email': student.email,
            'registration_number': student.registration_number,
            'batch': student.batch,
            'internship_status': student.internship_status
        }
    }), 200

@mentor_bp.route('/students/<registration_number>', methods=['PUT'])
@jwt_required()
@mentor_required
def update_student(registration_number):
    mentor_id = get_jwt_identity()
    
    # Check if student is assigned to this mentor
    assignment = MentorAssignment.query.filter_by(
        mentor_id=mentor_id, 
        registration_number=registration_number
    ).first()
    
    if not assignment:
        return jsonify({'error': 'Student not assigned to this mentor'}), 403
    
    student = Student.query.filter_by(registration_number=registration_number).first()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    data = request.get_json()
    
    # Only allow updating certain fields
    if 'name' in data:
        student.name = data['name']
    if 'email' in data:
        student.email = data['email']
    if 'batch' in data:
        student.batch = data['batch']
    if 'internship_status' in data:
        student.internship_status = data['internship_status']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Student updated successfully',
        'student': {
            'id': student.id,
            'name': student.name,
            'email': student.email,
            'registration_number': student.registration_number,
            'batch': student.batch,
            'internship_status': student.internship_status
        }
    }), 200

@mentor_bp.route('/students', methods=['POST'])
@jwt_required()
@mentor_required
def create_student():
    mentor_id = get_jwt_identity()
    data = request.get_json()
    
    # Check required fields
    if not all(k in data for k in ['name', 'email', 'registration_number', 'batch']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        # First check if user with this email already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        
        # User exists
        if existing_user:
            # Check if this user already has a student profile
            existing_student = Student.query.filter_by(user_id=existing_user.id).first()
            
            if existing_student:
                # Student profile exists - check assignment
                assignment = MentorAssignment.query.filter_by(student_id=existing_student.id).first()
                
                if assignment:
                    if assignment.mentor_id == mentor_id:
                        return jsonify({"message": "This student is already assigned to you."}), 400
                    else:
                        return jsonify({"message": "This student is already assigned to another mentor."}), 400
                else:
                    # Student exists but isn't assigned yet
                    assignment = MentorAssignment(
                        mentor_id=mentor_id,
                        student_id=existing_student.id
                    )
                    db.session.add(assignment)
                    db.session.commit()
                    
                    return jsonify({
                        "message": "Existing student has been assigned to you.",
                        "student": {
                            "id": existing_student.id,
                            "name": existing_student.name,
                            "email": existing_user.email,
                            "registration_number": existing_student.registration_number,
                            "batch": existing_student.batch
                        }
                    }), 200
            else:
                # User exists but no student profile - create student profile
                student = Student(
                    user_id=existing_user.id,
                    name=data['name'],
                    registration_number=data['registration_number'],
                    batch=data['batch'],
                    internship_status=data.get('internship_status', 'Not Started')
                )
                db.session.add(student)
                db.session.flush()  # Get the student ID
                
                # Create mentor assignment
                assignment = MentorAssignment(
                    mentor_id=mentor_id,
                    student_id=student.id
                )
                db.session.add(assignment)
                db.session.commit()
                
                return jsonify({
                    "message": "Student profile created for existing user and assigned to you.",
                    "student": {
                        "id": student.id,
                        "name": student.name,
                        "email": existing_user.email,
                        "registration_number": student.registration_number,
                        "batch": student.batch,
                        "internship_status": student.internship_status
                    }
                }), 201
        else:
            # Check if registration number is already in use
            existing_student = Student.query.filter_by(registration_number=data['registration_number']).first()
            if existing_student:
                return jsonify({'error': 'Registration number already in use'}), 400
            
            # No existing user - create new user first
            user = User(
                email=data['email'],
                role='student'
            )
            # Set a default password
            password = data.get('password', 'changeme123')
            user.set_password(password)
            
            db.session.add(user)
            db.session.flush()  # Get the user ID
            
            # Create new student
            student = Student(
                user_id=user.id,
                name=data['name'],
                registration_number=data['registration_number'],
                batch=data['batch'],
                internship_status=data.get('internship_status', 'Not Started')
            )
            
            db.session.add(student)
            db.session.flush()  # Get the student ID
            
            # Create mentor assignment
            assignment = MentorAssignment(
                mentor_id=mentor_id,
                student_id=student.id
            )
            
            db.session.add(assignment)
            db.session.commit()
            
            return jsonify({
                'message': 'Student created and assigned successfully',
                'student': {
                    'id': student.id,
                    'name': student.name,
                    'email': user.email,
                    'registration_number': student.registration_number,
                    'batch': student.batch,
                    'internship_status': student.internship_status,
                    'password': password  # Include password for mentor to share
                }
            }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error creating student: {str(e)}")
        return jsonify({"error": f"Failed to create student: {str(e)}"}), 500

@mentor_bp.route('/students/<registration_number>', methods=['DELETE'])
@jwt_required()
@mentor_required
def delete_student(registration_number):
    mentor_id = get_jwt_identity()
    
    # Check if student is assigned to this mentor
    assignment = MentorAssignment.query.filter_by(
        mentor_id=mentor_id, 
        registration_number=registration_number
    ).first()
    
    if not assignment:
        return jsonify({'error': 'Student not assigned to this mentor'}), 403
    
    student = Student.query.filter_by(registration_number=registration_number).first()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    # Remove the assignment first (foreign key constraint)
    db.session.delete(assignment)
    
    # Then remove the student
    db.session.delete(student)
    db.session.commit()
    
    return jsonify({
        'message': 'Student deleted successfully'
    }), 200

@mentor_bp.route('/allocations', methods=['GET'])
@jwt_required()
@mentor_required
def get_allocations():
    mentor_id = get_jwt_identity()
    
    allocations = MentorAssignment.query.filter_by(mentor_id=mentor_id).all()
    
    allocation_data = []
    for allocation in allocations:
        student = Student.query.filter_by(registration_number=allocation.registration_number).first()
        if student:
            allocation_data.append({
                'id': allocation.id,
                'student': {
                    'id': student.id,
                    'name': student.name,
                    'registrationNo': student.registration_number,
                    'batch': student.batch,
                    'email': student.email
                },
                'status': allocation.status if hasattr(allocation, 'status') else 'active',
                'createdAt': datetime.datetime.now().strftime('%Y-%m-%d')
            })
    
    return jsonify(allocation_data), 200 