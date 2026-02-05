"""
Authentication module - Etsy OAuth only

Users authenticate via Etsy OAuth. When they connect their Etsy account,
a user record is automatically created/updated based on their Etsy shop.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import (
    create_access_token, 
    create_refresh_token,
    jwt_required, 
    get_jwt_identity
)
from models import db, User

auth_bp = Blueprint('auth', __name__)


def get_or_create_user_from_etsy(shop_id: str, shop_name: str) -> User:
    """
    Get existing user by Etsy shop_id or create a new one.
    
    Args:
        shop_id: Etsy shop ID (unique identifier)
        shop_name: Etsy shop name
    
    Returns:
        User object
    """
    # Use shop_id as email (it's unique per Etsy shop)
    email = f"{shop_id}@etsy.local"
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        # Create new user
        user = User(email=email)
        user.set_password(shop_id)  # Use shop_id as password (never used directly)
        db.session.add(user)
        db.session.commit()
    
    return user


def create_tokens_for_user(user: User) -> dict:
    """Create access and refresh tokens for a user"""
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    return {
        'access_token': access_token,
        'refresh_token': refresh_token
    }


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        'access_token': access_token
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': user.to_dict()
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user - client should clear tokens"""
    return jsonify({'message': 'Logged out successfully'}), 200
