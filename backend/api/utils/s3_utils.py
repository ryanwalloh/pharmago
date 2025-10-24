"""
File upload utility functions - supports both S3 and Cloudinary
"""
import os
from django.conf import settings
from django.core.files.storage import Storage, default_storage
from django.utils import timezone
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Try to import boto3, but make it optional
try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    logger.info("boto3 not available - using default storage (Cloudinary or local)")


class S3Storage:
    """Custom storage class for handling file uploads - works with S3, Cloudinary, or local storage"""
    
    def __init__(self):
        # Only initialize S3 if boto3 is available and credentials are set
        if BOTO3_AVAILABLE:
            self.aws_access_key_id = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
            self.aws_secret_access_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
            self.aws_storage_bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
            self.aws_s3_region_name = getattr(settings, 'AWS_S3_REGION_NAME', 'ap-southeast-2')
            
            if all([self.aws_access_key_id, self.aws_secret_access_key, self.aws_storage_bucket_name]):
                try:
                    self.s3_client = boto3.client(
                        's3',
                        aws_access_key_id=self.aws_access_key_id,
                        aws_secret_access_key=self.aws_secret_access_key,
                        region_name=self.aws_s3_region_name
                    )
                    logger.info("AWS S3 client initialized successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize S3 client: {str(e)}")
                    self.s3_client = None
            else:
                logger.info("AWS S3 credentials not configured. Using default storage (Cloudinary or local).")
                self.s3_client = None
        else:
            logger.info("boto3 not installed. Using default storage (Cloudinary or local).")
            self.s3_client = None
    
    def upload_file(self, file_obj, bucket_name: str, object_key: str, 
                   content_type: Optional[str] = None, metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Upload a file to storage (S3, Cloudinary, or local)
        
        Args:
            file_obj: File object to upload
            bucket_name: S3 bucket name (ignored for Cloudinary)
            object_key: File path/key
            content_type: MIME type of the file
            metadata: Additional metadata for the file
            
        Returns:
            Dict containing upload result with 'success', 'url', 'error' keys
        """
        # Use default storage (Cloudinary or local) if S3 client not available
        if not self.s3_client:
            try:
                saved_path = default_storage.save(object_key, file_obj)
                file_url = default_storage.url(saved_path)
                logger.info(f"File uploaded to default storage: {saved_path}")
                return {
                    'success': True,
                    'url': file_url,
                    'bucket': None,
                    'key': saved_path,
                }
            except Exception as e:
                logger.error(f"Default storage upload failed: {str(e)}")
                return {
                    'success': False,
                    'error': f'Storage upload failed: {str(e)}'
                }
        
        # Use S3 if available
        try:
            # Prepare upload parameters
            upload_params = {
                'Bucket': bucket_name,
                'Key': object_key,
                'Body': file_obj.read(),
                'ContentType': content_type or 'application/octet-stream'
            }
            
            # Add metadata if provided
            if metadata:
                upload_params['Metadata'] = metadata
            
            # Upload file
            self.s3_client.put_object(**upload_params)
            
            # Generate public URL
            file_url = f"https://{bucket_name}.s3.{self.aws_s3_region_name}.amazonaws.com/{object_key}"
            
            logger.info(f"File uploaded successfully to S3: {object_key}")
            
            return {
                'success': True,
                'url': file_url,
                'bucket': bucket_name,
                'key': object_key
            }
            
        except Exception as e:
            logger.error(f"S3 upload failed: {str(e)}")
            # Fallback to default storage on S3 failure
            try:
                try:
                    file_obj.seek(0)
                except Exception:
                    pass
                saved_path = default_storage.save(object_key, file_obj)
                file_url = default_storage.url(saved_path)
                logger.warning("S3 upload failed; saved file to default storage.")
                return {
                    'success': True,
                    'url': file_url,
                    'bucket': None,
                    'key': saved_path,
                }
            except Exception as fe:
                logger.error(f"Default storage upload fallback failed: {str(fe)}")
                return {
                    'success': False,
                    'error': f"Upload failed: {str(e)} / {str(fe)}"
                }
    
    def delete_file(self, bucket_name: str, object_key: str) -> Dict[str, Any]:
        """
        Delete a file from storage
        
        Args:
            bucket_name: S3 bucket name (ignored for Cloudinary)
            object_key: File path/key
            
        Returns:
            Dict containing deletion result
        """
        if not self.s3_client:
            # For Cloudinary/local storage, deletion is handled by Django
            return {'success': True, 'message': 'Using default storage deletion'}
        
        try:
            self.s3_client.delete_object(Bucket=bucket_name, Key=object_key)
            logger.info(f"File deleted successfully from S3: {object_key}")
            return {'success': True}
            
        except Exception as e:
            logger.error(f"S3 deletion failed: {str(e)}")
            return {
                'success': False,
                'error': f"Deletion failed: {str(e)}"
            }
    
    def generate_presigned_url(self, bucket_name: str, object_key: str, 
                             expiration: int = 3600) -> Dict[str, Any]:
        """
        Generate a presigned URL for file access (S3 only)
        
        Args:
            bucket_name: S3 bucket name
            object_key: File path/key
            expiration: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Dict containing presigned URL result
        """
        if not self.s3_client:
            # For Cloudinary, files are already public
            return {
                'success': False,
                'error': 'Presigned URLs only available for S3. Cloudinary files are publicly accessible.'
            }
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': object_key},
                ExpiresIn=expiration
            )
            
            return {
                'success': True,
                'url': url,
                'expires_in': expiration
            }
            
        except Exception as e:
            logger.error(f"Presigned URL generation failed: {str(e)}")
            return {
                'success': False,
                'error': f"Presigned URL generation failed: {str(e)}"
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
