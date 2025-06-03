from extensions import db

class AlumniRelation(db.Model):
    __tablename__ = 'alumni_relations'
    
    id = db.Column(db.Integer, primary_key=True)
    registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=False)
    alumni_registration_number = db.Column(db.String(20))
    alumni_name = db.Column(db.String(100))
    alumni_branch = db.Column(db.String(255))
    alumni_batch = db.Column(db.String(20))
    relation_with_student = db.Column(db.String(100))

    # Relationship with Student
    student = db.relationship('Student', backref=db.backref('alumni_relation', uselist=False))

    def __repr__(self):
        return f"<AlumniRelation {self.alumni_name} - {self.relation_with_student}>"

    def to_dict(self):
        return {
            'id': self.id,
            'registration_number': self.registration_number,
            'alumni_registration_number': self.alumni_registration_number,
            'alumni_name': self.alumni_name,
            'alumni_branch': self.alumni_branch,
            'alumni_batch': self.alumni_batch,
            'relation_with_student': self.relation_with_student
        } 