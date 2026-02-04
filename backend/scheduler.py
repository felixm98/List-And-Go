"""
Scheduler for List-And-Go

Handles scheduled publishing of listings using APScheduler
with PostgreSQL job store for persistence.
"""

import os
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor

# Scheduler instance
scheduler = None


def init_scheduler(app):
    """Initialize the scheduler with the Flask app"""
    global scheduler
    
    database_url = app.config.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///etsy_uploader.db')
    
    jobstores = {
        'default': SQLAlchemyJobStore(url=database_url)
    }
    
    executors = {
        'default': ThreadPoolExecutor(10)
    }
    
    job_defaults = {
        'coalesce': False,
        'max_instances': 3
    }
    
    scheduler = BackgroundScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
        timezone='Europe/Stockholm'  # Swedish timezone
    )
    
    scheduler.start()
    print("Scheduler started")
    
    return scheduler


def shutdown_scheduler():
    """Gracefully shutdown the scheduler"""
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
        print("Scheduler stopped")


def schedule_publish(upload_id: int, scheduled_time: datetime, app_context):
    """
    Schedule an upload for publishing at a specific time.
    
    Args:
        upload_id: ID of the Upload to publish
        scheduled_time: When to publish
        app_context: Flask app context for database access
    """
    global scheduler
    
    if not scheduler:
        raise RuntimeError("Scheduler not initialized")
    
    job_id = f"publish_upload_{upload_id}"
    
    # Remove existing job if any
    existing = scheduler.get_job(job_id)
    if existing:
        scheduler.remove_job(job_id)
    
    # Schedule new job
    scheduler.add_job(
        func=execute_publish,
        trigger='date',
        run_date=scheduled_time,
        args=[upload_id, app_context],
        id=job_id,
        name=f"Publish Upload {upload_id}",
        replace_existing=True
    )
    
    print(f"Scheduled publish for upload {upload_id} at {scheduled_time}")
    
    return job_id


def cancel_scheduled_publish(upload_id: int) -> bool:
    """
    Cancel a scheduled publish.
    
    Args:
        upload_id: ID of the Upload
    
    Returns:
        True if cancelled, False if not found
    """
    global scheduler
    
    if not scheduler:
        return False
    
    job_id = f"publish_upload_{upload_id}"
    
    try:
        scheduler.remove_job(job_id)
        print(f"Cancelled scheduled publish for upload {upload_id}")
        return True
    except:
        return False


def execute_publish(upload_id: int, app):
    """
    Execute the actual publishing of listings.
    Called by the scheduler at the scheduled time.
    
    Args:
        upload_id: ID of the Upload to publish
        app: Flask app for context
    """
    with app.app_context():
        from models import db, Upload, Listing, EtsyToken
        from etsy_api import publish_listing, decrypt_token, refresh_access_token, encrypt_token
        
        upload = Upload.query.get(upload_id)
        if not upload:
            print(f"Upload {upload_id} not found")
            return
        
        if upload.status != 'scheduled':
            print(f"Upload {upload_id} is not scheduled (status: {upload.status})")
            return
        
        # Get user's Etsy token
        etsy_token = EtsyToken.query.filter_by(user_id=upload.user_id).first()
        if not etsy_token:
            upload.status = 'failed'
            upload.error_message = 'Etsy not connected'
            db.session.commit()
            return
        
        try:
            # Decrypt access token
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
            
            # Update upload status
            upload.status = 'uploading'
            db.session.commit()
            
            # Publish each listing
            published_count = 0
            failed_count = 0
            
            for listing in upload.listings:
                if listing.etsy_listing_id and listing.status == 'uploaded':
                    try:
                        publish_listing(access_token, etsy_token.shop_id, listing.etsy_listing_id)
                        listing.status = 'published'
                        listing.etsy_url = f"https://www.etsy.com/listing/{listing.etsy_listing_id}"
                        published_count += 1
                    except Exception as e:
                        listing.status = 'failed'
                        failed_count += 1
                        print(f"Failed to publish listing {listing.id}: {e}")
            
            # Update upload status
            if failed_count == 0:
                upload.status = 'published'
            elif published_count > 0:
                upload.status = 'published'  # Partial success
                upload.error_message = f'{failed_count} listings failed to publish'
            else:
                upload.status = 'failed'
                upload.error_message = 'All listings failed to publish'
            
            upload.completed_at = datetime.utcnow()
            db.session.commit()
            
            print(f"Publish complete for upload {upload_id}: {published_count} published, {failed_count} failed")
            
        except Exception as e:
            upload.status = 'failed'
            upload.error_message = str(e)
            db.session.commit()
            print(f"Publish failed for upload {upload_id}: {e}")


def get_scheduled_jobs() -> list:
    """Get all scheduled jobs"""
    global scheduler
    
    if not scheduler:
        return []
    
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            'id': job.id,
            'name': job.name,
            'next_run': job.next_run_time.isoformat() if job.next_run_time else None
        })
    
    return jobs
