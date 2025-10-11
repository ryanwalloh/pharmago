import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistration } from '../contexts/RegistrationContext';

const PharmacyRegistrationSubmission = () => {
  const navigate = useNavigate();
  const { 
    prepareFinalSubmissionData,
    getAllRegistrationData,
    resetRegistration
  } = useRegistration();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [validationErrors, setValidationErrors] = useState(null);

  // Handle final submission
  const handleFinalSubmission = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setValidationErrors(null);

    try {
      // Prepare all collected data
      const submissionData = prepareFinalSubmissionData();
      
      console.log('=== FINAL SUBMISSION STARTING ===');
      console.log('All Registration Data:', getAllRegistrationData());
      console.log('Prepared Submission Data:', submissionData);
      console.log('================================');

      // Since we're using Cloudinary URLs instead of files, we can send JSON
      // No need for FormData anymore
      console.log('=== SUBMISSION DATA DEBUG ===');
      console.log('Submission Data:', JSON.stringify(submissionData, null, 2));
      console.log('Document URLs:');
      console.log('- Pharmacy License:', submissionData.pharmacy_license_url);
      console.log('- Business Permit:', submissionData.business_permit_url);
      console.log('- Owner Primary ID:', submissionData.owner_primary_id_url);
      console.log('- Storefront Image:', submissionData.storefront_image_url);
      console.log('=============================');
      
      // Submit to API: try secure endpoint first, fallback to direct unauth path
      const base = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
      let response = await fetch(`${base}/users/register-pharmacy/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });
      if (response.status === 401 || response.status === 403) {
        // Fallback to direct unauthenticated endpoint under /api
        const directBase = base.replace('/api/v1', '/api');
        response = await fetch(`${directBase}/pharmacy-register/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData),
        });
      }
      
      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch {}

        console.error('=== REGISTRATION ERROR RESPONSE ===');
        console.error('Full Error Data:', errorData ? JSON.stringify(errorData, null, 2) : 'non-JSON response');
        const serverValidation = errorData && errorData.validation_errors ? errorData.validation_errors : null;
        const serverMessage = errorData && (errorData.error || errorData.details || errorData.message);

        if (serverValidation && Object.keys(serverValidation).length > 0) {
          setValidationErrors(serverValidation);
          setSubmissionError('Please fix the highlighted fields below and try again.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setIsSubmitting(false);
          return;
        }

        if (serverMessage) {
          setSubmissionError(serverMessage);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setIsSubmitting(false);
          return;
        }

        setSubmissionError('Registration failed. Please review your information and try again.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsSubmitting(false);
        return;
      }
      
      const result = await response.json();
      
      console.log('=== SUBMISSION SUCCESSFUL ===');
      console.log('Registration completed successfully!');
      console.log('Response:', result);
      console.log('=============================');
      
      // Clear registration data
      resetRegistration();
      
      // Navigate to success page or dashboard
      navigate('/registration-success');
      
    } catch (error) {
      console.error('=== SUBMISSION ERROR ===');
      console.error('Error:', error);
      console.error('========================');
      
      setSubmissionError(error.message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get all collected data for review
  const allData = getAllRegistrationData();

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
              src="/images/pharmasubmit.png" 
              alt="Registration Submission" 
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
                Review and submit your registration
              </h1>
              <p className="text-base mt-[-7px] text-[#8d8c8c] text-left leading-5 font-normal">
                Please review all your information before submitting. You can go back to make changes if needed.
              </p>

              {/* Server error summary */}
              {submissionError && (
                <div className="w-[22vw] mb-4 p-4 border border-red-200 bg-red-50 rounded-lg text-left">
                  <p className="text-red-700 text-sm font-semibold mb-2">{submissionError}</p>
                  {validationErrors && (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-red-700">
                      {Object.entries(validationErrors).map(([field, errors]) => (
                        <li key={field}>
                          <span className="font-medium">{friendlyFieldLabel(field)}:</span> {Array.isArray(errors) ? errors.join(', ') : errors}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Review Section */}
              <div className="w-[22vw] h-[55vh] pb-5 pt-2.5 flex flex-col text-[#2c2c2c] space-y-4">
                
                {/* User Account Information */}
                <div className="border-2 border-[#D5E8D4] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#4DAF7C] mb-3">Account Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Pharmacy Name:</span> {allData.userAccount.pharmacy_name}</p>
                    <p><span className="font-medium">Owner:</span> {allData.userAccount.first_name} {allData.userAccount.middle_name} {allData.userAccount.last_name}</p>
                    <p><span className="font-medium">Date of Birth:</span> {allData.userAccount.date_of_birth}</p>
                    <p><span className="font-medium">Gender:</span> {allData.userAccount.gender}</p>
                    <p><span className="font-medium">Email:</span> {allData.userAccount.email}</p>
                    <p><span className="font-medium">Phone:</span> {allData.userAccount.phone}</p>
                    <p><span className="font-medium">BIR Form:</span> {allData.userAccount.bir_form}</p>
                  </div>
                </div>

                {/* Business Information */}
                <div className="border-2 border-[#D5E8D4] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#4DAF7C] mb-3">Business Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Business Permit:</span> {allData.businessInfo.business_permit_number}</p>
                    <p><span className="font-medium">Pharmacy License:</span> {allData.businessInfo.pharmacy_license_number}</p>
                    <p><span className="font-medium">Business Phone:</span> {allData.businessInfo.business_phone}</p>
                    <p><span className="font-medium">Business Email:</span> {allData.businessInfo.business_email}</p>
                  </div>
                </div>

                {/* Location Information */}
                <div className="border-2 border-[#D5E8D4] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#4DAF7C] mb-3">Location Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Address:</span> {allData.locationInfo.street_address}</p>
                    <p><span className="font-medium">Barangay:</span> {allData.locationInfo.barangay}</p>
                    <p><span className="font-medium">City:</span> {allData.locationInfo.city}</p>
                    <p><span className="font-medium">Province:</span> {allData.locationInfo.province}</p>
                    <p><span className="font-medium">ZIP Code:</span> {allData.locationInfo.zip_code}</p>
                  </div>
                </div>

                {/* Documents */}
                <div className="border-2 border-[#D5E8D4] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#4DAF7C] mb-3">Documents</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Pharmacy License:</span> {allData.documents.pharmacy_license?.file_url ? '✓ Uploaded to cloud' : '✗ Missing'}</p>
                    <p><span className="font-medium">Business Permit:</span> {allData.documents.business_permit?.file_url ? '✓ Uploaded to cloud' : '✗ Missing'}</p>
                    <p><span className="font-medium">Owner Primary ID:</span> {allData.documents.owner_primary_id?.file_url ? '✓ Uploaded to cloud' : '✗ Missing'}</p>
                    <p><span className="font-medium">Storefront Image:</span> {allData.documents.storefront_image?.file_url ? '✓ Uploaded to cloud' : '✗ Missing'}</p>
                  </div>
                </div>

                {/* Inline validation list (duplicate for visibility below review) */}
                {validationErrors && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm font-semibold mb-2">Please address the following:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-red-700">
                      {Object.entries(validationErrors).map(([field, errors]) => (
                        <li key={field}>
                          <span className="font-medium">{friendlyFieldLabel(field)}:</span> {Array.isArray(errors) ? errors.join(', ') : errors}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Submit Button */}
                <button 
                  onClick={handleFinalSubmission}
                  disabled={isSubmitting}
                  className={`w-full font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                    isSubmitting 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-[#4DAF7C] hover:bg-[#2C7A5D] text-white'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-row justify-between items-center fixed right-0 bottom-20 w-[50vw] h-1.5 bg-[#c2bdbd] z-30">
        <div className="w-[100%] h-1.5 bg-[#004445]"></div>
      </div>

      {/* Footer */}
      <div className="flex flex-row justify-between items-center w-[48vw] fixed right-2.5 bottom-0 p-5 z-10 gap-2.5">
        <button 
          type="button"
          onClick={() => navigate('/pharmacy-registration-5')}
          className="text-base bg-white text-[#2c786c] border-none py-1.5 px-5 font-bold rounded hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <p className="text-gray-500">Final step</p>
        <div></div>
      </div>
    </div>
  );
};

export default PharmacyRegistrationSubmission;

// Map backend field keys to human-friendly labels
function friendlyFieldLabel(key) {
  const map = {
    email: 'Email',
    first_name: 'First Name',
    last_name: 'Last Name',
    middle_name: 'Middle Name',
    phone: 'Phone Number',
    date_of_birth: 'Date of Birth',
    gender: 'Gender',
    pharmacy_name: 'Pharmacy Name',
    business_permit_number: 'Business Permit Number',
    business_permit_expiry: 'Business Permit Expiry',
    pharmacy_license_number: 'Pharmacy License Number',
    pharmacy_license_expiry: 'Pharmacy License Expiry',
    business_phone: 'Business Phone',
    business_email: 'Business Email',
    street_address: 'Street Address',
    barangay: 'Barangay',
    city: 'City',
    province: 'Province',
    postal_code: 'Postal Code',
    latitude: 'Latitude',
    longitude: 'Longitude',
    operating_hours: 'Operating Hours',
    services_offered: 'Services Offered',
    payment_methods_accepted: 'Payment Methods',
    owner_primary_id_uploaded: 'Owner Primary ID Uploaded',
    business_permit_uploaded: 'Business Permit Uploaded',
    pharmacy_license_uploaded: 'Pharmacy License Uploaded',
    storefront_image_uploaded: 'Storefront Image Uploaded',
    pharmacy_license_file: 'Pharmacy License File',
    business_permit_file: 'Business Permit File',
    owner_primary_id_file: 'Owner Primary ID File',
    storefront_image_file: 'Storefront Image File',
    non_field_errors: 'General',
    detail: 'Detail',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
