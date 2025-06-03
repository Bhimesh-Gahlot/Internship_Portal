from extensions import db

class EvaluationType(db.Model):
    __tablename__ = 'evaluation_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20))
    description = db.Column(db.String(100))

    # We need to fix this relationship since evaluation_type_id doesn't exist
    # Instead, we'll create a property-based relationship
    
    def __repr__(self):
        return f"<EvaluationType {self.name}>"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        } 