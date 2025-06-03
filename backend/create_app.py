from flask import Flask
from config import Config
from extensions import db, jwt, cors, mail
from flask_cors import CORS
from routes import init_app as init_routes

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Apply CORS to allow all origins
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)

    with app.app_context():
        # Import models
        from models import (
            User, Student, Mentor, MentorAssignment, Internship,
            Evaluation, WeeklyReport, Report, MentorFeedback,
            WeeklyFeedback, ProgressTracking, Parent, AlumniRelation,
            PasswordChangeLogs, EvaluationType
        )
        
        # Create tables only if they don't exist
        tables_exist = False
        try:
            # Try to query any table to check if tables exist
            User.query.first()
            tables_exist = True
        except:
            pass

        if not tables_exist:
            print("Creating database tables...")
            db.create_all()
            print("Database tables created successfully")
        else:
            print("Database tables already exist")

        # Initialize routes
        init_routes(app)

    # Global CORS handler for all responses
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, PUT, POST, DELETE, OPTIONS'
        return response
        
    # Handle OPTIONS requests to bypass authentication for CORS preflight
    @app.before_request
    def handle_preflight():
        from flask import request
        if request.method == 'OPTIONS':
            from flask import jsonify, Response
            response = Response('')
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Access-Control-Allow-Methods'] = 'GET, PUT, POST, DELETE, OPTIONS'
            return response

    return app 