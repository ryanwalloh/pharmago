import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistration } from '../contexts/RegistrationContext';

const PharmacyRegistration = () => {
  const navigate = useNavigate();
  const { 
    userAccount, 
    businessInfo,
    updateUserAccount, 
    updateBusinessInfo,
    logRegistrationData, 
    getAllRegistrationData 
  } = useRegistration();

  // Form state - pre-populate with data from landing page
  const [formData, setFormData] = useState({
    // Business Information (from landing page)
    pharmacyName: userAccount.pharmacy_name || '',
    businessType: 'pharmacy',
    businessCategory: 'pharmacy',
    mobileNumber: userAccount.phone || '',
    email: userAccount.email || '',
    sameNumber: true
  });

  // Update form data when context data changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      pharmacyName: userAccount.pharmacy_name || prev.pharmacyName,
      mobileNumber: userAccount.phone || prev.mobileNumber,
      email: userAccount.email || prev.email
    }));
  }, [userAccount]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update context with form data
    updateUserAccount({
      pharmacy_name: formData.pharmacyName,
      email: formData.email,
      phone: formData.mobileNumber
    });

    updateBusinessInfo({
      pharmacy_name: formData.pharmacyName,
      business_type: formData.businessType,
      business_category: formData.businessCategory
    });

    console.log('=== PHARMACY REGISTRATION STEP 1 SUBMITTED ===');
    console.log('Form Data:', formData);
    console.log('Updated User Account:', {
      pharmacy_name: formData.pharmacyName,
      email: formData.email,
      phone: formData.mobileNumber
    });
    console.log('Updated Business Info:', {
      pharmacy_name: formData.pharmacyName,
      business_type: formData.businessType,
      business_category: formData.businessCategory
    });
    console.log('All Registration Data:', getAllRegistrationData());
    console.log('===============================================');
    
    logRegistrationData();
    
    // Navigate to next step
    navigate('/pharmacy-registration-2');
  };

  // Log the current registration data when component mounts
  useEffect(() => {
    console.log('=== PHARMACY REGISTRATION STEP 1 MOUNTED ===');
    console.log('Initial User Account Data:', userAccount);
    console.log('Initial Business Info Data:', businessInfo);
    console.log('Current Form Data:', formData);
    console.log('All Registration Data:', getAllRegistrationData());
    console.log('=============================================');
    logRegistrationData();
  }, [logRegistrationData, userAccount, businessInfo, formData]);

  // Form validation
  const isFormValid = () => {
    return (
      formData.pharmacyName.trim() !== '' &&
      formData.mobileNumber.trim() !== '' &&
      formData.email.trim() !== ''
    );
  };

  // Check if specific field is valid
  const isFieldValid = (fieldName) => {
    switch (fieldName) {
      case 'pharmacyName':
        return formData.pharmacyName.trim() !== '';
      case 'mobileNumber':
        return formData.mobileNumber.trim() !== '';
      case 'email':
        return formData.email.trim() !== '';
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
              src="/images/regbg1.png" 
              alt="Pharmacy Staff" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right Form Container */}
        <div className="flex flex-col justify-start items-center h-full text-center relative overflow-y-auto pb-16">
          <div className="flex justify-center relative top-6 pt-6">
            <div className="flex flex-col absolute w-[22vw] justify-start items-start text-[#2c2c2c]">
              {/* Header */}
              <h1 className="text-3xl font-bold mb-6 leading-10 flex text-left justify-left text-[#2c2c2c]">
                Tell us about your business
              </h1>
              <p className="text-base mt-[-7px] text-[#8d8c8c] text-left leading-5 font-normal">
                This information will be shown on the app so that customers can search and contact
                you in case they have any questions.
              </p>

              {/* Form */}
              <div className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]">
                <form className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]" onSubmit={handleSubmit}>
                  {/* Pharmacy Name */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="pharmacyName"
                      name="pharmacyName"
                      value={formData.pharmacyName}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid('pharmacyName') 
                          ? 'border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]' 
                          : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      }`}
                      placeholder="Your Pharmacy Name"
                      required
                    />
                    <label
                      htmlFor="pharmacyName"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid('pharmacyName') 
                          ? 'text-[#4DAF7C] peer-focus:text-[#6BBF9A]' 
                          : 'text-red-500 peer-focus:text-red-500'
                      }`}
                    >
                      Your Pharmacy Name *
                    </label>
                  </div>

                  {/* Business Type */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="businessType"
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                      placeholder="Business Type"
                      required
                    />
                    <label
                      htmlFor="businessType"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                    >
                      Business Type *
                    </label>
                  </div>

                  {/* Business Category */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="businessCategory"
                      name="businessCategory"
                      value={formData.businessCategory}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                      placeholder="Business Category"
                      required
                    />
                    <label
                      htmlFor="businessCategory"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                    >
                      Business Category *
                    </label>
                  </div>

                  {/* Business Email */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid('email') 
                          ? 'border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]' 
                          : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      }`}
                      placeholder="Business Email"
                      required
                    />
                    <label
                      htmlFor="email"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid('email') 
                          ? 'text-[#4DAF7C] peer-focus:text-[#6BBF9A]' 
                          : 'text-red-500 peer-focus:text-red-500'
                      }`}
                    >
                      Business Email *
                    </label>
                  </div>

                  {/* Mobile Number */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="tel"
                      id="mobileNumber"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid('mobileNumber') 
                          ? 'border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]' 
                          : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      }`}
                      placeholder="Mobile Number"
                      pattern="^(09|\+639)\d{9}$"
                      title="Please enter a valid Philippine mobile number (e.g., 09123456789 or +639123456789)"
                      required
                    />
                    <label
                      htmlFor="mobileNumber"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid('mobileNumber') 
                          ? 'text-[#4DAF7C] peer-focus:text-[#6BBF9A]' 
                          : 'text-red-500 peer-focus:text-red-500'
                      }`}
                    >
                      Mobile Number *
                    </label>
                  </div>

                  {/* Checkbox */}
                  <div className="text-base mt-2.5 flex">
                    <input
                      type="checkbox"
                      name="sameNumber"
                      checked={formData.sameNumber}
                      onChange={handleInputChange}
                      className="accent-[#2c786c] w-6 h-6 cursor-pointer mr-2.5 mt-[-3px]"
                    />
                    <label className="text-[#2c2c2c]">
                      My Business and Mobile Phone numbers are the same
                    </label>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-row justify-between items-center fixed right-0 bottom-20 w-[50vw] h-1.5 bg-[#c2bdbd] z-30">
        <div className="w-[20%] h-1.5 bg-[#004445]"></div>
      </div>

      {/* Footer */}
      <div className="flex flex-row justify-between items-center w-[48vw] fixed right-2.5 bottom-0 p-5 z-10 gap-2.5">
        <button 
          type="button"
          className="text-base bg-white text-[#2c786c] border-none py-1.5 px-5 font-bold rounded hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <p className="text-gray-500">4 step(s) to complete</p>
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

export default PharmacyRegistration;
