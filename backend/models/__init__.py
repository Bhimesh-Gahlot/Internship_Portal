# This file can be empty 
from .user import User
from .student import Student
from .mentor import Mentor
from .mentor_assignment import MentorAssignment
from .internship import Internship
from .evaluation import Evaluation
from .evaluation_type import EvaluationType
from .weekly_report import WeeklyReport
from .report import Report
from .mentor_feedback import MentorFeedback
from .weekly_feedback import WeeklyFeedback
from .progress_tracking import ProgressTracking
from .parent import Parent
from .alumni_relation import AlumniRelation
from .password_change_logs import PasswordChangeLogs

# Then import models that depend on them

# Add any future models here 

__all__ = [
    'User',
    'Student',
    'Mentor',
    'MentorAssignment',
    'Internship',
    'Evaluation',
    'EvaluationType',
    'WeeklyReport',
    'Report',
    'MentorFeedback',
    'WeeklyFeedback',
    'ProgressTracking',
    'Parent',
    'AlumniRelation',
    'PasswordChangeLogs'
] 