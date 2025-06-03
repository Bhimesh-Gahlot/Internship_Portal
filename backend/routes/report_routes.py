from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import WeeklyReport, Report, Student
from extensions import db
from datetime import datetime
import os
from werkzeug.utils import secure_filename

bp = Blueprint('reports', __name__)

@bp.route('/weekly-report', methods=['POST'])
@jwt_required()
def submit_weekly_report():
    try:
        data = request.get_json()
        new_report = WeeklyReport(
            registration_number=data['registration_number'],
            week_number=data['week_number'],
            report_text=data['report_text']
        )
        db.session.add(new_report)
        db.session.commit()
        return jsonify(new_report.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@bp.route('/report', methods=['POST'])
@jwt_required()
def submit_report():
    try:
        # Handle file upload
        report_file = request.files.get('report_file')
        presentation_file = request.files.get('presentation_file')
        
        # Save files and get paths
        report_path = None
        presentation_path = None
        
        if report_file:
            report_path = save_file(report_file, 'reports')
        if presentation_file:
            presentation_path = save_file(presentation_file, 'presentations')
        
        new_report = Report(
            registration_number=request.form['registration_number'],
            report_type=request.form['report_type'],
            submission_date=datetime.utcnow(),
            report_file_path=report_path,
            presentation_file_path=presentation_path
        )
        
        db.session.add(new_report)
        db.session.commit()
        return jsonify(new_report.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@bp.route('/weekly-reports/<registration_number>', methods=['GET'])
@jwt_required()
def get_weekly_reports(registration_number):
    try:
        reports = WeeklyReport.query.filter_by(registration_number=registration_number).all()
        return jsonify([report.to_dict() for report in reports]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/reports/<registration_number>', methods=['GET'])
@jwt_required()
def get_reports(registration_number):
    try:
        reports = Report.query.filter_by(registration_number=registration_number).all()
        return jsonify([report.to_dict() for report in reports]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/reports/<registration_number>/<report_type>', methods=['GET'])
@jwt_required()
def get_reports_by_type(registration_number, report_type):
    try:
        reports = Report.query.filter_by(
            registration_number=registration_number,
            report_type=report_type
        ).all()
        return jsonify([report.to_dict() for report in reports]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

def save_file(file, folder):
    """Helper function to save uploaded files"""
    if file:
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        
        # Create folder if it doesn't exist
        folder_path = os.path.join(current_app.config['UPLOAD_FOLDER'], folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Save file
        file_path = os.path.join(folder_path, unique_filename)
        file.save(file_path)
        
        # Return relative path for database storage
        return os.path.join(folder, unique_filename)
    return None 