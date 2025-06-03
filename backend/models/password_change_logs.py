from extensions import db
from datetime import datetime

class PasswordChangeLogs(db.Model):
    __tablename__ = 'password_change_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    changed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='password_changes')
    changed_by = db.relationship('User', foreign_keys=[changed_by_id])

    def __repr__(self):
        return f"<PasswordChangeLog {self.id} - User: {self.user_id}>"

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'changed_by_id': self.changed_by_id,
            'changed_at': self.changed_at.strftime('%Y-%m-%d %H:%M:%S') if self.changed_at else None
        } 