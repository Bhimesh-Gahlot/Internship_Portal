from app import app, db

with app.app_context():
    # Drop all tables first
    db.drop_all()
    # Create all tables with updated schema
    db.create_all()
    print("Database tables dropped and recreated successfully!")