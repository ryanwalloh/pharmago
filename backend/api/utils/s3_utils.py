"""
AWS S3 utility functions for file uploads
"""
import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from django.conf import settings
from django.core.files.storage import Storage
from django.utils import timezone
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class S3Storage:
    """Custom S3 storage class for handling file uploads"""
    
    def __init__(self):
        self.aws_access_key_id = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
        self.aws_secret_access_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
        self.aws_storage_bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
        self.aws_s3_region_name = getattr(settings, 'AWS_S3_REGION_NAME', 'ap-southeast-2')
        
        if not all([self.aws_access_key_id, self.aws_secret_access_key, self.aws_storage_bucket_name]):
            logger.warning("AWS S3 credentials not configured. File uploads will use local storage.")
            self.s3_client = None
        else:
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
    
    def upload_file(self, file_obj, bucket_name: str, object_key: str, 
                   content_type: Optional[str] = None, metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Upload a file to S3
        
        Args:
            file_obj: File object to upload
            bucket_name: S3 bucket name
            object_key: S3 object key (path)
            content_type: MIME type of the file
            metadata: Additional metadata for the file
            
        Returns:
            Dict containing upload result with 'success', 'url', 'error' keys
        """
        if not self.s3_client:
            return {
                'success': False,
                'error': 'S3 client not initialized. Check AWS credentials.'
            }
        
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
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"S3 upload failed: {error_code} - {error_message}")
            return {
                'success': False,
                'error': f"S3 upload failed: {error_message}"
            }
        except Exception as e:
            logger.error(f"Unexpected error during S3 upload: {str(e)}")
            return {
                'success': False,
                'error': f"Upload failed: {str(e)}"
            }
    
    def delete_file(self, bucket_name: str, object_key: str) -> Dict[str, Any]:
        """
        Delete a file from S3
        
        Args:
            bucket_name: S3 bucket name
            object_key: S3 object key (path)
            
        Returns:
            Dict containing deletion result
        """
        if not self.s3_client:
            return {
                'success': False,
                'error': 'S3 client not initialized. Check AWS credentials.'
            }
        
        try:
            self.s3_client.delete_object(Bucket=bucket_name, Key=object_key)
            logger.info(f"File deleted successfully from S3: {object_key}")
            return {'success': True}
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"S3 deletion failed: {error_code} - {error_message}")
            return {
                'success': False,
                'error': f"S3 deletion failed: {error_message}"
            }
        except Exception as e:
            logger.error(f"Unexpected error during S3 deletion: {str(e)}")
            return {
                'success': False,
                'error': f"Deletion failed: {str(e)}"
            }
    
    def generate_presigned_url(self, bucket_name: str, object_key: str, 
                             expiration: int = 3600) -> Dict[str, Any]:
        """
        Generate a presigned URL for file access
        
        Args:
            bucket_name: S3 bucket name
            object_key: S3 object key (path)
            expiration: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Dict containing presigned URL result
        """
        if not self.s3_client:
            return {
                'success': False,
                'error': 'S3 client not initialized. Check AWS credentials.'
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
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"Presigned URL generation failed: {error_code} - {error_message}")
            return {
                'success': False,
                'error': f"Presigned URL generation failed: {error_message}"
            }
        except Exception as e:
            logger.error(f"Unexpected error during presigned URL generation: {str(e)}")
            return {
                'success': False,
                'error': f"Presigned URL generation failed: {str(e)}"
            }


def generate_file_path(document_type: str, user_id: int, filename: str) -> str:
    """
    Generate a unique file path for S3 upload
    
    Args:
        document_type: Type of document (pharmacy_license, business_permit, etc.)
        user_id: User ID for organization
        filename: Original filename
        
    Returns:
        Generated S3 object key
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


# Global S3 storage instance
s3_storage = S3Storage()
