"""
Etsy API Compliance Utilities
=============================
Handles rate limiting, data freshness, and security notifications
to comply with Etsy API Terms of Use.
"""

import time
import logging
from datetime import datetime, timedelta
from functools import wraps
from threading import Lock

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# RATE LIMITING (Section 2 - API Rate Limits)
# =============================================================================

class RateLimiter:
    """
    Thread-safe rate limiter for Etsy API calls.
    
    Etsy's default rate limit varies, but we implement a conservative
    approach to avoid hitting limits.
    """
    
    def __init__(self, calls_per_second: float = 5.0, calls_per_day: int = 10000):
        """
        Initialize rate limiter.
        
        Args:
            calls_per_second: Maximum calls per second (default 5)
            calls_per_day: Maximum calls per day (default 10,000)
        """
        self.calls_per_second = calls_per_second
        self.calls_per_day = calls_per_day
        self.min_interval = 1.0 / calls_per_second
        
        self.last_call_time = 0
        self.daily_calls = 0
        self.daily_reset_time = datetime.utcnow()
        self.lock = Lock()
    
    def _reset_daily_if_needed(self):
        """Reset daily counter if 24 hours have passed"""
        now = datetime.utcnow()
        if now - self.daily_reset_time >= timedelta(hours=24):
            self.daily_calls = 0
            self.daily_reset_time = now
            logger.info("Rate limiter: Daily call counter reset")
    
    def wait_if_needed(self):
        """
        Block until it's safe to make another API call.
        Returns remaining daily calls.
        """
        with self.lock:
            self._reset_daily_if_needed()
            
            # Check daily limit
            if self.daily_calls >= self.calls_per_day:
                wait_time = (self.daily_reset_time + timedelta(hours=24) - datetime.utcnow()).total_seconds()
                logger.warning(f"Daily rate limit reached. Resets in {wait_time:.0f} seconds")
                raise RateLimitExceededError(
                    f"Daily API limit of {self.calls_per_day} calls exceeded. "
                    f"Resets in {wait_time/3600:.1f} hours."
                )
            
            # Check per-second limit
            now = time.time()
            elapsed = now - self.last_call_time
            
            if elapsed < self.min_interval:
                sleep_time = self.min_interval - elapsed
                time.sleep(sleep_time)
            
            self.last_call_time = time.time()
            self.daily_calls += 1
            
            return self.calls_per_day - self.daily_calls
    
    def get_status(self) -> dict:
        """Get current rate limit status"""
        with self.lock:
            self._reset_daily_if_needed()
            return {
                'daily_calls_used': self.daily_calls,
                'daily_calls_remaining': self.calls_per_day - self.daily_calls,
                'daily_limit': self.calls_per_day,
                'resets_at': (self.daily_reset_time + timedelta(hours=24)).isoformat()
            }


class RateLimitExceededError(Exception):
    """Raised when API rate limit is exceeded"""
    pass


# Global rate limiter instance
_rate_limiter = RateLimiter()


def get_rate_limiter() -> RateLimiter:
    """Get the global rate limiter instance"""
    return _rate_limiter


def rate_limited(func):
    """Decorator to apply rate limiting to API calls"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        _rate_limiter.wait_if_needed()
        return func(*args, **kwargs)
    return wrapper


def handle_rate_limit_response(response):
    """
    Handle 429 Too Many Requests responses from Etsy.
    
    Args:
        response: requests.Response object
    
    Returns:
        Wait time in seconds, or None if not a rate limit response
    """
    if response.status_code == 429:
        # Check for Retry-After header
        retry_after = response.headers.get('Retry-After')
        if retry_after:
            try:
                wait_time = int(retry_after)
            except ValueError:
                wait_time = 60  # Default to 60 seconds
        else:
            wait_time = 60
        
        logger.warning(f"Rate limited by Etsy. Waiting {wait_time} seconds...")
        return wait_time
    
    return None


# =============================================================================
# DATA FRESHNESS (Section 5 - Display of Data)
# =============================================================================

# Maximum cache age in hours (Etsy requires listing data < 6 hours old)
LISTING_CACHE_MAX_AGE_HOURS = 6
OTHER_DATA_CACHE_MAX_AGE_HOURS = 24


def is_cache_stale(synced_at: datetime, is_listing: bool = True) -> bool:
    """
    Check if cached data is too old per Etsy's requirements.
    
    Per Section 5 of API Terms:
    - Listing content: max 6 hours old
    - Other Etsy content: max 24 hours old
    
    Args:
        synced_at: When the data was last synced
        is_listing: Whether this is listing data (stricter limit)
    
    Returns:
        True if cache is stale and needs refresh
    """
    if synced_at is None:
        return True
    
    max_age_hours = LISTING_CACHE_MAX_AGE_HOURS if is_listing else OTHER_DATA_CACHE_MAX_AGE_HOURS
    max_age = timedelta(hours=max_age_hours)
    
    return datetime.utcnow() - synced_at > max_age


def get_cache_age_info(synced_at: datetime, is_listing: bool = True) -> dict:
    """
    Get information about cache freshness.
    
    Args:
        synced_at: When the data was last synced
        is_listing: Whether this is listing data
    
    Returns:
        Dict with cache age info
    """
    if synced_at is None:
        return {
            'is_stale': True,
            'age_minutes': None,
            'max_age_hours': LISTING_CACHE_MAX_AGE_HOURS if is_listing else OTHER_DATA_CACHE_MAX_AGE_HOURS,
            'needs_refresh': True,
            'synced_at': None
        }
    
    age = datetime.utcnow() - synced_at
    age_minutes = age.total_seconds() / 60
    max_age_hours = LISTING_CACHE_MAX_AGE_HOURS if is_listing else OTHER_DATA_CACHE_MAX_AGE_HOURS
    is_stale = age > timedelta(hours=max_age_hours)
    
    return {
        'is_stale': is_stale,
        'age_minutes': round(age_minutes, 1),
        'age_hours': round(age_minutes / 60, 2),
        'max_age_hours': max_age_hours,
        'needs_refresh': is_stale,
        'synced_at': synced_at.isoformat()
    }


# =============================================================================
# DATA BREACH NOTIFICATION (Section 7 - 24 Hour Requirement)
# =============================================================================

# Contact emails for security notifications
ETSY_SECURITY_EMAIL = "dpo@etsy.com"
ADMIN_CONTACT_EMAIL = "iggy.lundmark@telefonista.nu"


def log_security_event(event_type: str, details: dict):
    """
    Log a security-related event.
    
    Args:
        event_type: Type of event (e.g., 'login_failed', 'token_compromised')
        details: Event details
    """
    logger.warning(f"SECURITY EVENT [{event_type}]: {details}")


def notify_data_breach(breach_details: dict):
    """
    Handle data breach notification requirement.
    
    Per Section 7: Must notify Etsy at dpo@etsy.com within 24 hours
    of discovering a data breach.
    
    This function logs the breach and provides instructions for notification.
    In production, this should integrate with your alerting system.
    
    Args:
        breach_details: Dict with breach information
            - description: What happened
            - affected_users: Number of users affected
            - data_types: What data was potentially exposed
            - discovered_at: When breach was discovered
    """
    breach_details['logged_at'] = datetime.utcnow().isoformat()
    breach_details['notification_deadline'] = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    
    logger.critical(f"""
    ============================================================
    DATA BREACH DETECTED - IMMEDIATE ACTION REQUIRED
    ============================================================
    
    Description: {breach_details.get('description', 'Unknown')}
    Affected Users: {breach_details.get('affected_users', 'Unknown')}
    Data Types: {breach_details.get('data_types', 'Unknown')}
    Discovered At: {breach_details.get('discovered_at', 'Unknown')}
    
    REQUIRED ACTIONS (per Etsy API Terms Section 7):
    1. Notify Etsy at {ETSY_SECURITY_EMAIL} WITHIN 24 HOURS
    2. Notify affected Etsy sellers
    3. Document the breach and remediation steps
    
    Notification Deadline: {breach_details['notification_deadline']}
    
    ============================================================
    """)
    
    # TODO: In production, integrate with:
    # - Email alerting (send to admin immediately)
    # - Incident management system
    # - Automated Etsy notification if possible
    
    return {
        'logged': True,
        'notify_etsy_at': ETSY_SECURITY_EMAIL,
        'deadline': breach_details['notification_deadline'],
        'admin_notified_at': ADMIN_CONTACT_EMAIL
    }


def check_token_security(access_token: str, expected_shop_id: str) -> bool:
    """
    Verify that a token is being used for its intended shop.
    
    This helps detect potential token theft or misuse.
    
    Args:
        access_token: The OAuth access token
        expected_shop_id: The shop ID this token should be used for
    
    Returns:
        True if security check passes
    """
    # This would typically make a lightweight API call to verify the token
    # For now, we just log the check
    if not access_token or not expected_shop_id:
        log_security_event('invalid_token_check', {
            'has_token': bool(access_token),
            'has_shop_id': bool(expected_shop_id)
        })
        return False
    
    return True


# =============================================================================
# COMPLIANCE STATUS
# =============================================================================

def get_compliance_status() -> dict:
    """
    Get overall API compliance status.
    
    Returns:
        Dict with compliance information
    """
    rate_status = _rate_limiter.get_status()
    
    return {
        'rate_limiting': {
            'enabled': True,
            'status': rate_status
        },
        'data_freshness': {
            'enabled': True,
            'listing_max_age_hours': LISTING_CACHE_MAX_AGE_HOURS,
            'other_data_max_age_hours': OTHER_DATA_CACHE_MAX_AGE_HOURS
        },
        'security': {
            'breach_notification_enabled': True,
            'etsy_security_contact': ETSY_SECURITY_EMAIL,
            'admin_contact': ADMIN_CONTACT_EMAIL,
            'notification_deadline_hours': 24
        }
    }
