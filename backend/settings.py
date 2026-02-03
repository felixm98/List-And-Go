"""
Settings Blueprint - User settings and API credentials management
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User
from etsy_api import encrypt_token, decrypt_token

settings_bp = Blueprint('settings', __name__)


# We need to add UserSettings model - this gets imported from models.py
# But first we need to check if it exists and create it dynamically
def get_or_create_settings_model():
    """Get or create UserSettings model"""
    from models import db
    
    class UserSettings(db.Model):
        """User-specific settings including API credentials"""
        __tablename__ = 'user_settings'
        __table_args__ = {'extend_existing': True}
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
        
        # Etsy API credentials (encrypted)
        etsy_api_key_encrypted = db.Column(db.LargeBinary)
        etsy_shared_secret_encrypted = db.Column(db.LargeBinary)
        
        # Groq API key (encrypted) - optional, falls back to env
        groq_api_key_encrypted = db.Column(db.LargeBinary)
        
        # Default listing settings
        default_price = db.Column(db.Float, default=10.0)
        default_quantity = db.Column(db.Integer, default=999)
        auto_renew = db.Column(db.Boolean, default=True)
        
        def to_dict(self):
            return {
                'has_etsy_credentials': self.etsy_api_key_encrypted is not None,
                'has_groq_key': self.groq_api_key_encrypted is not None,
                'default_price': self.default_price,
                'default_quantity': self.default_quantity,
                'auto_renew': self.auto_renew
            }
    
    return UserSettings


@settings_bp.route('/api/settings', methods=['GET'])
@jwt_required()
def get_settings():
    """Get user settings"""
    user_id = get_jwt_identity()
    UserSettings = get_or_create_settings_model()
    
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    
    if not settings:
        # Return defaults
        return jsonify({
            'has_etsy_credentials': False,
            'has_groq_key': False,
            'default_price': 10.0,
            'default_quantity': 999,
            'auto_renew': True
        })
    
    return jsonify(settings.to_dict())


@settings_bp.route('/api/settings', methods=['POST'])
@jwt_required()
def save_settings():
    """Save user settings"""
    user_id = get_jwt_identity()
    data = request.get_json()
    UserSettings = get_or_create_settings_model()
    
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.session.add(settings)
    
    # Update Etsy credentials if provided
    if data.get('etsy_api_key'):
        settings.etsy_api_key_encrypted = encrypt_token(data['etsy_api_key'])
    
    if data.get('etsy_shared_secret'):
        settings.etsy_shared_secret_encrypted = encrypt_token(data['etsy_shared_secret'])
    
    # Update Groq API key if provided
    if data.get('groq_api_key'):
        settings.groq_api_key_encrypted = encrypt_token(data['groq_api_key'])
    
    # Update default settings
    if 'default_price' in data:
        settings.default_price = data['default_price']
    
    if 'default_quantity' in data:
        settings.default_quantity = data['default_quantity']
    
    if 'auto_renew' in data:
        settings.auto_renew = data['auto_renew']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Settings saved successfully',
        **settings.to_dict()
    })


def get_user_etsy_credentials(user_id):
    """Get user's Etsy API credentials, falling back to environment variables"""
    import os
    UserSettings = get_or_create_settings_model()
    
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    
    if settings and settings.etsy_api_key_encrypted:
        return {
            'api_key': decrypt_token(settings.etsy_api_key_encrypted),
            'shared_secret': decrypt_token(settings.etsy_shared_secret_encrypted) if settings.etsy_shared_secret_encrypted else None
        }
    
    # Fall back to environment variables
    return {
        'api_key': os.environ.get('ETSY_API_KEY'),
        'shared_secret': os.environ.get('ETSY_SHARED_SECRET')
    }


def get_user_groq_key(user_id):
    """Get user's Groq API key, falling back to environment variable"""
    import os
    UserSettings = get_or_create_settings_model()
    
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    
    if settings and settings.groq_api_key_encrypted:
        return decrypt_token(settings.groq_api_key_encrypted)
    
    # Fall back to environment variable
    return os.environ.get('GROQ_API_KEY')
