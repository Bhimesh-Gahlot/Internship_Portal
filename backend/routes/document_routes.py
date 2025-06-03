from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import os
import datetime

bp = Blueprint('documents', __name__, url_prefix='/documents')

@bp.route('', methods=['GET', 'OPTIONS'])
@cross_origin(origins="*")
def get_documents():
    """Get all documents"""
    if request.method == 'OPTIONS':
        return jsonify(success=True), 200
        
    try:
        # In production, query from database
        # For demo, return mock data
        documents = [
            {
                'id': 1,
                'name': 'Internship Guidelines',
                'type': 'pdf',
                'category': 'guidelines',
                'size': '1.2 MB',
                'uploaded_by': 'Admin',
                'upload_date': '2023-05-15',
                'description': 'Official guidelines for the internship program'
            },
            {
                'id': 2,
                'name': 'Weekly Report Template',
                'type': 'docx',
                'category': 'templates',
                'size': '245 KB',
                'uploaded_by': 'Admin',
                'upload_date': '2023-05-10',
                'description': 'Template for weekly progress reports'
            },
            {
                'id': 3,
                'name': 'Monthly Report Template',
                'type': 'docx',
                'category': 'templates',
                'size': '310 KB',
                'uploaded_by': 'Admin',
                'upload_date': '2023-05-10',
                'description': 'Template for monthly progress reports'
            },
            {
                'id': 4,
                'name': 'Final Report Template',
                'type': 'docx',
                'category': 'templates',
                'size': '420 KB',
                'uploaded_by': 'Admin',
                'upload_date': '2023-05-10',
                'description': 'Template for final internship report'
            },
            {
                'id': 5,
                'name': 'Company Evaluation Form',
                'type': 'pdf',
                'category': 'forms',
                'size': '180 KB',
                'uploaded_by': 'Admin',
                'upload_date': '2023-05-12',
                'description': 'Form for company to evaluate intern performance'
            }
        ]
        
        return jsonify({
            'success': True,
            'documents': documents
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching documents: {str(e)}'
        }), 500

@bp.route('/upload', methods=['POST', 'OPTIONS'])
@cross_origin(origins="*")
def upload_document():
    """Upload a document to the repository"""
    if request.method == 'OPTIONS':
        return jsonify(success=True), 200
        
    try:
        # Check if files are in the request
        if 'files[]' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No files in request'
            }), 400
        
        files = request.files.getlist('files[]')
        
        if not files or files[0].filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        # Get form data
        name = request.form.get('name', '')
        category = request.form.get('category', 'other')
        description = request.form.get('description', '')
        
        # Process each file
        uploaded_files = []
        for file in files:
            if file and file.filename:
                # Secure the filename
                filename = file.filename
                
                # Determine directory based on category
                upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../uploads', category)
                os.makedirs(upload_dir, exist_ok=True) # Create directory if it doesn't exist
                file_path = os.path.join(upload_dir, filename)
                
                # Save the file
                file.save(file_path)
                
                # Get file size
                file_size = os.path.getsize(file_path)
                size_kb = round(file_size / 1024, 2)
                size_str = f"{size_kb} KB"
                
                # In production, save metadata to database
                # For demo, just return success
                file_info = {
                    'filename': filename,
                    'path': file_path,
                    'size': size_str,
                    'category': category
                }
                uploaded_files.append(file_info)
        
        return jsonify({
            'success': True,
            'message': f'Successfully uploaded {len(uploaded_files)} file(s)',
            'files': uploaded_files
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error uploading document: {str(e)}'
        }), 500 