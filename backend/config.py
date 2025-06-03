import os
from datetime import timedelta

class Config:
    # Database configuration
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:yoyobheemsa@localhost/internship_portal'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = True  # For debugging SQL queries
    
    # JWT configuration
    JWT_SECRET_KEY = 'your-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    
    # Application secret key
    SECRET_KEY = 'dev-secret-key'
    
    # Mail configuration
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = 'bhimeshgahlot3@gmail.com'
    MAIL_PASSWORD = 'yoyobheemsa' 