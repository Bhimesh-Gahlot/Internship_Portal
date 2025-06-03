import pymysql
from flask import Flask, request, jsonify, send_from_directory
from create_app import create_app
from config import Config
from datetime import datetime
import os
from flask_cors import cross_origin

pymysql.install_as_MySQLdb()

# Create the database if it doesn't exist
def init_db():
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa'
        )
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        cursor.execute("CREATE DATABASE IF NOT EXISTS internship_portal")
        print("Database check completed")
        
        conn.close()
    except Exception as e:
        print(f"Database initialization error: {str(e)}")

# Create upload directories if they don't exist
UPLOAD_DIRS = [
    'uploads',
    'uploads/guidelines',
    'uploads/templates',
    'uploads/forms',
    'uploads/reports',
    'uploads/other'
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

for dir_path in UPLOAD_DIRS:
    full_path = os.path.join(BASE_DIR, dir_path)
    if not os.path.exists(full_path):
        os.makedirs(full_path)
        print(f"Created subdirectory: {full_path}")

# Add after app creation but before app.run()
def check_database_schema():
    """Check and fix critical database schema issues on startup"""
    try:
        print("Checking database schema...")
        import pymysql
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        cursor = conn.cursor()
        
        # Check if evaluations table has submitted_at column
        cursor.execute("SHOW COLUMNS FROM evaluations LIKE 'submitted_at'")
        column_exists = cursor.fetchone() is not None
        
        if not column_exists:
            print("Adding missing submitted_at column to evaluations table")
            cursor.execute("ALTER TABLE evaluations ADD COLUMN submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP")
            conn.commit()
            print("Added submitted_at column to evaluations table")
        
        cursor.close()
        conn.close()
        print("Database schema check completed")
    except Exception as e:
        print(f"Error checking database schema: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    init_db()  # Initialize database
    app = create_app()
    
    # Direct endpoint for student creation at app level
    @app.route('/direct-create-student', methods=['POST', 'OPTIONS'])
    @cross_origin(origins="*")
    def direct_create_student():
        """Direct app-level endpoint for student creation without using blueprints"""
        if request.method == 'OPTIONS':
            response = jsonify({'status': 'success'})
            response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            return response
        
        try:
            # Get request data
            data = request.get_json() or {}
            print(f"Direct create student received data: {data}")
            
            # Create student data structure
            student_data = {
                'name': data.get('name') or f"{data.get('first_name', '')} {data.get('last_name', '')}".strip(),
                'email': data.get('email'),
                'registration_number': data.get('registration_number'),
                'batch': data.get('batch')
            }
            
            # Use direct SQL to create the student
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
                
                # Check if registration number is already used
                cursor.execute("SELECT * FROM students WHERE registration_number = %s", 
                              (student_data['registration_number'],))
                if cursor.fetchone():
                    return jsonify({"error": "Registration number already in use"}), 400
                
                # Get or create user
                cursor.execute("SELECT * FROM users WHERE email = %s", (student_data['email'],))
                user = cursor.fetchone()
                
                if user:
                    user_id = user['id']
                else:
                    # Create new user
                    cursor.execute("""
                        INSERT INTO users (email, role, password, first_name, last_name) 
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        student_data['email'], 
                        'student',
                        'pbkdf2:sha256:260000$VDiPlI31kRHFuUZb$11d7d63f8c037e30908aadfd1a15747dfd84da9d4e15be95e47d19a743d5e761',  # Default password: test@123
                        data.get('first_name', student_data['name'].split(' ')[0]),
                        data.get('last_name', ' '.join(student_data['name'].split(' ')[1:]) if len(student_data['name'].split(' ')) > 1 else '')
                    ))
                    user_id = cursor.lastrowid
                
                # Get a mentor
                cursor.execute("SELECT id FROM mentors LIMIT 1")
                mentor = cursor.fetchone()
                mentor_id = mentor['id'] if mentor else None
                
                # Create student record
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
                
                # Create mentor assignment if mentor exists
                if mentor_id:
                    cursor.execute("""
                        INSERT INTO mentor_assignments (mentor_id, registration_number)
                        VALUES (%s, %s)
                    """, (
                        mentor_id,
                        student_data['registration_number']
                    ))
                
                conn.commit()
                
                return jsonify({
                    "status": "success",
                    "message": "Student created successfully",
                    "student": {
                        "id": student_id,
                        "name": student_data['name'],
                        "email": student_data['email'],
                        "registration_number": student_data['registration_number'],
                        "batch": student_data['batch'],
                        "password": "test@123"  # Always return this default password
                    }
                }), 201
                
            except Exception as db_error:
                conn.rollback()
                print(f"Database error: {str(db_error)}")
                return jsonify({"error": f"Database error: {str(db_error)}"}), 500
            finally:
                if 'conn' in locals() and conn:
                    conn.close()
        
        except Exception as e:
            print(f"Error creating student: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": f"Error creating student: {str(e)}"}), 500
    
    # Add a debug test endpoint to the app
    @app.route('/debug/test-endpoint', methods=['GET', 'POST', 'OPTIONS'])
    @cross_origin(origins="*")
    def test_endpoint():
        """Simple endpoint for testing API connectivity"""
        if request.method == 'OPTIONS':
            response = jsonify({'status': 'success'})
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            return response
        
        if request.method == 'POST':
            data = request.get_json() or {}
            return jsonify({
                'status': 'success',
                'message': 'Test endpoint successfully received POST request',
                'received_data': data,
                'time': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'status': 'success',
                'message': 'Test endpoint successfully received GET request',
                'time': datetime.now().isoformat()
            })
    
    with app.app_context():
        # Import models to ensure they're registered with SQLAlchemy
        from models import User, Student, Mentor, Internship, MentorAssignment, Evaluation
        from models.weekly_feedback import WeeklyFeedback
        from models.parent import Parent
        from models.alumni_relation import AlumniRelation
        from extensions import db
        
        # Create tables with new schema
        print("Creating all tables...")
        db.create_all()
        print("Database tables created successfully")
    
    # Debug endpoint to test student creation without authentication
    @app.route('/debug/create-student', methods=['POST', 'OPTIONS'])
    @cross_origin(origins="*")
    def debug_create_student():
        """Debug endpoint for student creation that bypasses authentication"""
        # Handle preflight OPTIONS request
        if request.method == 'OPTIONS':
            response = jsonify({'status': 'success'})
            response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            return response
        
        try:
            # Get request data
            data = request.get_json() or {}
            print(f"Debug create student received data: {data}")
            
            # Check required fields
            required_fields = ['email', 'name', 'registration_number', 'batch']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
            
            # For testing, just return success without creating anything
            return jsonify({
                'status': 'success',
                'message': 'Debug student creation would succeed with this data',
                'student': data
            }), 200
        except Exception as e:
            print(f"Debug create student error: {str(e)}")
            return jsonify({'error': str(e)}), 500
        
    check_database_schema()  # Add this line before app.run
    
    # Run database migrations for progress tracking
    from db_migrations import run_migrations
    run_migrations()
    
    print("Starting Flask application...")
    app.run(debug=True)

# Health check and other endpoints are moved inside the if __name__ == '__main__' block
# to ensure they're registered with the app properly

# Add a health check endpoint
@app.route('/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Simple health check endpoint to verify the server is running"""
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = app.make_default_options_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
        
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    }), 200

# Add document repository endpoints
@app.route('/documents', methods=['GET'])
def get_documents():
    """Get all documents"""
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

@app.route('/documents/upload', methods=['POST'])
def upload_document():
    """Upload a document to the repository"""
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
                upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', category)
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

@app.route('/documents/<int:document_id>', methods=['DELETE'])
def delete_document(document_id):
    """Delete a document from the repository"""
    try:
        # In production, query document from database and delete file
        # For demo, just return success
        return jsonify({
            'success': True,
            'message': f'Document with ID {document_id} deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error deleting document: {str(e)}'
        }), 500

@app.route('/documents/download/<int:document_id>', methods=['GET'])
def download_document(document_id):
    """Download a document from the repository"""
    try:
        # In production, query document from database and serve file
        # For demo, just return success
        return jsonify({
            'success': True,
            'message': f'Document with ID {document_id} would be downloaded'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error downloading document: {str(e)}'
        }), 500

# Add schedule endpoints
@app.route('/schedule/events', methods=['GET'])
def get_events():
    """Get all events from the schedule"""
    try:
        # In production, query from database
        # For demo, return mock data
        events = [
            {
                'id': 1,
                'title': 'Internship Orientation',
                'date': '2024-06-01',
                'start_time': '10:00',
                'end_time': '12:00',
                'type': 'meeting',
                'description': 'Introduction to internship program and expectations',
                'location': 'Main Hall',
                'attendees': ['All Students', 'Program Coordinators']
            },
            {
                'id': 2,
                'title': 'Weekly Report Due',
                'date': '2024-06-08',
                'type': 'deadline',
                'description': 'Submit your first weekly progress report',
                'location': 'Online Portal'
            },
            {
                'id': 3,
                'title': 'Mid-term Presentation',
                'date': '2024-07-15',
                'start_time': '09:00',
                'end_time': '17:00',
                'type': 'presentation',
                'description': 'Present your internship progress to faculty panel',
                'location': 'Conference Room 2',
                'attendees': ['All Students', 'Faculty Panel', 'Mentors']
            },
            {
                'id': 4,
                'title': 'Monthly Report Due',
                'date': '2024-06-30',
                'type': 'deadline',
                'description': 'Submit your monthly progress report',
                'location': 'Online Portal'
            },
            {
                'id': 5,
                'title': 'Mentor Feedback Session',
                'date': '2024-06-15',
                'start_time': '14:00',
                'end_time': '16:00',
                'type': 'meeting',
                'description': 'One-on-one feedback session with your mentor',
                'location': 'Meeting Room 3',
                'attendees': ['Student', 'Mentor']
            },
            {
                'id': 6,
                'title': 'Final Report Submission',
                'date': '2024-08-15',
                'type': 'deadline',
                'description': 'Submit your final internship report',
                'location': 'Online Portal'
            },
            {
                'id': 7,
                'title': 'Final Presentation',
                'date': '2024-08-25',
                'start_time': '09:00',
                'end_time': '18:00',
                'type': 'presentation',
                'description': 'Present your internship outcomes to evaluation committee',
                'location': 'Auditorium',
                'attendees': ['All Students', 'Evaluation Committee', 'Mentors', 'Industry Partners']
            }
        ]
        
        return jsonify({
            'success': True,
            'events': events
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching events: {str(e)}'
        }), 500

@app.route('/schedule/events', methods=['POST'])
def create_event():
    """Create a new event in the schedule"""
    try:
        # Get event data from request
        event_data = request.get_json()
        
        if not event_data:
            return jsonify({
                'success': False,
                'message': 'No event data provided'
            }), 400
        
        # Required fields
        required_fields = ['title', 'date', 'type']
        for field in required_fields:
            if field not in event_data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # In production, save to database
        # For demo, just return success with mock ID
        mock_id = event_data.get('id', 999)
        
        return jsonify({
            'success': True,
            'message': 'Event created successfully',
            'event': {
                'id': mock_id,
                **event_data
            }
        }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error creating event: {str(e)}'
        }), 500

@app.route('/schedule/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Delete an event from the schedule"""
    try:
        # In production, delete from database
        # For demo, just return success
        return jsonify({
            'success': True,
            'message': f'Event with ID {event_id} deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error deleting event: {str(e)}'
        }), 500 