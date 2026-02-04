"""
Etsy API Integration

Handles OAuth 2.0 authentication with PKCE, token management,
and all listing-related API calls.
"""

import os
import base64
import hashlib
import secrets
import requests
from datetime import datetime, timedelta
from urllib.parse import urlencode
from cryptography.fernet import Fernet

# Etsy API base URL
ETSY_API_BASE = 'https://openapi.etsy.com/v3'
ETSY_AUTH_URL = 'https://www.etsy.com/oauth/connect'
ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token'

# Encryption for storing tokens
_fernet = None


def get_fernet():
    """Get or create Fernet instance for token encryption"""
    global _fernet
    if _fernet is None:
        key = os.environ.get('FERNET_KEY')
        if not key:
            # Generate a key for development (should be set in production)
            key = Fernet.generate_key().decode()
            print(f"Warning: Generated temporary FERNET_KEY. Set this in production: {key}")
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_token(token: str) -> bytes:
    """Encrypt a token for storage"""
    return get_fernet().encrypt(token.encode())


def decrypt_token(encrypted: bytes) -> str:
    """Decrypt a stored token"""
    return get_fernet().decrypt(encrypted).decode()


def generate_pkce_pair():
    """Generate PKCE code verifier and challenge"""
    # Generate random verifier (43-128 characters)
    verifier = secrets.token_urlsafe(64)[:128]
    
    # Create challenge using SHA256
    challenge_bytes = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(challenge_bytes).decode().rstrip('=')
    
    return verifier, challenge


def get_authorization_url(state: str = None) -> tuple:
    """
    Generate Etsy OAuth authorization URL with PKCE.
    
    Returns:
        Tuple of (authorization_url, code_verifier, state)
    """
    api_key = os.environ.get('ETSY_API_KEY')
    redirect_uri = os.environ.get('ETSY_REDIRECT_URI')
    
    if not api_key or not redirect_uri:
        raise ValueError("ETSY_API_KEY and ETSY_REDIRECT_URI must be set")
    
    # Generate PKCE
    verifier, challenge = generate_pkce_pair()
    
    # Generate state if not provided
    if not state:
        state = secrets.token_urlsafe(32)
    
    # Build authorization URL
    params = {
        'response_type': 'code',
        'client_id': api_key,
        'redirect_uri': redirect_uri,
        'scope': 'listings_r listings_w listings_d transactions_r',
        'state': state,
        'code_challenge': challenge,
        'code_challenge_method': 'S256'
    }
    
    auth_url = f"{ETSY_AUTH_URL}?{urlencode(params)}"
    
    return auth_url, verifier, state


def exchange_code_for_tokens(code: str, verifier: str) -> dict:
    """
    Exchange authorization code for access and refresh tokens.
    
    Args:
        code: Authorization code from callback
        verifier: PKCE code verifier
    
    Returns:
        Dictionary with access_token, refresh_token, expires_in
    """
    api_key = os.environ.get('ETSY_API_KEY')
    redirect_uri = os.environ.get('ETSY_REDIRECT_URI')
    
    data = {
        'grant_type': 'authorization_code',
        'client_id': api_key,
        'redirect_uri': redirect_uri,
        'code': code,
        'code_verifier': verifier
    }
    
    response = requests.post(ETSY_TOKEN_URL, data=data)
    
    if response.status_code != 200:
        raise Exception(f"Token exchange failed: {response.text}")
    
    return response.json()


def refresh_access_token(refresh_token: str) -> dict:
    """
    Refresh an expired access token.
    
    Args:
        refresh_token: The refresh token
    
    Returns:
        Dictionary with new access_token, refresh_token, expires_in
    """
    api_key = os.environ.get('ETSY_API_KEY')
    
    data = {
        'grant_type': 'refresh_token',
        'client_id': api_key,
        'refresh_token': refresh_token
    }
    
    response = requests.post(ETSY_TOKEN_URL, data=data)
    
    if response.status_code != 200:
        raise Exception(f"Token refresh failed: {response.text}")
    
    return response.json()


def get_auth_headers(access_token: str) -> dict:
    """Get authorization headers for API requests"""
    api_key = os.environ.get('ETSY_API_KEY')
    return {
        'Authorization': f'Bearer {access_token}',
        'x-api-key': api_key,
        'Content-Type': 'application/json'
    }


def get_user_info(access_token: str) -> dict:
    """Get information about the authenticated user"""
    headers = get_auth_headers(access_token)
    
    # Get token metadata (includes user_id)
    response = requests.get(
        f'{ETSY_API_BASE}/application/openapi-ping',
        headers=headers
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to get user info: {response.text}")
    
    return response.json()


def get_shop_info(access_token: str, user_id: str) -> dict:
    """Get the user's shop information"""
    headers = get_auth_headers(access_token)
    
    response = requests.get(
        f'{ETSY_API_BASE}/application/users/{user_id}/shops',
        headers=headers
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to get shop info: {response.text}")
    
    data = response.json()
    if data.get('count', 0) > 0:
        return data['results'][0]
    return None


def get_shipping_profiles(access_token: str, shop_id: str) -> list:
    """Get shop's shipping profiles"""
    headers = get_auth_headers(access_token)
    
    response = requests.get(
        f'{ETSY_API_BASE}/application/shops/{shop_id}/shipping-profiles',
        headers=headers
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to get shipping profiles: {response.text}")
    
    return response.json().get('results', [])


def get_return_policies(access_token: str, shop_id: str) -> list:
    """Get shop's return policies"""
    headers = get_auth_headers(access_token)
    
    response = requests.get(
        f'{ETSY_API_BASE}/application/shops/{shop_id}/policies/return',
        headers=headers
    )
    
    if response.status_code != 200:
        return []  # Return policies might not exist
    
    return response.json().get('results', [])


def get_shop_sections(access_token: str, shop_id: str) -> list:
    """Get shop's sections for organizing listings"""
    headers = get_auth_headers(access_token)
    
    response = requests.get(
        f'{ETSY_API_BASE}/application/shops/{shop_id}/sections',
        headers=headers
    )
    
    if response.status_code != 200:
        return []  # Sections might not exist
    
    return response.json().get('results', [])


def create_draft_listing(access_token: str, shop_id: str, listing_data: dict) -> dict:
    """
    Create a draft listing on Etsy.
    
    Args:
        access_token: Valid access token
        shop_id: Shop ID
        listing_data: Dictionary with listing details:
            - title (required, max 140 chars)
            - description (required)
            - price (required, as float)
            - quantity (required, default 999 for digital)
            - tags (optional, list of up to 13)
            - taxonomy_id (required, category ID)
            - who_made (required: 'i_did', 'someone_else', 'collective')
            - when_made (required: 'made_to_order', '2020_2024', etc.)
            - is_digital (optional, boolean)
            - shipping_profile_id (required for physical items)
    
    Returns:
        Created listing data from Etsy
    """
    headers = get_auth_headers(access_token)
    
    # Build request body
    body = {
        'title': listing_data['title'][:140],
        'description': listing_data['description'],
        'price': float(listing_data['price']),
        'quantity': listing_data.get('quantity', 999),
        'who_made': listing_data.get('who_made', 'i_did'),
        'when_made': listing_data.get('when_made', 'made_to_order'),
        'taxonomy_id': listing_data.get('taxonomy_id', 2078),  # Digital downloads default
        'type': 'download' if listing_data.get('is_digital', True) else 'physical'
    }
    
    # Add optional fields
    if listing_data.get('tags'):
        body['tags'] = listing_data['tags'][:13]
    
    if listing_data.get('shipping_profile_id'):
        body['shipping_profile_id'] = listing_data['shipping_profile_id']
    
    if listing_data.get('return_policy_id'):
        body['return_policy_id'] = listing_data['return_policy_id']
    
    response = requests.post(
        f'{ETSY_API_BASE}/application/shops/{shop_id}/listings',
        headers=headers,
        json=body
    )
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Failed to create listing: {response.text}")
    
    return response.json()


def upload_listing_image(access_token: str, shop_id: str, listing_id: str, 
                         image_data: bytes, rank: int = 1, alt_text: str = '') -> dict:
    """
    Upload an image to a listing.
    
    Args:
        access_token: Valid access token
        shop_id: Shop ID
        listing_id: Listing ID
        image_data: Image file bytes
        rank: Image position (1 = primary)
        alt_text: Alt text for accessibility
    
    Returns:
        Image upload response
    """
    api_key = os.environ.get('ETSY_API_KEY')
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'x-api-key': api_key
    }
    
    files = {
        'image': ('mockup.jpg', image_data, 'image/jpeg')
    }
    
    data = {
        'rank': rank,
        'overwrite': True
    }
    
    if alt_text:
        data['alt_text'] = alt_text[:500]
    
    response = requests.post(
        f'{ETSY_API_BASE}/application/shops/{shop_id}/listings/{listing_id}/images',
        headers=headers,
        files=files,
        data=data
    )
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Failed to upload image: {response.text}")
    
    return response.json()


def upload_listing_video(access_token: str, shop_id: str, listing_id: str,
                         video_data: bytes, video_name: str = 'video.mp4') -> dict:
    """
    Upload a video to a listing.
    
    Etsy supports videos for listings with the following requirements:
    - Max file size: 100MB
    - Supported formats: MP4, MOV
    - Max duration: 15 seconds for listing videos, 5 seconds for preview videos
    - Max resolution: 4K (3840x2160)
    
    Args:
        access_token: Valid access token
        shop_id: Shop ID
        listing_id: Listing ID
        video_data: Video file bytes
        video_name: Original video filename for content type detection
    
    Returns:
        Video upload response with video_id
    """
    api_key = os.environ.get('ETSY_API_KEY')
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'x-api-key': api_key
    }
    
    # Determine content type from filename
    content_type = 'video/mp4'
    if video_name.lower().endswith('.mov'):
        content_type = 'video/quicktime'
    elif video_name.lower().endswith('.mp4'):
        content_type = 'video/mp4'
    
    files = {
        'video': (video_name, video_data, content_type)
    }
    
    response = requests.post(
        f'{ETSY_API_BASE}/application/shops/{shop_id}/listings/{listing_id}/videos',
        headers=headers,
        files=files
    )
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Failed to upload video: {response.text}")
    
    return response.json()


def get_listing_videos(access_token: str, listing_id: str) -> list:
    """
    Get videos attached to a listing.
    
    Args:
        access_token: Valid access token
        listing_id: Listing ID
    
    Returns:
        List of video objects
    """
    headers = get_auth_headers(access_token)
    
    response = requests.get(
        f'{ETSY_API_BASE}/application/listings/{listing_id}/videos',
        headers=headers
    )
    
    if response.status_code != 200:
        return []
    
    return response.json().get('results', [])


def delete_listing_video(access_token: str, shop_id: str, listing_id: str, video_id: str) -> bool:
    """
    Delete a video from a listing.
    
    Args:
        access_token: Valid access token
        shop_id: Shop ID
        listing_id: Listing ID
        video_id: Video ID to delete
    
    Returns:
        True if successful
    """
    api_key = os.environ.get('ETSY_API_KEY')
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'x-api-key': api_key
    }
    
    response = requests.delete(
        f'{ETSY_API_BASE}/application/shops/{shop_id}/listings/{listing_id}/videos/{video_id}',
        headers=headers
    )
    
    return response.status_code == 204


def update_listing(access_token: str, shop_id: str, listing_id: str, updates: dict) -> dict:
    """
    Update an existing listing.
    
    Args:
        access_token: Valid access token
        shop_id: Shop ID
        listing_id: Listing ID
        updates: Dictionary of fields to update
    
    Returns:
        Updated listing data
    """
    headers = get_auth_headers(access_token)
    
    response = requests.patch(
        f'{ETSY_API_BASE}/application/shops/{shop_id}/listings/{listing_id}',
        headers=headers,
        json=updates
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to update listing: {response.text}")
    
    return response.json()


def publish_listing(access_token: str, shop_id: str, listing_id: str) -> dict:
    """
    Publish a draft listing (change state to active).
    
    Args:
        access_token: Valid access token
        shop_id: Shop ID
        listing_id: Listing ID
    
    Returns:
        Updated listing data
    """
    return update_listing(access_token, shop_id, listing_id, {'state': 'active'})


def delete_listing(access_token: str, listing_id: str) -> bool:
    """
    Delete a listing.
    
    Args:
        access_token: Valid access token
        listing_id: Listing ID
    
    Returns:
        True if successful
    """
    headers = get_auth_headers(access_token)
    
    response = requests.delete(
        f'{ETSY_API_BASE}/application/listings/{listing_id}',
        headers=headers
    )
    
    return response.status_code == 204


def get_taxonomy_nodes() -> list:
    """Get Etsy's taxonomy (categories) for listings"""
    api_key = os.environ.get('ETSY_API_KEY')
    
    response = requests.get(
        f'{ETSY_API_BASE}/application/seller-taxonomy/nodes',
        headers={'x-api-key': api_key}
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to get taxonomy: {response.text}")
    
    return response.json().get('results', [])
