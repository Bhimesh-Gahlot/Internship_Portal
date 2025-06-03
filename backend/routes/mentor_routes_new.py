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
            student = Student.query.filter_by(registration_number=assignment.registration_number).first()
            if student:
                # Get user info for email
                user = User.query.get(student.user_id)
                
                # Get internship info if available
                internship = Internship.query.filter_by(registration_number=student.registration_number).first()
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