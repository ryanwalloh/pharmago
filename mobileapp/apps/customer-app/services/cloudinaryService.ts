/**
 * Cloudinary Service for Mobile App
 * Handles direct file uploads to Cloudinary for prescriptions and other documents
 */

// Cloudinary Configuration
const CLOUD_NAME = 'dwqrkobq1'; // Your Cloudinary cloud name
const UPLOAD_PRESET = 'pharmago-file-uploads'; // Your upload preset
const API_KEY = '947651824417687'; // Your API key

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  public_id?: string;
  error?: string;
}

/**
 * Upload a file to Cloudinary
 * @param fileUri - Local file URI (from camera or gallery)
 * @param folder - Cloudinary folder path
 * @param fileName - Optional custom file name
 * @returns CloudinaryUploadResult with URL or error
 */
export async function uploadToCloudinary(
  fileUri: string,
  folder: string,
  fileName?: string
): Promise<CloudinaryUploadResult> {
  try {
    console.log('☁️ Starting Cloudinary upload...');
    console.log('📁 Folder:', folder);
    console.log('📄 File URI:', fileUri);

    // Prepare form data
    const formData = new FormData();
    
    // Add the file
    // For React Native, we need to provide uri, type, and name
    const fileExtension = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
    
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: fileName || `upload_${Date.now()}.${fileExtension}`
    } as any);

    // Add Cloudinary parameters
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);
    formData.append('api_key', API_KEY);

    // Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    
    console.log('☁️ Uploading to Cloudinary:', cloudinaryUrl);

    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let fetch handle it for FormData
    });

    const data = await response.json();

    if (response.ok && data.secure_url) {
      console.log('✅ Upload successful!');
      console.log('🔗 URL:', data.secure_url);
      
      return {
        success: true,
        url: data.secure_url,
        public_id: data.public_id,
      };
    } else {
      console.error('❌ Upload failed:', data);
      return {
        success: false,
        error: data.error?.message || 'Upload failed',
      };
    }
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload a prescription image to Cloudinary
 * @param fileUri - Local file URI
 * @returns CloudinaryUploadResult
 */
export async function uploadPrescriptionImage(
  fileUri: string
): Promise<CloudinaryUploadResult> {
  const folder = 'pharmago-file-uploads/prescriptions';
  const fileName = `prescription_${Date.now()}.${fileUri.split('.').pop()}`;
  return uploadToCloudinary(fileUri, folder, fileName);
}

/**
 * Upload a driver's license image to Cloudinary
 * @param fileUri - Local file URI
 * @returns CloudinaryUploadResult
 */
export async function uploadDriverLicenseImage(
  fileUri: string
): Promise<CloudinaryUploadResult> {
  const folder = 'pharmago-file-uploads/driver-licenses';
  const fileName = `license_${Date.now()}.${fileUri.split('.').pop()}`;
  return uploadToCloudinary(fileUri, folder, fileName);
}

/**
 * Get optimized Cloudinary URL with transformations
 * @param url - Original Cloudinary URL
 * @param width - Desired width
 * @param height - Desired height
 * @returns Optimized URL
 */
export function getOptimizedUrl(
  url: string,
  width?: number,
  height?: number
): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  // Insert transformation parameters into the URL
  const transformations = [];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push('c_limit'); // Don't upscale, only downscale
  transformations.push('q_auto'); // Auto quality
  transformations.push('f_auto'); // Auto format

  const transformString = transformations.join(',');
  return url.replace('/upload/', `/upload/${transformString}/`);
}

export default {
  uploadToCloudinary,
  uploadPrescriptionImage,
  uploadDriverLicenseImage,
  getOptimizedUrl,
};

