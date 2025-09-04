import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistration } from '../contexts/RegistrationContext';

const PharmacyRegistration4 = () => {
  const navigate = useNavigate();
  const { 
    userAccount, 
    businessInfo,
    locationInfo,
    documents,
    updateUserAccount, 
    updateBusinessInfo,
    updateLocationInfo,
    updateDocuments,
    logRegistrationData, 
    getAllRegistrationData 
  } = useRegistration();

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
    }
  });

  // Update form data when context data changes
  useEffect(() => {
    setFormData(prev => ({
      pharmacyLicense: {
        ...prev.pharmacyLicense,
        fileUrl: documents.pharmacy_license?.file_url || prev.pharmacyLicense.fileUrl,
        expiryDate: documents.pharmacy_license?.expiry_date || prev.pharmacyLicense.expiryDate,
        uploaded: documents.pharmacy_license_uploaded || prev.pharmacyLicense.uploaded
      },
      businessPermit: {
        ...prev.businessPermit,
        fileUrl: documents.business_permit?.file_url || prev.businessPermit.fileUrl,
        expiryDate: documents.business_permit?.expiry_date || prev.businessPermit.expiryDate,
        uploaded: documents.business_permit_uploaded || prev.businessPermit.uploaded
      },
      ownerPrimaryId: {
        ...prev.ownerPrimaryId,
        fileUrl: documents.owner_primary_id?.file_url || prev.ownerPrimaryId.fileUrl,
        expiryDate: documents.owner_primary_id?.expiry_date || prev.ownerPrimaryId.expiryDate,
        uploaded: documents.owner_primary_id_uploaded || prev.ownerPrimaryId.uploaded
      }
    }));
  }, [documents]);

  // Handle file input changes
  const handleFileChange = async (documentType, e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload only PDF, JPG, or PNG files.');
        return;
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File size must be less than 10MB.');
        return;
      }

      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', documentType);
        
        // Upload file to backend
        const response = await fetch('http://localhost:8000/api/v1/document-uploads/', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const uploadResult = await response.json();
        
        // Update form data with uploaded file info
        setFormData(prev => ({
          ...prev,
          [documentType]: {
            ...prev[documentType],
            file: file,
            fileUrl: uploadResult.file_url,
            uploaded: true
          }
        }));

        console.log(`File uploaded successfully: ${uploadResult.filename}`);
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Upload failed: ${error.message}`);
      }
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

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update context with document data
    updateDocuments({
      pharmacy_license: {
        file_url: formData.pharmacyLicense.fileUrl,
        expiry_date: formData.pharmacyLicense.expiryDate
      },
      business_permit: {
        file_url: formData.businessPermit.fileUrl,
        expiry_date: formData.businessPermit.expiryDate
      },
      owner_primary_id: {
        file_url: formData.ownerPrimaryId.fileUrl,
        expiry_date: formData.ownerPrimaryId.expiryDate
      },
      pharmacy_license_uploaded: formData.pharmacyLicense.uploaded,
      business_permit_uploaded: formData.businessPermit.uploaded,
      owner_primary_id_uploaded: formData.ownerPrimaryId.uploaded
    });

    console.log('=== PHARMACY REGISTRATION STEP 4 SUBMITTED ===');
    console.log('Form Data:', formData);
    console.log('Updated Documents:', {
      pharmacy_license: {
        file_url: formData.pharmacyLicense.fileUrl,
        expiry_date: formData.pharmacyLicense.expiryDate
      },
      business_permit: {
        file_url: formData.businessPermit.fileUrl,
        expiry_date: formData.businessPermit.expiryDate
      },
      owner_primary_id: {
        file_url: formData.ownerPrimaryId.fileUrl,
        expiry_date: formData.ownerPrimaryId.expiryDate
      },
      pharmacy_license_uploaded: formData.pharmacyLicense.uploaded,
      business_permit_uploaded: formData.businessPermit.uploaded,
      owner_primary_id_uploaded: formData.ownerPrimaryId.uploaded
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
  }, [logRegistrationData, documents, formData]);

  // Form validation
  const isFormValid = () => {
    return (
      formData.pharmacyLicense.uploaded &&
      formData.pharmacyLicense.expiryDate !== '' &&
      formData.businessPermit.uploaded &&
      formData.businessPermit.expiryDate !== '' &&
      formData.ownerPrimaryId.uploaded &&
      formData.ownerPrimaryId.expiryDate !== ''
    );
  };

  // Check if specific field is valid
  const isFieldValid = (fieldName) => {
    switch (fieldName) {
      case 'pharmacyLicense':
        return formData.pharmacyLicense.uploaded && formData.pharmacyLicense.expiryDate !== '';
      case 'businessPermit':
        return formData.businessPermit.uploaded && formData.businessPermit.expiryDate !== '';
      case 'ownerPrimaryId':
        return formData.ownerPrimaryId.uploaded && formData.ownerPrimaryId.expiryDate !== '';
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
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6BBF9A] file:text-white hover:file:bg-[#4DAF7C]"
                        />
                        {formData.pharmacyLicense.file && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {formData.pharmacyLicense.file.name}
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
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6BBF9A] file:text-white hover:file:bg-[#4DAF7C]"
                        />
                        {formData.businessPermit.file && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {formData.businessPermit.file.name}
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
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6BBF9A] file:text-white hover:file:bg-[#4DAF7C]"
                        />
                        {formData.ownerPrimaryId.file && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {formData.ownerPrimaryId.file.name}
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

                                     {/* File Requirements Info */}
                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                     <h4 className="text-sm font-medium text-blue-800 mb-2">Document Requirements:</h4>
                     <ul className="text-xs text-blue-700 space-y-1">
                       <li>• Accepted formats: PDF, JPG, PNG</li>
                       <li>• Maximum file size: 10MB per document</li>
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
        <div className="w-[80%] h-1.5 bg-[#004445]"></div>
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
        <p className="text-gray-500">5 step(s) to complete</p>
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
