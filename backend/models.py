from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """User account model"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    templates = db.relationship('Template', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    uploads = db.relationship('Upload', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    etsy_token = db.relationship('EtsyToken', backref='user', uselist=False, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'has_etsy_connected': self.etsy_token is not None
        }


class Template(db.Model):
    """Saved templates for default settings"""
    __tablename__ = 'templates'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    default_price = db.Column(db.Float)
    category = db.Column(db.String(200))
    shipping_profile_id = db.Column(db.String(50))
    return_policy = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'default_price': self.default_price,
            'category': self.category,
            'shipping_profile_id': self.shipping_profile_id,
            'return_policy': self.return_policy,
            'created_at': self.created_at.isoformat()
        }


class Upload(db.Model):
    """Upload batch tracking"""
    __tablename__ = 'uploads'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200))
    status = db.Column(db.String(20), default='draft')  # draft, scheduled, uploading, published, failed
    scheduled_for = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    error_message = db.Column(db.Text)
    
    # Relationships
    listings = db.relationship('Listing', backref='upload', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'status': self.status,
            'scheduled_for': self.scheduled_for.isoformat() if self.scheduled_for else None,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'error_message': self.error_message,
            'listing_count': self.listings.count(),
            'listings': [l.to_dict() for l in self.listings]
        }


class Listing(db.Model):
    """Individual listing within an upload"""
    __tablename__ = 'listings'
    
    id = db.Column(db.Integer, primary_key=True)
    upload_id = db.Column(db.Integer, db.ForeignKey('uploads.id'), nullable=False)
    folder_name = db.Column(db.String(200))
    
    # Listing content
    title = db.Column(db.String(140), nullable=False)
    description = db.Column(db.Text)
    tags = db.Column(db.JSON)  # List of up to 13 tags
    price = db.Column(db.Float)
    quantity = db.Column(db.Integer, default=999)
    category = db.Column(db.String(200))
    
    # Etsy-specific IDs
    taxonomy_id = db.Column(db.Integer)  # Category ID for Etsy
    shipping_profile_id = db.Column(db.String(50))  # Shipping profile ID
    return_policy_id = db.Column(db.String(50))  # Return policy ID
    
    # SEO
    seo_score = db.Column(db.Integer)
    
    # Etsy integration
    etsy_listing_id = db.Column(db.String(50))
    etsy_url = db.Column(db.String(500))
    status = db.Column(db.String(20), default='pending')  # pending, uploaded, published, failed
    
    # Images stored as JSON array of paths
    images = db.Column(db.JSON)
    
    # Videos stored as JSON array of paths
    videos = db.Column(db.JSON)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'folder_name': self.folder_name,
            'title': self.title,
            'description': self.description,
            'tags': self.tags or [],
            'price': self.price,
            'quantity': self.quantity,
            'category': self.category,
            'taxonomy_id': self.taxonomy_id,
            'shipping_profile_id': self.shipping_profile_id,
            'return_policy_id': self.return_policy_id,
            'seo_score': self.seo_score,
            'etsy_listing_id': self.etsy_listing_id,
            'etsy_url': self.etsy_url,
            'status': self.status,
            'images': self.images or [],
            'videos': self.videos or [],
            'created_at': self.created_at.isoformat()
        }


class EtsyToken(db.Model):
    """Encrypted Etsy OAuth tokens"""
    __tablename__ = 'etsy_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Encrypted tokens
    access_token_encrypted = db.Column(db.LargeBinary)
    refresh_token_encrypted = db.Column(db.LargeBinary)
    
    # Token metadata
    expires_at = db.Column(db.DateTime)
    shop_id = db.Column(db.String(50))
    shop_name = db.Column(db.String(200))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'shop_id': self.shop_id,
            'shop_name': self.shop_name,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_valid': self.expires_at and self.expires_at > datetime.utcnow()
        }


class UserSettings(db.Model):
    """User-specific default settings for listings"""
    __tablename__ = 'user_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Default listing settings
    default_price = db.Column(db.Float, default=10.0)
    default_quantity = db.Column(db.Integer, default=999)
    auto_renew = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('settings', uselist=False))
    
    def to_dict(self):
        return {
            'default_price': self.default_price,
            'default_quantity': self.default_quantity,
            'auto_renew': self.auto_renew
        }

