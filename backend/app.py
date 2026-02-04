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

from config import config
from models import db, User, Template, Upload, Listing, EtsyToken
from auth import auth_bp
from settings import settings_bp
from ai_generator import generate_listing_content, regenerate_field, encode_image_bytes_to_base64
from seo_scorer import calculate_seo_score
from etsy_api import (
    get_authorization_url, exchange_code_for_tokens, refresh_access_token,
    get_shop_info, get_shipping_profiles, get_return_policies,
    create_draft_listing, upload_listing_image, upload_listing_video, publish_listing,
    encrypt_token, decrypt_token, get_taxonomy_nodes
)
from scheduler import init_scheduler, schedule_publish, cancel_scheduled_publish, shutdown_scheduler

import atexit


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


# ============== Etsy OAuth Routes ==============

@app.route('/api/etsy/connect', methods=['GET'])
@jwt_required()
def etsy_connect():
    """Start Etsy OAuth flow"""
    user_id = get_jwt_identity()
    
    try:
        auth_url, verifier, state = get_authorization_url(state=str(user_id))
        
        # Store verifier for callback (in production, use Redis with expiry)
        app.pkce_verifiers[state] = verifier
        
        return jsonify({'auth_url': auth_url})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/etsy/callback', methods=['GET'])
def etsy_callback():
    """Handle Etsy OAuth callback"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    
    if error:
        return redirect(f'/etsy-error?error={error}')
    
    if not code or not state:
        return redirect('/etsy-error?error=missing_params')
    
    # Get verifier
    verifier = app.pkce_verifiers.get(state)
    if not verifier:
        return redirect('/etsy-error?error=invalid_state')
    
    try:
        # Exchange code for tokens
        tokens = exchange_code_for_tokens(code, verifier)
        
        # Clean up verifier
        del app.pkce_verifiers[state]
        
        # Get user ID from state
        user_id = int(state)
        
        # Get shop info
        # Extract user_id from token (format: user_id.token)
        etsy_user_id = tokens['access_token'].split('.')[0]
        shop_info = get_shop_info(tokens['access_token'], etsy_user_id)
        
        # Save or update token
        etsy_token = EtsyToken.query.filter_by(user_id=user_id).first()
        
        if not etsy_token:
            etsy_token = EtsyToken(user_id=user_id)
            db.session.add(etsy_token)
        
        etsy_token.access_token_encrypted = encrypt_token(tokens['access_token'])
        etsy_token.refresh_token_encrypted = encrypt_token(tokens['refresh_token'])
        etsy_token.expires_at = datetime.utcnow() + timedelta(seconds=tokens['expires_in'])
        etsy_token.shop_id = shop_info['shop_id'] if shop_info else None
        etsy_token.shop_name = shop_info['shop_name'] if shop_info else None
        
        db.session.commit()
        
        return redirect('/etsy-success')
        
    except Exception as e:
        print(f"Etsy callback error: {e}")
        return redirect(f'/etsy-error?error={str(e)}')


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
                
                # Create draft listing on Etsy
                etsy_listing = create_draft_listing(
                    access_token,
                    etsy_token.shop_id,
                    listing_data
                )
                
                listing.etsy_listing_id = str(etsy_listing['listing_id'])
                listing.status = 'uploaded'
                
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


# ============== Health Check ==============

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)

