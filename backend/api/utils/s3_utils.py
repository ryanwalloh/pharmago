"""
File upload utility functions - uses Cloudinary for file storage
boto3/S3 support disabled for performance (no longer used in production)
"""
import os
from django.conf import settings
from django.core.files.storage import Storage, default_storage
from django.utils import timezone
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# ❌ DISABLED: boto3/S3 support removed - using Cloudinary exclusively
# This eliminates unnecessary import attempts and speeds up container startup
BOTO3_AVAILABLE = False


class S3Storage:
    """
    Storage class for file uploads - uses Cloudinary (via Django's default_storage)
    
    ❌ S3/boto3 support disabled - Cloudinary is used exclusively for all file operations.
    This eliminates boto3 import checks and speeds up initialization.
    """
    
    def __init__(self):
        # ❌ S3 disabled: Always use default storage (Cloudinary)
        self.s3_client = None
        logger.debug("Storage initialized - using Cloudinary via default_storage")
    
    def upload_file(self, file_obj, bucket_name: str, object_key: str, 
                   content_type: Optional[str] = None, metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Upload a file to Cloudinary storage (via Django's default_storage)
        
        Args:
            file_obj: File object to upload
            bucket_name: Ignored (kept for API compatibility)
            object_key: File path/key
            content_type: MIME type of the file (Cloudinary handles automatically)
            metadata: Additional metadata (Cloudinary handles via resource_type)
            
        Returns:
            Dict containing upload result with 'success', 'url', 'error' keys
        """
        # ❌ S3 disabled: Always use Cloudinary via default_storage
        try:
            saved_path = default_storage.save(object_key, file_obj)
            file_url = default_storage.url(saved_path)
            logger.info(f"✅ File uploaded to Cloudinary: {saved_path}")
            return {
                'success': True,
                'url': file_url,
                'bucket': None,
                'key': saved_path,
            }
        except Exception as e:
            logger.error(f"❌ Cloudinary upload failed: {str(e)}")
            return {
                'success': False,
                'error': f'Storage upload failed: {str(e)}'
            }
    
    def delete_file(self, bucket_name: str, object_key: str) -> Dict[str, Any]:
        """
        Delete a file from Cloudinary storage
        
        Args:
            bucket_name: Ignored (kept for API compatibility)
            object_key: File path/key
            
        Returns:
            Dict containing deletion result
        """
        # ❌ S3 disabled: Cloudinary deletion handled by Django's default_storage
        try:
            default_storage.delete(object_key)
            logger.info(f"✅ File deleted from Cloudinary: {object_key}")
            return {'success': True}
        except Exception as e:
            logger.warning(f"⚠️ Cloudinary deletion attempt: {str(e)}")
            # Cloudinary may have already deleted or file doesn't exist
            return {'success': True, 'message': 'File deletion handled by Cloudinary'}
    
    def generate_presigned_url(self, bucket_name: str, object_key: str, 
                             expiration: int = 3600) -> Dict[str, Any]:
        """
        ❌ NOT SUPPORTED: Presigned URLs are S3-specific.
        Cloudinary files are publicly accessible via direct URLs.
        
        Args:
            bucket_name: Ignored
            object_key: File path/key
            expiration: Ignored
            
        Returns:
            Dict indicating presigned URLs not needed for Cloudinary
        """
        # Cloudinary files are already public - just return the URL
        try:
            file_url = default_storage.url(object_key)
            return {
                'success': True,
                'url': file_url,
                'note': 'Cloudinary files are publicly accessible - no presigned URL needed'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Cloudinary files are public. URL generation failed: {str(e)}'
            }


def generate_file_path(document_type: str, user_id: int, filename: str) -> str:
    """
    Generate a unique file path for upload
    
    Args:
        document_type: Type of document (pharmacy_license, business_permit, etc.)
        user_id: User ID for organization
        filename: Original filename
        
    Returns:
        Generated file path
    """
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    file_extension = os.path.splitext(filename)[1]
    
    return f"pharmacy_registrations/{user_id}/{document_type}/{timestamp}{file_extension}"


def validate_file_type(file_obj, allowed_types: list) -> bool:
    """
    Validate file type based on content type
    
    Args:
        file_obj: File object to validate
        allowed_types: List of allowed MIME types
        
    Returns:
        True if file type is allowed, False otherwise
    """
    if hasattr(file_obj, 'content_type'):
        return file_obj.content_type in allowed_types
    return False


def validate_file_size(file_obj, max_size_bytes: int) -> bool:
    """
    Validate file size
    
    Args:
        file_obj: File object to validate
        max_size_bytes: Maximum allowed size in bytes
        
    Returns:
        True if file size is within limit, False otherwise
    """
    if hasattr(file_obj, 'size'):
        return file_obj.size <= max_size_bytes
    return False


# Global storage instance (works with S3, Cloudinary, or local)
s3_storage = S3Storage()
