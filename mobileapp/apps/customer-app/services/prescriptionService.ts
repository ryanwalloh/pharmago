import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { apiService } from './api';

export interface PrescriptionData {
  doctorName?: string;
  prescriptionDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface PrescriptionUploadResult {
  success: boolean;
  prescriptionId?: string;
  error?: string;
  imageUri?: string;
}

class PrescriptionService {
  /**
   * Request necessary permissions for camera and photo library access
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('🔐 Requesting camera and photo library permissions...');
      
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      console.log('📷 Camera permission:', cameraPermission.status);
      
      // Request media library permissions
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📱 Media library permission:', mediaPermission.status);
      
      const hasPermissions = cameraPermission.status === 'granted' && mediaPermission.status === 'granted';
      
      if (!hasPermissions) {
        console.log('❌ Permissions not granted');
        return false;
      }
      
      console.log('✅ All permissions granted');
      return true;
    } catch (error) {
      console.error('💥 Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Launch image picker to select from gallery
   */
  async pickImageFromGallery(): Promise<string | null> {
    try {
      console.log('🖼️ Opening image picker for gallery...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4], // Portrait aspect ratio (3:4) for prescription photos
        quality: 0.8, // Compress image for faster upload
        base64: false,
      });

      if (result.canceled) {
        console.log('❌ User canceled image selection');
        return null;
      }

      const imageUri = result.assets[0].uri;
      console.log('✅ Image selected:', imageUri);
      return imageUri;
    } catch (error) {
      console.error('💥 Error picking image from gallery:', error);
      return null;
    }
  }

  /**
   * Launch camera to take a photo
   */
  async takePhotoWithCamera(): Promise<string | null> {
    try {
      console.log('📷 Opening camera...');
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4], // Portrait aspect ratio (3:4) for prescription photos
        quality: 0.8, // Compress image for faster upload
        base64: false,
      });

      if (result.canceled) {
        console.log('❌ User canceled photo capture');
        return null;
      }

      const imageUri = result.assets[0].uri;
      console.log('✅ Photo taken:', imageUri);
      return imageUri;
    } catch (error) {
      console.error('💥 Error taking photo:', error);
      return null;
    }
  }

  /**
   * Show action sheet to choose between camera and gallery
   */
  async showImagePickerOptions(): Promise<string | null> {
    try {
      console.log('📋 Showing image picker options...');
      
      // Try camera first, then fallback to gallery
      // This ensures camera is attempted if available
      try {
        console.log('📷 Attempting to open camera...');
        const cameraResult = await this.takePhotoWithCamera();
        if (cameraResult) {
          return cameraResult;
        }
      } catch (cameraError) {
        console.log('📷 Camera not available, trying gallery:', cameraError);
      }
      
      // Fallback to gallery
      console.log('🖼️ Opening gallery...');
      return await this.pickImageFromGallery();
    } catch (error) {
      console.error('💥 Error showing image picker options:', error);
      return null;
    }
  }

  /**
   * Get image file info for upload
   */
  async getImageInfo(imageUri: string): Promise<{ size: number; type: string } | null> {
    try {
      console.log('📊 Getting image info for:', imageUri);
      
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (!fileInfo.exists) {
        console.log('❌ Image file does not exist');
        return null;
      }

      // Get file extension
      const extension = imageUri.split('.').pop()?.toLowerCase();
      const mimeType = this.getMimeType(extension || '');

      console.log('✅ Image info:', {
        size: fileInfo.size,
        type: mimeType,
        uri: imageUri
      });

      return {
        size: fileInfo.size || 0,
        type: mimeType
      };
    } catch (error) {
      console.error('💥 Error getting image info:', error);
      return null;
    }
  }

  /**
   * Upload prescription image to backend
   */
  async uploadPrescription(
    imageUri: string, 
    prescriptionData: PrescriptionData = {}
  ): Promise<PrescriptionUploadResult> {
    try {
      console.log('📤 Starting prescription upload...');
      console.log('📋 Prescription data:', prescriptionData);

      // Get image info
      const imageInfo = await this.getImageInfo(imageUri);
      if (!imageInfo) {
        return {
          success: false,
          error: 'Could not read image file'
        };
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (imageInfo.size > maxSize) {
        return {
          success: false,
          error: 'Image file is too large. Please select an image smaller than 10MB.'
        };
      }

      // Create FormData for upload
      const formData = new FormData();
      
      // Add image file
      formData.append('prescription_file', {
        uri: imageUri,
        type: imageInfo.type,
        name: `prescription_${Date.now()}.${imageUri.split('.').pop()}`
      } as any);

      // Add prescription data
      if (prescriptionData.doctorName) {
        formData.append('doctor_name', prescriptionData.doctorName);
      }
      if (prescriptionData.prescriptionDate) {
        formData.append('prescription_date', prescriptionData.prescriptionDate);
      }
      if (prescriptionData.expiryDate) {
        formData.append('expiry_date', prescriptionData.expiryDate);
      }
      if (prescriptionData.notes) {
        formData.append('notes', prescriptionData.notes);
      }

      console.log('📤 Uploading prescription to backend...');
      
      // Upload to backend
      const response = await apiService.makeRequest('/prescriptions/upload/', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.success && response.data) {
        console.log('✅ Prescription uploaded successfully:', response.data);
        return {
          success: true,
          prescriptionId: response.data.id,
          imageUri: imageUri
        };
      } else {
        console.log('❌ Prescription upload failed:', response.error);
        return {
          success: false,
          error: response.error || 'Upload failed'
        };
      }
    } catch (error) {
      console.error('💥 Error uploading prescription:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  /**
   * Complete prescription upload flow with user interaction
   */
  async uploadPrescriptionWithUI(prescriptionData: PrescriptionData = {}): Promise<PrescriptionUploadResult> {
    try {
      console.log('🚀 Starting prescription upload flow...');

      // Request permissions
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return {
          success: false,
          error: 'Camera and photo library permissions are required to upload prescriptions.'
        };
      }

      // Show image picker options
      const imageUri = await this.showImagePickerOptions();
      if (!imageUri) {
        return {
          success: false,
          error: 'No image selected'
        };
      }

      // Upload prescription
      const uploadResult = await this.uploadPrescription(imageUri, prescriptionData);
      
      if (uploadResult.success) {
        console.log('🎉 Prescription upload completed successfully!');
      } else {
        console.log('❌ Prescription upload failed:', uploadResult.error);
      }

      return uploadResult;
    } catch (error) {
      console.error('💥 Error in prescription upload flow:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Convert image to base64 string for temporary storage
   */
  async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      console.log('🔄 Converting image to base64:', imageUri);
      
      // Use the correct encoding type for expo-file-system
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64' as any,
      });
      
      console.log('✅ Image converted to base64, length:', base64.length);
      return base64;
    } catch (error) {
      console.error('💥 Error converting image to base64:', error);
      throw new Error('Failed to convert image to base64');
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    
    return mimeTypes[extension] || 'image/jpeg';
  }
}

export const prescriptionService = new PrescriptionService();
export default prescriptionService;
