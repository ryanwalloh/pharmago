/**
 * Cloudinary Upload Service
 * Handles file uploads to Cloudinary for the PharmaGo platform
 * 
 * Configuration:
 * - Cloud Name: You need to get this from your Cloudinary dashboard
 * - Upload Preset: pharmago-file-uploads (configured in Cloudinary)
 * - API Key: 947651824417687
 * 
 * Note: In production, these should be environment variables
 */

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'dw8x5q1wa'; // Replace with your actual cloud name
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'pharmago-file-uploads';
const API_KEY = process.env.REACT_APP_CLOUDINARY_API_KEY || '947651824417687';

/**
 * Upload a file to Cloudinary
 * @param {File} file - The file to upload
 * @param {Object} options - Additional options for the upload
 * @returns {Promise<Object>} - The upload response containing the secure_url
 */
export const uploadToCloudinary = async (file, options = {}) => {
  try {
    // Create FormData for Cloudinary upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('api_key', API_KEY);
    
    // Add optional parameters
    if (options.folder) {
      formData.append('folder', options.folder);
    }
    if (options.resource_type) {
      formData.append('resource_type', options.resource_type);
    } else {
      // Auto-detect: 'image' for images, 'raw' for documents
      formData.append('resource_type', 'auto');
    }
    
    // Add tags for better organization
    if (options.tags) {
      formData.append('tags', options.tags.join(','));
    }

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();
    
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      resourceType: data.resource_type,
      format: data.format,
      bytes: data.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload file',
    };
  }
};

/**
 * Upload pharmacy registration documents
 * @param {File} file - The document file
 * @param {string} documentType - Type of document (e.g., 'pharmacy_license', 'business_permit')
 * @returns {Promise<Object>} - Upload result
 */
export const uploadPharmacyDocument = async (file, documentType) => {
  return uploadToCloudinary(file, {
    folder: 'pharmago-file-uploads/pharmacy-registrations',
    tags: ['pharmacy-registration', documentType],
  });
};

/**
 * Upload storefront image
 * @param {File} file - The image file
 * @returns {Promise<Object>} - Upload result
 */
export const uploadStorefrontImage = async (file) => {
  return uploadToCloudinary(file, {
    folder: 'pharmago-file-uploads/storefront-images',
    tags: ['pharmacy-registration', 'storefront'],
    resource_type: 'image',
  });
};

/**
 * Upload with progress tracking
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Progress callback (receives percentage)
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result
 */
export const uploadWithProgress = (file, onProgress, options = {}) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        onProgress(percentComplete);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          success: true,
          url: data.secure_url,
          publicId: data.public_id,
          resourceType: data.resource_type,
          format: data.format,
          bytes: data.bytes,
        });
      } else {
        reject(new Error('Upload failed'));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('api_key', API_KEY);
    
    if (options.folder) {
      formData.append('folder', options.folder);
    }
    if (options.tags) {
      formData.append('tags', options.tags.join(','));
    }
    formData.append('resource_type', options.resource_type || 'auto');

    // Send request
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`);
    xhr.send(formData);
  });
};

export default {
  uploadToCloudinary,
  uploadPharmacyDocument,
  uploadStorefrontImage,
  uploadWithProgress,
};

