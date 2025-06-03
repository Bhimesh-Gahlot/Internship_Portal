from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.internship import Internship
from models.student import Student
from models.mentor import Mentor
from extensions import db
from datetime import datetime
from flask_cors import cross_origin
from utils.access_control import student_required, mentor_required

bp = Blueprint('internship', __name__, url_prefix='/internship')

@bp.route('/submit', methods=['POST'])
@student_required
def submit_internship():
    try:
        # Get student details
        student = Student.query.filter_by(user_id=g.user.id).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        # Check if internship already exists
        existing_internship = Internship.query.filter_by(registration_number=student.registration_number).first()
        if existing_internship:
            return jsonify({'error': 'Internship details already submitted. Use PUT to update'}), 400
            
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['company_name', 'internship_type', 'start_date', 'end_date']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields', 'required': required_fields}), 400
        
        # Create new internship
        internship = Internship(
            registration_number=student.registration_number,
            company_name=data['company_name'],
            internship_type=data['internship_type'],
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date(),
            stipend=float(data['stipend']) if data.get('stipend') else None,
            location=data.get('location'),
            hr_contact=data.get('hr_contact'),
            hr_email=data.get('hr_email')
        )
        
        db.session.add(internship)
        db.session.commit()
        
        return jsonify({
            'message': 'Internship details submitted successfully',
            'internship': internship.to_dict()
        }), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/details', methods=['GET'])
@student_required
def get_internship_details():
    try:
        # Get student details
        student = Student.query.filter_by(user_id=g.user.id).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        # Get internship using registration_number - this already ensures we only get this student's internship
        internship = Internship.query.filter_by(registration_number=student.registration_number).first()
        if not internship:
            return jsonify({'error': 'No internship details found', 'code': 'NO_INTERNSHIP'}), 404
            
        return jsonify(internship.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/update', methods=['PUT'])
@student_required
def update_internship():
    try:
        # Get student details
        student = Student.query.filter_by(user_id=g.user.id).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        # Get existing internship - this already ensures we only get this student's internship
        internship = Internship.query.filter_by(registration_number=student.registration_number).first()
        if not internship:
            return jsonify({'error': 'No internship details found to update. Submit first.'}), 404
            
        data = request.get_json()
        
        # Update fields if provided
        if 'company_name' in data:
            internship.company_name = data['company_name']
        if 'internship_type' in data:
            internship.internship_type = data['internship_type']
        if 'start_date' in data:
            internship.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if 'end_date' in data:
            internship.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        if 'stipend' in data:
            internship.stipend = float(data['stipend']) if data['stipend'] else None
        if 'location' in data:
            internship.location = data['location']
        if 'hr_contact' in data:
            internship.hr_contact = data['hr_contact']
        if 'hr_email' in data:
            internship.hr_email = data['hr_email']
            
        db.session.commit()
        
        return jsonify({
            'message': 'Internship details updated successfully',
            'internship': internship.to_dict()
        }), 200
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/mentor/approval/<registration_number>', methods=['PUT'])
@mentor_required
def approve_internship(registration_number):
    try:
        # Check if mentor is assigned to this student
        student = Student.query.filter_by(registration_number=registration_number).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
            
        mentor = Mentor.query.filter_by(user_id=g.user.id).first()
        if not mentor:
            return jsonify({'error': 'Mentor not found'}), 404
            
        # Check if this mentor is assigned to the student
        if student.mentor_id != mentor.id:
            return jsonify({'error': 'You are not assigned as a mentor to this student'}), 403
            
        # Get and update internship
        internship = Internship.query.filter_by(registration_number=registration_number).first()
        if not internship:
            return jsonify({'error': 'No internship details found for this student'}), 404
            
        data = request.get_json()
        approved = data.get('approved', False)
        
        internship.mentor_approval = approved
        internship.mentor_id = mentor.id
        
        db.session.commit()
        
        return jsonify({
            'message': f'Internship {("approved" if approved else "disapproved")}',
            'internship': internship.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500 