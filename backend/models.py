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
    
    # Styles (max 2 free-form strings like "Formal", "Minimalist")
    styles = db.Column(db.JSON)  # ['Modern', 'Boho']
    
    # AI-generated listing attributes for Etsy properties
    # {holiday, occasion, recipient, subject, style, primary_color, secondary_color, mood}
    listing_attributes = db.Column(db.JSON)
    
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
            'styles': self.styles or [],
            'listing_attributes': self.listing_attributes or {},
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


class DescriptionTemplate(db.Model):
    """User-created description templates with variable support"""
    __tablename__ = 'description_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    name = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)  # Template with {{variables}}
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('description_templates', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def render(self, variables):
        """Render template with provided variables"""
        result = self.content
        for key, value in variables.items():
            result = result.replace(f'{{{{{key}}}}}', str(value) if value else '')
        return result


class ListingPreset(db.Model):
    """Saved presets matching Etsy listing fields - acts as Etsy listing wrapper"""
    __tablename__ = 'listing_presets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Preset identification
    name = db.Column(db.String(100), nullable=False)
    preset_type = db.Column(db.String(20), default='digital')  # 'digital', 'physical', 'both'
    
    # === REQUIRED ETSY FIELDS ===
    # Price & Inventory
    price = db.Column(db.Float, nullable=False, default=4.99)
    quantity = db.Column(db.Integer, nullable=False, default=999)
    
    # Who/When/What
    who_made = db.Column(db.String(20), default='i_did')  # 'i_did', 'someone_else', 'collective'
    when_made = db.Column(db.String(20), default='made_to_order')  # 'made_to_order', '2020_2026', etc.
    is_supply = db.Column(db.Boolean, default=False)  # True = supply, False = finished product
    
    # Category
    taxonomy_id = db.Column(db.Integer)  # Etsy category ID
    taxonomy_path = db.Column(db.String(500))  # Human-readable path for display
    
    # Type
    listing_type = db.Column(db.String(20), default='download')  # 'physical', 'download', 'both'
    
    # === SHIPPING (required for physical) ===
    shipping_profile_id = db.Column(db.String(50))
    
    # === RETURN POLICY (required for physical in most regions) ===
    return_policy_id = db.Column(db.String(50))
    
    # === OPTIONAL FIELDS ===
    # Shop organization
    shop_section_id = db.Column(db.String(50))
    
    # Renewal
    should_auto_renew = db.Column(db.Boolean, default=True)
    
    # Tax & Customization
    is_taxable = db.Column(db.Boolean, default=True)  # Apply shop tax rates at checkout
    is_customizable = db.Column(db.Boolean, default=True)  # Buyer can contact for custom order
    
    # Production partners (for print-on-demand, etc.)
    production_partner_ids = db.Column(db.JSON)  # Array of production partner IDs
    
    # Personalization
    is_personalizable = db.Column(db.Boolean, default=False)
    personalization_is_required = db.Column(db.Boolean, default=False)
    personalization_char_count_max = db.Column(db.Integer, default=256)
    personalization_instructions = db.Column(db.Text)
    
    # Physical item dimensions (for physical listings)
    item_weight = db.Column(db.Float)
    item_weight_unit = db.Column(db.String(5))  # 'oz', 'lb', 'g', 'kg'
    item_length = db.Column(db.Float)
    item_width = db.Column(db.Float)
    item_height = db.Column(db.Float)
    item_dimensions_unit = db.Column(db.String(10))  # 'in', 'ft', 'mm', 'cm', 'm'
    
    # Processing time
    processing_min = db.Column(db.Integer)
    processing_max = db.Column(db.Integer)
    
    # Materials (stored as JSON array)
    materials = db.Column(db.JSON)  # ['canvas', 'ink', etc.]
    
    # Styles (stored as JSON array, max 2)
    styles = db.Column(db.JSON)  # ['Modern', 'Minimalist']
    
    # Default tags (can be overridden per listing)
    default_tags = db.Column(db.JSON)  # Up to 13 tags
    
    # === DESCRIPTION SOURCE ===
    description_source = db.Column(db.String(20), default='ai')  # 'ai', 'template', 'manual'
    description_template_id = db.Column(db.Integer, db.ForeignKey('description_templates.id'))
    manual_description = db.Column(db.Text)  # Used when description_source = 'manual'
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('listing_presets', lazy='dynamic'))
    description_template = db.relationship('DescriptionTemplate', backref='presets')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'preset_type': self.preset_type,
            
            # Required fields
            'price': self.price,
            'quantity': self.quantity,
            'who_made': self.who_made,
            'when_made': self.when_made,
            'is_supply': self.is_supply,
            'taxonomy_id': self.taxonomy_id,
            'taxonomy_path': self.taxonomy_path,
            'listing_type': self.listing_type,
            
            # Shipping & Returns
            'shipping_profile_id': self.shipping_profile_id,
            'return_policy_id': self.return_policy_id,
            
            # Optional fields
            'shop_section_id': self.shop_section_id,
            'should_auto_renew': self.should_auto_renew,
            
            # Tax & Customization
            'is_taxable': self.is_taxable,
            'is_customizable': self.is_customizable,
            'production_partner_ids': self.production_partner_ids or [],
            
            # Personalization
            'is_personalizable': self.is_personalizable,
            'personalization_is_required': self.personalization_is_required,
            'personalization_char_count_max': self.personalization_char_count_max,
            'personalization_instructions': self.personalization_instructions,
            
            # Physical dimensions
            'item_weight': self.item_weight,
            'item_weight_unit': self.item_weight_unit,
            'item_length': self.item_length,
            'item_width': self.item_width,
            'item_height': self.item_height,
            'item_dimensions_unit': self.item_dimensions_unit,
            
            # Processing
            'processing_min': self.processing_min,
            'processing_max': self.processing_max,
            
            # Arrays
            'materials': self.materials or [],
            'styles': self.styles or [],
            'default_tags': self.default_tags or [],
            
            # Description
            'description_source': self.description_source,
            'description_template_id': self.description_template_id,
            'manual_description': self.manual_description,
            
            # Include template name if linked
            'description_template_name': self.description_template.name if self.description_template else None,
            
            # Timestamps
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def to_etsy_data(self):
        """Convert preset to Etsy API-compatible data structure"""
        data = {
            'price': self.price,
            'quantity': self.quantity,
            'who_made': self.who_made,
            'when_made': self.when_made,
            'is_supply': self.is_supply,
            'taxonomy_id': self.taxonomy_id,
            'type': self.listing_type,
            'should_auto_renew': self.should_auto_renew,
            'is_taxable': self.is_taxable,
            'is_customizable': self.is_customizable,
        }
        
        # Add optional fields only if set
        if self.shipping_profile_id:
            data['shipping_profile_id'] = int(self.shipping_profile_id)
        if self.return_policy_id:
            data['return_policy_id'] = int(self.return_policy_id)
        if self.shop_section_id:
            data['shop_section_id'] = int(self.shop_section_id)
        if self.materials:
            data['materials'] = self.materials
        if self.styles:
            data['styles'] = self.styles
        if self.default_tags:
            data['tags'] = self.default_tags
        if self.production_partner_ids:
            data['production_partner_ids'] = self.production_partner_ids
            
        # Personalization
        if self.is_personalizable:
            data['is_personalizable'] = True
            data['personalization_is_required'] = self.personalization_is_required
            if self.personalization_char_count_max:
                data['personalization_char_count_max'] = self.personalization_char_count_max
            if self.personalization_instructions:
                data['personalization_instructions'] = self.personalization_instructions
        
        # Physical item specifics
        if self.listing_type in ('physical', 'both'):
            if self.item_weight:
                data['item_weight'] = self.item_weight
                data['item_weight_unit'] = self.item_weight_unit or 'oz'
            if self.item_length:
                data['item_length'] = self.item_length
            if self.item_width:
                data['item_width'] = self.item_width
            if self.item_height:
                data['item_height'] = self.item_height
            if self.item_dimensions_unit:
                data['item_dimensions_unit'] = self.item_dimensions_unit
            if self.processing_min:
                data['processing_min'] = self.processing_min
            if self.processing_max:
                data['processing_max'] = self.processing_max
        
        return data

