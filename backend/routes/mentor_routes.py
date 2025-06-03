from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import get_jwt_identity
from functools import wraps
from models.user import User
from models.student import Student
from models.mentor import Mentor
from models.internship import Internship
from models.mentor_assignment import MentorAssignment
from models.evaluation import Evaluation
from models.parent import Parent
from extensions import db
from utils.access_control import mentor_required, token_required
from flask_cors import cross_origin
import datetime
import pymysql
import sys

bp = Blueprint('mentor', __name__, url_prefix='/mentor')

@bp.route('/dashboard', methods=['GET'])
@token_required
@cross_origin(origins="*")
def mentor_dashboard():
    # Get user ID from token data
    user_id = request.token_data['user_id']
    role = request.token_data['role']
    
    # Check if user has mentor role
    if role != 'mentor':
        return jsonify({'error': 'Mentor access required'}), 403
    
    # Find mentor profile
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT * FROM mentors WHERE user_id = %s", (user_id,))
        mentor = cursor.fetchone()
        
        if not mentor:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Mentor profile not found'}), 404
        
        # Get email from User model
        cursor.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'mentor': {
                'id': mentor['id'],
                'user_id': user_id,
                'name': mentor['name'],
                'email': user['email'] if user else None,
                'department': mentor['department']
            }
        }), 200
    
    except Exception as e:
        print(f"Error in mentor dashboard: {str(e)}")
        return jsonify({'error': f'Failed to fetch mentor dashboard: {str(e)}'}), 500

@bp.route('/students', methods=['GET'])
@mentor_required
def get_assigned_students():
    try:
        mentor = Mentor.query.filter_by(user_id=g.user.id).first()
        if not mentor:
            return jsonify({'error': 'Mentor not found'}), 404

        # Get all students assigned to this mentor
        students = Student.query.filter_by(mentor_id=mentor.id).all()
        
        students_data = []
        for student in students:
            # Get internship details if available
            internship = Internship.query.filter_by(registration_number=student.registration_number).first()
            
            # Get latest progress
            latest_progress = Progress.query.filter_by(
                registration_number=student.registration_number
            ).order_by(Progress.updated_at.desc()).first()
            
            # Calculate overall progress
            progress_entries = Progress.query.filter_by(
                registration_number=student.registration_number
            ).all()
            
            overall_progress = 0
            if progress_entries:
                total = len(progress_entries) * 100
                completed = sum(entry.completion_percentage for entry in progress_entries)
                overall_progress = int((completed / total) * 100) if total > 0 else 0
            
            # Get latest evaluation
            latest_evaluation = Evaluation.query.filter_by(
                registration_number=student.registration_number,
                mentor_id=mentor.id
            ).order_by(Evaluation.submitted_at.desc()).first()
            
            students_data.append({
                'id': student.id,
                'name': student.name,
                'registration_number': student.registration_number,
                'batch': student.batch,
                'department': student.department,
                'internship': {
                    'company': internship.company_name if internship else None,
                    'type': internship.internship_type if internship else None,
                    'approved': internship.mentor_approval if internship else False
                } if internship else None,
                'progress': {
                    'overall': overall_progress,
                    'latest': latest_progress.to_dict() if latest_progress else None
                },
                'evaluation': latest_evaluation.to_dict() if latest_evaluation else None
            })
            
        return jsonify(students_data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/student/<registration_number>', methods=['GET'])
@mentor_required
def get_student_detail(registration_number):
    try:
        mentor = Mentor.query.filter_by(user_id=g.user.id).first()
        if not mentor:
            return jsonify({'error': 'Mentor not found'}), 404
            
        # Get student details
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        # Check if this mentor is assigned to the student
        if student.mentor_id != mentor.id:
            return jsonify({'error': 'You are not assigned as a mentor to this student'}), 403
            
        # Get internship details
        internship = Internship.query.filter_by(registration_number=registration_number).first()
        
        # Get all evaluations
        evaluations = Evaluation.query.filter_by(
            registration_number=registration_number,
            mentor_id=mentor.id
        ).order_by(Evaluation.submitted_at.desc()).all()
        
        # Get all weekly reports
        weekly_reports = WeeklyReport.query.filter_by(
            registration_number=registration_number
        ).order_by(WeeklyReport.week_number.desc()).all()
        
        # Get all feedback
        feedback = MentorFeedback.query.filter_by(
            registration_number=registration_number,
            mentor_id=mentor.id
        ).order_by(MentorFeedback.created_at.desc()).all()
        
        # Get progress data
        progress_entries = Progress.query.filter_by(
            registration_number=registration_number
        ).order_by(Progress.week.desc()).all()
        
        # Calculate overall progress
        overall_progress = 0
        if progress_entries:
            total = len(progress_entries) * 100
            completed = sum(entry.completion_percentage for entry in progress_entries)
            overall_progress = int((completed / total) * 100) if total > 0 else 0
            
        user = User.query.get(student.user_id)
        
        student_data = {
            'id': student.id,
            'name': student.name,
            'registration_number': student.registration_number,
            'batch': student.batch,
            'department': student.department,
            'email': user.email if user else None,
            'phone': student.phone,
            'address': student.address,
            'internship': internship.to_dict() if internship else None,
            'evaluations': [eval.to_dict() for eval in evaluations],
            'weekly_reports': [report.to_dict() for report in weekly_reports],
            'feedback': [f.to_dict() for f in feedback],
            'progress': {
                'overall': overall_progress,
                'entries': [entry.to_dict() for entry in progress_entries]
            }
        }
            
        return jsonify(student_data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/feedback/submit', methods=['POST'])
@mentor_required
def submit_feedback():
    try:
        mentor = Mentor.query.filter_by(user_id=g.user.id).first()
        if not mentor:
            return jsonify({'error': 'Mentor not found'}), 404
            
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['registration_number', 'feedback_text', 'rating', 'title']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields', 'required': required_fields}), 400
            
        # Check rating range
        rating = int(data['rating'])
        if rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
            
        # Get student details
        student = Student.query.filter_by(registration_number=data['registration_number']).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        # Check if this mentor is assigned to the student
        if student.mentor_id != mentor.id:
            return jsonify({'error': 'You are not assigned as a mentor to this student'}), 403
            
        # Create feedback
        feedback = MentorFeedback(
            mentor_id=mentor.id,
            registration_number=data['registration_number'],
            title=data['title'],
            feedback_text=data['feedback_text'],
            rating=rating,
            category=data.get('category'),
            improvement_areas=data.get('improvement_areas'),
            strengths=data.get('strengths')
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        return jsonify({
            'message': 'Feedback submitted successfully',
            'feedback': feedback.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/evaluation/submit', methods=['POST'])
@mentor_required
def submit_evaluation():
    try:
        mentor = Mentor.query.filter_by(user_id=g.user.id).first()
        if not mentor:
            return jsonify({'error': 'Mentor not found'}), 404
            
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['registration_number', 'evaluation_type', 'marks']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields', 'required': required_fields}), 400
            
        # Get student details
        student = Student.query.filter_by(registration_number=data['registration_number']).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        # Check if this mentor is assigned to the student
        if student.mentor_id != mentor.id:
            return jsonify({'error': 'You are not assigned as a mentor to this student'}), 403
            
        # Create evaluation
        evaluation = Evaluation(
            mentor_id=mentor.id,
            registration_number=data['registration_number'],
            evaluation_type=data['evaluation_type'],
            marks=float(data['marks']),
            feedback=data.get('feedback'),
            remarks=data.get('remarks')
        )
        
        db.session.add(evaluation)
        db.session.commit()
        
        return jsonify({
            'message': 'Evaluation submitted successfully',
            'evaluation': evaluation.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/progress/update', methods=['POST'])
@mentor_required
def update_progress():
    try:
        mentor = Mentor.query.filter_by(user_id=g.user.id).first()
        if not mentor:
            return jsonify({'error': 'Mentor not found'}), 404
            
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['registration_number', 'phase', 'week', 'completion_percentage', 'status']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields', 'required': required_fields}), 400
            
        # Get student details
        student = Student.query.filter_by(registration_number=data['registration_number']).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        # Check if this mentor is assigned to the student
        if student.mentor_id != mentor.id:
            return jsonify({'error': 'You are not assigned as a mentor to this student'}), 403
            
        # Check if progress entry exists
        progress = Progress.query.filter_by(
            registration_number=data['registration_number'],
            phase=data['phase'],
            week=int(data['week'])
        ).first()
        
        if progress:
            # Update existing progress
            progress.completion_percentage = int(data['completion_percentage'])
            progress.status = data['status']
        else:
            # Create new progress entry
            progress = Progress(
                registration_number=data['registration_number'],
                phase=data['phase'],
                week=int(data['week']),
                completion_percentage=int(data['completion_percentage']),
                status=data['status']
            )
            db.session.add(progress)
            
        db.session.commit()
        
        return jsonify({
            'message': 'Progress updated successfully',
            'progress': progress.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/student/<registration_number>/reports', methods=['GET'])
@token_required
@cross_origin(origins="*")
def get_student_reports(registration_number):
    """Get all reports submitted by a specific student"""
    try:
        user_id = request.token_data['user_id']
        role = request.token_data['role']
        
        # Check if user has mentor role
        if role != 'mentor':
            return jsonify({'error': 'Mentor access required'}), 403
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Find mentor profile
        cursor.execute("SELECT * FROM mentors WHERE user_id = %s", (user_id,))
        mentor = cursor.fetchone()
        
        if not mentor:
            cursor.close()
            conn.close()
            return jsonify({"message": "Mentor profile not found."}), 404
        
        # Check if this student is assigned to this mentor
        cursor.execute("""
            SELECT * FROM mentor_assignments 
            WHERE mentor_id = %s AND registration_number = %s
        """, (mentor['id'], registration_number))
        
        assignment = cursor.fetchone()
        if not assignment:
            cursor.close()
            conn.close()
            return jsonify({"message": "This student is not assigned to you."}), 403
        
        # Get all reports for this student
        cursor.execute("""
            SELECT * FROM reports
            WHERE student_id = %s
            ORDER BY submission_date DESC
        """, (registration_number,))
        
        reports = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({"reports": reports}), 200
        
    except Exception as e:
        print(f"Error getting student reports: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Failed to get student reports: {str(e)}"}), 500

@bp.route('/evaluations/<registration_number>', methods=['GET'])
@token_required
@cross_origin(origins="*")
def get_student_evaluations(registration_number):
    """Get all evaluations for a specific student"""
    try:
        user_id = request.token_data['user_id']
        role = request.token_data['role']
        
        # Check if user has mentor role
        if role != 'mentor':
            return jsonify({'error': 'Mentor access required'}), 403
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Find mentor profile
        cursor.execute("SELECT * FROM mentors WHERE user_id = %s", (user_id,))
        mentor = cursor.fetchone()
        
        if not mentor:
            cursor.close()
            conn.close()
            return jsonify({"message": "Mentor profile not found."}), 404
        
        # Check if this student is assigned to this mentor
        cursor.execute("""
            SELECT * FROM mentor_assignments 
            WHERE mentor_id = %s AND registration_number = %s
        """, (mentor['id'], registration_number))
        
        assignment = cursor.fetchone()
        if not assignment:
            cursor.close()
            conn.close()
            return jsonify({"message": "You are not authorized to view this student's evaluations."}), 403
        
        # Get all evaluations for this student
        cursor.execute("""
            SELECT * FROM evaluations
            WHERE registration_number = %s AND mentor_id = %s
            ORDER BY submitted_at DESC
        """, (registration_number, mentor['id']))
        
        evaluations = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({"evaluations": evaluations}), 200
        
    except Exception as e:
        print(f"Error getting student evaluations: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Failed to get student evaluations: {str(e)}"}), 500

@bp.route('/evaluate/<registration_number>', methods=['POST'])
@token_required
@cross_origin(origins="*")
def evaluate_student(registration_number):
    """Create a new evaluation for a student"""
    try:
        user_id = request.token_data['user_id']
        role = request.token_data['role']
        
        # Check if user has mentor role
        if role != 'mentor':
            return jsonify({'error': 'Mentor access required'}), 403
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        # Validate required fields
        required_fields = ['evaluation_type', 'marks']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
                
        # Connect to database
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Find mentor profile
        cursor.execute("SELECT * FROM mentors WHERE user_id = %s", (user_id,))
        mentor = cursor.fetchone()
        
        if not mentor:
            cursor.close()
            conn.close()
            return jsonify({"message": "Mentor profile not found."}), 404
            
        # Find student
        cursor.execute("SELECT * FROM students WHERE registration_number = %s", (registration_number,))
        student = cursor.fetchone()
        
        if not student:
            cursor.close()
            conn.close()
            return jsonify({"message": "Student not found."}), 404
            
        # Check if student is assigned to this mentor
        cursor.execute("""
            SELECT * FROM mentor_assignments 
            WHERE mentor_id = %s AND registration_number = %s
        """, (mentor['id'], registration_number))
        
        assignment = cursor.fetchone()
        if not assignment:
            cursor.close()
            conn.close()
            return jsonify({"message": "This student is not assigned to you."}), 403
            
        # Validate marks
        try:
            marks = float(data['marks'])
            if marks < 0 or marks > 100:
                return jsonify({'error': 'Marks must be between 0 and 100'}), 400
        except ValueError:
            return jsonify({'error': 'Marks must be a number'}), 400
            
        # Insert evaluation
        eval_data = {
            'registration_number': registration_number,
            'mentor_id': mentor['id'],
            'evaluation_type': data['evaluation_type'],
            'marks': marks,
            'feedback': data.get('feedback', ''),
            'remarks': data.get('remarks', ''),
            'submitted_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Create evaluation
        cursor.execute("""
            INSERT INTO evaluations
            (registration_number, mentor_id, evaluation_type, marks, feedback, remarks, submitted_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            eval_data['registration_number'],
            eval_data['mentor_id'],
            eval_data['evaluation_type'],
            eval_data['marks'],
            eval_data['feedback'],
            eval_data['remarks'],
            eval_data['submitted_at']
        ))
        
        evaluation_id = cursor.lastrowid
        
        # If this is a report evaluation, update the report
        if 'report_id' in data and data['report_id']:
            cursor.execute("""
                UPDATE reports
                SET marks = %s, remarks = %s
                WHERE id = %s AND student_id = %s
            """, (
                eval_data['marks'],
                eval_data['remarks'],
                data['report_id'],
                student['id']
            ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": "Evaluation submitted successfully",
            "evaluation_id": evaluation_id
        }), 200
        
    except Exception as e:
        print(f"Error evaluating student: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Failed to submit evaluation: {str(e)}"}), 500

@bp.route('/student/<registration_number>/weekly-feedback', methods=['GET'])
@token_required
@cross_origin(origins="*")
def get_weekly_feedback(registration_number):
    """Get all weekly feedback for a specific student"""
    try:
        user_id = request.token_data['user_id']
        role = request.token_data['role']
        
        # Check if user has mentor role
        if role != 'mentor':
            return jsonify({'error': 'Mentor access required'}), 403
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Find mentor profile
        cursor.execute("SELECT * FROM mentors WHERE user_id = %s", (user_id,))
        mentor = cursor.fetchone()
        
        if not mentor:
            cursor.close()
            conn.close()
            return jsonify({"message": "Mentor profile not found."}), 404
        
        # Check if this student is assigned to this mentor
        cursor.execute("""
            SELECT * FROM mentor_assignments 
            WHERE mentor_id = %s AND registration_number = %s
        """, (mentor['id'], registration_number))
        
        assignment = cursor.fetchone()
        if not assignment:
            cursor.close()
            conn.close()
            return jsonify({"message": "This student is not assigned to you."}), 403
        
        # Get all weekly feedback for this student
        cursor.execute("""
            SELECT * FROM weekly_feedback
            WHERE registration_number = %s AND mentor_id = %s
            ORDER BY week DESC
        """, (registration_number, mentor['id']))
        
        feedback = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({"feedback": feedback}), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Failed to get weekly feedback: {str(e)}"}), 500

@bp.route('/student/<registration_number>/progress', methods=['GET'])
@cross_origin(origins="*")
def get_student_progress_data(registration_number):
    """Get progress data for a specific student with detailed info - no auth required for development"""
    try:
        print(f"Fetching progress data for student: {registration_number}")
        
        # Get student details
        student = Student.query.filter_by(registration_number=registration_number).first()
        
        if not student:
            print(f"Student not found: {registration_number}")
            return jsonify({'error': 'Student not found'}), 404
            
        # Get internship details
        internship = Internship.query.filter_by(registration_number=registration_number).first()
        
        # Get progress data
        progress_entries = Progress.query.filter_by(
            registration_number=registration_number
        ).order_by(Progress.week.desc()).all()
        
        # Calculate overall progress
        overall_progress = 0
        if progress_entries:
            total = len(progress_entries) * 100
            completed = sum(entry.completion_percentage for entry in progress_entries)
            overall_progress = int((completed / total) * 100) if total > 0 else 0
        
        # Build response with all necessary data
        response_data = {
            'student': {
                'id': student.id,
                'name': student.name,
                'registration_number': student.registration_number
            },
            'internship': internship.to_dict() if internship else None,
            'progress': {
                'overall': overall_progress,
                'entries': [entry.to_dict() for entry in progress_entries]
            }
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Error fetching progress data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@bp.route('/student/<registration_number>/progress', methods=['POST'])
@token_required
@cross_origin(origins="*")
def update_student_progress(registration_number):
    """Update progress for a specific student"""
    try:
        user_id = request.token_data['user_id']
        role = request.token_data['role']
        
        # Check if user has mentor role
        if role != 'mentor':
            return jsonify({'error': 'Mentor access required'}), 403
            
        data = request.get_json()
        if not data:
            return jsonify({"message": "No progress data provided"}), 400
            
        # Check required fields
        required_fields = ['phase', 'week', 'completion_percentage', 'status']
        for field in required_fields:
            if field not in data:
                return jsonify({"message": f"Missing required field: {field}"}), 400
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Find mentor profile
        cursor.execute("SELECT * FROM mentors WHERE user_id = %s", (user_id,))
        mentor = cursor.fetchone()
        
        if not mentor:
            cursor.close()
            conn.close()
            return jsonify({"message": "Mentor profile not found."}), 404
            
        # Find student
        cursor.execute("SELECT * FROM students WHERE registration_number = %s", (registration_number,))
        student = cursor.fetchone()
        
        if not student:
            cursor.close()
            conn.close()
            return jsonify({"message": "Student not found."}), 404
            
        # Check if student is assigned to this mentor
        cursor.execute("""
            SELECT * FROM mentor_assignments 
            WHERE mentor_id = %s AND registration_number = %s
        """, (mentor['id'], registration_number))
        
        assignment = cursor.fetchone()
        if not assignment:
            cursor.close()
            conn.close()
            return jsonify({"message": "This student is not assigned to you."}), 403
            
        # Validate completion percentage
        try:
            completion = int(data['completion_percentage'])
            if completion < 0 or completion > 100:
                return jsonify({"message": "Completion percentage must be between 0 and 100"}), 400
        except ValueError:
            return jsonify({"message": "Completion percentage must be a number"}), 400
            
        # Check if there's an existing progress entry for this phase and week
        cursor.execute("""
            SELECT * FROM progress
            WHERE registration_number = %s AND phase = %s AND week = %s
        """, (registration_number, data['phase'], data['week']))
        
        existing_progress = cursor.fetchone()
        
        if existing_progress:
            # Update existing progress entry
            cursor.execute("""
                UPDATE progress
                SET completion_percentage = %s, status = %s, updated_at = NOW()
                WHERE id = %s
            """, (
                completion,
                data['status'],
                existing_progress['id']
            ))
            
            progress_id = existing_progress['id']
            message = "Progress updated successfully"
        else:
            # Create new progress entry
            cursor.execute("""
                INSERT INTO progress
                    (registration_number, phase, week, completion_percentage, status, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            """, (
                registration_number,
                data['phase'],
                data['week'],
                completion,
                data['status']
            ))
            
            progress_id = cursor.lastrowid
            message = "Progress created successfully"
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": message,
            "progress_id": progress_id
        }), 200
        
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Failed to update progress: {str(e)}"}), 500

@bp.route('/feedback/<registration_number>', methods=['POST'])
@token_required
@cross_origin(origins="*")
def submit_weekly_feedback(registration_number):
    """Submit weekly feedback for a student"""
    try:
        user_id = request.token_data['user_id']
        role = request.token_data['role']
        
        # Check if user has mentor role
        if role != 'mentor':
            return jsonify({'error': 'Mentor access required'}), 403
            
        data = request.get_json()
        if not data:
            return jsonify({"message": "No feedback data provided"}), 400
            
        # Check required fields
        required_fields = ['week', 'performance_rating', 'feedback']
        for field in required_fields:
            if field not in data:
                return jsonify({"message": f"Missing required field: {field}"}), 400
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Find mentor profile
        cursor.execute("SELECT * FROM mentors WHERE user_id = %s", (user_id,))
        mentor = cursor.fetchone()
        
        if not mentor:
            cursor.close()
            conn.close()
            return jsonify({"message": "Mentor profile not found."}), 404
            
        # Find student
        cursor.execute("SELECT * FROM students WHERE registration_number = %s", (registration_number,))
        student = cursor.fetchone()
        
        if not student:
            cursor.close()
            conn.close()
            return jsonify({"message": "Student not found."}), 404
            
        # Check if student is assigned to this mentor
        cursor.execute("""
            SELECT * FROM mentor_assignments 
            WHERE mentor_id = %s AND registration_number = %s
        """, (mentor['id'], registration_number))
        
        assignment = cursor.fetchone()
        if not assignment:
            cursor.close()
            conn.close()
            return jsonify({"message": "This student is not assigned to you."}), 403
            
        # Validate performance rating
        try:
            rating = int(data['performance_rating'])
            if rating < 1 or rating > 5:
                return jsonify({"message": "Performance rating must be between 1 and 5"}), 400
        except ValueError:
            return jsonify({"message": "Performance rating must be a number"}), 400
            
        # Check if there's already feedback for this week
        cursor.execute("""
            SELECT * FROM weekly_feedback
            WHERE registration_number = %s AND mentor_id = %s AND week = %s
        """, (registration_number, mentor['id'], data['week']))
        
        existing_feedback = cursor.fetchone()
        
        # Get completion percentage if provided
        completion_percentage = data.get('completion_percentage', 0)
        
        if existing_feedback:
            # Update existing feedback
            cursor.execute("""
                UPDATE weekly_feedback
                SET performance_rating = %s, feedback = %s, areas_of_improvement = %s, 
                    strengths = %s, completion_percentage = %s, updated_at = NOW()
                WHERE id = %s
            """, (
                rating,
                data['feedback'],
                data.get('areas_of_improvement', ''),
                data.get('strengths', ''),
                completion_percentage,
                existing_feedback['id']
            ))
            
            feedback_id = existing_feedback['id']
            message = "Weekly feedback updated successfully"
        else:
            # Create new feedback
            cursor.execute("""
                INSERT INTO weekly_feedback
                    (registration_number, mentor_id, week, performance_rating, feedback, 
                     areas_of_improvement, strengths, completion_percentage, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (
                registration_number,
                mentor['id'],
                data['week'],
                rating,
                data['feedback'],
                data.get('areas_of_improvement', ''),
                data.get('strengths', ''),
                completion_percentage
            ))
            
            feedback_id = cursor.lastrowid
            message = "Weekly feedback submitted successfully"
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": message,
            "feedback_id": feedback_id
        }), 200
        
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Failed to submit weekly feedback: {str(e)}"}), 500

# Development endpoint for mentor students - No authentication required
@bp.route('/dev/students', methods=['GET'])
@cross_origin(origins="*")
def get_dev_assigned_students():
    try:
        # For development, just return all students without authentication
        students = Student.query.limit(10).all()  # Get first 10 students
        
        students_data = []
        for student in students:
            # Simplified response for development
            students_data.append({
                'id': student.id,
                'user_id': student.user_id,
                'name': student.name,
                'email': 'dev@example.com',  # Placeholder email
                'registration_number': student.registration_number,
                'batch': student.batch,
                'status': 'active',
                'progress': 50  # Default progress value
            })
            
        return jsonify(students_data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/dev/assignments', methods=['GET'])
@cross_origin(origins="*")
def get_dev_mentor_assignments():
    """Development endpoint for mentor assignments - no authentication required"""
    try:
        # Get all mentor assignments
        all_mentors = Mentor.query.all()
        
        result = []
        for mentor in all_mentors:
            # Get mentor user for email
            mentor_user = User.query.get(mentor.user_id) if mentor.user_id else None
            
            # Get students assigned to this mentor
            students = Student.query.filter_by(mentor_id=mentor.id).all()
            
            student_data = []
            for student in students:
                student_user = User.query.get(student.user_id) if student.user_id else None
                student_data.append({
                    'id': student.id,
                    'name': student.name,
                    'registration_number': student.registration_number,
                    'email': student_user.email if student_user else None
                })
            
            result.append({
                'mentor': {
                    'id': mentor.id,
                    'name': mentor.name,
                    'department': mentor.department,
                    'email': mentor_user.email if mentor_user else None
                },
                'students': student_data,
                'student_count': len(student_data)
            })
            
        return jsonify(result), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/dev/assign-mentor', methods=['POST'])
@cross_origin(origins="*")
def dev_assign_mentor():
    """Development endpoint to assign a mentor to a student - no authentication required"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or 'mentor_id' not in data or 'student_id' not in data:
            return jsonify({'error': 'Missing required fields: mentor_id and student_id'}), 400
            
        mentor_id = data['mentor_id']
        student_id = data['student_id']
        
        # Check if mentor exists
        mentor = Mentor.query.get(mentor_id)
        if not mentor:
            return jsonify({'error': f'Mentor with id {mentor_id} not found'}), 404
            
        # Check if student exists
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'error': f'Student with id {student_id} not found'}), 404
            
        # Assign mentor to student
        student.mentor_id = mentor_id
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Mentor {mentor.name} assigned to student {student.name}',
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

@bp.route('/student/<registration_number>/internship', methods=['GET'])
@token_required
@cross_origin(origins="*")
def get_student_internship(registration_number):
    try:
        # Get mentor from token
        user_id = request.token_data['user_id']
        role = request.token_data['role']
        
        # Check if user has mentor role
        if role != 'mentor':
            return jsonify({'error': 'Mentor access required'}), 403
        
        # Get mentor profile
        mentor = Mentor.query.filter_by(user_id=user_id).first()
        if not mentor:
            return jsonify({'error': 'Mentor profile not found'}), 404
        
        # Get student details
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Check if this mentor is assigned to the student
        if student.mentor_id != mentor.id:
            return jsonify({'error': 'You are not assigned as a mentor to this student'}), 403
        
        # Get internship details
        internship = Internship.query.filter_by(registration_number=registration_number).first()
        if not internship:
            return jsonify({'message': 'No internship found for this student', 'internship': None}), 200
        
        return jsonify({'internship': internship.to_dict()}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/student/<registration_number>/internship', methods=['POST', 'PUT'])
@token_required
@cross_origin(origins="*")
def update_student_internship(registration_number):
    try:
        # Get mentor from token
        user_id = request.token_data['user_id']
        role = request.token_data['role']
        
        # Check if user has mentor role
        if role != 'mentor':
            return jsonify({'error': 'Mentor access required'}), 403
        
        # Get mentor profile
        mentor = Mentor.query.filter_by(user_id=user_id).first()
        if not mentor:
            return jsonify({'error': 'Mentor profile not found'}), 404
        
        # Get student details
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Check if this mentor is assigned to the student
        if student.mentor_id != mentor.id:
            return jsonify({'error': 'You are not assigned as a mentor to this student'}), 403
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get existing internship or create new one
        internship = Internship.query.filter_by(registration_number=registration_number).first()
        
        if not internship:
            # Create new internship record
            internship = Internship(
                registration_number=registration_number,
                company_name=data.get('company_name', ''),
                internship_type=data.get('internship_type', 'in-house'),
                start_date=data.get('start_date'),
                end_date=data.get('end_date'),
                stipend=data.get('stipend'),
                location=data.get('location'),
                hr_contact=data.get('hr_contact'),
                hr_email=data.get('hr_email'),
                role=data.get('role'),
                description=data.get('description'),
                skills=data.get('skills'),
                mentor_approval=True,  # Automatically approve when created by mentor
                mentor_id=mentor.id
            )
            db.session.add(internship)
        else:
            # Update existing internship
            if 'company_name' in data:
                internship.company_name = data['company_name']
            if 'internship_type' in data:
                internship.internship_type = data['internship_type']
            if 'start_date' in data:
                internship.start_date = data['start_date']
            if 'end_date' in data:
                internship.end_date = data['end_date']
            if 'stipend' in data:
                internship.stipend = data['stipend']
            if 'location' in data:
                internship.location = data['location']
            if 'hr_contact' in data:
                internship.hr_contact = data['hr_contact']
            if 'hr_email' in data:
                internship.hr_email = data['hr_email']
            if 'role' in data:
                internship.role = data['role']
            if 'description' in data:
                internship.description = data['description']
            if 'skills' in data:
                internship.skills = data['skills']
            if 'mentor_approval' in data:
                internship.mentor_approval = data['mentor_approval']
            
            # Always update the mentor ID
            internship.mentor_id = mentor.id
        
        # Update student's internship company field as well
        if data.get('company_name'):
            student.internship_company = data['company_name']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Internship details updated successfully',
            'internship': internship.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@bp.route('/dev/student/<registration_number>', methods=['GET'])
@cross_origin(origins="*")
def dev_get_student_detail(registration_number):
    """Development endpoint for getting student details without authentication"""
    try:
        print(f"DEBUG: Fetching student with registration number: {registration_number}")
        
        # Get student details directly from database
        student = Student.query.filter_by(registration_number=registration_number).first()
        
        if not student:
            print(f"DEBUG: No student found with registration number {registration_number}")
            return jsonify({'error': 'Student not found'}), 404
            
        print(f"DEBUG: Found student: {student.name}")
        
        # Get user data
        user = User.query.get(student.user_id) if student.user_id else None
        
        # Get internship data
        internship = Internship.query.filter_by(registration_number=registration_number).first()
        
        # Create basic response
        response_data = {
            'id': student.id,
            'name': student.name,
            'registration_number': student.registration_number,
            'batch': student.batch,
            'department': getattr(student, 'department', None),
            'email': user.email if user else None,
            'phone': getattr(student, 'phone', None),
            'address': getattr(student, 'address', None),
        }
        
        # Add internship data if available
        if internship:
            try:
                response_data['internship'] = internship.to_dict()
            except Exception as e:
                print(f"DEBUG: Error converting internship to dict: {str(e)}")
                response_data['internship'] = {
                    'id': internship.id,
                    'company_name': getattr(internship, 'company_name', None),
                    'start_date': getattr(internship, 'start_date', None),
                    'end_date': getattr(internship, 'end_date', None)
                }
        
        print(f"DEBUG: Returning response: {response_data}")
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@bp.route('/students', methods=['POST', 'OPTIONS'])
@token_required
def create_student():
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
                # Handle either name or first_name/last_name format
                if 'name' in data and not ('first_name' in data and 'last_name' in data):
                    # Split the name into first_name and last_name
                    name_parts = data['name'].split(' ', 1)
                    first_name = name_parts[0]
                    last_name = name_parts[1] if len(name_parts) > 1 else ''
                else:
                    first_name = data.get('first_name', '')
                    last_name = data.get('last_name', '')
                
                cursor.execute("""
                    INSERT INTO users (email, first_name, last_name, role, password)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    data['email'],
                    first_name,
                    last_name,
                    'student',
                    User.generate_password_hash(data.get('password', 'changeme123'))
                ))
                user_id = cursor.lastrowid
                print(f"Created new user with ID: {user_id}")
            
            # Create student record
            full_name = f"{data['first_name']} {data['last_name']}"
            print(f"Creating student with name: {full_name}")
            
            # Prepare fields for student record, including optional ones
            student_fields = ['user_id', 'name', 'registration_number', 'batch', 'mentor_id']
            student_values = [
                user_id,
                full_name,
                data['registration_number'],
                data['batch'],
                mentor.id
            ]
            
            # Add optional fields if provided
            optional_fields = {
                'department': data.get('department'),
                'phone': data.get('phone'),
                'address': data.get('address'),
                'profile_picture': data.get('profile_picture'),
                'section': data.get('section'),
                'program': data.get('program'),
                'blood_group': data.get('blood_group'),
                'date_of_birth': data.get('date_of_birth'),
                'hostel_name': data.get('hostel_name'),
                'hostel_block': data.get('hostel_block'),
                'hostel_room_no': data.get('hostel_room_no'),
                'has_muj_alumni': data.get('has_muj_alumni')
            }
            
            for field, value in optional_fields.items():
                if value is not None:
                    student_fields.append(field)
                    student_values.append(value)
            
            # Build dynamic SQL query based on fields
            fields_str = ', '.join(student_fields)
            placeholders = ', '.join(['%s'] * len(student_fields))
            
            sql = f"""
                INSERT INTO students ({fields_str})
                VALUES ({placeholders})
            """
            
            cursor.execute(sql, student_values)
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
            
            # If alumni relation is provided, create it
            if data.get('alumni_relation'):
                alumni_data = data.get('alumni_relation')
                if alumni_data and 'alumni_name' in alumni_data and 'relation_with_student' in alumni_data:
                    cursor.execute("""
                        INSERT INTO alumni_relations (
                            registration_number, alumni_name, relation_with_student,
                            alumni_registration_number, alumni_branch, alumni_program, alumni_batch
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        data['registration_number'],
                        alumni_data.get('alumni_name'),
                        alumni_data.get('relation_with_student'),
                        alumni_data.get('alumni_registration_number'),
                        alumni_data.get('alumni_branch'),
                        alumni_data.get('alumni_program'),
                        alumni_data.get('alumni_batch')
                    ))
                    print(f"Created alumni relation for student")
            
            # If parent information is provided, create it
            if data.get('parent_info'):
                parent_data = data.get('parent_info')
                if parent_data:
                    # Extract parent data with defaults to avoid errors
                    parent_fields = {
                        'student_registration_number': data['registration_number'],
                        'father_name': parent_data.get('father_name', ''),
                        'father_mobile_no': parent_data.get('father_mobile_no', ''),
                        'mother_name': parent_data.get('mother_name', ''),
                        'mother_mobile_no': parent_data.get('mother_mobile_no', '')
                    }
                    
                    # Add optional parent fields
                    optional_parent_fields = [
                        'father_is_entrepreneur', 'father_is_family_business', 'father_is_public_sector',
                        'father_is_professional', 'father_is_govt_employee', 'father_is_private_company',
                        'father_organization', 'father_designation', 'father_email',
                        'mother_is_entrepreneur', 'mother_is_family_business', 'mother_is_public_sector',
                        'mother_is_professional', 'mother_is_govt_employee', 'mother_is_private_company',
                        'mother_is_home_maker', 'mother_organization', 'mother_designation', 'mother_email',
                        'business_card_image', 'communication_address', 'permanent_address', 'pin_code'
                    ]
                    
                    for field in optional_parent_fields:
                        if field in parent_data:
                            parent_fields[field] = parent_data[field]
                    
                    # Build dynamic SQL for parents
                    parent_field_names = ', '.join(parent_fields.keys())
                    parent_placeholders = ', '.join(['%s'] * len(parent_fields))
                    
                    sql = f"""
                        INSERT INTO parents ({parent_field_names})
                        VALUES ({parent_placeholders})
                    """
                    
                    cursor.execute(sql, list(parent_fields.values()))
                    print(f"Created parent record for student")
            
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
                    'batch': data['batch'],
                    'department': data.get('department')
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

@bp.route('/debug', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin(origins="*")
def debug_endpoint():
    """Debug endpoint to help diagnose issues with requests"""
    response_data = {
        'method': request.method,
        'path': request.path,
        'headers': dict(request.headers),
        'content_type': request.content_type,
        'is_json': request.is_json,
        'data': None,
        'form': None,
        'json': None,
        'cookies': dict(request.cookies),
        'args': dict(request.args)
    }
    
    # Try to get each type of data
    try:
        response_data['data'] = request.data.decode('utf-8') if request.data else None
    except:
        response_data['data'] = 'Error decoding data'
    
    try:
        response_data['form'] = dict(request.form)
    except:
        response_data['form'] = 'Error accessing form data'
    
    try:
        response_data['json'] = request.get_json(silent=True)
    except:
        response_data['json'] = 'Error parsing JSON'
    
    return jsonify({
        'message': 'Debug info',
        'request_info': response_data,
        'python_version': sys.version,
        'timestamp': datetime.datetime.now().isoformat()
    })

@bp.route('/debug/post-test', methods=['POST', 'OPTIONS'])
@cross_origin(origins="*")
def debug_post_endpoint():
    """Debug endpoint for POST requests to diagnose formatting issues"""
    # Handle preflight OPTIONS request first
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response
    
    # Log everything about the request
    try:
        print("\n--- DEBUG REQUEST INFORMATION ---")
        print(f"Method: {request.method}")
        print(f"Headers: {dict(request.headers)}")
        print(f"Content-Type: {request.content_type}")
        print(f"Is JSON: {request.is_json}")
        
        # Try to get the data in multiple formats
        data = None
        if request.is_json:
            data = request.get_json()
            print(f"JSON Data: {data}")
        else:
            # Try different ways to get the data
            try:
                form_data = request.form.to_dict()
                print(f"Form Data: {form_data}")
            except:
                print("No form data")
            
            try:
                raw_data = request.data.decode('utf-8')
                print(f"Raw Data: {raw_data}")
            except:
                print("No raw data or couldn't decode")
        
        # Try to extract student fields based on expected format
        student_data = {}
        if data:
            for field in ['first_name', 'last_name', 'email', 'registration_number', 'batch']:
                if field in data:
                    student_data[field] = data[field]
        
        print(f"Extracted Student Data: {student_data}")
        print("--- END DEBUG REQUEST INFORMATION ---\n")
        
        return jsonify({
            'status': 'success',
            'message': 'Debug request received',
            'received_data': {
                'headers': dict(request.headers),
                'content_type': request.content_type,
                'is_json': request.is_json,
                'json_data': data,
                'extracted_student_data': student_data
            }
        }), 200
    except Exception as e:
        print(f"Debug endpoint error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': f'Error in debug endpoint: {str(e)}',
            'trace': traceback.format_exc()
        }), 500

@bp.route('/debug/create-student', methods=['POST', 'OPTIONS'])
@cross_origin(origins="*")
def debug_create_student():
    """Debug endpoint for student creation that bypasses authentication"""
    # Handle preflight OPTIONS request first
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response
    
    try:
        print("\n--- DEBUG STUDENT CREATION ATTEMPT ---")
        
        # Get request data
        data = request.get_json()
        if not data:
            print("No data provided in request")
            return jsonify({"error": "No data provided"}), 400
        
        print(f"Received data: {data}")
        
        # Check required fields
        required_fields = ['email', 'first_name', 'last_name', 'registration_number', 'batch']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            print(f"Missing fields: {missing_fields}")
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        # For debugging, just log the data that would be processed
        print(f"Student data validated successfully. Would create student with:")
        print(f"  - First name: {data['first_name']}")
        print(f"  - Last name: {data['last_name']}")
        print(f"  - Email: {data['email']}")
        print(f"  - Registration: {data['registration_number']}")
        print(f"  - Batch: {data['batch']}")
        print("--- END DEBUG STUDENT CREATION ---\n")
        
        # Return success without actually creating anything
        return jsonify({
            'status': 'success',
            'message': 'Student creation simulation successful',
            'student': {
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'email': data['email'],
                'registration_number': data['registration_number'],
                'batch': data['batch']
            }
        }), 201
    except Exception as e:
        print(f"Debug student creation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': f'Error in debug student creation: {str(e)}',
            'trace': traceback.format_exc()
        }), 500

@bp.route('/create-student-simple', methods=['POST', 'OPTIONS'])
@cross_origin(origins="*")
def create_student_simple():
    """Simplified student creation endpoint with detailed error reporting"""
    # Handle preflight OPTIONS request first
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response
        
    try:
        print("\n--- SIMPLE STUDENT CREATION ---")
        
        # Get request data
        data = request.get_json()
        if not data:
            print("No data provided")
            return jsonify({"error": "No data provided"}), 400
        
        print(f"Received data: {data}")
        
        # Create basic student structure with most essential fields
        student_data = {
            # Required fields
            'name': data.get('name'),
            'email': data.get('email'),
            'registration_number': data.get('registration_number'),
            'batch': data.get('batch'),
            
            # Handle both name formats
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name')
        }
        
        # If only first_name and last_name provided, but no combined name
        if not student_data['name'] and student_data['first_name'] and student_data['last_name']:
            student_data['name'] = f"{student_data['first_name']} {student_data['last_name']}".strip()
            print(f"Constructed name from first_name and last_name: {student_data['name']}")
        
        # Check required fields using the name and other essentials
        required_fields = ['name', 'email', 'registration_number', 'batch']
        missing_fields = [field for field in required_fields if not student_data[field]]
        
        if missing_fields:
            print(f"Missing required fields: {missing_fields}")
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        # Use pymysql to directly create the student record
        # This avoids any SQLAlchemy validation issues
        try:
            conn = pymysql.connect(
                host='localhost',
                user='root',
                password='yoyobheemsa',
                database='internship_portal',
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor
            )
            
            cursor = conn.cursor()
            
            # Check if student with this registration number already exists
            cursor.execute("SELECT * FROM students WHERE registration_number = %s", (student_data['registration_number'],))
            existing_student = cursor.fetchone()
            
            if existing_student:
                print(f"Student with registration number {student_data['registration_number']} already exists")
                return jsonify({'error': 'Registration number already in use'}), 400
            
            # Create a user if email doesn't exist
            cursor.execute("SELECT * FROM users WHERE email = %s", (student_data['email'],))
            existing_user = cursor.fetchone()
            
            if existing_user:
                print(f"Using existing user with email {student_data['email']}")
                user_id = existing_user['id']
            else:
                # Create a new user with the given email
                password_hash = 'pbkdf2:sha256:260000$VDiPlI31kRHFuUZb$11d7d63f8c037e30908aadfd1a15747dfd84da9d4e15be95e47d19a743d5e761'  # Default password: changeme123
                
                cursor.execute("""
                    INSERT INTO users (email, first_name, last_name, role, password) 
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    student_data['email'],
                    student_data.get('first_name', student_data['name'].split(' ')[0]),
                    student_data.get('last_name', ' '.join(student_data['name'].split(' ')[1:]) if len(student_data['name'].split(' ')) > 1 else ''),
                    'student',
                    password_hash
                ))
                
                user_id = cursor.lastrowid
                print(f"Created new user with ID: {user_id}")
            
            # Get a mentor ID (use the first mentor for simplicity)
            cursor.execute("SELECT id FROM mentors LIMIT 1")
            mentor = cursor.fetchone()
            
            if not mentor:
                print("No mentors found in the system")
                return jsonify({'error': 'No mentors available to assign to student'}), 500
            
            mentor_id = mentor['id']
            
            # Create the student record
            cursor.execute("""
                INSERT INTO students (user_id, name, registration_number, batch, mentor_id)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                user_id,
                student_data['name'],
                student_data['registration_number'],
                student_data['batch'],
                mentor_id
            ))
            
            student_id = cursor.lastrowid
            print(f"Created student with ID: {student_id}")
            
            # Create mentor assignment
            cursor.execute("""
                INSERT INTO mentor_assignments (mentor_id, registration_number)
                VALUES (%s, %s)
            """, (
                mentor_id,
                student_data['registration_number']
            ))
            
            # Commit all changes
            conn.commit()
            cursor.close()
            conn.close()
            
            print("Student creation successful!")
            print("--- END SIMPLE STUDENT CREATION ---\n")
            
            return jsonify({
                'message': 'Student created successfully',
                'student': {
                    'id': student_id,
                    'user_id': user_id,
                    'name': student_data['name'],
                    'email': student_data['email'],
                    'registration_number': student_data['registration_number'],
                    'batch': student_data['batch'],
                    'mentor_id': mentor_id
                }
            }), 201
            
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
            if 'conn' in locals() and conn:
                conn.rollback()
                conn.close()
            return jsonify({"error": f"Database error: {str(db_error)}"}), 500
            
    except Exception as e:
        print(f"Error in create_student_simple: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to create student: {str(e)}"}), 500

@bp.route('/dev/student/<registration_number>/feedback', methods=['GET'])
@cross_origin(origins="*")
def get_student_feedback_dev(registration_number):
    """Development endpoint for getting student feedback without authentication"""
    try:
        # Get student
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        # Get all feedback
        feedback_entries = Feedback.query.filter_by(
            registration_number=registration_number
        ).order_by(Feedback.submitted_at.desc()).all()
        
        return jsonify({
            'feedback': [entry.to_dict() for entry in feedback_entries]
        }), 200
        
    except Exception as e:
        print(f"Error fetching feedback: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
        
@bp.route('/dev/student/<registration_number>/feedback', methods=['POST'])
@cross_origin(origins="*")
def submit_student_feedback_dev(registration_number):
    """Development endpoint for submitting student feedback without authentication"""
    try:
        data = request.json
        
        # Get student
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        # Validate required fields
        required_fields = ['week', 'feedback_text', 'rating']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
                
        # Create new feedback entry
        feedback = Feedback(
            registration_number=registration_number,
            week=data['week'],
            feedback_text=data['feedback_text'],
            rating=data['rating'],
            submitted_at=datetime.now()
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        return jsonify({
            'message': 'Feedback submitted successfully',
            'feedback': feedback.to_dict()
        }), 201
        
    except Exception as e:
        print(f"Error submitting feedback: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@bp.route('/dev/student/<registration_number>/evaluations', methods=['GET'])
@cross_origin(origins="*")
def get_student_evaluations_dev(registration_number):
    """Development endpoint for getting student evaluations without authentication"""
    try:
        # Get student
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        # Get all evaluations
        evaluations = Evaluation.query.filter_by(
            registration_number=registration_number
        ).order_by(Evaluation.submitted_at.desc()).all()
        
        return jsonify({
            'evaluations': [eval.to_dict() for eval in evaluations]
        }), 200
        
    except Exception as e:
        print(f"Error fetching evaluations: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# This endpoint is for development and testing purposes only - No authentication required
@bp.route('/dev/feedback/<registration_number>', methods=['POST'])
@cross_origin(origins="*")
def submit_weekly_feedback_dev(registration_number):
    """Submit weekly feedback for a student - development endpoint (no auth)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "No feedback data provided"}), 400
            
        # Check required fields
        required_fields = ['week', 'feedback']
        for field in required_fields:
            if field not in data:
                return jsonify({"message": f"Missing required field: {field}"}), 400
        
        # Connect to the database
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # For dev purposes, use the first mentor if none specified
        mentor_id = data.get('mentor_id', None)
        if not mentor_id:
            cursor.execute("SELECT id FROM mentors LIMIT 1")
            mentor_result = cursor.fetchone()
            if mentor_result:
                mentor_id = mentor_result['id']
            else:
                mentor_id = 1  # Default value
            
        # Find student
        cursor.execute("SELECT * FROM students WHERE registration_number = %s", (registration_number,))
        student = cursor.fetchone()
        
        if not student:
            cursor.close()
            conn.close()
            return jsonify({"message": "Student not found."}), 404
            
        # Get performance rating
        rating = data.get('performance_rating', 3)  # Default to 3 if not provided
        
        # Check if there's already feedback for this week
        cursor.execute("""
            SELECT * FROM weekly_feedback
            WHERE registration_number = %s AND mentor_id = %s AND week = %s
        """, (registration_number, mentor_id, data['week']))
        
        existing_feedback = cursor.fetchone()
        
        completion_percentage = data.get('completion_percentage', 0)
        
        if existing_feedback:
            # Update existing feedback
            cursor.execute("""
                UPDATE weekly_feedback
                SET performance_rating = %s, feedback = %s, areas_of_improvement = %s, 
                    strengths = %s, completion_percentage = %s, updated_at = NOW()
                WHERE id = %s
            """, (
                rating,
                data['feedback'],
                data.get('areas_of_improvement', ''),
                data.get('strengths', ''),
                completion_percentage,
                existing_feedback['id']
            ))
            
            feedback_id = existing_feedback['id']
            message = "Weekly feedback updated successfully"
        else:
            # Create new feedback
            cursor.execute("""
                INSERT INTO weekly_feedback
                    (registration_number, mentor_id, week, feedback, completion_percentage, 
                     performance_rating, areas_of_improvement, strengths, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (
                registration_number,
                mentor_id,
                data['week'],
                data['feedback'],
                completion_percentage,
                rating,
                data.get('areas_of_improvement', ''),
                data.get('strengths', ''),
                data.get('areas_of_improvement', ''),
                data.get('strengths', '')
            ))
            
            feedback_id = cursor.lastrowid
            message = "Weekly feedback submitted successfully"
        
        # Also create a MentorFeedback entry if detailed feedback is provided
        if data.get('detailed_feedback'):
            cursor.execute("""
                INSERT INTO mentor_feedback
                    (registration_number, mentor_id, title, feedback_text, rating, 
                     category, improvement_areas, strengths, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (
                registration_number,
                mentor_id,
                data.get('title', f'Week {data["week"]} Feedback'),
                data.get('detailed_feedback', data['feedback']),
                rating,
                data.get('category', 'performance'),
                data.get('areas_of_improvement', ''),
                data.get('strengths', '')
            ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": message,
            "feedback_id": feedback_id
        }), 200
        
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Failed to submit weekly feedback: {str(e)}"}), 500

# Development endpoint to get weekly feedback without authentication
@bp.route('/dev/student/<registration_number>/weekly-feedback', methods=['GET'])
@cross_origin(origins="*")
def get_weekly_feedback_dev(registration_number):
    """Get weekly feedback for a student - development endpoint (no auth)"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Check if student exists
        cursor.execute("SELECT * FROM students WHERE registration_number = %s", (registration_number,))
        student = cursor.fetchone()
        
        if not student:
            cursor.close()
            conn.close()
            return jsonify({"message": "Student not found."}), 404
        
        # Get weekly feedback
        cursor.execute("""
            SELECT wf.*, m.name as mentor_name
            FROM weekly_feedback wf
            JOIN mentors m ON wf.mentor_id = m.id
            WHERE wf.registration_number = %s
            ORDER BY wf.week DESC
        """, (registration_number,))
        
        feedback_results = cursor.fetchall()
        
        feedback_list = []
        for feedback in feedback_results:
            feedback_list.append({
                'id': feedback['id'],
                'week': feedback['week'],
                'mentor_id': feedback['mentor_id'],
                'mentor_name': feedback['mentor_name'],
                'performance_rating': feedback['performance_rating'],
                'feedback': feedback['feedback'],
                'strengths': feedback['strengths'],
                'areas_of_improvement': feedback['areas_of_improvement'],
                'completion_percentage': feedback['completion_percentage'],
                'created_at': feedback['created_at'].isoformat() if feedback['created_at'] else None,
                'updated_at': feedback['updated_at'].isoformat() if feedback['updated_at'] else None
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'feedback': feedback_list
        }), 200
        
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Failed to retrieve weekly feedback: {str(e)}"}), 500

# Development endpoint to get student details that matches the path in the frontend
@bp.route('/mentor/debug/get-student/<registration_number>', methods=['GET', 'OPTIONS'])
@cross_origin(origins="*")
def debug_get_student_detail(registration_number):
    """Get student details with the debug endpoint path expected by the frontend"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Get student details
        cursor.execute("""
            SELECT * 
            FROM students 
            WHERE registration_number = %s
        """, (registration_number,))
        
        student = cursor.fetchone()
        
        if not student:
            cursor.close()
            conn.close()
            return jsonify({"message": "Student not found"}), 404
        
        # Get internship details if available
        cursor.execute("""
            SELECT * 
            FROM internships 
            WHERE registration_number = %s
        """, (registration_number,))
        
        internship = cursor.fetchone()
        
        # Get mentor details if assigned
        mentor_id = student.get('mentor_id')
        mentor = None
        
        if mentor_id:
            cursor.execute("""
                SELECT id, name, department, phone, email
                FROM mentors
                WHERE id = %s
            """, (mentor_id,))
            mentor = cursor.fetchone()
        
        # Get parent information - Fixed to use registration_number instead of student_id
        cursor.execute("""
            SELECT id, name, relation, email, phone
            FROM parents
            WHERE registration_number = %s
        """, (registration_number,))
        
        parents = cursor.fetchall()
        
        # Construct the response
        result = {
            "id": student['id'],
            "name": student['name'],
            "registration_number": student['registration_number'],
            "email": student.get('email', ''),
            "phone": student.get('phone', ''),
            "address": student.get('address', ''),
            "batch": student.get('batch', ''),
            "internship_status": student.get('status', 'Not Started'),
            "parents": parents if parents else []
        }
        
        # Add internship details if available
        if internship:
            result['internship'] = {
                "id": internship['id'],
                "title": internship.get('title', ''),
                "company_name": internship.get('company_name', ''),
                "start_date": internship.get('start_date'),
                "end_date": internship.get('end_date'),
                "supervisor": internship.get('supervisor', ''),
                "supervisor_email": internship.get('supervisor_email', ''),
                "status": internship.get('status', 'Not Started'),
                "progress": internship.get('progress', 0)
            }
        
        # Add mentor details if available
        if mentor:
            result['mentor'] = {
                "id": mentor['id'],
                "name": mentor['name'],
                "department": mentor.get('department', ''),
                "phone": mentor.get('phone', ''),
                "email": mentor.get('email', '')
            }
        
        cursor.close()
        conn.close()
        
        return jsonify(result), 200
        
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.close()
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Failed to get student details: {str(e)}"}), 500