import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistration } from '../contexts/RegistrationContext';
import { uploadPharmacyDocument, uploadStorefrontImage } from '../services/cloudinary';

const PharmacyRegistration4 = () => {
  const navigate = useNavigate();
  const { 
    documents,
    updateDocuments,
    updateBusinessInfo,
    logRegistrationData, 
    getAllRegistrationData 
  } = useRegistration();

  // Image preview state
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  // Upload status state
  const [uploadStatus, setUploadStatus] = useState({
    pharmacyLicense: { uploading: false, error: null },
    businessPermit: { uploading: false, error: null },
    ownerPrimaryId: { uploading: false, error: null },
    storefrontImage: { uploading: false, error: null }
  });

  // Form state for document uploads
  const [formData, setFormData] = useState({
    pharmacyLicense: {
      file: null,
      fileUrl: documents.pharmacy_license?.file_url || '',
      expiryDate: documents.pharmacy_license?.expiry_date || '',
      uploaded: documents.pharmacy_license_uploaded || false
    },
    businessPermit: {
      file: null,
      fileUrl: documents.business_permit?.file_url || '',
      expiryDate: documents.business_permit?.expiry_date || '',
      uploaded: documents.business_permit_uploaded || false
    },
    ownerPrimaryId: {
      file: null,
      fileUrl: documents.owner_primary_id?.file_url || '',
      expiryDate: documents.owner_primary_id?.expiry_date || '',
      uploaded: documents.owner_primary_id_uploaded || false
    },
    storefrontImage: {
      file: null,
      fileUrl: documents.storefront_image?.file_url || '',
      uploaded: documents.storefront_image_uploaded || false
    }
  });

  // Update form data when context data changes
  useEffect(() => {
    setFormData(prev => ({
      pharmacyLicense: {
        ...prev.pharmacyLicense,
        file: documents.pharmacy_license?.file || prev.pharmacyLicense.file, // Preserve file object
        fileUrl: documents.pharmacy_license?.file_url || prev.pharmacyLicense.fileUrl,
        expiryDate: documents.pharmacy_license?.expiry_date || prev.pharmacyLicense.expiryDate,
        uploaded: documents.pharmacy_license?.uploaded || prev.pharmacyLicense.uploaded
      },
      businessPermit: {
        ...prev.businessPermit,
        file: documents.business_permit?.file || prev.businessPermit.file, // Preserve file object
        fileUrl: documents.business_permit?.file_url || prev.businessPermit.fileUrl,
        expiryDate: documents.business_permit?.expiry_date || prev.businessPermit.expiryDate,
        uploaded: documents.business_permit?.uploaded || prev.businessPermit.uploaded
      },
      ownerPrimaryId: {
        ...prev.ownerPrimaryId,
        file: documents.owner_primary_id?.file || prev.ownerPrimaryId.file, // Preserve file object
        fileUrl: documents.owner_primary_id?.file_url || prev.ownerPrimaryId.fileUrl,
        expiryDate: documents.owner_primary_id?.expiry_date || prev.ownerPrimaryId.expiryDate,
        uploaded: documents.owner_primary_id?.uploaded || prev.ownerPrimaryId.uploaded
      },
      storefrontImage: {
        ...prev.storefrontImage,
        file: documents.storefront_image?.file || prev.storefrontImage.file, // Preserve file object
        fileUrl: documents.storefront_image?.file_url || prev.storefrontImage.fileUrl,
        uploaded: documents.storefront_image?.uploaded || prev.storefrontImage.uploaded
      }
    }));
  }, [documents]);

  // Handle file input changes - Now uploads to Cloudinary immediately
  const handleFileChange = async (documentType, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type based on document type
    let allowedTypes;
    let maxSize;
    
    if (documentType === 'storefrontImage') {
      // Storefront image only accepts image formats
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      maxSize = 2 * 1024 * 1024; // 2MB limit for images
    } else {
      // Documents accept PDF and image formats
      allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      maxSize = 10 * 1024 * 1024; // 10MB limit for documents
    }
    
    if (!allowedTypes.includes(file.type)) {
      const allowedFormats = documentType === 'storefrontImage' ? 'JPG, or PNG' : 'PDF, JPG, or PNG';
      alert(`Please upload only ${allowedFormats} files.`);
      return;
    }

    if (file.size > maxSize) {
      const sizeLimit = documentType === 'storefrontImage' ? '2MB' : '10MB';
      alert(`File size must be less than ${sizeLimit}.`);
      return;
    }

    // Set uploading status
    setUploadStatus(prev => ({
      ...prev,
      [documentType]: { uploading: true, error: null }
    }));

    try {
      // Upload to Cloudinary
      let uploadResult;
      if (documentType === 'storefrontImage') {
        uploadResult = await uploadStorefrontImage(file);
      } else {
        uploadResult = await uploadPharmacyDocument(file, documentType);
      }

      if (uploadResult.success) {
        // Store Cloudinary URL in state
        setFormData(prev => ({
          ...prev,
          [documentType]: {
            ...prev[documentType],
            file: file, // Keep file for display purposes
            fileUrl: uploadResult.url,
            uploaded: true
          }
        }));

        // Create image preview for storefront image
        if (documentType === 'storefrontImage') {
          setImagePreviewUrl(uploadResult.url); // Use Cloudinary URL for preview
        }

        // Clear uploading status
        setUploadStatus(prev => ({
          ...prev,
          [documentType]: { uploading: false, error: null }
        }));

        console.log(`File uploaded to Cloudinary: ${file.name}`, uploadResult);
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Set error status
      setUploadStatus(prev => ({
        ...prev,
        [documentType]: { uploading: false, error: error.message }
      }));

      alert(`Failed to upload ${file.name}: ${error.message}`);
    }
  };

  // Handle expiry date changes
  const handleExpiryDateChange = (documentType, e) => {
    setFormData(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        expiryDate: e.target.value
      }
    }));
  };

  // Safe image preview creation
  const createImagePreview = (file) => {
    try {
      if (file && file instanceof File) {
        return URL.createObjectURL(file);
      }
      return null;
    } catch (error) {
      console.error('Error creating image preview:', error);
      return null;
    }
  };

  // Cleanup object URLs on component unmount
  useEffect(() => {
    return () => {
      // Cleanup any object URLs to prevent memory leaks
      if (imagePreviewUrl) {
        try {
          URL.revokeObjectURL(imagePreviewUrl);
        } catch (error) {
          console.error('Error revoking object URL:', error);
        }
      }
    };
  }, [imagePreviewUrl]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update context with document data (including file objects)
    updateDocuments({
      pharmacy_license: {
        file: formData.pharmacyLicense.file,
        file_url: formData.pharmacyLicense.fileUrl,
        expiry_date: formData.pharmacyLicense.expiryDate,
        uploaded: formData.pharmacyLicense.uploaded
      },
      business_permit: {
        file: formData.businessPermit.file,
        file_url: formData.businessPermit.fileUrl,
        expiry_date: formData.businessPermit.expiryDate,
        uploaded: formData.businessPermit.uploaded
      },
      owner_primary_id: {
        file: formData.ownerPrimaryId.file,
        file_url: formData.ownerPrimaryId.fileUrl,
        expiry_date: formData.ownerPrimaryId.expiryDate,
        uploaded: formData.ownerPrimaryId.uploaded
      },
      storefront_image: {
        file: formData.storefrontImage.file,
        file_url: formData.storefrontImage.fileUrl,
        uploaded: formData.storefrontImage.uploaded
      }
    });

    // Also update business info with expiry dates for easier access during submission
    updateBusinessInfo({
      business_permit_expiry: formData.businessPermit.expiryDate,
      pharmacy_license_expiry: formData.pharmacyLicense.expiryDate
    });

    console.log('=== PHARMACY REGISTRATION STEP 4 SUBMITTED ===');
    console.log('Form Data:', formData);
    console.log('Updated Documents:', {
      pharmacy_license: {
        file: formData.pharmacyLicense.file?.name || 'No file',
        file_url: formData.pharmacyLicense.fileUrl,
        expiry_date: formData.pharmacyLicense.expiryDate,
        uploaded: formData.pharmacyLicense.uploaded
      },
      business_permit: {
        file: formData.businessPermit.file?.name || 'No file',
        file_url: formData.businessPermit.fileUrl,
        expiry_date: formData.businessPermit.expiryDate,
        uploaded: formData.businessPermit.uploaded
      },
      owner_primary_id: {
        file: formData.ownerPrimaryId.file?.name || 'No file',
        file_url: formData.ownerPrimaryId.fileUrl,
        expiry_date: formData.ownerPrimaryId.expiryDate,
        uploaded: formData.ownerPrimaryId.uploaded
      },
      storefront_image: {
        file: formData.storefrontImage.file?.name || 'No file',
        file_url: formData.storefrontImage.fileUrl,
        uploaded: formData.storefrontImage.uploaded
      }
    });
    console.log('All Registration Data:', getAllRegistrationData());
    console.log('===============================================');
    
    logRegistrationData();
    
    // Navigate to next step
    navigate('/pharmacy-registration-5');
  };

  // Log the current registration data when component mounts
  useEffect(() => {
    console.log('=== PHARMACY REGISTRATION STEP 4 MOUNTED ===');
    console.log('Initial Documents Data:', documents);
    console.log('Current Form Data:', formData);
    console.log('All Registration Data:', getAllRegistrationData());
    console.log('=============================================');
    logRegistrationData();
  }, [logRegistrationData, documents, formData, getAllRegistrationData]);

  // Debug form validation state
  useEffect(() => {
    const formValid = (
      formData.pharmacyLicense.file &&
      formData.pharmacyLicense.expiryDate !== '' &&
      formData.businessPermit.file &&
      formData.businessPermit.expiryDate !== '' &&
      formData.ownerPrimaryId.file &&
      formData.ownerPrimaryId.expiryDate !== '' &&
      formData.storefrontImage.file
    );
    
    console.log('=== FORM VALIDATION DEBUG ===');
    console.log('Pharmacy License:', {
      file: formData.pharmacyLicense.file?.name || 'No file',
      expiryDate: formData.pharmacyLicense.expiryDate,
      isValid: formData.pharmacyLicense.file && formData.pharmacyLicense.expiryDate !== ''
    });
    console.log('Business Permit:', {
      file: formData.businessPermit.file?.name || 'No file',
      expiryDate: formData.businessPermit.expiryDate,
      isValid: formData.businessPermit.file && formData.businessPermit.expiryDate !== ''
    });
    console.log('Owner Primary ID:', {
      file: formData.ownerPrimaryId.file?.name || 'No file',
      expiryDate: formData.ownerPrimaryId.expiryDate,
      isValid: formData.ownerPrimaryId.file && formData.ownerPrimaryId.expiryDate !== ''
    });
    console.log('Storefront Image:', {
      file: formData.storefrontImage.file?.name || 'No file',
      isValid: formData.storefrontImage.file
    });
    console.log('Overall Form Valid:', formValid);
    console.log('Next Button Enabled:', formValid);
    console.log('=============================');
  }, [formData]);

  // Form validation - Check for fileUrl (Cloudinary URL) instead of file
  const isFormValid = () => {
    return (
      formData.pharmacyLicense.fileUrl &&
      formData.pharmacyLicense.expiryDate !== '' &&
      formData.businessPermit.fileUrl &&
      formData.businessPermit.expiryDate !== '' &&
      formData.ownerPrimaryId.fileUrl &&
      formData.ownerPrimaryId.expiryDate !== '' &&
      formData.storefrontImage.fileUrl &&
      !uploadStatus.pharmacyLicense.uploading &&
      !uploadStatus.businessPermit.uploading &&
      !uploadStatus.ownerPrimaryId.uploading &&
      !uploadStatus.storefrontImage.uploading
    );
  };

  // Check if specific field is valid
  const isFieldValid = (fieldName) => {
    switch (fieldName) {
      case 'pharmacyLicense':
        return formData.pharmacyLicense.fileUrl && formData.pharmacyLicense.expiryDate !== '';
      case 'businessPermit':
        return formData.businessPermit.fileUrl && formData.businessPermit.expiryDate !== '';
      case 'ownerPrimaryId':
        return formData.ownerPrimaryId.fileUrl && formData.ownerPrimaryId.expiryDate !== '';
      case 'storefrontImage':
        return formData.storefrontImage.fileUrl;
      default:
        return true;
    }
  };

  return (
    <div className="h-screen overflow-hidden font-roboto">
      {/* Header - Simplified version with only logo */}
      <nav className="bg-white shadow-lg border-b border-[#D5E8D4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <img 
                    src="/assets/logosvgdark.svg" 
                    alt="PharmaGo Logo" 
                    className="h-10 w-auto"
                  />
                </div>
              </div>
            </div>
            {/* Empty div to maintain spacing - no buttons on right */}
            <div></div>
          </div>
        </div>
      </nav>

      {/* Main Container - Grid Layout */}
      <div className="grid grid-cols-2 h-[calc(100vh-88px)]">
        {/* Left Image Container */}
        <div className="relative overflow-hidden">
          <div className="w-full h-full">
            <img 
              src="/images/pharmadocs.png" 
              alt="Pharmacy Documents" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right Form Container */}
        <div className="flex flex-col justify-start items-center h-full text-center relative overflow-y-auto pb-16">
          <div className="flex justify-center relative top-6 pt-6">
            <div className="flex flex-col absolute w-[25vw] justify-start items-start text-[#2c2c2c] max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Header */}
              <h1 className="text-3xl font-bold mb-6 leading-10 flex text-left justify-left text-[#2c2c2c]">
                Upload your verification documents
              </h1>
              <p className="text-base mt-[-7px] text-[#8d8c8c] text-left leading-5 font-normal">
                To keep PharmaGo safe and trustworthy, we'll need a few official documents to verify your pharmacy.
              </p>

              {/* Form */}
              <div className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]">
                <form className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c] space-y-4" onSubmit={handleSubmit}>
                  
                  {/* Pharmacy License */}
                  <div className="relative my-2.5 z-10">
                    <div className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                      isFieldValid('pharmacyLicense') 
                        ? 'border-[#D5E8D4]' 
                        : 'border-red-300'
                    }`}>
                      <label className={`block text-sm mb-3 font-medium ${
                        isFieldValid('pharmacyLicense') 
                          ? 'text-[#4DAF7C]' 
                          : 'text-red-500'
                      }`}>
                        Pharmacy License *
                      </label>
                      
                      {/* File Upload */}
                      <div className="mb-3">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('pharmacyLicense', e)}
                          disabled={uploadStatus.pharmacyLicense.uploading}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6BBF9A] file:text-white hover:file:bg-[#4DAF7C] disabled:opacity-50"
                        />
                        {uploadStatus.pharmacyLicense.uploading && (
                          <p className="text-xs text-blue-600 mt-1">
                            ⏳ Uploading to cloud...
                          </p>
                        )}
                        {uploadStatus.pharmacyLicense.error && (
                          <p className="text-xs text-red-600 mt-1">
                            ✗ {uploadStatus.pharmacyLicense.error}
                          </p>
                        )}
                        {formData.pharmacyLicense.file && !uploadStatus.pharmacyLicense.uploading && !uploadStatus.pharmacyLicense.error && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {formData.pharmacyLicense.file.name} (Uploaded to cloud)
                          </p>
                        )}
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <input
                          type="date"
                          value={formData.pharmacyLicense.expiryDate}
                          onChange={(e) => handleExpiryDateChange('pharmacyLicense', e)}
                          className={`w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                            formData.pharmacyLicense.expiryDate !== '' 
                              ? 'border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]' 
                              : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          }`}
                          placeholder="Expiry Date"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Document expiry date</p>
                      </div>
                    </div>
                  </div>

                  {/* Business Permit */}
                  <div className="relative my-2.5 z-10">
                    <div className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                      isFieldValid('businessPermit') 
                        ? 'border-[#D5E8D4]' 
                        : 'border-red-300'
                    }`}>
                      <label className={`block text-sm mb-3 font-medium ${
                        isFieldValid('businessPermit') 
                          ? 'text-[#4DAF7C]' 
                          : 'text-red-500'
                      }`}>
                        Business Permit *
                      </label>
                      
                      {/* File Upload */}
                      <div className="mb-3">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('businessPermit', e)}
                          disabled={uploadStatus.businessPermit.uploading}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6BBF9A] file:text-white hover:file:bg-[#4DAF7C] disabled:opacity-50"
                        />
                        {uploadStatus.businessPermit.uploading && (
                          <p className="text-xs text-blue-600 mt-1">
                            ⏳ Uploading to cloud...
                          </p>
                        )}
                        {uploadStatus.businessPermit.error && (
                          <p className="text-xs text-red-600 mt-1">
                            ✗ {uploadStatus.businessPermit.error}
                          </p>
                        )}
                        {formData.businessPermit.file && !uploadStatus.businessPermit.uploading && !uploadStatus.businessPermit.error && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {formData.businessPermit.file.name} (Uploaded to cloud)
                          </p>
                        )}
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <input
                          type="date"
                          value={formData.businessPermit.expiryDate}
                          onChange={(e) => handleExpiryDateChange('businessPermit', e)}
                          className={`w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                            formData.businessPermit.expiryDate !== '' 
                              ? 'border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]' 
                              : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          }`}
                          placeholder="Expiry Date"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Document expiry date</p>
                      </div>
                    </div>
                  </div>

                  {/* Owner's Primary ID */}
                  <div className="relative my-2.5 z-10">
                    <div className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                      isFieldValid('ownerPrimaryId') 
                        ? 'border-[#D5E8D4]' 
                        : 'border-red-300'
                    }`}>
                      <label className={`block text-sm mb-3 font-medium ${
                        isFieldValid('ownerPrimaryId') 
                          ? 'text-[#4DAF7C]' 
                          : 'text-red-500'
                      }`}>
                        Owner's Primary ID *
                      </label>
                      
                      {/* File Upload */}
                      <div className="mb-3">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('ownerPrimaryId', e)}
                          disabled={uploadStatus.ownerPrimaryId.uploading}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6BBF9A] file:text-white hover:file:bg-[#4DAF7C] disabled:opacity-50"
                        />
                        {uploadStatus.ownerPrimaryId.uploading && (
                          <p className="text-xs text-blue-600 mt-1">
                            ⏳ Uploading to cloud...
                          </p>
                        )}
                        {uploadStatus.ownerPrimaryId.error && (
                          <p className="text-xs text-red-600 mt-1">
                            ✗ {uploadStatus.ownerPrimaryId.error}
                          </p>
                        )}
                        {formData.ownerPrimaryId.file && !uploadStatus.ownerPrimaryId.uploading && !uploadStatus.ownerPrimaryId.error && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {formData.ownerPrimaryId.file.name} (Uploaded to cloud)
                          </p>
                        )}
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <input
                          type="date"
                          value={formData.ownerPrimaryId.expiryDate}
                          onChange={(e) => handleExpiryDateChange('ownerPrimaryId', e)}
                          className={`w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                            formData.ownerPrimaryId.expiryDate !== '' 
                              ? 'border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]' 
                              : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          }`}
                          placeholder="Expiry Date"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Document expiry date</p>
                      </div>
                    </div>
                  </div>

                  {/* Storefront Image */}
                  <div className="relative my-2.5 z-10">
                    <div className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                      isFieldValid('storefrontImage') 
                        ? 'border-[#D5E8D4]' 
                        : 'border-red-300'
                    }`}>
                      <label className={`block text-sm mb-3 font-medium ${
                        isFieldValid('storefrontImage') 
                          ? 'text-[#4DAF7C]' 
                          : 'text-red-500'
                      }`}>
                        Storefront Image *
                      </label>
                      
                      {/* File Upload */}
                      <div className="mb-3">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('storefrontImage', e)}
                          disabled={uploadStatus.storefrontImage.uploading}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6BBF9A] file:text-white hover:file:bg-[#4DAF7C] disabled:opacity-50"
                        />
                        {uploadStatus.storefrontImage.uploading && (
                          <p className="text-xs text-blue-600 mt-1">
                            ⏳ Uploading to cloud...
                          </p>
                        )}
                        {uploadStatus.storefrontImage.error && (
                          <p className="text-xs text-red-600 mt-1">
                            ✗ {uploadStatus.storefrontImage.error}
                          </p>
                        )}
                        {formData.storefrontImage.file && !uploadStatus.storefrontImage.uploading && !uploadStatus.storefrontImage.error && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {formData.storefrontImage.file.name} (Uploaded to cloud)
                          </p>
                        )}
                      </div>

                      {/* Image Preview */}
                      {imagePreviewUrl && (
                        <div className="mt-3">
                          <img
                            src={imagePreviewUrl}
                            alt="Storefront preview"
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              console.error('Image preview failed:', e);
                              e.target.style.display = 'none';
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-1">Image preview</p>
                        </div>
                      )}
                    </div>
                  </div>

                                     {/* File Requirements Info */}
                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                     <h4 className="text-sm font-medium text-blue-800 mb-2">Document Requirements:</h4>
                     <ul className="text-xs text-blue-700 space-y-1">
                       <li>• Documents: PDF, JPG, PNG (max 10MB each)</li>
                       <li>• Storefront Image: JPG, PNG only (max 2MB)</li>
                       <li>• All documents must be valid and not expired</li>
                       <li>• Clear, readable copies are required</li>
                     </ul>
                   </div>

                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-row justify-between items-center fixed right-0 bottom-20 w-[50vw] h-1.5 bg-[#c2bdbd] z-30">
        <div className="w-[67%] h-1.5 bg-[#004445]"></div>
      </div>

      {/* Footer */}
      <div className="flex flex-row justify-between items-center w-[48vw] fixed right-2.5 bottom-0 p-5 z-10 gap-2.5">
        <button 
          type="button"
          onClick={() => navigate('/pharmacy-registration-3')}
          className="text-base bg-white text-[#2c786c] border-none py-1.5 px-5 font-bold rounded hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <p className="text-gray-500">2 step(s) to complete</p>
        <button 
          type="submit"
          onClick={handleSubmit}
          disabled={!isFormValid()}
          className={`text-base border-none py-1.5 px-5 font-bold rounded transition-colors ${
            isFormValid() 
              ? 'bg-[#2c786c] text-white hover:bg-[#004445]' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PharmacyRegistration4;
