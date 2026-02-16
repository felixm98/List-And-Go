"""
List-And-Go - Flask Backend

Main application file with all API routes.
"""

import os
import base64
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, redirect, session
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from sqlalchemy import inspect, text

from config import config
from models import db, User, Template, Upload, Listing, EtsyToken, ListingPreset, DescriptionTemplate, EtsyListing
from auth import auth_bp, get_or_create_user_from_etsy, create_tokens_for_user
from settings import settings_bp
from ai_generator import generate_listing_content, regenerate_field, encode_image_bytes_to_base64
from mockup_analyzer import (
    analyze_image_for_prompt, search_etsy_bestsellers,
    encode_image_bytes, encode_image_from_url, batch_analyze_images
)
from seo_scorer import calculate_seo_score
from etsy_api import (
    get_authorization_url, exchange_code_for_tokens, refresh_access_token,
    get_shop_info, get_shipping_profiles, get_return_policies, get_shop_sections,
    create_draft_listing, upload_listing_image, upload_listing_video, publish_listing,
    encrypt_token, decrypt_token, get_taxonomy_nodes, get_taxonomy_properties,
    update_listing_property, get_listing_properties, set_listing_attributes_from_ai,
    get_shop_listings, get_all_shop_listings, get_listing, get_listing_images,
    delete_listing_image, update_listing
)
from scheduler import init_scheduler, schedule_publish, cancel_scheduled_publish, shutdown_scheduler
from api_compliance import is_cache_stale, get_cache_age_info, get_compliance_status, get_rate_limiter

import atexit


def migrate_database(app):
    """Add missing columns to existing tables"""
    with app.app_context():
        inspector = inspect(db.engine)
        
        # Define columns to add for each table
        migrations = {
            'listing_presets': [
                # Newer fields that might be missing
                ('is_taxable', 'BOOLEAN DEFAULT 1'),
                ('is_customizable', 'BOOLEAN DEFAULT 1'),
                ('production_partner_ids', 'TEXT'),  # JSON stored as TEXT in SQLite
                ('taxonomy_id', 'INTEGER'),
                ('taxonomy_path', 'VARCHAR(500)'),
                ('category_properties', 'TEXT'),  # JSON stored as TEXT in SQLite
                # New fields for Etsy parity
                ('sku', 'VARCHAR(50)'),
                ('primary_color', 'VARCHAR(50)'),
                ('secondary_color', 'VARCHAR(50)'),
                ('is_featured', 'BOOLEAN DEFAULT 0'),
                ('note_to_buyers', 'TEXT'),
            ],
            'listings': [
                ('styles', 'TEXT'),  # JSON stored as TEXT
                ('listing_attributes', 'TEXT'),  # JSON stored as TEXT
                ('taxonomy_id', 'INTEGER'),
            ]
        }
        
        for table_name, columns in migrations.items():
            if table_name in inspector.get_table_names():
                existing_columns = [col['name'] for col in inspector.get_columns(table_name)]
                
                for col_name, col_type in columns:
                    if col_name not in existing_columns:
                        try:
                            db.session.execute(text(f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}'))
                            db.session.commit()
                            print(f"Added column {col_name} to {table_name}")
                        except Exception as e:
                            db.session.rollback()
                            print(f"Column {col_name} might already exist in {table_name}: {e}")


def create_app(config_name='default'):
    """Application factory"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, supports_credentials=True)
    JWTManager(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(settings_bp)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    # Run migrations for any missing columns
    migrate_database(app)
    
    # Initialize scheduler
    init_scheduler(app)
    atexit.register(shutdown_scheduler)
    
    # Store PKCE verifiers (in production, use Redis)
    app.pkce_verifiers = {}
    
    return app



app = create_app(os.environ.get('FLASK_ENV', 'development'))

# Root route for Render health check and info
@app.route('/')
def index():
    return 'List-And-Go backend is running!'


# ============== API Compliance Routes ==============

@app.route('/api/compliance/status', methods=['GET'])
@jwt_required()
def get_api_compliance_status():
    """
    Get API compliance status including rate limits and cache freshness.
    
    This endpoint helps monitor compliance with Etsy API Terms:
    - Section 2: Rate Limiting
    - Section 5: Data Freshness
    - Section 7: Security Notifications
    """
    user_id = get_jwt_identity()
    
    # Get rate limiter status
    rate_limiter = get_rate_limiter()
    rate_status = rate_limiter.get_status()
    
    # Get cache freshness for user's listings
    from models import EtsyListing
    oldest_listing = EtsyListing.query.filter_by(user_id=user_id).order_by(
        EtsyListing.synced_at.asc()
    ).first()
    
    cache_freshness = None
    if oldest_listing and oldest_listing.synced_at:
        cache_freshness = get_cache_age_info(oldest_listing.synced_at, is_listing=True)
    
    return jsonify({
        'compliance': get_compliance_status(),
        'current_status': {
            'rate_limit': rate_status,
            'cache_freshness': cache_freshness
        }
    })


# ============== Template Routes ==============

@app.route('/api/templates', methods=['GET'])
@jwt_required()
def get_templates():
    """Get user's saved templates"""
    user_id = get_jwt_identity()
    templates = Template.query.filter_by(user_id=user_id).all()
    return jsonify([t.to_dict() for t in templates])


@app.route('/api/templates', methods=['POST'])
@jwt_required()
def create_template():
    """Create a new template"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    template = Template(
        user_id=user_id,
        name=data.get('name', 'Untitled'),
        default_price=data.get('default_price'),
        category=data.get('category'),
        shipping_profile_id=data.get('shipping_profile_id'),
        return_policy=data.get('return_policy')
    )
    
    db.session.add(template)
    db.session.commit()
    
    return jsonify(template.to_dict()), 201


@app.route('/api/templates/<int:template_id>', methods=['DELETE'])
@jwt_required()
def delete_template(template_id):
    """Delete a template"""
    user_id = get_jwt_identity()
    template = Template.query.filter_by(id=template_id, user_id=user_id).first()
    
    if not template:
        return jsonify({'error': 'Template not found'}), 404
    
    db.session.delete(template)
    db.session.commit()
    
    return jsonify({'message': 'Template deleted'}), 200


# ============== Listing Presets Routes ==============

@app.route('/api/presets', methods=['GET'])
@jwt_required()
def get_presets():
    """Get user's listing presets"""
    user_id = get_jwt_identity()
    presets = ListingPreset.query.filter_by(user_id=user_id).order_by(ListingPreset.name).all()
    return jsonify([p.to_dict() for p in presets])


@app.route('/api/presets', methods=['POST'])
@jwt_required()
def create_preset():
    """Create a new listing preset"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        preset = ListingPreset(
            user_id=user_id,
            name=data.get('name', 'Untitled Preset'),
            preset_type=data.get('preset_type', 'digital'),
            
            # Required fields
            price=data.get('price', 4.99),
            quantity=data.get('quantity', 999),
            who_made=data.get('who_made', 'i_did'),
            when_made=data.get('when_made', 'made_to_order'),
            is_supply=data.get('is_supply', False),
            taxonomy_id=data.get('taxonomy_id'),
            taxonomy_path=data.get('taxonomy_path'),
            listing_type=data.get('listing_type', 'download'),
            
            # Shipping & Returns
            shipping_profile_id=data.get('shipping_profile_id'),
            return_policy_id=data.get('return_policy_id'),
            
            # Optional
            shop_section_id=data.get('shop_section_id'),
            should_auto_renew=data.get('should_auto_renew', True),
            
            # Tax & Customization
            is_taxable=data.get('is_taxable', True),
            is_customizable=data.get('is_customizable', True),
            production_partner_ids=data.get('production_partner_ids'),
            
            # Personalization
            is_personalizable=data.get('is_personalizable', False),
            personalization_is_required=data.get('personalization_is_required', False),
            personalization_char_count_max=data.get('personalization_char_count_max', 256),
            personalization_instructions=data.get('personalization_instructions'),
            
            # Physical dimensions
            item_weight=data.get('item_weight'),
            item_weight_unit=data.get('item_weight_unit'),
            item_length=data.get('item_length'),
            item_width=data.get('item_width'),
            item_height=data.get('item_height'),
            item_dimensions_unit=data.get('item_dimensions_unit'),
            
            # Processing
            processing_min=data.get('processing_min'),
            processing_max=data.get('processing_max'),
            
            # Arrays
            materials=data.get('materials'),
            styles=data.get('styles'),
            default_tags=data.get('default_tags'),
            category_properties=data.get('category_properties'),
            
            # Description
            description_source=data.get('description_source', 'ai'),
            description_template_id=data.get('description_template_id'),
            manual_description=data.get('manual_description'),
            
            # New fields for Etsy parity
            sku=data.get('sku'),
            primary_color=data.get('primary_color'),
            secondary_color=data.get('secondary_color'),
            is_featured=data.get('is_featured', False),
            note_to_buyers=data.get('note_to_buyers')
        )
        
        db.session.add(preset)
        db.session.commit()
        
        return jsonify(preset.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to create preset: {str(e)}'}), 500


@app.route('/api/presets/<int:preset_id>', methods=['GET'])
@jwt_required()
def get_preset(preset_id):
    """Get a single preset"""
    user_id = get_jwt_identity()
    preset = ListingPreset.query.filter_by(id=preset_id, user_id=user_id).first()
    
    if not preset:
        return jsonify({'error': 'Preset not found'}), 404
    
    return jsonify(preset.to_dict())


@app.route('/api/presets/<int:preset_id>', methods=['PUT'])
@jwt_required()
def update_preset(preset_id):
    """Update a listing preset"""
    user_id = get_jwt_identity()
    preset = ListingPreset.query.filter_by(id=preset_id, user_id=user_id).first()
    
    if not preset:
        return jsonify({'error': 'Preset not found'}), 404
    
    data = request.get_json()
    
    # Update all fields
    for field in ['name', 'preset_type', 'price', 'quantity', 'who_made', 'when_made',
                  'is_supply', 'taxonomy_id', 'taxonomy_path', 'listing_type',
                  'shipping_profile_id', 'return_policy_id', 'shop_section_id',
                  'should_auto_renew', 'is_taxable', 'is_customizable', 'production_partner_ids',
                  'is_personalizable', 'personalization_is_required',
                  'personalization_char_count_max', 'personalization_instructions',
                  'item_weight', 'item_weight_unit', 'item_length', 'item_width',
                  'item_height', 'item_dimensions_unit', 'processing_min', 'processing_max',
                  'materials', 'styles', 'default_tags', 'category_properties', 'description_source',
                  'description_template_id', 'manual_description',
                  'sku', 'primary_color', 'secondary_color', 'is_featured', 'note_to_buyers']:
        if field in data:
            setattr(preset, field, data[field])
    
    db.session.commit()
    
    return jsonify(preset.to_dict())


@app.route('/api/presets/<int:preset_id>', methods=['DELETE'])
@jwt_required()
def delete_preset(preset_id):
    """Delete a listing preset"""
    user_id = get_jwt_identity()
    preset = ListingPreset.query.filter_by(id=preset_id, user_id=user_id).first()
    
    if not preset:
        return jsonify({'error': 'Preset not found'}), 404
    
    db.session.delete(preset)
    db.session.commit()
    
    return jsonify({'message': 'Preset deleted'})


# ============== Description Templates Routes ==============

@app.route('/api/description-templates', methods=['GET'])
@jwt_required()
def get_description_templates():
    """Get user's description templates"""
    user_id = get_jwt_identity()
    templates = DescriptionTemplate.query.filter_by(user_id=user_id).order_by(DescriptionTemplate.name).all()
    return jsonify([t.to_dict() for t in templates])


@app.route('/api/description-templates', methods=['POST'])
@jwt_required()
def create_description_template():
    """Create a new description template"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('name') or not data.get('content'):
        return jsonify({'error': 'Name and content are required'}), 400
    
    template = DescriptionTemplate(
        user_id=user_id,
        name=data['name'],
        content=data['content']
    )
    
    db.session.add(template)
    db.session.commit()
    
    return jsonify(template.to_dict()), 201


@app.route('/api/description-templates/<int:template_id>', methods=['GET'])
@jwt_required()
def get_description_template(template_id):
    """Get a single description template"""
    user_id = get_jwt_identity()
    template = DescriptionTemplate.query.filter_by(id=template_id, user_id=user_id).first()
    
    if not template:
        return jsonify({'error': 'Template not found'}), 404
    
    return jsonify(template.to_dict())


@app.route('/api/description-templates/<int:template_id>', methods=['PUT'])
@jwt_required()
def update_description_template(template_id):
    """Update a description template"""
    user_id = get_jwt_identity()
    template = DescriptionTemplate.query.filter_by(id=template_id, user_id=user_id).first()
    
    if not template:
        return jsonify({'error': 'Template not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        template.name = data['name']
    if 'content' in data:
        template.content = data['content']
    
    db.session.commit()
    
    return jsonify(template.to_dict())


@app.route('/api/description-templates/<int:template_id>', methods=['DELETE'])
@jwt_required()
def delete_description_template(template_id):
    """Delete a description template"""
    user_id = get_jwt_identity()
    template = DescriptionTemplate.query.filter_by(id=template_id, user_id=user_id).first()
    
    if not template:
        return jsonify({'error': 'Template not found'}), 404
    
    # Check if any presets use this template
    presets_using = ListingPreset.query.filter_by(
        user_id=user_id, 
        description_template_id=template_id
    ).count()
    
    if presets_using > 0:
        return jsonify({
            'error': f'Cannot delete: {presets_using} preset(s) are using this template'
        }), 400
    
    db.session.delete(template)
    db.session.commit()
    
    return jsonify({'message': 'Template deleted'})


@app.route('/api/description-templates/<int:template_id>/preview', methods=['POST'])
@jwt_required()
def preview_description_template(template_id):
    """Preview a description template with variables"""
    user_id = get_jwt_identity()
    template = DescriptionTemplate.query.filter_by(id=template_id, user_id=user_id).first()
    
    if not template:
        return jsonify({'error': 'Template not found'}), 404
    
    data = request.get_json()
    variables = data.get('variables', {})
    
    rendered = template.render(variables)
    
    return jsonify({'rendered': rendered})


# ============== AI Generation Routes ==============

@app.route('/api/generate', methods=['POST'])
@jwt_required()
def generate_content():
    """Generate listing content from an image using AI"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    image_file = request.files['image']
    folder_name = request.form.get('folder_name', '')
    image_count = int(request.form.get('image_count', 1))
    category_hint = request.form.get('category_hint', '')
    
    try:
        # Read and encode image
        image_bytes = image_file.read()
        image_base64 = encode_image_bytes_to_base64(image_bytes)
        
        # Generate content
        content = generate_listing_content(
            image_data=image_base64,
            folder_name=folder_name,
            image_count=image_count,
            category_hint=category_hint
        )
        
        # Calculate SEO score
        seo = calculate_seo_score(
            content.get('title', ''),
            content.get('description', ''),
            content.get('tags', [])
        )
        
        content['seo_score'] = seo['overall_score']
        content['seo_breakdown'] = seo['breakdown']
        content['seo_tips'] = seo['tips']
        content['seo_grade'] = seo['grade']
        
        return jsonify(content)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/regenerate', methods=['POST'])
@jwt_required()
def regenerate_content():
    """Regenerate a specific field"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    image_file = request.files['image']
    field = request.form.get('field')  # title, description, tags
    instruction = request.form.get('instruction', '')
    current_content = request.form.get('current_content', '{}')
    
    if field not in ['title', 'description', 'tags']:
        return jsonify({'error': 'Invalid field'}), 400
    
    try:
        import json
        current = json.loads(current_content)
        
        image_bytes = image_file.read()
        image_base64 = encode_image_bytes_to_base64(image_bytes)
        
        new_value = regenerate_field(image_base64, field, current, instruction)
        
        return jsonify({field: new_value})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/seo-score', methods=['POST'])
@jwt_required()
def get_seo_score():
    """Calculate SEO score for given content"""
    data = request.get_json()
    
    seo = calculate_seo_score(
        data.get('title', ''),
        data.get('description', ''),
        data.get('tags', [])
    )
    
    return jsonify(seo)


# ============== Etsy OAuth Routes (Login) ==============

@app.route('/api/etsy/login', methods=['GET'])
def etsy_login():
    """
    Start Etsy OAuth flow for login.
    This is the primary authentication method - users log in via Etsy.
    """
    import secrets
    
    try:
        # Generate a random state for CSRF protection
        state = secrets.token_urlsafe(32)
        auth_url, verifier, _ = get_authorization_url(state=state)
        
        # Store verifier for callback (in production, use Redis with expiry)
        app.pkce_verifiers[state] = verifier
        
        return jsonify({'auth_url': auth_url})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/etsy/callback', methods=['GET'])
def etsy_callback():
    """
    Handle Etsy OAuth callback.
    Creates/updates user based on Etsy shop and returns JWT tokens.
    """
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    
    # Get frontend URL for redirects
    frontend_url = os.environ.get('FRONTEND_URL', '')
    
    if error:
        return redirect(f'{frontend_url}/login?error={error}')
    
    if not code or not state:
        return redirect(f'{frontend_url}/login?error=missing_params')
    
    # Get verifier
    verifier = app.pkce_verifiers.get(state)
    if not verifier:
        return redirect(f'{frontend_url}/login?error=invalid_state')
    
    try:
        # Exchange code for Etsy tokens
        tokens = exchange_code_for_tokens(code, verifier)
        
        # Clean up verifier
        del app.pkce_verifiers[state]
        
        # Get shop info from Etsy
        etsy_user_id = tokens['access_token'].split('.')[0]
        shop_info = get_shop_info(tokens['access_token'], etsy_user_id)
        
        if not shop_info:
            return redirect(f'{frontend_url}/login?error=no_shop')
        
        shop_id = str(shop_info['shop_id'])
        shop_name = shop_info['shop_name']
        
        # Get or create user based on Etsy shop
        user = get_or_create_user_from_etsy(shop_id, shop_name)
        
        # Save or update Etsy token
        etsy_token = EtsyToken.query.filter_by(user_id=user.id).first()
        
        if not etsy_token:
            etsy_token = EtsyToken(user_id=user.id)
            db.session.add(etsy_token)
        
        etsy_token.access_token_encrypted = encrypt_token(tokens['access_token'])
        etsy_token.refresh_token_encrypted = encrypt_token(tokens['refresh_token'])
        etsy_token.expires_at = datetime.utcnow() + timedelta(seconds=tokens['expires_in'])
        etsy_token.shop_id = shop_id
        etsy_token.shop_name = shop_name
        
        db.session.commit()
        
        # Create JWT tokens for the app
        jwt_tokens = create_tokens_for_user(user)
        
        # Redirect to frontend with tokens
        access = jwt_tokens['access_token']
        refresh = jwt_tokens['refresh_token']
        return redirect(f'{frontend_url}/auth-callback?access_token={access}&refresh_token={refresh}&shop_name={shop_name}')
        
    except Exception as e:
        print(f"Etsy callback error: {e}")
        import traceback
        traceback.print_exc()
        return redirect(f'{frontend_url}/login?error=auth_failed')


@app.route('/api/etsy/status', methods=['GET'])
@jwt_required()
def etsy_status():
    """Get Etsy connection status"""
    user_id = get_jwt_identity()
    etsy_token = EtsyToken.query.filter_by(user_id=user_id).first()
    
    if not etsy_token:
        return jsonify({'connected': False})
    
    return jsonify({
        'connected': True,
        'shop': etsy_token.to_dict()
    })


@app.route('/api/etsy/disconnect', methods=['POST'])
@jwt_required()
def etsy_disconnect():
    """Disconnect Etsy account"""
    user_id = get_jwt_identity()
    etsy_token = EtsyToken.query.filter_by(user_id=user_id).first()
    
    if etsy_token:
        db.session.delete(etsy_token)
        db.session.commit()
    
    return jsonify({'message': 'Etsy disconnected'})


@app.route('/api/etsy/shipping-profiles', methods=['GET'])
@jwt_required()
def get_etsy_shipping_profiles():
    """Get user's Etsy shipping profiles"""
    user_id = get_jwt_identity()
    etsy_token = EtsyToken.query.filter_by(user_id=user_id).first()
    
    if not etsy_token:
        return jsonify({'error': 'Etsy not connected'}), 400
    
    try:
        access_token = decrypt_token(etsy_token.access_token_encrypted)
        profiles = get_shipping_profiles(access_token, etsy_token.shop_id)
        return jsonify(profiles)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/etsy/return-policies', methods=['GET'])
@jwt_required()
def get_etsy_return_policies():
    """Get user's Etsy return policies"""
    user_id = get_jwt_identity()
    etsy_token = EtsyToken.query.filter_by(user_id=user_id).first()
    
    if not etsy_token:
        return jsonify({'error': 'Etsy not connected'}), 400
    
    try:
        access_token = decrypt_token(etsy_token.access_token_encrypted)
        policies = get_return_policies(access_token, etsy_token.shop_id)
        return jsonify(policies)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/etsy/categories', methods=['GET'])
def get_categories():
    """Get Etsy taxonomy/categories"""
    try:
        categories = get_taxonomy_nodes()
        return jsonify(categories)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/etsy/categories/<int:taxonomy_id>/properties', methods=['GET'])
def get_category_properties(taxonomy_id):
    """Get available listing properties for a specific category/taxonomy.
    
    Properties are category-specific attributes like Holiday, Color, Style, etc.
    Returns a list of properties with their possible values.
    """
    try:
        properties = get_taxonomy_properties(taxonomy_id)
        return jsonify({
            'taxonomy_id': taxonomy_id,
            'properties': properties,
            'count': len(properties)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/etsy/shop-sections', methods=['GET'])
@jwt_required()
def get_etsy_shop_sections():
    """Get user's Etsy shop sections"""
    user_id = get_jwt_identity()
    etsy_token = EtsyToken.query.filter_by(user_id=user_id).first()
    
    if not etsy_token:
        return jsonify({'error': 'Etsy not connected'}), 400
    
    try:
        access_token = decrypt_token(etsy_token.access_token_encrypted)
        sections = get_shop_sections(access_token, etsy_token.shop_id)
        return jsonify(sections)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== Upload Routes ==============

@app.route('/api/uploads', methods=['GET'])
@jwt_required()
def get_uploads():
    """Get user's upload history"""
    user_id = get_jwt_identity()
    uploads = Upload.query.filter_by(user_id=user_id).order_by(Upload.created_at.desc()).all()
    return jsonify([u.to_dict() for u in uploads])


@app.route('/api/uploads', methods=['POST'])
@jwt_required()
def create_upload():
    """Create a new upload batch with listings"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Check Etsy connection
    etsy_token = EtsyToken.query.filter_by(user_id=user_id).first()
    if not etsy_token:
        return jsonify({'error': 'Etsy not connected'}), 400
    
    # Create upload
    scheduled_for = None
    if data.get('scheduled_for'):
        scheduled_for = datetime.fromisoformat(data['scheduled_for'].replace('Z', '+00:00'))
    
    upload = Upload(
        user_id=user_id,
        title=data.get('title', f"{len(data.get('listings', []))} produkter"),
        status='scheduled' if scheduled_for else 'draft',
        scheduled_for=scheduled_for
    )
    
    db.session.add(upload)
    db.session.flush()  # Get upload.id
    
    # Create listings
    for listing_data in data.get('listings', []):
        listing = Listing(
            upload_id=upload.id,
            folder_name=listing_data.get('folder_name'),
            title=listing_data['title'],
            description=listing_data.get('description', ''),
            tags=listing_data.get('tags', []),
            price=listing_data.get('price'),
            quantity=listing_data.get('quantity', 999),
            category=listing_data.get('category'),
            taxonomy_id=listing_data.get('categoryId'),
            shipping_profile_id=listing_data.get('shippingProfileId'),
            return_policy_id=listing_data.get('returnPolicyId'),
            styles=listing_data.get('styles', []),
            listing_attributes=listing_data.get('listing_attributes', {}),
            seo_score=listing_data.get('seo_score') or listing_data.get('seoScore'),
            images=listing_data.get('images', []),
            videos=listing_data.get('videos', [])
        )
        db.session.add(listing)
    
    db.session.commit()
    
    # Schedule if needed
    if scheduled_for:
        schedule_publish(upload.id, scheduled_for, app)
    
    return jsonify(upload.to_dict()), 201


@app.route('/api/uploads/<int:upload_id>/listings/<int:listing_id>/videos', methods=['POST'])
@jwt_required()
def upload_video_to_listing(upload_id, listing_id):
    """
    Upload a video file to a specific listing.
    
    This endpoint accepts a video file and uploads it to Etsy.
    The listing must already have an etsy_listing_id from a prior publish.
    
    Etsy video requirements:
    - Max file size: 100MB
    - Supported formats: MP4, MOV
    - Max duration: 15 seconds
    - Max resolution: 4K (3840x2160)
    """
    user_id = get_jwt_identity()
    
    # Validate upload ownership
    upload = Upload.query.filter_by(id=upload_id, user_id=user_id).first()
    if not upload:
        return jsonify({'error': 'Upload not found'}), 404
    
    # Get the listing
    listing = Listing.query.filter_by(id=listing_id, upload_id=upload_id).first()
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404
    
    if not listing.etsy_listing_id:
        return jsonify({'error': 'Listing has not been published to Etsy yet'}), 400
    
    # Check Etsy connection
    etsy_token = EtsyToken.query.filter_by(user_id=user_id).first()
    if not etsy_token:
        return jsonify({'error': 'Etsy not connected'}), 400
    
    # Get video file from request
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    video_file = request.files['video']
    
    # Validate file type
    allowed_extensions = {'.mp4', '.mov'}
    file_ext = os.path.splitext(video_file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        return jsonify({'error': f'Invalid video format. Allowed: {", ".join(allowed_extensions)}'}), 400
    
    try:
        access_token = decrypt_token(etsy_token.access_token_encrypted)
        
        # Check if token needs refresh
        if etsy_token.expires_at and etsy_token.expires_at <= datetime.utcnow():
            refresh_token_str = decrypt_token(etsy_token.refresh_token_encrypted)
            new_tokens = refresh_access_token(refresh_token_str)
            
            etsy_token.access_token_encrypted = encrypt_token(new_tokens['access_token'])
            etsy_token.refresh_token_encrypted = encrypt_token(new_tokens['refresh_token'])
            etsy_token.expires_at = datetime.utcnow() + timedelta(seconds=new_tokens['expires_in'])
            
            access_token = new_tokens['access_token']
            db.session.commit()
        
        # Read video data
        video_data = video_file.read()
        
        # Check file size (100MB limit)
        if len(video_data) > 100 * 1024 * 1024:
            return jsonify({'error': 'Video file too large. Maximum size is 100MB'}), 400
        
        # Upload to Etsy
        result = upload_listing_video(
            access_token,
            etsy_token.shop_id,
            listing.etsy_listing_id,
            video_data,
            video_file.filename
        )
        
        # Update listing videos metadata
        videos = listing.videos or []
        videos.append({
            'name': video_file.filename,
            'etsy_video_id': result.get('video_id'),
            'uploaded_at': datetime.utcnow().isoformat()
        })
        listing.videos = videos
        db.session.commit()
        
        return jsonify({
            'message': 'Video uploaded successfully',
            'video_id': result.get('video_id'),
            'listing_id': listing.id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/uploads/<int:upload_id>/listings/<int:listing_id>/images', methods=['POST'])
@jwt_required()
def upload_image_to_listing(upload_id, listing_id):
    """
    Upload an image file to a specific listing.
    
    This endpoint accepts an image file and uploads it to Etsy.
    The listing must already have an etsy_listing_id from a prior publish.
    
    Etsy image requirements:
    - Max file size: 10MB
    - Supported formats: JPG, PNG, GIF
    - Min dimensions: 2000x2000 recommended for quality
    """
    user_id = get_jwt_identity()
    
    # Validate upload ownership
    upload = Upload.query.filter_by(id=upload_id, user_id=user_id).first()
    if not upload:
        return jsonify({'error': 'Upload not found'}), 404
    
    # Get the listing
    listing = Listing.query.filter_by(id=listing_id, upload_id=upload_id).first()
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404
    
    if not listing.etsy_listing_id:
        return jsonify({'error': 'Listing has not been published to Etsy yet'}), 400
    
    # Check Etsy connection
    etsy_token = EtsyToken.query.filter_by(user_id=user_id).first()
    if not etsy_token:
        return jsonify({'error': 'Etsy not connected'}), 400
    
    # Get image file from request
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    image_file = request.files['image']
    rank = request.form.get('rank', 1, type=int)
    alt_text = request.form.get('alt_text', '')
    
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif'}
    file_ext = os.path.splitext(image_file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        return jsonify({'error': f'Invalid image format. Allowed: {", ".join(allowed_extensions)}'}), 400
    
    try:
        access_token = decrypt_token(etsy_token.access_token_encrypted)
        
        # Check if token needs refresh
        if etsy_token.expires_at and etsy_token.expires_at <= datetime.utcnow():
            refresh_token_str = decrypt_token(etsy_token.refresh_token_encrypted)
            new_tokens = refresh_access_token(refresh_token_str)
            
            etsy_token.access_token_encrypted = encrypt_token(new_tokens['access_token'])
            etsy_token.refresh_token_encrypted = encrypt_token(new_tokens['refresh_token'])
            etsy_token.expires_at = datetime.utcnow() + timedelta(seconds=new_tokens['expires_in'])
            
            access_token = new_tokens['access_token']
            db.session.commit()
        
        # Read image data
        image_data = image_file.read()
        
        # Check file size (10MB limit)
        if len(image_data) > 10 * 1024 * 1024:
            return jsonify({'error': 'Image file too large. Maximum size is 10MB'}), 400
        
        # Upload to Etsy
        result = upload_listing_image(
            access_token,
            etsy_token.shop_id,
            listing.etsy_listing_id,
            image_data,
            rank=rank,
            alt_text=alt_text
        )
        
        # Update listing images metadata
        images = listing.images or []
        images.append({
            'name': image_file.filename,
            'etsy_image_id': result.get('listing_image_id'),
            'rank': rank,
            'uploaded_at': datetime.utcnow().isoformat()
        })
        listing.images = images
        db.session.commit()
        
        return jsonify({
            'message': 'Image uploaded successfully',
            'image_id': result.get('listing_image_id'),
            'listing_id': listing.id,
            'rank': rank
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/uploads/<int:upload_id>/publish', methods=['POST'])
@jwt_required()
def publish_upload(upload_id):
    """Publish an upload (create drafts on Etsy)"""
    user_id = get_jwt_identity()
    upload = Upload.query.filter_by(id=upload_id, user_id=user_id).first()
    
    if not upload:
        return jsonify({'error': 'Upload not found'}), 404
    
    etsy_token = EtsyToken.query.filter_by(user_id=user_id).first()
    if not etsy_token:
        return jsonify({'error': 'Etsy not connected'}), 400
    
    try:
        access_token = decrypt_token(etsy_token.access_token_encrypted)
        
        # Check if token needs refresh
        if etsy_token.expires_at and etsy_token.expires_at <= datetime.utcnow():
            refresh_token = decrypt_token(etsy_token.refresh_token_encrypted)
            new_tokens = refresh_access_token(refresh_token)
            
            etsy_token.access_token_encrypted = encrypt_token(new_tokens['access_token'])
            etsy_token.refresh_token_encrypted = encrypt_token(new_tokens['refresh_token'])
            etsy_token.expires_at = datetime.utcnow() + timedelta(seconds=new_tokens['expires_in'])
            
            access_token = new_tokens['access_token']
            db.session.commit()
        
        upload.status = 'uploading'
        db.session.commit()
        
        # Process each listing
        for listing in upload.listings:
            try:
                # Build listing data with all available fields
                listing_data = {
                    'title': listing.title,
                    'description': listing.description,
                    'price': listing.price or 10.0,
                    'quantity': listing.quantity or 999,
                    'tags': listing.tags,
                    'is_digital': True
                }
                
                # Add taxonomy_id if available (category)
                if listing.taxonomy_id:
                    listing_data['taxonomy_id'] = listing.taxonomy_id
                
                # Add shipping profile if available and valid (not for digital)
                if listing.shipping_profile_id and listing.shipping_profile_id not in ['digital', 'no_returns']:
                    try:
                        listing_data['shipping_profile_id'] = int(listing.shipping_profile_id)
                    except (ValueError, TypeError):
                        pass  # Skip if not a valid integer ID
                
                # Add return policy if available and valid
                if listing.return_policy_id and listing.return_policy_id not in ['no_returns', '14_days', '30_days']:
                    try:
                        listing_data['return_policy_id'] = int(listing.return_policy_id)
                    except (ValueError, TypeError):
                        pass  # Skip if not a valid integer ID
                
                # Add styles if available (max 2)
                if listing.styles:
                    listing_data['styles'] = listing.styles[:2]
                # Also check listing_attributes for style array
                elif listing.listing_attributes and listing.listing_attributes.get('style'):
                    listing_data['styles'] = listing.listing_attributes['style'][:2]
                
                # Create draft listing on Etsy
                etsy_listing = create_draft_listing(
                    access_token,
                    etsy_token.shop_id,
                    listing_data
                )
                
                listing.etsy_listing_id = str(etsy_listing['listing_id'])
                listing.status = 'uploaded'
                
                # Set listing properties (attributes) from AI-generated data
                if listing.listing_attributes and listing.taxonomy_id:
                    try:
                        property_result = set_listing_attributes_from_ai(
                            access_token,
                            etsy_token.shop_id,
                            listing.etsy_listing_id,
                            listing.taxonomy_id,
                            listing.listing_attributes
                        )
                        if property_result.get('errors'):
                            print(f"Property setting warnings: {property_result['errors']}")
                    except Exception as prop_error:
                        # Property setting failures are not critical - continue
                        print(f"Warning: Failed to set properties: {prop_error}")
                
                # Upload images would go here
                # For each image in listing.images, upload to Etsy
                
                # Upload videos if present
                # Note: Videos should be uploaded via the /api/uploads/:id/videos endpoint
                # which handles the actual file upload from the frontend
                # Videos in listing.videos are metadata only at this point
                
                db.session.commit()
                
            except Exception as e:
                listing.status = 'failed'
                db.session.commit()
                print(f"Failed to create listing: {e}")
        
        # Update upload status
        failed_count = Listing.query.filter_by(upload_id=upload.id, status='failed').count()
        if failed_count == 0:
            upload.status = 'published'
        else:
            upload.status = 'published'
            upload.error_message = f'{failed_count} listings failed'
        
        upload.completed_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(upload.to_dict())
        
    except Exception as e:
        upload.status = 'failed'
        upload.error_message = str(e)
        db.session.commit()
        return jsonify({'error': str(e)}), 500


@app.route('/api/uploads/<int:upload_id>/schedule', methods=['POST'])
@jwt_required()
def schedule_upload(upload_id):
    """Schedule an upload for later publishing"""
    user_id = get_jwt_identity()
    upload = Upload.query.filter_by(id=upload_id, user_id=user_id).first()
    
    if not upload:
        return jsonify({'error': 'Upload not found'}), 404
    
    data = request.get_json()
    scheduled_for = datetime.fromisoformat(data['scheduled_for'].replace('Z', '+00:00'))
    
    upload.scheduled_for = scheduled_for
    upload.status = 'scheduled'
    db.session.commit()
    
    # Schedule the job
    schedule_publish(upload.id, scheduled_for, app)
    
    return jsonify(upload.to_dict())


@app.route('/api/uploads/<int:upload_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_upload(upload_id):
    """Cancel a scheduled upload"""
    user_id = get_jwt_identity()
    upload = Upload.query.filter_by(id=upload_id, user_id=user_id).first()
    
    if not upload:
        return jsonify({'error': 'Upload not found'}), 404
    
    if upload.status == 'scheduled':
        cancel_scheduled_publish(upload.id)
        upload.status = 'draft'
        upload.scheduled_for = None
        db.session.commit()
    
    return jsonify(upload.to_dict())


@app.route('/api/uploads/<int:upload_id>', methods=['DELETE'])
@jwt_required()
def delete_upload(upload_id):
    """Delete an upload and its listings"""
    user_id = get_jwt_identity()
    upload = Upload.query.filter_by(id=upload_id, user_id=user_id).first()
    
    if not upload:
        return jsonify({'error': 'Upload not found'}), 404
    
    # Cancel if scheduled
    if upload.status == 'scheduled':
        cancel_scheduled_publish(upload.id)
    
    db.session.delete(upload)
    db.session.commit()
    
    return jsonify({'message': 'Upload deleted'})


# ============== Listing Manager Routes ==============

def get_user_etsy_credentials(user_id):
    """Helper to get user's Etsy token and shop ID"""
    etsy_token = EtsyToken.query.filter_by(user_id=user_id).first()
    if not etsy_token:
        return None, None, 'Etsy account not connected'
    
    # Check if token is expired and refresh if needed
    if etsy_token.expires_at and etsy_token.expires_at < datetime.utcnow():
        try:
            refresh_token = decrypt_token(etsy_token.refresh_token_encrypted)
            new_tokens = refresh_access_token(refresh_token)
            
            etsy_token.access_token_encrypted = encrypt_token(new_tokens['access_token'])
            etsy_token.refresh_token_encrypted = encrypt_token(new_tokens['refresh_token'])
            etsy_token.expires_at = datetime.utcnow() + timedelta(seconds=new_tokens['expires_in'])
            db.session.commit()
        except Exception as e:
            return None, None, f'Token refresh failed: {str(e)}'
    
    access_token = decrypt_token(etsy_token.access_token_encrypted)
    shop_id = etsy_token.shop_id
    
    return access_token, shop_id, None


@app.route('/api/shop/sync', methods=['POST'])
@jwt_required()
def sync_shop_listings():
    """Sync listings from Etsy to local cache"""
    user_id = get_jwt_identity()
    access_token, shop_id, error = get_user_etsy_credentials(user_id)
    
    if error:
        return jsonify({'error': error}), 401
    
    try:
        # Get states to sync (default: all states)
        data = request.get_json() or {}
        states_to_sync = data.get('states', ['active', 'draft', 'expired', 'inactive', 'sold_out'])
        
        synced_count = 0
        
        for state in states_to_sync:
            try:
                listings = get_all_shop_listings(
                    access_token, shop_id, state, 
                    includes=['Images']
                )
                
                for etsy_listing in listings:
                    listing_id = str(etsy_listing.get('listing_id'))
                    
                    # Find or create local cache entry
                    cached = EtsyListing.query.filter_by(
                        user_id=user_id, 
                        etsy_listing_id=listing_id
                    ).first()
                    
                    if not cached:
                        cached = EtsyListing(
                            user_id=user_id,
                            etsy_listing_id=listing_id
                        )
                        db.session.add(cached)
                    
                    # Update cached data
                    cached.title = etsy_listing.get('title')
                    cached.description = etsy_listing.get('description')
                    cached.tags = etsy_listing.get('tags', [])
                    cached.state = etsy_listing.get('state')
                    cached.sku = (etsy_listing.get('skus') or [None])[0]  # First SKU
                    
                    # Price
                    price_obj = etsy_listing.get('price', {})
                    cached.price_amount = price_obj.get('amount')
                    cached.price_divisor = price_obj.get('divisor', 100)
                    cached.currency_code = price_obj.get('currency_code', 'USD')
                    
                    # Quantity and stats
                    cached.quantity = etsy_listing.get('quantity')
                    cached.num_favorers = etsy_listing.get('num_favorers', 0)
                    cached.views = etsy_listing.get('views', 0)
                    
                    # URLs
                    cached.url = etsy_listing.get('url')
                    
                    # Images
                    images = etsy_listing.get('images', [])
                    cached.images = [{
                        'listing_image_id': img.get('listing_image_id'),
                        'url_75x75': img.get('url_75x75'),
                        'url_170x170': img.get('url_170x170'),
                        'url_570xN': img.get('url_570xN'),
                        'url_fullxfull': img.get('url_fullxfull'),
                        'rank': img.get('rank', 1)
                    } for img in images]
                    
                    # Taxonomy
                    cached.taxonomy_id = etsy_listing.get('taxonomy_id')
                    cached.shop_section_id = str(etsy_listing.get('shop_section_id')) if etsy_listing.get('shop_section_id') else None
                    
                    # Timestamps
                    if etsy_listing.get('created_timestamp'):
                        cached.created_timestamp = datetime.utcfromtimestamp(etsy_listing['created_timestamp'])
                    if etsy_listing.get('last_modified_timestamp'):
                        cached.last_modified_timestamp = datetime.utcfromtimestamp(etsy_listing['last_modified_timestamp'])
                    if etsy_listing.get('ending_timestamp'):
                        cached.ending_timestamp = datetime.utcfromtimestamp(etsy_listing['ending_timestamp'])
                    
                    cached.synced_at = datetime.utcnow()
                    synced_count += 1
                    
            except Exception as e:
                print(f"Error syncing {state} listings: {e}")
                continue
        
        db.session.commit()
        
        # Get counts by state
        state_counts = {}
        for state in ['active', 'draft', 'expired', 'inactive', 'sold_out']:
            count = EtsyListing.query.filter_by(user_id=user_id, state=state).count()
            state_counts[state] = count
        
        return jsonify({
            'message': f'Synced {synced_count} listings',
            'synced_count': synced_count,
            'state_counts': state_counts,
            'synced_at': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/shop/listings', methods=['GET'])
@jwt_required()
def get_cached_listings():
    """Get cached listings with pagination and filtering"""
    user_id = get_jwt_identity()
    
    # Query parameters
    state = request.args.get('state', 'active')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 25))
    search = request.args.get('search', '')
    sort_by = request.args.get('sort_by', 'last_modified_timestamp')
    sort_order = request.args.get('sort_order', 'desc')
    
    # Base query
    query = EtsyListing.query.filter_by(user_id=user_id, state=state)
    
    # Search filter
    if search:
        query = query.filter(EtsyListing.title.ilike(f'%{search}%'))
    
    # Sorting
    sort_column = getattr(EtsyListing, sort_by, EtsyListing.last_modified_timestamp)
    if sort_order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Pagination
    total = query.count()
    listings = query.offset((page - 1) * per_page).limit(per_page).all()
    
    # Get counts by state
    state_counts = {}
    for s in ['active', 'draft', 'expired', 'inactive', 'sold_out']:
        state_counts[s] = EtsyListing.query.filter_by(user_id=user_id, state=s).count()
    
    # Check cache freshness (Etsy API Terms Section 5: max 6 hours for listings)
    oldest_sync = None
    needs_refresh = False
    for listing in listings:
        if listing.synced_at:
            if oldest_sync is None or listing.synced_at < oldest_sync:
                oldest_sync = listing.synced_at
            if is_cache_stale(listing.synced_at, is_listing=True):
                needs_refresh = True
    
    cache_info = get_cache_age_info(oldest_sync, is_listing=True) if oldest_sync else None
    
    return jsonify({
        'listings': [l.to_dict() for l in listings],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page,
        'state_counts': state_counts,
        'cache_info': cache_info,
        'needs_refresh': needs_refresh
    })


@app.route('/api/shop/listings/<listing_id>', methods=['GET'])
@jwt_required()
def get_single_listing(listing_id):
    """Get a single listing with full details from Etsy"""
    user_id = get_jwt_identity()
    access_token, shop_id, error = get_user_etsy_credentials(user_id)
    
    if error:
        return jsonify({'error': error}), 401
    
    try:
        # Get fresh data from Etsy
        listing_data = get_listing(access_token, listing_id, includes=['Images'])
        images = get_listing_images(access_token, listing_id)
        
        listing_data['images'] = images
        
        return jsonify(listing_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/shop/listings/<listing_id>', methods=['PATCH'])
@jwt_required()
def update_shop_listing(listing_id):
    """Update a single listing on Etsy"""
    user_id = get_jwt_identity()
    access_token, shop_id, error = get_user_etsy_credentials(user_id)
    
    if error:
        return jsonify({'error': error}), 401
    
    try:
        data = request.get_json()
        
        # Build update payload
        update_data = {}
        
        if 'title' in data:
            update_data['title'] = data['title'][:140]  # Max 140 chars
        if 'description' in data:
            update_data['description'] = data['description']
        if 'tags' in data:
            # Ensure tags is a list of max 13 items
            tags = data['tags']
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(',') if t.strip()]
            update_data['tags'] = tags[:13]
        if 'price' in data:
            update_data['price'] = float(data['price'])
        if 'quantity' in data:
            update_data['quantity'] = int(data['quantity'])
        
        # Call Etsy API to update
        result = update_listing(access_token, shop_id, listing_id, update_data)
        
        # Update local cache
        cached = EtsyListing.query.filter_by(
            user_id=user_id, 
            etsy_listing_id=listing_id
        ).first()
        
        if cached:
            if 'title' in update_data:
                cached.title = update_data['title']
            if 'description' in update_data:
                cached.description = update_data['description']
            if 'tags' in update_data:
                cached.tags = update_data['tags']
            if 'price' in update_data:
                cached.price_amount = int(update_data['price'] * 100)
            if 'quantity' in update_data:
                cached.quantity = update_data['quantity']
            cached.synced_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({
            'message': 'Listing updated',
            'listing': result
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/shop/listings/bulk', methods=['PATCH'])
@jwt_required()
def bulk_update_listings():
    """Bulk update multiple listings"""
    user_id = get_jwt_identity()
    access_token, shop_id, error = get_user_etsy_credentials(user_id)
    
    if error:
        return jsonify({'error': error}), 401
    
    try:
        data = request.get_json()
        listing_ids = data.get('listing_ids', [])
        updates = data.get('updates', {})
        
        if not listing_ids:
            return jsonify({'error': 'No listing IDs provided'}), 400
        
        results = {
            'success': [],
            'failed': []
        }
        
        for listing_id in listing_ids:
            try:
                # Get the specific update for this listing (if per-listing updates provided)
                listing_update = updates.get(str(listing_id), updates.get('_all', updates))
                
                if not listing_update:
                    continue
                
                # Build update payload
                update_data = {}
                
                if 'title' in listing_update:
                    update_data['title'] = listing_update['title'][:140]
                if 'description' in listing_update:
                    update_data['description'] = listing_update['description']
                if 'tags' in listing_update:
                    tags = listing_update['tags']
                    if isinstance(tags, str):
                        tags = [t.strip() for t in tags.split(',') if t.strip()]
                    update_data['tags'] = tags[:13]
                
                if update_data:
                    result = update_listing(access_token, shop_id, str(listing_id), update_data)
                    results['success'].append({
                        'listing_id': listing_id,
                        'updates': update_data
                    })
                    
                    # Update cache
                    cached = EtsyListing.query.filter_by(
                        user_id=user_id, 
                        etsy_listing_id=str(listing_id)
                    ).first()
                    
                    if cached:
                        if 'title' in update_data:
                            cached.title = update_data['title']
                        if 'description' in update_data:
                            cached.description = update_data['description']
                        if 'tags' in update_data:
                            cached.tags = update_data['tags']
                        cached.synced_at = datetime.utcnow()
                        
            except Exception as e:
                results['failed'].append({
                    'listing_id': listing_id,
                    'error': str(e)
                })
        
        db.session.commit()
        
        return jsonify({
            'message': f"Updated {len(results['success'])} listings, {len(results['failed'])} failed",
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/shop/listings/<listing_id>/regenerate', methods=['POST'])
@jwt_required()
def regenerate_listing_content_route(listing_id):
    """Regenerate AI content for an existing listing"""
    user_id = get_jwt_identity()
    access_token, shop_id, error = get_user_etsy_credentials(user_id)
    
    if error:
        return jsonify({'error': error}), 401
    
    try:
        data = request.get_json()
        field = data.get('field', 'title')  # 'title', 'description', 'tags'
        instruction = data.get('instruction', '')
        image_rank = data.get('image_rank', 1)  # Which image to use for AI
        
        # Get listing images
        images = get_listing_images(access_token, listing_id)
        
        if not images:
            return jsonify({'error': 'Listing has no images for AI analysis'}), 400
        
        # Find image by rank or use first one
        target_image = None
        for img in images:
            if img.get('rank') == image_rank:
                target_image = img
                break
        
        if not target_image:
            target_image = images[0]
        
        # Get image URL and download for AI analysis
        image_url = target_image.get('url_fullxfull') or target_image.get('url_570xN')
        
        if not image_url:
            return jsonify({'error': 'Could not get image URL'}), 400
        
        # Download image
        import requests as req
        img_response = req.get(image_url)
        if img_response.status_code != 200:
            return jsonify({'error': 'Could not download image'}), 400
        
        image_base64 = encode_image_bytes_to_base64(img_response.content)
        
        # Regenerate using AI
        result = regenerate_field(image_base64, field, instruction)
        
        return jsonify({
            'field': field,
            'value': result,
            'image_used': image_rank
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/shop/listings/<listing_id>/images', methods=['POST'])
@jwt_required()
def upload_listing_image_route(listing_id):
    """Upload a new image to a listing"""
    user_id = get_jwt_identity()
    access_token, shop_id, error = get_user_etsy_credentials(user_id)
    
    if error:
        return jsonify({'error': error}), 401
    
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        rank = int(request.form.get('rank', 1))
        
        # Read image bytes
        image_bytes = image_file.read()
        
        # Upload to Etsy
        result = upload_listing_image(
            access_token, shop_id, listing_id,
            image_bytes, rank=rank
        )
        
        return jsonify({
            'message': 'Image uploaded',
            'image': result
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/shop/listings/<listing_id>/images/<image_id>', methods=['DELETE'])
@jwt_required()
def delete_listing_image_route(listing_id, image_id):
    """Delete an image from a listing"""
    user_id = get_jwt_identity()
    access_token, shop_id, error = get_user_etsy_credentials(user_id)
    
    if error:
        return jsonify({'error': error}), 401
    
    try:
        delete_listing_image(access_token, shop_id, listing_id, image_id)
        
        # Update local cache
        cached = EtsyListing.query.filter_by(
            user_id=user_id, 
            etsy_listing_id=listing_id
        ).first()
        
        if cached and cached.images:
            cached.images = [img for img in cached.images if str(img.get('listing_image_id')) != str(image_id)]
            cached.synced_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({'message': 'Image deleted'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/shop/listings/<listing_id>/images/reorder', methods=['PATCH'])
@jwt_required()
def reorder_listing_images_route(listing_id):
    """
    Reorder images for a listing.
    Note: Etsy doesn't support direct reordering, so this requires delete + re-upload.
    """
    user_id = get_jwt_identity()
    access_token, shop_id, error = get_user_etsy_credentials(user_id)
    
    if error:
        return jsonify({'error': error}), 401
    
    try:
        data = request.get_json()
        new_order = data.get('image_ids', [])  # List of image IDs in new order
        
        if not new_order:
            return jsonify({'error': 'No image order provided'}), 400
        
        # Get current images
        current_images = get_listing_images(access_token, listing_id)
        
        # Unfortunately, Etsy doesn't support changing image rank directly.
        # The client needs to handle this by downloading images, deleting, and re-uploading
        # in the correct order. For now, we'll return info about the current state.
        
        return jsonify({
            'message': 'Image reorder requires download and re-upload',
            'current_images': current_images,
            'requested_order': new_order,
            'note': 'Client should download images, delete all, then re-upload in desired order'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== Health Check ==============

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    })


# ============== Mockup Analyzer & Nano Banano Pro Prompt Generator ==============

@app.route('/api/mockup/search-bestsellers', methods=['POST'])
@jwt_required()
def mockup_search_bestsellers():
    """Search Etsy for bestselling products/mockups"""
    try:
        data = request.get_json()
        query = data.get('query', 'product mockup')
        limit = data.get('limit', 20)
        sort_on = data.get('sort_on', 'score')
        min_price = data.get('min_price')
        max_price = data.get('max_price')

        api_key = app.config.get('ETSY_API_KEY') or os.environ.get('ETSY_API_KEY')
        if not api_key:
            return jsonify({'error': 'Etsy API key not configured'}), 500

        results = search_etsy_bestsellers(
            query=query,
            api_key=api_key,
            limit=limit,
            sort_on=sort_on,
            min_price=min_price,
            max_price=max_price
        )

        return jsonify({
            'success': True,
            'results': results,
            'count': len(results),
            'query': query
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/mockup/analyze-url', methods=['POST'])
@jwt_required()
def mockup_analyze_url():
    """Analyze an image from URL and generate Nano Banano Pro prompt"""
    try:
        data = request.get_json()
        image_url = data.get('image_url')
        context = data.get('context', '')

        if not image_url:
            return jsonify({'error': 'image_url is required'}), 400

        # Download and encode the image
        image_b64 = encode_image_from_url(image_url)

        # Analyze and generate prompt
        result = analyze_image_for_prompt(image_b64, context=context)

        return jsonify({
            'success': True,
            'analysis': result,
            'source_url': image_url
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/mockup/analyze-upload', methods=['POST'])
@jwt_required()
def mockup_analyze_upload():
    """Analyze an uploaded image (file or base64) and generate Nano Banano Pro prompt"""
    try:
        context = ''

        # Check if it's a file upload
        if 'image' in request.files:
            file = request.files['image']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400

            image_bytes = file.read()
            image_b64 = encode_image_bytes(image_bytes)
            context = request.form.get('context', '')

        # Check if it's base64 data (from clipboard paste)
        elif request.is_json:
            data = request.get_json()
            image_data = data.get('image_data')
            context = data.get('context', '')

            if not image_data:
                return jsonify({'error': 'image_data or image file is required'}), 400

            # Handle data URL format (data:image/png;base64,...)
            if image_data.startswith('data:'):
                image_b64_raw = image_data.split(',', 1)[1]
            else:
                image_b64_raw = image_data

            # Decode, resize, re-encode
            image_bytes = base64.b64decode(image_b64_raw)
            image_b64 = encode_image_bytes(image_bytes)

        else:
            return jsonify({'error': 'Provide an image file or base64 image_data'}), 400

        # Analyze and generate prompt
        result = analyze_image_for_prompt(image_b64, context=context)

        return jsonify({
            'success': True,
            'analysis': result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/mockup/batch-analyze', methods=['POST'])
@jwt_required()
def mockup_batch_analyze():
    """Analyze multiple images from URLs and generate prompts for each"""
    try:
        data = request.get_json()
        image_urls = data.get('image_urls', [])
        contexts = data.get('contexts', [])

        if not image_urls:
            return jsonify({'error': 'image_urls array is required'}), 400

        if len(image_urls) > 5:
            return jsonify({'error': 'Maximum 5 images per batch'}), 400

        results = batch_analyze_images(image_urls, contexts)

        return jsonify({
            'success': True,
            'results': results,
            'count': len(results)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)

