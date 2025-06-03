from datetime import datetime
from extensions import db

class FinalReport(db.Model):
    """Model for storing final internship reports submitted by students."""
    __tablename__ = 'final_reports'

    id = db.Column(db.Integer, primary_key=True)
    registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    executive_summary = db.Column(db.Text, nullable=False)
    introduction = db.Column(db.Text, nullable=False)
    objectives = db.Column(db.Text, nullable=False)
    methodology = db.Column(db.Text, nullable=False)
    results_and_discussion = db.Column(db.Text, nullable=False)
    challenges_faced = db.Column(db.Text, nullable=False)
    lessons_learned = db.Column(db.Text, nullable=False)
    recommendations = db.Column(db.Text, nullable=False)
    conclusion = db.Column(db.Text, nullable=False)
    total_hours_completed = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Ensure one final report per student
    __table_args__ = (
        db.UniqueConstraint('registration_number', name='unique_final_report_per_student'),
    )

    # Relationship with Student model
    student = db.relationship('Student', backref=db.backref('final_report', uselist=False))

    def __repr__(self):
        return f'<FinalReport {self.registration_number}>'

    def to_dict(self):
        """Convert the model instance to a dictionary."""
        return {
            'id': self.id,
            'registration_number': self.registration_number,
            'title': self.title,
            'executive_summary': self.executive_summary,
            'introduction': self.introduction,
            'objectives': self.objectives,
            'methodology': self.methodology,
            'results_and_discussion': self.results_and_discussion,
            'challenges_faced': self.challenges_faced,
            'lessons_learned': self.lessons_learned,
            'recommendations': self.recommendations,
            'conclusion': self.conclusion,
            'total_hours_completed': self.total_hours_completed,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        } 