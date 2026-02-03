import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///etsy_uploader.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Fix for Render PostgreSQL URL
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)
    
    # Groq API
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
    
    # Etsy API
    ETSY_API_KEY = os.environ.get('ETSY_API_KEY')
    ETSY_SHARED_SECRET = os.environ.get('ETSY_SHARED_SECRET')
    ETSY_REDIRECT_URI = os.environ.get('ETSY_REDIRECT_URI', 'http://localhost:5000/api/etsy/callback')
    
    # File upload settings
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # Encryption key for storing tokens
    FERNET_KEY = os.environ.get('FERNET_KEY')


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
