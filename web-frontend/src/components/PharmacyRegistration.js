import React, { useState } from 'react';
import { useRegistration } from '../contexts/RegistrationContext';

const PharmacyRegistration = () => {
  const { logRegistrationData, getAllRegistrationData } = useRegistration();

  // Form state
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'pharmacy',
    businessCategory: 'pharmacy',
    mobileNumber: '',
    sameNumber: true
  });

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
    console.log('Form submitted:', formData);
    logRegistrationData();
  };

  // Log the current registration data when component mounts
  React.useEffect(() => {
    logRegistrationData();
  }, [logRegistrationData]);

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
              <h1 className="text-3xl font-bold leading-10 flex text-left justify-left text-[#2c2c2c]">
                Tell us about your business
              </h1>
              <p className="text-base mt-[-7px] text-[#8d8c8c] text-left leading-5 font-normal">
                This information will be shown on the app so that customers can search and contact
                you in case they have any questions.
              </p>

              {/* Form */}
              <div className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]">
                <form className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]" onSubmit={handleSubmit}>
                  {/* Business Name */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="w-full px-6 py-7 border-none rounded-sm text-base box-border bg-gray-100 pt-8 pb-1.5 h-15 mb-2.5 focus:outline-none focus:ring-2 focus:ring-[#2c786c]"
                      placeholder=" "
                      required
                    />
                    <label className="absolute top-4 left-6 transition-all duration-200 ease-in-out text-[#8d8c8c] font-normal text-sm">
                      Your Business Name<span className="text-[#2c786c] text-xl relative top-1"> *</span>
                    </label>
                  </div>

                  {/* Business Type */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleInputChange}
                      className="w-full px-6 py-7 border-none rounded-sm text-base box-border bg-gray-100 pt-8 pb-1.5 h-15 mb-2.5 focus:outline-none focus:ring-2 focus:ring-[#2c786c]"
                      placeholder=" "
                      required
                    />
                    <label className="absolute top-4 left-6 transition-all duration-200 ease-in-out text-[#8d8c8c] font-normal text-sm">
                      Business Type<span className="text-[#2c786c] text-xl relative top-1"> *</span>
                    </label>
                  </div>

                  {/* Business Category */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      name="businessCategory"
                      value={formData.businessCategory}
                      onChange={handleInputChange}
                      className="w-full px-6 py-7 border-none rounded-sm text-base box-border bg-gray-100 pt-8 pb-1.5 h-15 mb-2.5 focus:outline-none focus:ring-2 focus:ring-[#2c786c]"
                      placeholder=" "
                      required
                    />
                    <label className="absolute top-4 left-6 transition-all duration-200 ease-in-out text-[#8d8c8c] font-normal text-sm">
                      Business Category<span className="text-[#2c786c] text-xl relative top-1"> *</span>
                    </label>
                  </div>

                  {/* Mobile Number */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      className="w-full px-6 py-7 border-none rounded-sm text-base box-border bg-gray-100 pt-8 pb-1.5 h-15 mb-2.5 focus:outline-none focus:ring-2 focus:ring-[#2c786c]"
                      placeholder=" "
                      pattern="^(09|\+639)\d{9}$"
                      title="Please enter a valid Philippine mobile number (e.g., 09123456789 or +639123456789)"
                      required
                    />
                    <label className="absolute top-4 left-6 transition-all duration-200 ease-in-out text-[#8d8c8c] font-normal text-sm">
                      Mobile Number<span className="text-[#2c786c] text-xl relative top-1"> *</span>
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
          className="text-base bg-[#2c786c] text-white border-none py-1.5 px-5 font-bold rounded hover:bg-[#004445] transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PharmacyRegistration;
