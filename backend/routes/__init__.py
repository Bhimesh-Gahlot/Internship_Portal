# This file can be empty 

from .auth import bp as auth_bp
from .student_routes import bp as student_bp
from .mentor import mentor_bp
from .admin_routes import bp as admin_bp
from .report_routes import bp as reports_bp
from .mentor_debug import debug_bp as mentor_debug_bp
from .document_routes import bp as documents_bp
from .internship_routes import bp as internship_bp

def init_app(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(mentor_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(mentor_debug_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(internship_bp)

# Register blueprints in create_app.py 