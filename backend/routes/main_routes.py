from flask import Blueprint, jsonify

bp = Blueprint('main', __name__)

@bp.route('/', methods=['GET'])
def index():
    return jsonify({
        'message': 'Welcome to Internship Portal API',
        'status': 'running',
        'available_endpoints': {
            'auth': [
                '/auth/register',
                '/auth/login'
            ],
            'student': [
                '/student/profile'
            ],
            'mentor': [
                '/mentor/students'
            ],
            'internship': [
                '/internship/submit'
            ],
            'reports': [
                '/reports/upload',
                '/reports/grade'
            ]
        }
    }) 