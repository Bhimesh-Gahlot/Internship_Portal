from extensions import db

class Parent(db.Model):
    __tablename__ = 'parents'
    
    id = db.Column(db.Integer, primary_key=True)
    # Keep the old column for backward compatibility
    registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=False)
    # Add the new column name for future use
    student_registration_number = db.Column(db.String(20), db.ForeignKey('students.registration_number'), nullable=True)
    
    # Father details
    father_name = db.Column(db.String(100))
    father_is_entrepreneur = db.Column(db.Boolean, default=False)
    father_is_family_business = db.Column(db.Boolean, default=False)
    father_is_public_sector = db.Column(db.Boolean, default=False)
    father_is_professional = db.Column(db.Boolean, default=False)
    father_is_govt_employee = db.Column(db.Boolean, default=False)
    father_is_private_company = db.Column(db.Boolean, default=False)
    father_organization = db.Column(db.String(255))
    father_designation = db.Column(db.String(100))
    father_mobile_no = db.Column(db.String(20))
    father_email = db.Column(db.String(120))
    
    # Mother details
    mother_name = db.Column(db.String(100))
    mother_is_entrepreneur = db.Column(db.Boolean, default=False)
    mother_is_family_business = db.Column(db.Boolean, default=False)
    mother_is_public_sector = db.Column(db.Boolean, default=False)
    mother_is_professional = db.Column(db.Boolean, default=False)
    mother_is_govt_employee = db.Column(db.Boolean, default=False)
    mother_is_private_company = db.Column(db.Boolean, default=False)
    mother_is_home_maker = db.Column(db.Boolean, default=False)
    mother_organization = db.Column(db.String(255))
    mother_designation = db.Column(db.String(100))
    mother_mobile_no = db.Column(db.String(20))
    mother_email = db.Column(db.String(120))
    
    # Business card
    business_card_image = db.Column(db.String(255))
    
    # Address fields
    communication_address = db.Column(db.Text)
    permanent_address = db.Column(db.Text)
    pin_code = db.Column(db.String(10))
    
    # Relationship with Student
    student = db.relationship('Student', backref=db.backref('parent', uselist=False), foreign_keys=[registration_number])
    
    __table_args__ = (
        db.UniqueConstraint('registration_number', name='unique_student_parents'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'registration_number': self.registration_number,
            'student_registration_number': self.student_registration_number or self.registration_number,
            'father_name': self.father_name,
            'father_is_entrepreneur': self.father_is_entrepreneur,
            'father_is_family_business': self.father_is_family_business,
            'father_is_public_sector': self.father_is_public_sector,
            'father_is_professional': self.father_is_professional,
            'father_is_govt_employee': self.father_is_govt_employee,
            'father_is_private_company': self.father_is_private_company,
            'father_organization': self.father_organization,
            'father_designation': self.father_designation,
            'father_mobile_no': self.father_mobile_no,
            'father_email': self.father_email,
            
            'mother_name': self.mother_name,
            'mother_is_entrepreneur': self.mother_is_entrepreneur,
            'mother_is_family_business': self.mother_is_family_business,
            'mother_is_public_sector': self.mother_is_public_sector,
            'mother_is_professional': self.mother_is_professional,
            'mother_is_govt_employee': self.mother_is_govt_employee,
            'mother_is_private_company': self.mother_is_private_company,
            'mother_is_home_maker': self.mother_is_home_maker,
            'mother_organization': self.mother_organization,
            'mother_designation': self.mother_designation,
            'mother_mobile_no': self.mother_mobile_no,
            'mother_email': self.mother_email,
            
            'business_card_image': self.business_card_image,
            'communication_address': self.communication_address,
            'permanent_address': self.permanent_address,
            'pin_code': self.pin_code
        }
    
    def __repr__(self):
        return f"<Parent for Student {self.registration_number}>" 