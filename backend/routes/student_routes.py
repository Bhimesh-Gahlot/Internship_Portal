from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import get_jwt_identity
from models import (
    User, Student, Mentor, MentorAssignment, Internship, 
    Evaluation, WeeklyReport, MentorFeedback, ProgressTracking,
    Parent, AlumniRelation
)
from extensions import db
from functools import wraps
from utils.access_control import student_required, check_student_access, token_required
import pymysql
from flask_cors import cross_origin
from datetime import datetime

bp = Blueprint('student', __name__, url_prefix='/student')

@bp.route('/profile', methods=['GET'])
@student_required
def get_student_profile():
    try:
        # Get student details
        student = Student.query.filter_by(user_id=g.user.id).first()
        if not student:
            return jsonify({'error': 'Student not found', 'code': 'STUDENT_NOT_FOUND'}), 404
            
        # Get internship using registration_number - this already ensures we only get this student's internship
        internship = Internship.query.filter_by(registration_number=student.registration_number).first()
        
        # Get parent details
        parent = Parent.query.filter_by(registration_number=student.registration_number).first()
        
        # Get alumni relation if exists
        alumni_relation = None
        if student.has_muj_alumni:
            alumni_relation = AlumniRelation.query.filter_by(registration_number=student.registration_number).first()
        
        # Get mentor details
        mentor = None
        if student.mentor_id:
            mentor = Mentor.query.get(student.mentor_id)
        
        # Get latest evaluation
        latest_evaluation = Evaluation.query.filter_by(
            registration_number=student.registration_number
        ).order_by(Evaluation.submitted_at.desc()).first()
        
        # Get latest report
        latest_report = WeeklyReport.query.filter_by(
            registration_number=student.registration_number
        ).order_by(WeeklyReport.created_at.desc()).first()
        
        # Get latest feedback
        latest_feedback = None
        try:
            latest_feedback = MentorFeedback.query.filter_by(
                registration_number=student.registration_number
            ).order_by(MentorFeedback.created_at.desc()).first()
        except Exception as feedback_error:
            print(f"Error fetching mentor feedback: {str(feedback_error)}")
            # Continue without feedback data
        
        # Get progress summary
        progress_entries = ProgressTracking.query.filter_by(
            registration_number=student.registration_number
        ).order_by(ProgressTracking.week.desc()).limit(5).all()
        
        # Calculate overall progress
        overall_progress = 0
        if progress_entries:
            total = len(progress_entries) * 100
            completed = sum(entry.completion_percentage for entry in progress_entries)
            overall_progress = int((completed / total) * 100) if total > 0 else 0
        
        return jsonify({
            'student': {
                'id': student.id,
                'name': student.name,
                'registration_number': student.registration_number,
                'batch': student.batch,
                'department': student.department,
                'email': g.user.email,
                'phone': student.phone,
                'address': student.address,
                'section': student.section,
                'program': student.program,
                'blood_group': student.blood_group,
                'date_of_birth': student.date_of_birth.strftime('%Y-%m-%d') if student.date_of_birth else None,
                'hostel_name': student.hostel_name,
                'hostel_block': student.hostel_block,
                'hostel_room_no': student.hostel_room_no,
                'has_muj_alumni': student.has_muj_alumni
            },
            'parent': parent.to_dict() if parent else None,
            'alumni_relation': alumni_relation.to_dict() if alumni_relation else None,
            'mentor': {
                'id': mentor.id if mentor else None,
                'name': mentor.name if mentor else None,
                'department': mentor.department if mentor else None,
                'email': mentor.user.email if mentor and mentor.user else None,
                'phone': mentor.phone if mentor else None
            } if mentor else None,
            'internship': internship.to_dict() if internship else None,
            'latest_evaluation': latest_evaluation.to_dict() if latest_evaluation else None,
            'latest_report': latest_report.to_dict() if latest_report else None,
            'latest_feedback': latest_feedback.to_dict() if latest_feedback else None,
            'progress': {
                'overall': overall_progress,
                'recent_entries': [entry.to_dict() for entry in progress_entries] if progress_entries else []
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/evaluations', methods=['GET'])
@student_required
def get_evaluations():
    try:
        # Get user ID from token data
        user_id = request.token_data['user_id']
        
        # Get student ID
        student = Student.query.filter_by(user_id=user_id).first()
        if not student:
            return jsonify({'error': 'Student profile not found'}), 404
            
        # Fetch all evaluations for this student
        evaluations = Evaluation.query.filter_by(student_id=student.id).all()
        
        # Format evaluation data
        evaluations_data = []
        for eval in evaluations:
            mentor = Mentor.query.get(eval.mentor_id)
            mentor_user = User.query.get(mentor.user_id) if mentor else None
            
            evaluations_data.append({
                'id': eval.id,
                'type': eval.evaluation_type,
                'marks': eval.marks,
                'feedback': eval.feedback,
                'remarks': eval.remarks,
                'date': eval.date.strftime('%Y-%m-%d %H:%M:%S') if eval.date else None,
                'mentor': {
                    'name': mentor.name if mentor else 'Unknown',
                    'department': mentor.department if mentor else None,
                    'email': mentor_user.email if mentor_user else None
                } if mentor else None
            })
        
        return jsonify({
            'evaluations': evaluations_data
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def student_to_dict(student):
    return {
        'id': student.id,
        'user_id': student.user_id,
        'name': student.name,
        'registration_number': student.registration_number,
        'internship_company': student.internship_company
    }

@bp.route('/progress', methods=['GET', 'OPTIONS'])
@cross_origin(origins="*")
def get_student_progress():
    """Get progress tracking data for the current student"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return jsonify(success=True), 200
    
    try:
        # DEVELOPMENT MODE: Skip token authentication
        # Get a default student for development
        reg_number = request.args.get('registration_number')
        
        if reg_number:
            student = Student.query.filter_by(registration_number=reg_number).first()
        else:
            # Get the first student for development
            student = Student.query.first()
            
        if not student:
            return jsonify({
                "message": "No students found in database for development", 
                "progress_data": []
            }), 200
        
        # Get progress tracking data using SQLAlchemy
        progress_data = ProgressTracking.query.filter_by(
            registration_number=student.registration_number
        ).order_by(ProgressTracking.week.asc()).all()
        
        # Return mock data if no progress data exists
        if not progress_data:
            mock_progress = [
                {
                    "id": 1,
                    "phase": "Phase 1",
                    "week": 1,
                    "completion_percentage": 100,
                    "status": "Completed",
                    "registration_number": student.registration_number
                },
                {
                    "id": 2,
                    "phase": "Phase 2",
                    "week": 2,
                    "completion_percentage": 75,
                    "status": "In Progress",
                    "registration_number": student.registration_number
                },
                {
                    "id": 3,
                    "phase": "Phase 3",
                    "week": 3,
                    "completion_percentage": 25,
                    "status": "In Progress",
                    "registration_number": student.registration_number
                }
            ]
            return jsonify({"progress_data": mock_progress}), 200
        
        return jsonify({
            "progress_data": [progress.to_dict() for progress in progress_data]
        }), 200
        
    except Exception as e:
        print(f"Error getting student progress: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "message": f"Failed to get student progress: {str(e)}",
            "progress_data": []
        }), 500

@bp.route('/weekly-feedback', methods=['GET', 'OPTIONS'])
@cross_origin(origins="*")
def get_weekly_feedback():
    """Get weekly feedback for the current student"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return jsonify(success=True), 200
    
    try:
        # DEVELOPMENT MODE: Skip token authentication
        # Get a default student for development
        reg_number = request.args.get('registration_number')
        
        if reg_number:
            student = Student.query.filter_by(registration_number=reg_number).first()
        else:
            # Get the first student for development
            student = Student.query.first()
            
        if not student:
            return jsonify({
                "message": "No students found in database for development", 
                "weekly_feedback": []
            }), 200
        
        # Get weekly feedback data using SQLAlchemy with join
        try:
            weekly_feedback = db.session.query(
                WeeklyFeedback, Mentor
            ).join(
                Mentor, WeeklyFeedback.mentor_id == Mentor.id
            ).filter(
                WeeklyFeedback.registration_number == student.registration_number
            ).order_by(
                WeeklyFeedback.week.asc()
            ).all()
            
            # Format the response
            feedback_data = []
            for feedback, mentor in weekly_feedback:
                feedback_dict = feedback.to_dict()
                feedback_dict.update({
                    'mentor_name': mentor.name,
                    'mentor_email': mentor.user.email if mentor.user else None
                })
                feedback_data.append(feedback_dict)
                
            # Return mock data if no feedback data exists
            if not feedback_data:
                mock_feedback = [
                    {
                        "id": 1,
                        "week": 1,
                        "feedback": "Good progress on the initial phase. Keep up the good work!",
                        "completion_percentage": 100,
                        "submitted_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        "mentor_name": "Default Mentor",
                        "mentor_email": "mentor@example.com",
                        "registration_number": student.registration_number
                    },
                    {
                        "id": 2,
                        "week": 2,
                        "feedback": "Making steady progress. Need to focus more on documentation.",
                        "completion_percentage": 75,
                        "submitted_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        "mentor_name": "Default Mentor",
                        "mentor_email": "mentor@example.com",
                        "registration_number": student.registration_number
                    }
                ]
                return jsonify({"weekly_feedback": mock_feedback}), 200
                
            return jsonify({"weekly_feedback": feedback_data}), 200
            
        except Exception as inner_e:
            print(f"Error in weekly feedback query: {str(inner_e)}")
            # Return mock data as fallback
            mock_feedback = [
                {
                    "id": 1,
                    "week": 1,
                    "feedback": "Good progress on the initial phase. Keep up the good work!",
                    "completion_percentage": 100,
                    "submitted_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "mentor_name": "Default Mentor",
                    "mentor_email": "mentor@example.com",
                    "registration_number": student.registration_number
                },
                {
                    "id": 2,
                    "week": 2,
                    "feedback": "Making steady progress. Need to focus more on documentation.",
                    "completion_percentage": 75,
                    "submitted_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "mentor_name": "Default Mentor",
                    "mentor_email": "mentor@example.com",
                    "registration_number": student.registration_number
                }
            ]
            return jsonify({"weekly_feedback": mock_feedback}), 200
        
    except Exception as e:
        print(f"Error getting weekly feedback: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "message": f"Failed to get weekly feedback: {str(e)}",
            "weekly_feedback": []
        }), 500

@bp.route('/parent', methods=['GET'])
@student_required
def get_parent_info():
    try:
        # Get student details
        student = Student.query.filter_by(user_id=g.user.id).first()
        if not student:
            return jsonify({'error': 'Student not found', 'code': 'STUDENT_NOT_FOUND'}), 404
            
        # Get parent details
        parent = Parent.query.filter_by(registration_number=student.registration_number).first()
        
        if not parent:
            return jsonify({'error': 'Parent information not found', 'code': 'PARENT_NOT_FOUND'}), 404
            
        return jsonify({'parent': parent.to_dict()})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/parent', methods=['POST'])
@student_required
def add_parent_info():
    try:
        data = request.get_json()
        
        # Get student details
        student = Student.query.filter_by(user_id=g.user.id).first()
        if not student:
            return jsonify({'error': 'Student not found', 'code': 'STUDENT_NOT_FOUND'}), 404
            
        # Check if parent record already exists
        existing_parent = Parent.query.filter_by(registration_number=student.registration_number).first()
        if existing_parent:
            return jsonify({'error': 'Parent information already exists', 'code': 'PARENT_EXISTS'}), 400
            
        # Create new parent record
        new_parent = Parent(
            registration_number=student.registration_number,
            father_name=data.get('father_name'),
            father_is_entrepreneur=data.get('father_is_entrepreneur', False),
            father_is_family_business=data.get('father_is_family_business', False),
            father_is_public_sector=data.get('father_is_public_sector', False),
            father_is_professional=data.get('father_is_professional', False),
            father_is_govt_employee=data.get('father_is_govt_employee', False),
            father_is_private_company=data.get('father_is_private_company', False),
            father_organization=data.get('father_organization'),
            father_designation=data.get('father_designation'),
            father_mobile_no=data.get('father_mobile_no'),
            father_email=data.get('father_email'),
            
            mother_name=data.get('mother_name'),
            mother_is_entrepreneur=data.get('mother_is_entrepreneur', False),
            mother_is_family_business=data.get('mother_is_family_business', False),
            mother_is_public_sector=data.get('mother_is_public_sector', False),
            mother_is_professional=data.get('mother_is_professional', False),
            mother_is_govt_employee=data.get('mother_is_govt_employee', False),
            mother_is_private_company=data.get('mother_is_private_company', False),
            mother_is_home_maker=data.get('mother_is_home_maker', False),
            mother_organization=data.get('mother_organization'),
            mother_designation=data.get('mother_designation'),
            mother_mobile_no=data.get('mother_mobile_no'),
            mother_email=data.get('mother_email'),
            
            business_card_image=data.get('business_card_image'),
            communication_address=data.get('communication_address'),
            permanent_address=data.get('permanent_address'),
            pin_code=data.get('pin_code')
        )
        
        db.session.add(new_parent)
        db.session.commit()
        
        return jsonify({'message': 'Parent information added successfully', 'parent': new_parent.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/parent', methods=['PUT'])
@student_required
def update_parent_info():
    try:
        data = request.get_json()
        
        # Get student details
        student = Student.query.filter_by(user_id=g.user.id).first()
        if not student:
            return jsonify({'error': 'Student not found', 'code': 'STUDENT_NOT_FOUND'}), 404
            
        # Get parent record
        parent = Parent.query.filter_by(registration_number=student.registration_number).first()
        if not parent:
            return jsonify({'error': 'Parent information not found', 'code': 'PARENT_NOT_FOUND'}), 404
            
        # Update parent fields
        if 'father_name' in data:
            parent.father_name = data['father_name']
        if 'father_is_entrepreneur' in data:
            parent.father_is_entrepreneur = data['father_is_entrepreneur']
        if 'father_is_family_business' in data:
            parent.father_is_family_business = data['father_is_family_business']
        if 'father_is_public_sector' in data:
            parent.father_is_public_sector = data['father_is_public_sector']
        if 'father_is_professional' in data:
            parent.father_is_professional = data['father_is_professional']
        if 'father_is_govt_employee' in data:
            parent.father_is_govt_employee = data['father_is_govt_employee']
        if 'father_is_private_company' in data:
            parent.father_is_private_company = data['father_is_private_company']
        if 'father_organization' in data:
            parent.father_organization = data['father_organization']
        if 'father_designation' in data:
            parent.father_designation = data['father_designation']
        if 'father_mobile_no' in data:
            parent.father_mobile_no = data['father_mobile_no']
        if 'father_email' in data:
            parent.father_email = data['father_email']
            
        if 'mother_name' in data:
            parent.mother_name = data['mother_name']
        if 'mother_is_entrepreneur' in data:
            parent.mother_is_entrepreneur = data['mother_is_entrepreneur']
        if 'mother_is_family_business' in data:
            parent.mother_is_family_business = data['mother_is_family_business']
        if 'mother_is_public_sector' in data:
            parent.mother_is_public_sector = data['mother_is_public_sector']
        if 'mother_is_professional' in data:
            parent.mother_is_professional = data['mother_is_professional']
        if 'mother_is_govt_employee' in data:
            parent.mother_is_govt_employee = data['mother_is_govt_employee']
        if 'mother_is_private_company' in data:
            parent.mother_is_private_company = data['mother_is_private_company']
        if 'mother_is_home_maker' in data:
            parent.mother_is_home_maker = data['mother_is_home_maker']
        if 'mother_organization' in data:
            parent.mother_organization = data['mother_organization']
        if 'mother_designation' in data:
            parent.mother_designation = data['mother_designation']
        if 'mother_mobile_no' in data:
            parent.mother_mobile_no = data['mother_mobile_no']
        if 'mother_email' in data:
            parent.mother_email = data['mother_email']
            
        if 'business_card_image' in data:
            parent.business_card_image = data['business_card_image']
        if 'communication_address' in data:
            parent.communication_address = data['communication_address']
        if 'permanent_address' in data:
            parent.permanent_address = data['permanent_address']
        if 'pin_code' in data:
            parent.pin_code = data['pin_code']
        
        db.session.commit()
        
        return jsonify({'message': 'Parent information updated successfully', 'parent': parent.to_dict()})
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/profile', methods=['PUT'])
@student_required
def update_student_profile():
    try:
        data = request.get_json()
        
        # Get student details
        student = Student.query.filter_by(user_id=g.user.id).first()
        if not student:
            return jsonify({'error': 'Student not found', 'code': 'STUDENT_NOT_FOUND'}), 404
            
        # Update student fields
        if 'section' in data:
            student.section = data['section']
        if 'program' in data:
            student.program = data['program']
        if 'blood_group' in data:
            student.blood_group = data['blood_group']
        if 'date_of_birth' in data and data['date_of_birth']:
            student.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d')
        if 'hostel_name' in data:
            student.hostel_name = data['hostel_name']
        if 'hostel_block' in data:
            student.hostel_block = data['hostel_block']
        if 'hostel_room_no' in data:
            student.hostel_room_no = data['hostel_room_no']
        if 'has_muj_alumni' in data:
            student.has_muj_alumni = data['has_muj_alumni']
        if 'phone' in data:
            student.phone = data['phone']
        if 'address' in data:
            student.address = data['address']
            
        db.session.commit()
        
        # Handle alumni relation
        if student.has_muj_alumni and data.get('alumni_relation'):
            alumni_data = data['alumni_relation']
            existing_alumni = AlumniRelation.query.filter_by(registration_number=student.registration_number).first()
            
            if existing_alumni:
                # Update existing alumni relation
                if 'alumni_name' in alumni_data:
                    existing_alumni.alumni_name = alumni_data['alumni_name']
                if 'alumni_registration_number' in alumni_data:
                    existing_alumni.alumni_registration_number = alumni_data['alumni_registration_number']
                if 'alumni_branch' in alumni_data:
                    existing_alumni.alumni_branch = alumni_data['alumni_branch']
                if 'alumni_program' in alumni_data:
                    existing_alumni.alumni_program = alumni_data['alumni_program']
                if 'alumni_batch' in alumni_data:
                    existing_alumni.alumni_batch = alumni_data['alumni_batch']
                if 'relation_with_student' in alumni_data:
                    existing_alumni.relation_with_student = alumni_data['relation_with_student']
            else:
                # Create new alumni relation
                new_alumni = AlumniRelation(
                    registration_number=student.registration_number,
                    alumni_name=alumni_data.get('alumni_name'),
                    alumni_registration_number=alumni_data.get('alumni_registration_number'),
                    alumni_branch=alumni_data.get('alumni_branch'),
                    alumni_program=alumni_data.get('alumni_program'),
                    alumni_batch=alumni_data.get('alumni_batch'),
                    relation_with_student=alumni_data.get('relation_with_student')
                )
                db.session.add(new_alumni)
                
            db.session.commit()
        
        # Delete alumni relation if has_muj_alumni is False
        if not student.has_muj_alumni:
            alumni_relation = AlumniRelation.query.filter_by(registration_number=student.registration_number).first()
            if alumni_relation:
                db.session.delete(alumni_relation)
                db.session.commit()
        
        return jsonify({'message': 'Student profile updated successfully', 'student': student.to_dict()})
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/dev/profile', methods=['GET'])
@cross_origin(origins="*")
def get_dev_student_profile():
    """Development endpoint for student profile - no authentication required"""
    try:
        # Use a specific student by registration number if you want to show Aarav Sharma
        registration_number = request.args.get('registration_number')
        
        if registration_number:
            student = Student.query.filter_by(registration_number=registration_number).first()
        else:
            # Get the first student for development
            student = Student.query.first()
            
        if not student:
            return jsonify({'error': 'No students found in the database'}), 404
            
        # Get user for this student
        user = User.query.get(student.user_id)
        if not user:
            return jsonify({'error': 'Student user not found'}), 404
            
        # Get internship using registration_number - this already ensures we only get this student's internship
        internship = Internship.query.filter_by(registration_number=student.registration_number).first()
        
        # Get parent details
        parent = Parent.query.filter_by(registration_number=student.registration_number).first()
        
        # Get mentor details - IMPORTANT: Prioritize direct mentor_id relationship
        mentor = None
        mentor_user = None
        if student.mentor_id:
            # Direct mentor assignment through mentor_id
            mentor = Mentor.query.get(student.mentor_id)
            if mentor and mentor.user_id:
                mentor_user = User.query.get(mentor.user_id)
        
        # If no direct mentor relationship, check through MentorAssignment table
        if not mentor:
            mentor_assignment = MentorAssignment.query.filter_by(
                registration_number=student.registration_number
            ).first()
            
            if mentor_assignment:
                mentor = Mentor.query.get(mentor_assignment.mentor_id)
                if mentor and mentor.user_id:
                    mentor_user = User.query.get(mentor.user_id)
                    
                    # Also update the student's mentor_id for future reference
                    if not student.mentor_id:
                        student.mentor_id = mentor.id
                        db.session.commit()
            
        response_data = {
            'student': {
                'id': student.id,
                'name': student.name,
                'registration_number': student.registration_number,
                'batch': student.batch,
                'department': student.department,
                'email': user.email if user else None,
                'phone': student.phone,
                'address': student.address,
                'section': student.section,
                'program': student.program,
                'blood_group': student.blood_group,
                'date_of_birth': student.date_of_birth.strftime('%Y-%m-%d') if student.date_of_birth else None,
                'hostel_name': student.hostel_name,
                'hostel_block': student.hostel_block,
                'hostel_room_no': student.hostel_room_no,
                'has_muj_alumni': student.has_muj_alumni
            }
        }
        
        # Only include parent, mentor, and internship if they exist
        if parent:
            response_data['parent'] = parent.to_dict()
            
        if mentor:
            response_data['mentor'] = {
                'id': mentor.id,
                'name': mentor.name,
                'department': mentor.department,
                'email': mentor_user.email if mentor_user else None,
                'phone': mentor.phone
            }
            
        if internship:
            response_data['internship'] = internship.to_dict()
            
        return jsonify(response_data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

# Development endpoint to check and fix student-mentor relationships
@bp.route('/dev/fix-mentor-assignments', methods=['GET'])
@cross_origin(origins="*")
def dev_fix_mentor_assignments():
    """Development endpoint to check and fix student-mentor relationships"""
    try:
        # Get all students
        students = Student.query.all()
        
        # Get all mentors
        mentors = Mentor.query.all()
        
        if not mentors:
            return jsonify({'error': 'No mentors found in the database'}), 404
            
        fixed_assignments = []
        
        # Assign the first mentor to any student without a mentor
        default_mentor = mentors[0]
        
        for student in students:
            # Check if student has a mentor assigned
            if not student.mentor_id:
                # Assign default mentor
                student.mentor_id = default_mentor.id
                fixed_assignments.append({
                    'student_id': student.id,
                    'student_name': student.name,
                    'mentor_id': default_mentor.id,
                    'mentor_name': default_mentor.name,
                    'status': 'fixed'
                })
            else:
                # Check if assigned mentor exists
                mentor = Mentor.query.get(student.mentor_id)
                if mentor:
                    fixed_assignments.append({
                        'student_id': student.id,
                        'student_name': student.name,
                        'mentor_id': mentor.id,
                        'mentor_name': mentor.name,
                        'status': 'already_assigned'
                    })
                else:
                    # Invalid mentor ID, reassign
                    student.mentor_id = default_mentor.id
                    fixed_assignments.append({
                        'student_id': student.id,
                        'student_name': student.name,
                        'mentor_id': default_mentor.id,
                        'mentor_name': default_mentor.name,
                        'status': 'fixed_invalid'
                    })
        
        # Commit changes
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Fixed mentor assignments for {len([a for a in fixed_assignments if a["status"] != "already_assigned"])} students',
            'total_students': len(students),
            'assignments': fixed_assignments
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

# Development endpoint to assign a specific mentor to a student by registration number
@bp.route('/dev/assign-mentor-by-reg', methods=['GET'])
@cross_origin(origins="*")
def dev_assign_mentor_by_reg():
    """Development endpoint to assign a mentor to a student by registration number"""
    try:
        reg_number = request.args.get('reg_number')
        mentor_name = request.args.get('mentor_name')
        
        if not reg_number or not mentor_name:
            return jsonify({'error': 'Missing required parameters: reg_number and mentor_name'}), 400
            
        # Find the student by registration number
        student = Student.query.filter_by(registration_number=reg_number).first()
        if not student:
            return jsonify({'error': f'Student with registration number {reg_number} not found'}), 404
            
        # Find the mentor by name (using LIKE for partial matching)
        mentor = Mentor.query.filter(Mentor.name.like(f'%{mentor_name}%')).first()
        if not mentor:
            return jsonify({'error': f'Mentor with name containing "{mentor_name}" not found'}), 404
            
        # Get old mentor info if any
        old_mentor = None
        if student.mentor_id:
            old_mentor = Mentor.query.get(student.mentor_id)
            
        # Assign the mentor to the student
        old_mentor_id = student.mentor_id
        student.mentor_id = mentor.id
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Mentor {mentor.name} assigned to student {student.name}',
            'previous_mentor': {
                'id': old_mentor.id if old_mentor else None,
                'name': old_mentor.name if old_mentor else None
            } if old_mentor else None,
            'student': {
                'id': student.id,
                'name': student.name,
                'registration_number': student.registration_number
            },
            'mentor': {
                'id': mentor.id,
                'name': mentor.name,
                'department': mentor.department
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/dev/mock-profile', methods=['GET'])
@cross_origin(origins="*")
def get_mock_student_profile():
    """Development mock endpoint that always returns profile data"""
    try:
        # Return hardcoded mock data
        return jsonify({
            'student': {
                'id': 1,
                'name': 'John Doe',
                'registration_number': 'R12345',
                'batch': '2023-24',
                'department': 'Computer Science',
                'email': 'john.doe@example.com',
                'phone': '9876543210',
                'address': 'Student Hostel, Room 101',
                'section': 'A',
                'program': 'B.Tech',
                'blood_group': 'O+',
                'date_of_birth': '2000-01-01',
                'hostel_name': 'North Block',
                'hostel_block': 'A',
                'hostel_room_no': '101',
                'has_muj_alumni': False
            },
            'parent': {
                'father_name': 'James Doe',
                'father_mobile_no': '9876543211',
                'father_email': 'james.doe@example.com',
                'mother_name': 'Jane Doe',
                'mother_mobile_no': '9876543212',
                'mother_email': 'jane.doe@example.com',
                'communication_address': '123 Main Street, New York',
                'pin_code': '123456'
            },
            'mentor': {
                'id': 1,
                'name': 'Dr. Robert Smith',
                'department': 'Computer Science',
                'email': 'robert.smith@example.com',
                'phone': '9876543213'
            },
            'internship': {
                'company_name': 'Tech Solutions Inc.',
                'internship_type': 'in-house',
                'start_date': '2023-05-01',
                'end_date': '2023-07-31',
                'stipend': '10000',
                'location': 'Jaipur',
                'hr_contact': 'HR Manager',
                'hr_email': 'hr@techsolutions.com'
            }
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/dev/parent', methods=['GET'])
@cross_origin(origins="*")
def get_dev_parent_info():
    """Development endpoint for parent information - no authentication required"""
    try:
        # Return hardcoded mock data
        return jsonify({
            'parent': {
                'father_name': 'James Doe',
                'father_mobile_no': '9876543211',
                'father_email': 'james.doe@example.com',
                'father_is_entrepreneur': True,
                'father_is_family_business': False,
                'father_is_public_sector': False,
                'father_is_professional': False,
                'father_is_govt_employee': False,
                'father_is_private_company': False,
                'father_organization': 'Doe Enterprises',
                'father_designation': 'CEO',
                
                'mother_name': 'Jane Doe',
                'mother_mobile_no': '9876543212',
                'mother_email': 'jane.doe@example.com',
                'mother_is_entrepreneur': False,
                'mother_is_family_business': False,
                'mother_is_public_sector': False,
                'mother_is_professional': True,
                'mother_is_govt_employee': False,
                'mother_is_private_company': False,
                'mother_is_home_maker': False,
                'mother_organization': 'City Hospital',
                'mother_designation': 'Doctor',
                
                'communication_address': '123 Main Street, New York',
                'permanent_address': '123 Main Street, New York',
                'pin_code': '123456'
            }
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/profile/<registration_number>', methods=['GET'])
@cross_origin(origins="*")
def get_student_profile_by_reg(registration_number):
    """Get student profile by registration number without authentication (for development)"""
    try:
        # Get student details by registration number
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({'error': f'Student with registration number {registration_number} not found'}), 404
            
        # Get user for this student
        user = User.query.get(student.user_id) if student.user_id else None
            
        # Get internship using registration_number - this already ensures we only get this student's internship
        internship = Internship.query.filter_by(registration_number=student.registration_number).first()
        
        # Get parent details
        parent = Parent.query.filter_by(registration_number=student.registration_number).first()
        
        # Get alumni relation if exists
        alumni_relation = None
        if student.has_muj_alumni:
            alumni_relation = AlumniRelation.query.filter_by(registration_number=student.registration_number).first()
        
        # Get mentor details
        mentor = None
        if student.mentor_id:
            mentor = Mentor.query.get(student.mentor_id)
            mentor_user = User.query.get(mentor.user_id) if mentor and mentor.user_id else None
        
        # Get latest evaluation
        latest_evaluation = Evaluation.query.filter_by(
            registration_number=student.registration_number
        ).order_by(Evaluation.submitted_at.desc()).first()
        
        # Get latest report
        latest_report = WeeklyReport.query.filter_by(
            registration_number=student.registration_number
        ).order_by(WeeklyReport.created_at.desc()).first()
        
        # Get latest feedback
        latest_feedback = None
        try:
            latest_feedback = MentorFeedback.query.filter_by(
                registration_number=student.registration_number
            ).order_by(MentorFeedback.created_at.desc()).first()
        except Exception as feedback_error:
            print(f"Error fetching mentor feedback: {str(feedback_error)}")
            # Continue without feedback data
        
        # Get progress summary
        progress_entries = ProgressTracking.query.filter_by(
            registration_number=student.registration_number
        ).order_by(ProgressTracking.week.desc()).limit(5).all()
        
        # Calculate overall progress
        overall_progress = 0
        if progress_entries:
            total = len(progress_entries) * 100
            completed = sum(entry.completion_percentage for entry in progress_entries)
            overall_progress = int((completed / total) * 100) if total > 0 else 0
        
        response_data = {
            'student': {
                'id': student.id,
                'name': student.name,
                'registration_number': student.registration_number,
                'batch': student.batch,
                'department': student.department,
                'email': user.email if user else None,
                'phone': student.phone,
                'address': student.address,
                'section': student.section,
                'program': student.program,
                'blood_group': student.blood_group,
                'date_of_birth': student.date_of_birth.strftime('%Y-%m-%d') if student.date_of_birth else None,
                'hostel_name': student.hostel_name,
                'hostel_block': student.hostel_block,
                'hostel_room_no': student.hostel_room_no,
                'has_muj_alumni': student.has_muj_alumni
            },
            'parent': parent.to_dict() if parent else None,
            'alumni_relation': alumni_relation.to_dict() if alumni_relation else None,
            'mentor': {
                'id': mentor.id if mentor else None,
                'name': mentor.name if mentor else None,
                'department': mentor.department if mentor else None,
                'email': mentor_user.email if mentor_user and mentor else None,
                'phone': mentor.phone if mentor else None
            } if mentor else None,
            'internship': internship.to_dict() if internship else None,
            'latest_evaluation': latest_evaluation.to_dict() if latest_evaluation else None,
            'latest_report': latest_report.to_dict() if latest_report else None,
            'latest_feedback': latest_feedback.to_dict() if latest_feedback else None,
            'progress': {
                'overall': overall_progress,
                'recent_entries': [entry.to_dict() for entry in progress_entries] if progress_entries else []
            }
        }
        
        return jsonify(response_data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

# Direct access endpoint without authentication - FOR DEVELOPMENT ONLY
@bp.route('/direct-access', methods=['GET', 'OPTIONS'])
@cross_origin(origins="*")
def direct_access_profile():
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return jsonify(success=True), 200
        
    try:
        response_data = {}
        
        # Check if a specific registration number was provided
        registration_number = request.args.get('registration_number')
        
        if registration_number:
            # Get student by registration number
            student = Student.query.filter_by(registration_number=registration_number).first()
            if not student:
                return jsonify({'error': f'Student with registration number {registration_number} not found'}), 404
        else:
            # For development, return the first student in the database
            student = Student.query.first()
            
        if not student:
            # If no students exist yet, return a mock response
            return jsonify({
                'student': {
                    'id': 1,
                    'name': 'Test Student',
                    'registration_number': '21SCSE1010123',
                    'batch': '2021-2025',
                    'department': 'Computer Science',
                    'email': 'test.student@email.com',
                    'phone': '9876543210',
                    'address': 'Test Address',
                    'section': 'A',
                    'program': 'B.Tech',
                    'blood_group': 'O+',
                    'date_of_birth': '2000-01-01',
                    'hostel_name': 'BH-1',
                    'hostel_block': 'A',
                    'hostel_room_no': '101',
                    'has_muj_alumni': False
                },
                'parent': None,
                'alumni_relation': None,
                'mentor': {
                    'id': 1,
                    'name': 'Test Mentor',
                    'department': 'Computer Science',
                    'email': 'test.mentor@email.com',
                    'phone': '9876543211'
                },
                'internship': None,
                'progress': {
                    'overall': 0,
                    'recent_entries': []
                }
            })

        # Add student data to response
        response_data['student'] = {
            'id': student.id,
            'name': student.name,
            'registration_number': student.registration_number,
            'batch': student.batch,
            'department': student.department,
            'email': None,  # Will be populated if user exists
            'phone': student.phone,
            'address': student.address,
            'section': student.section,
            'program': student.program,
            'blood_group': student.blood_group,
            'date_of_birth': student.date_of_birth.strftime('%Y-%m-%d') if student.date_of_birth else None,
            'hostel_name': student.hostel_name,
            'hostel_block': student.hostel_block,
            'hostel_room_no': student.hostel_room_no,
            'has_muj_alumni': student.has_muj_alumni
        }

        # Try to get user data
        try:
            user = User.query.get(student.user_id)
            if user:
                response_data['student']['email'] = user.email
            else:
                response_data['student']['email'] = "development@example.com"
        except Exception as e:
            print(f"Error fetching user data: {str(e)}")
            response_data['student']['email'] = "development@example.com"
            
        # Try to get internship data
        try:
            internship = Internship.query.filter_by(registration_number=student.registration_number).first()
            if internship:
                response_data['internship'] = internship.to_dict()
        except Exception as e:
            print(f"Error fetching internship data: {str(e)}")
            
        # Try to get parent details
        try:
            parent = Parent.query.filter_by(registration_number=student.registration_number).first()
            if parent:
                response_data['parent'] = parent.to_dict()
        except Exception as e:
            print(f"Error fetching parent data: {str(e)}")
            
        # Try to get alumni relation
        try:
            if student.has_muj_alumni:
                alumni_relation = AlumniRelation.query.filter_by(registration_number=student.registration_number).first()
                if alumni_relation:
                    response_data['alumni_relation'] = alumni_relation.to_dict()
        except Exception as e:
            print(f"Error fetching alumni relation data: {str(e)}")
        
        # Try to get mentor details
        try:
            mentor_data = None
            
            # First try to get mentor from student.mentor_id
            if student.mentor_id:
                mentor = Mentor.query.get(student.mentor_id)
                if mentor:
                    mentor_data = {
                        'id': mentor.id,
                        'name': mentor.name,
                        'department': mentor.department,
                        'email': None,
                        'phone': mentor.phone
                    }
                    
                    # Try to get mentor's user information
                    try:
                        if mentor.user_id:
                            mentor_user = User.query.get(mentor.user_id)
                            if mentor_user:
                                mentor_data['email'] = mentor_user.email
                    except Exception as e:
                        print(f"Error fetching mentor user data: {str(e)}")
            else:
                # If no mentor_id in student record, check MentorAssignment table
                mentor_assignment = MentorAssignment.query.filter_by(
                    registration_number=student.registration_number
                ).first()
                
                if mentor_assignment:
                    mentor = Mentor.query.get(mentor_assignment.mentor_id)
                    if mentor:
                        mentor_data = {
                            'id': mentor.id,
                            'name': mentor.name,
                            'department': mentor.department,
                            'email': None,
                            'phone': mentor.phone
                        }
                        
                        # Also update the student's mentor_id for future reference
                        student.mentor_id = mentor.id
                        db.session.commit()
                        
                        # Try to get mentor's user information
                        try:
                            if mentor.user_id:
                                mentor_user = User.query.get(mentor.user_id)
                                if mentor_user:
                                    mentor_data['email'] = mentor_user.email
                        except Exception as e:
                            print(f"Error fetching mentor user data: {str(e)}")
                
            if mentor_data:
                response_data['mentor'] = mentor_data
            
        except Exception as e:
            print(f"Error fetching mentor data: {str(e)}")
        
        # Initialize progress data
        response_data['progress'] = {
            'overall': 0,
            'recent_entries': []
        }
        
        # Try to get latest evaluation
        try:
            latest_evaluation = Evaluation.query.filter_by(
                registration_number=student.registration_number
            ).order_by(Evaluation.submitted_at.desc()).first()
            
            if latest_evaluation:
                # Only access fields that actually exist in the database
                response_data['latest_evaluation'] = latest_evaluation.to_dict()
        except Exception as e:
            print(f"Error fetching evaluation data: {str(e)}")
        
        # Try to get latest report
        try:
            latest_report = WeeklyReport.query.filter_by(
                registration_number=student.registration_number
            ).order_by(WeeklyReport.created_at.desc()).first()
            
            if latest_report:
                response_data['latest_report'] = latest_report.to_dict()
        except Exception as e:
            print(f"Error fetching report data: {str(e)}")
            
        # Try to get latest feedback
        try:
            latest_feedback = MentorFeedback.query.filter_by(
                registration_number=student.registration_number
            ).order_by(MentorFeedback.created_at.desc()).first()
            
            if latest_feedback:
                response_data['latest_feedback'] = latest_feedback.to_dict()
        except Exception as e:
            print(f"Error fetching feedback data: {str(e)}")
            
        # Try to get progress data
        try:
            progress_entries = ProgressTracking.query.filter_by(
                registration_number=student.registration_number
            ).order_by(ProgressTracking.week.desc()).limit(5).all()
            
            if progress_entries:
                # Calculate overall progress
                total = len(progress_entries) * 100
                completed = sum(entry.completion_percentage for entry in progress_entries)
                overall_progress = int((completed / total) * 100) if total > 0 else 0
                
                response_data['progress'] = {
                    'overall': overall_progress,
                    'recent_entries': [entry.to_dict() for entry in progress_entries]
                }
        except Exception as e:
            print(f"Error fetching progress data: {str(e)}")
        
        return jsonify(response_data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e), 
            'message': 'An error occurred while fetching profile data. Using direct access mode.'
        }), 500 

@bp.route('/test-student/<registration_number>', methods=['GET'])
@cross_origin(origins="*")
def test_student_by_reg(registration_number):
    """Test endpoint to get a specific student's data by registration number"""
    try:
        # Get student details by registration number
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({'error': f'Student with registration number {registration_number} not found'}), 404
            
        # Create a simplified response with just the essential student info
        response_data = {
            'student': {
                'id': student.id,
                'name': student.name,
                'registration_number': student.registration_number,
                'batch': student.batch,
                'department': student.department
            }
        }
        
        # Get user for this student
        try:
            user = User.query.get(student.user_id)
            if user:
                response_data['student']['email'] = user.email
        except Exception as e:
            print(f"Error fetching user data: {str(e)}")
            
        return jsonify(response_data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500 

@bp.route('/list-students', methods=['GET'])
@cross_origin(origins="*")
def list_all_students():
    """List all students with basic information for debugging purposes"""
    try:
        # Query all students with basic info
        students = Student.query.all()
        
        # Format response
        student_list = []
        for student in students:
            # Try to get user email
            email = None
            try:
                if student.user_id:
                    user = User.query.get(student.user_id)
                    if user:
                        email = user.email
            except Exception as e:
                print(f"Error getting user email: {str(e)}")
            
            student_list.append({
                'id': student.id,
                'name': student.name,
                'registration_number': student.registration_number,
                'batch': student.batch,
                'department': student.department,
                'email': email
            })
        
        return jsonify({
            'message': f'Found {len(student_list)} students',
            'students': student_list
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500 