from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from models.user import User
from models.student import Student
from models.mentor import Mentor
from models.internship import Internship
from models.mentor_assignment import MentorAssignment
from models.evaluation import Evaluation
from extensions import db
import datetime

bp = Blueprint('mentor', __name__, url_prefix='/api/mentor')

# Decorator to check if user is a mentor
def mentor_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'mentor':
            return jsonify({"message": "Access denied. Mentor role required."}), 403
            
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        if not mentor:
            return jsonify({"message": "Mentor profile not found."}), 404
            
        return fn(*args, **kwargs)
    return wrapper

@bp.route('/dashboard', methods=['GET'])
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

@bp.route('/students', methods=['GET'])
@jwt_required()
@mentor_required
def get_assigned_students():
    """Get all students assigned to the current mentor"""
    try:
        current_user_id = get_jwt_identity()
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        
        if not mentor:
            return jsonify({"message": "Mentor profile not found."}), 404
        
        # Get all assignments for this mentor
        assignments = MentorAssignment.query.filter_by(mentor_id=mentor.id).all()
        
        # Get the students from these assignments
        students_data = []
        
        for assignment in assignments:
            student = Student.query.get(assignment.student_id)
            if student:
                # Get user info for email
                user = User.query.get(student.user_id)
                
                # Get internship info if available
                internship = Internship.query.filter_by(student_id=student.user_id).first()
                internship_data = None
                if internship:
                    internship_data = internship.to_dict()
                
                student_data = student.to_dict()
                student_data['email'] = user.email if user else None
                student_data['internship'] = internship_data
                students_data.append(student_data)
        
        return jsonify({"students": students_data}), 200
    
    except Exception as e:
        print(f"Error fetching assigned students: {str(e)}")
        return jsonify({"message": f"Failed to fetch students: {str(e)}"}), 500

@bp.route('/students', methods=['POST'])
@jwt_required()
@mentor_required
def create_student():
    """Create a new student and assign to the current mentor"""
    try:
        current_user_id = get_jwt_identity()
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        
        if not mentor:
            return jsonify({"message": "Mentor profile not found."}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({"message": "No data provided."}), 400
        
        # Required fields
        required_fields = ['name', 'email', 'registration_number', 'batch']
        for field in required_fields:
            if field not in data:
                return jsonify({"message": f"Missing required field: {field}"}), 400
        
        # Check if user with this email already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            # Check if this user already has a student profile
            existing_student = Student.query.filter_by(user_id=existing_user.id).first()
            if existing_student:
                # Check if this student is already assigned to a mentor
                existing_assignment = MentorAssignment.query.filter_by(student_id=existing_student.id).first()
                if existing_assignment:
                    if existing_assignment.mentor_id == mentor.id:
                        return jsonify({"message": "This student is already assigned to you."}), 400
                    else:
                        return jsonify({"message": "This student is already assigned to another mentor."}), 400
                else:
                    # Student exists but isn't assigned - let's assign them to the current mentor
                    new_assignment = MentorAssignment(
                        mentor_id=mentor.id,
                        student_id=existing_student.id
                    )
                    db.session.add(new_assignment)
                    db.session.commit()
                    
                    return jsonify({
                        "message": "Existing student has been assigned to you.",
                        "student": {
                            "id": existing_student.id,
                            "user_id": existing_user.id,
                            "name": existing_student.name,
                            "email": existing_user.email,
                            "registration_number": existing_student.registration_number,
                            "batch": existing_student.batch
                        }
                    }), 200
            else:
                # User exists but doesn't have a student profile
                # This is an unusual state - let's create a student profile for this user
                print(f"User {existing_user.id} exists without student profile - creating one")
                
                # Create the student profile
                student = Student(
                    user_id=existing_user.id,
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
                    "message": "Student profile created for existing user and assigned to you.",
                    "student": {
                        "id": student.id,
                        "user_id": existing_user.id,
                        "name": student.name,
                        "email": existing_user.email,
                        "registration_number": student.registration_number,
                        "batch": student.batch
                    }
                }), 201
        
        # Check if registration number already exists
        existing_student = Student.query.filter_by(registration_number=data['registration_number']).first()
        if existing_student:
            return jsonify({"message": "A student with this registration number already exists."}), 400
        
        # Create a new user with student role
        user = User(
            email=data['email'],
            role='student'
        )
        # Set a default password or use provided password
        password = data.get('password', 'changeme123')
        user.set_password(password)
        
        try:
            # Begin a nested transaction for better control
            db.session.begin_nested()
            
            db.session.add(user)
            db.session.flush()  # Get the user ID
            
            # Create the student
            student = Student(
                user_id=user.id,
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
            
            # Commit the nested transaction
            db.session.commit()
        except Exception as e:
            # Roll back the nested transaction
            db.session.rollback()
            print(f"Error in nested transaction: {str(e)}")
            raise
        
        # Return the created student data
        return jsonify({
            "message": "Student created successfully and assigned to you.",
            "student": {
                "id": student.id,
                "user_id": user.id,
                "name": student.name,
                "email": user.email,
                "registration_number": student.registration_number,
                "batch": student.batch,
                "password": password  # Include the password in the response so mentor can share it
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating student: {str(e)}")
        return jsonify({"message": f"Failed to create student: {str(e)}"}), 500

@bp.route('/students/<int:student_id>', methods=['PUT'])
@jwt_required()
@mentor_required
def update_student(student_id):
    """Update a student assigned to the current mentor"""
    try:
        current_user_id = get_jwt_identity()
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        
        if not mentor:
            return jsonify({"message": "Mentor profile not found."}), 404
        
        # Check if student exists and is assigned to this mentor
        student = Student.query.get(student_id)
        if not student:
            return jsonify({"message": "Student not found."}), 404
        
        # Check if student is assigned to this mentor
        assignment = MentorAssignment.query.filter_by(
            mentor_id=mentor.id,
            student_id=student.id
        ).first()
        
        if not assignment:
            return jsonify({"message": "You are not authorized to update this student."}), 403
        
        # Update student with provided data
        data = request.get_json()
        if not data:
            return jsonify({"message": "No data provided."}), 400
        
        # Update fields if provided
        if 'name' in data:
            student.name = data['name']
        if 'registration_number' in data:
            # Check if new registration number already exists
            if data['registration_number'] != student.registration_number:
                existing = Student.query.filter_by(registration_number=data['registration_number']).first()
                if existing and existing.id != student.id:
                    return jsonify({"message": "This registration number is already in use."}), 400
            student.registration_number = data['registration_number']
        if 'batch' in data:
            student.batch = data['batch']
        
        # If email is provided, update the user email
        if 'email' in data:
            user = User.query.get(student.user_id)
            if user and data['email'] != user.email:
                # Check if new email already exists
                existing = User.query.filter_by(email=data['email']).first()
                if existing and existing.id != user.id:
                    return jsonify({"message": "This email is already in use."}), 400
                user.email = data['email']
        
        db.session.commit()
        
        return jsonify({
            "message": "Student updated successfully.",
            "student": {
                "id": student.id,
                "name": student.name,
                "registration_number": student.registration_number,
                "batch": student.batch,
                "email": User.query.get(student.user_id).email
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating student: {str(e)}")
        return jsonify({"message": f"Failed to update student: {str(e)}"}), 500

@bp.route('/students/<int:student_id>', methods=['DELETE'])
@jwt_required()
@mentor_required
def delete_student(student_id):
    """Delete a student assigned to the current mentor"""
    try:
        current_user_id = get_jwt_identity()
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        
        if not mentor:
            return jsonify({"message": "Mentor profile not found."}), 404
        
        # Check if student exists
        student = Student.query.get(student_id)
        if not student:
            return jsonify({"message": "Student not found."}), 404
        
        # Check if student is assigned to this mentor
        assignment = MentorAssignment.query.filter_by(
            mentor_id=mentor.id,
            student_id=student.id
        ).first()
        
        if not assignment:
            return jsonify({"message": "You are not authorized to delete this student."}), 403
        
        # Get the user ID before deleting the student
        user_id = student.user_id
        
        # Delete the mentor assignment
        db.session.delete(assignment)
        
        # Delete the student
        db.session.delete(student)
        
        # Delete the user
        user = User.query.get(user_id)
        if user:
            db.session.delete(user)
        
        db.session.commit()
        
        return jsonify({"message": "Student deleted successfully."}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting student: {str(e)}")
        return jsonify({"message": f"Failed to delete student: {str(e)}"}), 500

@bp.route('/allocations', methods=['GET'])
@jwt_required()
@mentor_required
def get_allocations():
    """This endpoint is now disabled"""
    return jsonify({
        'message': 'This functionality has been disabled. Mentor allocations are now managed by administrators.'
    }), 200

@bp.route('/evaluate/<int:student_user_id>', methods=['POST'])
@jwt_required()
@mentor_required
def evaluate_student(student_user_id):
    """Submit evaluation for a student"""
    try:
        # Get current mentor
        current_user_id = get_jwt_identity()
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        
        # Get the student
        student = Student.query.filter_by(user_id=student_user_id).first()
        if not student:
            return jsonify({'message': 'Student not found'}), 404
        
        # Check if mentor is assigned to this student
        assignment = MentorAssignment.query.filter_by(
            mentor_id=mentor.id, 
            student_id=student.id
        ).first()
        
        if not assignment:
            return jsonify({'message': 'You are not assigned to this student'}), 403
        
        # Get evaluation data from request
        data = request.get_json()
        
        if not data:
            return jsonify({'message': 'No data provided'}), 400
            
        # Required fields
        required_fields = ['type', 'marks', 'feedback']
        for field in required_fields:
            if field not in data:
                return jsonify({'message': f'Missing required field: {field}'}), 400
        
        # Create new evaluation
        new_evaluation = Evaluation(
            student_id=student.id,
            mentor_id=mentor.id,
            evaluation_type=data['type'],
            marks=data['marks'],
            feedback=data['feedback'],
            remarks=data.get('remarks', ''),
            date=datetime.datetime.now()
        )
        
        db.session.add(new_evaluation)
        db.session.commit()
        
        return jsonify({
            'message': 'Evaluation submitted successfully',
            'evaluation_id': new_evaluation.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error evaluating student: {str(e)}")
        return jsonify({'message': f'Failed to submit evaluation: {str(e)}'}), 500

@bp.route('/profile', methods=['GET'])
@jwt_required()
@mentor_required
def get_profile():
    """Get mentor profile information"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get mentor and user information
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        user = User.query.get(current_user_id)
        
        if not mentor or not user:
            return jsonify({'message': 'Mentor profile not found'}), 404
            
        # Get assigned students count
        assigned_students = MentorAssignment.query.filter_by(mentor_id=mentor.id).count()
        
        # Return mentor profile data
        return jsonify({
            'id': mentor.id,
            'name': mentor.name,
            'email': user.email,
            'department': mentor.department,
            'designation': mentor.designation,
            'assigned_students_count': assigned_students
        }), 200
        
    except Exception as e:
        print(f"Error fetching mentor profile: {str(e)}")
        return jsonify({'message': f'Failed to fetch profile: {str(e)}'}), 500

@bp.route('/evaluations/<int:student_id>', methods=['GET'])
@jwt_required()
@mentor_required
def get_student_evaluations(student_id):
    """Get all evaluations for a specific student"""
    try:
        current_user_id = get_jwt_identity()
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        
        # Check if student exists
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'message': 'Student not found'}), 404
            
        # Check if mentor is assigned to this student
        assignment = MentorAssignment.query.filter_by(
            mentor_id=mentor.id, 
            student_id=student.id
        ).first()
        
        if not assignment:
            return jsonify({'message': 'You are not assigned to this student'}), 403
            
        # Get all evaluations for this student by this mentor
        evaluations = Evaluation.query.filter_by(
            student_id=student.id,
            mentor_id=mentor.id
        ).all()
        
        evaluations_data = []
        for evaluation in evaluations:
            evaluations_data.append({
                'id': evaluation.id,
                'type': evaluation.evaluation_type,
                'marks': evaluation.marks,
                'feedback': evaluation.feedback,
                'remarks': evaluation.remarks,
                'date': evaluation.date.strftime('%Y-%m-%d %H:%M:%S') if evaluation.date else None
            })
    
        return jsonify({
            'message': 'Evaluations fetched successfully',
            'evaluations': evaluations_data
        }), 200
        
    except Exception as e:
        print(f"Error fetching evaluations: {str(e)}")
        return jsonify({'message': f'Failed to fetch evaluations: {str(e)}'}), 500

# Add a debug endpoint to find orphaned users
@bp.route('/debug/orphaned-users', methods=['GET'])
# @jwt_required()
def find_orphaned_users():
    """Debug endpoint to find users without corresponding student profiles"""
    try:
        # Get current user ID from token
        # current_user_id = get_jwt_identity()
        # Check if user is a mentor
        # user = User.query.get(current_user_id)
        
        # if not user or user.role != 'mentor':
        #     return jsonify({"message": "Access denied. Mentor role required."}), 403
            
        # mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        # if not mentor:
        #     return jsonify({"message": "Mentor profile not found."}), 404
        
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
@bp.route('/debug/fix-orphaned-user/<int:user_id>', methods=['POST'])
# @jwt_required()
def fix_orphaned_user(user_id):
    """Create a student profile for an orphaned user and assign to the current mentor"""
    try:
        # Get current user ID from token
        # current_user_id = get_jwt_identity()
        # Check if user is a mentor
        # user = User.query.get(current_user_id)
        
        # if not user or user.role != 'mentor':
        #     return jsonify({"message": "Access denied. Mentor role required."}), 403
            
        # mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        # if not mentor:
        #     return jsonify({"message": "Mentor profile not found."}), 404
        
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

@bp.route('/students/<registration_number>/skills', methods=['GET'])
@jwt_required()
@mentor_required
def get_student_skills(registration_number):
    """Get all skills for a student"""
    try:
        current_user_id = get_jwt_identity()
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        
        if not mentor:
            return jsonify({"message": "Mentor profile not found."}), 404
        
        # Check if student is assigned to this mentor
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({"message": "Student not found."}), 404
            
        assignment = MentorAssignment.query.filter_by(
            mentor_id=mentor.id,
            registration_number=registration_number
        ).first()
        
        if not assignment:
            return jsonify({"message": "Student not assigned to this mentor."}), 403
        
        # Get skills
        from models.skill import Skill
        skills = Skill.query.filter_by(student_id=student.id).all()
        
        skills_data = []
        for skill in skills:
            skills_data.append({
                "id": skill.id,
                "name": skill.name,
                "proficiency": skill.proficiency,
                "mentor_approved": skill.mentor_approved
            })
        
        return jsonify({"skills": skills_data}), 200
        
    except Exception as e:
        print(f"Error fetching skills: {str(e)}")
        return jsonify({"message": f"Failed to fetch skills: {str(e)}"}), 500

@bp.route('/students/<registration_number>/skills', methods=['POST'])
@jwt_required()
@mentor_required
def add_student_skill(registration_number):
    """Add a new skill for a student"""
    try:
        current_user_id = get_jwt_identity()
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        
        if not mentor:
            return jsonify({"message": "Mentor profile not found."}), 404
        
        # Check if student is assigned to this mentor
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({"message": "Student not found."}), 404
            
        assignment = MentorAssignment.query.filter_by(
            mentor_id=mentor.id,
            registration_number=registration_number
        ).first()
        
        if not assignment:
            return jsonify({"message": "Student not assigned to this mentor."}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({"message": "No data provided."}), 400
            
        # Validate required fields
        required_fields = ['name', 'proficiency']
        for field in required_fields:
            if field not in data:
                return jsonify({"message": f"Missing required field: {field}"}), 400
        
        # Validate proficiency range (assuming 1-5 scale)
        try:
            proficiency = int(data['proficiency'])
            if proficiency < 1 or proficiency > 5:
                return jsonify({"message": "Proficiency must be between 1 and 5."}), 400
        except (ValueError, TypeError):
            return jsonify({"message": "Proficiency must be a number between 1 and 5."}), 400
        
        # Create skill
        from models.skill import Skill
        
        # Check if skill already exists
        existing_skill = Skill.query.filter_by(
            student_id=student.id,
            name=data['name']
        ).first()
        
        if existing_skill:
            return jsonify({"message": "This skill already exists for the student."}), 400
        
        # Create the skill
        skill = Skill(
            student_id=student.id,
            name=data['name'],
            proficiency=proficiency,
            mentor_approved=True  # Auto approve if added by mentor
        )
        
        db.session.add(skill)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Skill added successfully.",
            "skill": {
                "id": skill.id,
                "name": skill.name,
                "proficiency": skill.proficiency,
                "mentor_approved": skill.mentor_approved
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding skill: {str(e)}")
        return jsonify({"message": f"Failed to add skill: {str(e)}"}), 500

@bp.route('/students/<registration_number>/skills/<skill_id>', methods=['PUT'])
@jwt_required()
@mentor_required
def update_student_skill(registration_number, skill_id):
    """Update a student's skill"""
    try:
        current_user_id = get_jwt_identity()
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        
        if not mentor:
            return jsonify({"message": "Mentor profile not found."}), 404
        
        # Check if student is assigned to this mentor
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({"message": "Student not found."}), 404
            
        assignment = MentorAssignment.query.filter_by(
            mentor_id=mentor.id,
            registration_number=registration_number
        ).first()
        
        if not assignment:
            return jsonify({"message": "Student not assigned to this mentor."}), 403
        
        # Get the skill
        from models.skill import Skill
        skill = Skill.query.filter_by(
            id=skill_id,
            student_id=student.id
        ).first()
        
        if not skill:
            return jsonify({"message": "Skill not found."}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({"message": "No data provided."}), 400
        
        # Update skill fields
        if 'name' in data:
            # Check if the new name already exists for another skill
            if data['name'] != skill.name:
                existing_skill = Skill.query.filter_by(
                    student_id=student.id,
                    name=data['name']
                ).first()
                
                if existing_skill:
                    return jsonify({"message": "Another skill with this name already exists."}), 400
            
            skill.name = data['name']
            
        if 'proficiency' in data:
            try:
                proficiency = int(data['proficiency'])
                if proficiency < 1 or proficiency > 5:
                    return jsonify({"message": "Proficiency must be between 1 and 5."}), 400
                skill.proficiency = proficiency
            except (ValueError, TypeError):
                return jsonify({"message": "Proficiency must be a number between 1 and 5."}), 400
                
        if 'mentor_approved' in data:
            skill.mentor_approved = data['mentor_approved']
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Skill updated successfully.",
            "skill": {
                "id": skill.id,
                "name": skill.name,
                "proficiency": skill.proficiency,
                "mentor_approved": skill.mentor_approved
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating skill: {str(e)}")
        return jsonify({"message": f"Failed to update skill: {str(e)}"}), 500

@bp.route('/students/<registration_number>/skills/<skill_id>', methods=['DELETE'])
@jwt_required()
@mentor_required
def delete_student_skill(registration_number, skill_id):
    """Delete a student's skill"""
    try:
        current_user_id = get_jwt_identity()
        mentor = Mentor.query.filter_by(user_id=current_user_id).first()
        
        if not mentor:
            return jsonify({"message": "Mentor profile not found."}), 404
        
        # Check if student is assigned to this mentor
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({"message": "Student not found."}), 404
            
        assignment = MentorAssignment.query.filter_by(
            mentor_id=mentor.id,
            registration_number=registration_number
        ).first()
        
        if not assignment:
            return jsonify({"message": "Student not assigned to this mentor."}), 403
        
        # Get the skill
        from models.skill import Skill
        skill = Skill.query.filter_by(
            id=skill_id,
            student_id=student.id
        ).first()
        
        if not skill:
            return jsonify({"message": "Skill not found."}), 404
        
        # Delete the skill
        db.session.delete(skill)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Skill deleted successfully."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting skill: {str(e)}")
        return jsonify({"message": f"Failed to delete skill: {str(e)}"}), 500
