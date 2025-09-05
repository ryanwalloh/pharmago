import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistration } from '../contexts/RegistrationContext';

const PharmacyRegistration3 = () => {
  const navigate = useNavigate();
  const { 
    userAccount, 
    businessInfo,
    locationInfo,
    updateUserAccount, 
    updateBusinessInfo,
    updateLocationInfo,
    logRegistrationData, 
    getAllRegistrationData 
  } = useRegistration();

  // Form state - pre-populate with data from previous steps
  const [formData, setFormData] = useState({
    businessPermitNumber: businessInfo.business_permit_number || '',
    pharmacyLicenseNumber: businessInfo.pharmacy_license_number || '',
    businessPhone: businessInfo.business_phone || userAccount.phone || '',
    businessEmail: businessInfo.business_email || userAccount.email || '',
    operatingHours: businessInfo.operating_hours || {
      monday: { is_open: true, open_time: '08:00', close_time: '20:00' },
      tuesday: { is_open: true, open_time: '08:00', close_time: '20:00' },
      wednesday: { is_open: true, open_time: '08:00', close_time: '20:00' },
      thursday: { is_open: true, open_time: '08:00', close_time: '20:00' },
      friday: { is_open: true, open_time: '08:00', close_time: '20:00' },
      saturday: { is_open: true, open_time: '08:00', close_time: '18:00' },
      sunday: { is_open: false, open_time: '08:00', close_time: '18:00' }
    },
    servicesOffered: businessInfo.services_offered || ['delivery', 'prescription_filling', 'over_the_counter'],
    paymentMethodsAccepted: businessInfo.payment_methods_accepted || ['cash', 'credit_card', 'debit_card']
  });

  // Update form data when context data changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      businessPermitNumber: businessInfo.business_permit_number || prev.businessPermitNumber,
      businessPermitExpiry: businessInfo.business_permit_expiry || prev.businessPermitExpiry,
      pharmacyLicenseNumber: businessInfo.pharmacy_license_number || prev.pharmacyLicenseNumber,
      pharmacyLicenseExpiry: businessInfo.pharmacy_license_expiry || prev.pharmacyLicenseExpiry,
      businessPhone: businessInfo.business_phone || userAccount.phone || prev.businessPhone,
      businessEmail: businessInfo.business_email || userAccount.email || prev.businessEmail,
      operatingHours: businessInfo.operating_hours || prev.operatingHours,
      servicesOffered: businessInfo.services_offered || prev.servicesOffered,
      paymentMethodsAccepted: businessInfo.payment_methods_accepted || prev.paymentMethodsAccepted
    }));
  }, [userAccount, businessInfo]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle checkbox changes for services and payment methods
  const handleCheckboxChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  // Handle operating hours changes
  const handleOperatingHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: field === 'is_open' ? value : value
        }
      }
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update context with form data
    updateBusinessInfo({
      business_permit_number: formData.businessPermitNumber,
      pharmacy_license_number: formData.pharmacyLicenseNumber,
      business_phone: formData.businessPhone,
      business_email: formData.businessEmail,
      operating_hours: formData.operatingHours,
      services_offered: formData.servicesOffered,
      payment_methods_accepted: formData.paymentMethodsAccepted
    });

    console.log('=== PHARMACY REGISTRATION STEP 3 SUBMITTED ===');
    console.log('Form Data:', formData);
    console.log('Updated Business Info:', {
      business_permit_number: formData.businessPermitNumber,
      pharmacy_license_number: formData.pharmacyLicenseNumber,
      business_phone: formData.businessPhone,
      business_email: formData.businessEmail,
      operating_hours: formData.operatingHours,
      services_offered: formData.servicesOffered,
      payment_methods_accepted: formData.paymentMethodsAccepted
    });
    console.log('All Registration Data:', getAllRegistrationData());
    console.log('===============================================');
    
    logRegistrationData();
    
    // Navigate to next step
    navigate('/pharmacy-registration-4');
  };

  // Log the current registration data when component mounts
  useEffect(() => {
    console.log('=== PHARMACY REGISTRATION STEP 3 MOUNTED ===');
    console.log('Initial User Account Data:', userAccount);
    console.log('Initial Business Info Data:', businessInfo);
    console.log('Current Form Data:', formData);
    console.log('All Registration Data:', getAllRegistrationData());
    console.log('=============================================');
    logRegistrationData();
  }, [logRegistrationData, userAccount, businessInfo, formData]);

  const servicesOptions = [
    { value: 'delivery', label: 'Home Delivery Service' },
    { value: 'consultation', label: 'Pharmacist Consultation' },
    { value: 'prescription_filling', label: 'Prescription Medication' },
    { value: 'over_the_counter', label: 'OTC Medications' },
    { value: 'health_screening', label: 'Basic Health Checks' },
    { value: 'vaccination', label: 'Vaccination Services' }
  ];

  const paymentOptions = [
    { value: 'cash', label: 'Cash Payments' },
    { value: 'credit_card', label: 'Credit Card Payments' },
    { value: 'debit_card', label: 'Debit Card Payments' },
    { value: 'online_banking', label: 'Online Banking' },
    { value: 'mobile_payment', label: 'Mobile Payment Apps' },
    { value: 'insurance', label: 'Insurance Coverage' }
  ];

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Form validation
  const isFormValid = () => {
    return (
      formData.businessPermitNumber.trim() !== '' &&
      formData.businessPermitExpiry !== '' &&
      formData.pharmacyLicenseNumber.trim() !== '' &&
      formData.pharmacyLicenseExpiry !== '' &&
      formData.businessPhone.trim() !== '' &&
      formData.businessEmail.trim() !== '' &&
      formData.servicesOffered.length > 0 &&
      formData.paymentMethodsAccepted.length > 0
    );
  };

  // Check if specific field is valid
  const isFieldValid = (fieldName) => {
    switch (fieldName) {
      case 'businessPermitNumber':
        return formData.businessPermitNumber.trim() !== '';
      case 'pharmacyLicenseNumber':
        return formData.pharmacyLicenseNumber.trim() !== '';
      case 'businessPhone':
        return formData.businessPhone.trim() !== '';
      case 'businessEmail':
        return formData.businessEmail.trim() !== '';
      case 'servicesOffered':
        return formData.servicesOffered.length > 0;
      case 'paymentMethodsAccepted':
        return formData.paymentMethodsAccepted.length > 0;
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
              src="/images/pharmabizz.png" 
              alt="Pharmacy Business" 
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
                Add your business information
              </h1>
              <p className="text-base mt-[-7px] text-[#8d8c8c] text-left leading-5 font-normal">
                Let's get to know your business better so we can verify your details and get you started smoothly.
              </p>

              {/* Form */}
              <div className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]">
                <form className="w-[22vw] h-[50vh] pb-5 pt-2.5 flex flex-col text-[#2c2c2c] space-y-4" onSubmit={handleSubmit}>
                  
                                     {/* Business Permit Number */}
                   <div className="relative my-2.5 z-10">
                     <input
                       type="text"
                       id="businessPermitNumber"
                       name="businessPermitNumber"
                       value={formData.businessPermitNumber}
                       onChange={handleInputChange}
                       className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                         isFieldValid('businessPermitNumber') 
                           ? 'border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]' 
                           : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                       }`}
                       placeholder="Business Permit Number"
                       required
                     />
                     <label
                       htmlFor="businessPermitNumber"
                       className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                         isFieldValid('businessPermitNumber') 
                           ? 'text-[#4DAF7C] peer-focus:text-[#6BBF9A]' 
                           : 'text-red-500 peer-focus:text-red-500'
                       }`}
                     >
                       Business Permit Number *
                     </label>
                   </div>


                  {/* Pharmacy License Number */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="pharmacyLicenseNumber"
                      name="pharmacyLicenseNumber"
                      value={formData.pharmacyLicenseNumber}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                      placeholder="Pharmacy License Number"
                      required
                    />
                    <label
                      htmlFor="pharmacyLicenseNumber"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                    >
                      Pharmacy License Number *
                    </label>
                  </div>


                  {/* Business Phone */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="tel"
                      id="businessPhone"
                      name="businessPhone"
                      value={formData.businessPhone}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                      placeholder="Business Phone"
                      required
                    />
                    <label
                      htmlFor="businessPhone"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                    >
                      Business Phone *
                    </label>
                  </div>

                  {/* Business Email */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="email"
                      id="businessEmail"
                      name="businessEmail"
                      value={formData.businessEmail}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                      placeholder="Business Email"
                      required
                    />
                    <label
                      htmlFor="businessEmail"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                    >
                      Business Email *
                    </label>
                  </div>

                  {/* Services Offered */}
                  <div className="relative my-2.5 z-10">
                    <div className="border-2 border-[#D5E8D4] rounded-lg p-4">
                      <label className="block text-sm text-[#4DAF7C] mb-3 font-medium">
                        Services Offered *
                      </label>
                      <div className="space-y-2">
                        {servicesOptions.map((service) => (
                          <label key={service.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.servicesOffered.includes(service.value)}
                              onChange={() => handleCheckboxChange('servicesOffered', service.value)}
                              className="rounded border-[#D5E8D4] text-[#6BBF9A] focus:ring-[#6BBF9A]"
                            />
                            <span className="text-sm text-gray-700">{service.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="relative my-2.5 z-10">
                    <div className="border-2 border-[#D5E8D4] rounded-lg p-4">
                      <label className="block text-sm text-[#4DAF7C] mb-3 font-medium">
                        Payment Methods Accepted *
                      </label>
                      <div className="space-y-2">
                        {paymentOptions.map((payment) => (
                          <label key={payment.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.paymentMethodsAccepted.includes(payment.value)}
                              onChange={() => handleCheckboxChange('paymentMethodsAccepted', payment.value)}
                              className="rounded border-[#D5E8D4] text-[#6BBF9A] focus:ring-[#6BBF9A]"
                            />
                            <span className="text-sm text-gray-700">{payment.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-row justify-between items-center fixed right-0 bottom-20 w-[50vw] h-1.5 bg-[#c2bdbd] z-30">
        <div className="w-[60%] h-1.5 bg-[#004445]"></div>
      </div>

      {/* Footer */}
      <div className="flex flex-row justify-between items-center w-[48vw] fixed right-2.5 bottom-0 p-5 z-10 gap-2.5">
        <button 
          type="button"
          onClick={() => navigate('/pharmacy-registration-2')}
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

export default PharmacyRegistration3;
