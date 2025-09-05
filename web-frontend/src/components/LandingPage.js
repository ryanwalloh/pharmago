import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Hero from './Hero';
import { useRegistration } from '../contexts/RegistrationContext';



const LandingPage = () => {
  const navigate = useNavigate();
  const { updateUserAccount, logRegistrationData } = useRegistration();
  
  // Local state for form inputs
  const [formData, setFormData] = useState({
    pharmacyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birForm: ''
  });

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update registration context in real-time
    updateUserAccount({
      pharmacy_name: name === 'pharmacyName' ? value : formData.pharmacyName,
      first_name: name === 'firstName' ? value : formData.firstName,
      last_name: name === 'lastName' ? value : formData.lastName,
      email: name === 'email' ? value : formData.email,
      phone: name === 'phone' ? value : formData.phone,
      bir_form: formData.birForm
    });
  };

  // Handle radio button changes
  const handleRadioChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      birForm: value
    }));
    
    // Update registration context in real-time
    updateUserAccount({
      pharmacy_name: formData.pharmacyName,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      bir_form: value
    });
  };

  // Form validation
  const isFormValid = () => {
    return (
      formData.pharmacyName.trim() !== '' &&
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.birForm !== ''
    );
  };

  // Check if specific field is valid
  const isFieldValid = (fieldName) => {
    switch (fieldName) {
      case 'pharmacyName':
        return formData.pharmacyName.trim() !== '';
      case 'firstName':
        return formData.firstName.trim() !== '';
      case 'lastName':
        return formData.lastName.trim() !== '';
      case 'email':
        return formData.email.trim() !== '';
      case 'phone':
        return formData.phone.trim() !== '';
      case 'birForm':
        return formData.birForm !== '';
      default:
        return true;
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Log all collected data
    console.log('=== LANDING PAGE FORM SUBMISSION ===');
    console.log('Form Data:', formData);
    logRegistrationData();
    
    // Navigate to pharmacy registration
    navigate('/pharmacy-registration');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />

      {/* Registration Section */}
      <div className="relative h-screen bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/images/registerBg2.png)' }}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 h-screen flex items-start justify-end pt-14">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end">
              <div className="w-full max-w-md lg:max-w-lg">
                <div className="text-left mb-8">
                  <h1 className="text-2xl font-extrabold text-white sm:text-4xl md:text-5xl leading-tight mb-6">
                    Register your pharmacy with us!
                  </h1>
                  <p className="text-xl text-white mb-8 max-w-lg">
                    Join in minutes, add your products, and let us help you serve more people in need of care.
                  </p>
                </div>
                
                {/* Registration Form */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
                  <h2 className="text-2xl font-bold text-[#2C7A5D] mb-6 text-left">
                    Ready to serve more people?
                  </h2>
                  
                  <form className="space-y-6" onSubmit={handleSubmit}>
                    {/* Pharmacy Name */}
                    <div className="relative">
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

                    {/* Owner First Name */}
                    <div className="relative">
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                        placeholder="Pharmacy Owner First Name"
                        required
                      />
                      <label
                        htmlFor="firstName"
                        className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                      >
                        Pharmacy Owner First Name *
                      </label>
                    </div>

                    {/* Owner Last Name */}
                    <div className="relative">
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                        placeholder="Pharmacy Owner Last Name"
                        required
                      />
                      <label
                        htmlFor="lastName"
                        className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                      >
                        Pharmacy Owner Last Name *
                      </label>
                    </div>

                    {/* Business Email */}
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                        placeholder="Enter your Business Email"
                        required
                      />
                      <label
                        htmlFor="email"
                        className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                      >
                        Enter your Business Email *
                      </label>
                    </div>

                    {/* Mobile Phone */}
                    <div className="relative">
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                        placeholder="Mobile Phone Number"
                        required
                      />
                      <label
                        htmlFor="phone"
                        className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                      >
                        Mobile Phone Number *
                      </label>
                    </div>

                    {/* BIR 2303 Form Radio Buttons */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-[#4DAF7C] mb-2">
                        Do you have BIR 2303 form? *
                      </label>
                      <div className="flex space-x-6">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="birForm"
                            value="yes"
                            checked={formData.birForm === 'yes'}
                            onChange={handleRadioChange}
                            className="h-4 w-4 text-[#6BBF9A] border-[#D5E8D4] focus:ring-[#6BBF9A] focus:ring-2"
                            required
                          />
                          <span className="ml-2 text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="birForm"
                            value="no"
                            checked={formData.birForm === 'no'}
                            onChange={handleRadioChange}
                            className="h-4 w-4 text-[#6BBF9A] border-[#D5E8D4] focus:ring-[#6BBF9A] focus:ring-2"
                            required
                          />
                          <span className="ml-2 text-gray-700">No</span>
                        </label>
                      </div>
                    </div>

                    {/* Register Button */}
                    <button
                      type="submit"
                      disabled={!isFormValid()}
                      className={`w-full font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                        isFormValid() 
                          ? 'bg-[#4DAF7C] hover:bg-[#2C7A5D] text-white' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Register
                    </button>
                  </form>

                  {/* Links below form */}
                  <div className="mt-6 space-y-3 text-left">
                    <div className="text-sm">
                      <span className="text-gray-700">Already have an account? </span>
                      <a href="#login" className="text-[#6BBF9A] hover:text-[#4DAF7C] transition-colors duration-200">
                        Login
                      </a>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-700">Do you want to be a PharmaGo rider? </span>
                      <a href="#rider" className="text-[#6BBF9A] hover:text-[#4DAF7C] transition-colors duration-200">
                        Click here
                      </a>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="mt-6 text-xs text-gray-500 text-left leading-relaxed">
                    This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-left mt-20">
            <h2 className="text-3xl font-extrabold text-[#2C7A5D] sm:text-4xl">
              Everything you need to run your pharmacy online
            </h2>
            <p className="mt-4 max-w-2xl text-xl text-[#4DAF7C]">
              From inventory management to customer care, we've got you covered.
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                             {/* Feature 1 */}
               <div className="pt-6">
                 <div className="flow-root bg-[#D5E8D4] rounded-lg px-6 pb-8 h-full flex flex-col">
                   <div className="-mt-6 flex-1 flex flex-col">
                     <div>
                       <span className="inline-flex items-center justify-center p-3 bg-[#6BBF9A] rounded-md shadow-lg">
                         <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                         </svg>
                       </span>
                     </div>
                     <h3 className="mt-8 text-lg font-medium text-[#2C7A5D] tracking-tight">Expand Your Operations</h3>
                     <p className="mt-5 text-base text-[#4DAF7C] flex-1">
                       Scale your pharmacy business with our comprehensive platform. Reach more customers, and grow your revenue through our integrated solutions.
                     </p>
                   </div>
                 </div>
               </div>

                             {/* Feature 2 */}
               <div className="pt-6">
                 <div className="flow-root bg-[#D5E8D4] rounded-lg px-6 pb-8 h-full flex flex-col">
                   <div className="-mt-6 flex-1 flex flex-col">
                     <div>
                       <span className="inline-flex items-center justify-center p-3 bg-[#6BBF9A] rounded-md shadow-lg">
                         <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                         </svg>
                       </span>
                     </div>
                     <h3 className="mt-8 text-lg font-medium text-[#2C7A5D] tracking-tight">Order Processing</h3>
                     <p className="mt-5 text-base text-[#4DAF7C] flex-1">
                       Handle prescriptions, manage customer orders, and streamline your fulfillment process.
                     </p>
                   </div>
                 </div>
               </div>

                             {/* Feature 3 */}
               <div className="pt-6">
                 <div className="flow-root bg-[#D5E8D4] rounded-lg px-6 pb-8 h-full flex flex-col">
                   <div className="-mt-6 flex-1 flex flex-col">
                     <div>
                       <span className="inline-flex items-center justify-center p-3 bg-[#6BBF9A] rounded-md shadow-lg">
                         <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                         </svg>
                       </span>
                     </div>
                     <h3 className="mt-8 text-lg font-medium text-[#2C7A5D] tracking-tight">Delivery Management</h3>
                     <p className="mt-5 text-base text-[#4DAF7C] flex-1">
                       Coordinate deliveries, track packages, and ensure timely medication delivery to your customers.
                     </p>
                   </div>
                 </div>
               </div>

                             {/* Feature 4 */}
               <div className="pt-6">
                 <div className="flow-root bg-[#D5E8D4] rounded-lg px-6 pb-8 h-full flex flex-col">
                   <div className="-mt-6 flex-1 flex flex-col">
                     <div>
                       <span className="inline-flex items-center justify-center p-3 bg-[#6BBF9A] rounded-md shadow-lg">
                         <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                         </svg>
                       </span>
                     </div>
                     <h3 className="mt-8 text-lg font-medium text-[#2C7A5D] tracking-tight">Customer Management</h3>
                     <p className="mt-5 text-base text-[#4DAF7C] flex-1">
                       Build lasting relationships with your customers through personalized care and efficient service.
                     </p>
                   </div>
                 </div>
               </div>

                             {/* Feature 5 */}
               <div className="pt-6">
                 <div className="flow-root bg-[#D5E8D4] rounded-lg px-6 pb-8 h-full flex flex-col">
                   <div className="-mt-6 flex-1 flex flex-col">
                     <div>
                       <span className="inline-flex items-center justify-center p-3 bg-[#6BBF9A] rounded-md shadow-lg">
                         <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                         </svg>
                       </span>
                     </div>
                     <h3 className="mt-8 text-lg font-medium text-[#2C7A5D] tracking-tight">Analytics & Reporting</h3>
                     <p className="mt-5 text-base text-[#4DAF7C] flex-1">
                       Get insights into your business performance with comprehensive analytics and detailed reports.
                     </p>
                   </div>
                 </div>
               </div>

                             {/* Feature 6 */}
               <div className="pt-6">
                 <div className="flow-root bg-[#D5E8D4] rounded-lg px-6 pb-8 h-full flex flex-col">
                   <div className="-mt-6 flex-1 flex flex-col">
                     <div>
                       <span className="inline-flex items-center justify-center p-3 bg-[#6BBF9A] rounded-md shadow-lg">
                         <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                         </svg>
                       </span>
                     </div>
                     <h3 className="mt-8 text-lg font-medium text-[#2C7A5D] tracking-tight">Secure & Compliant</h3>
                     <p className="mt-5 text-base text-[#4DAF7C] flex-1">
                       HIPAA compliant with enterprise-grade security to protect sensitive patient information.
                     </p>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-green-600 mt-20">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to transform your pharmacy?</span>
            <span className="block text-green-200">Register Now!</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <a href="#signup" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-green-600 bg-white hover:bg-gray-50 transition-colors">
                Get started
              </a>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <a href="#contact" className="inline-flex items-center justify-center px-5 py-3 border border-white text-base font-medium rounded-md text-white bg-green hover:bg--400 transition-colors">
                Learn more
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8 xl:col-span-1">
              <h3 className="text-2xl font-bold text-white">Pharmago</h3>
              <p className="text-gray-300 text-base">
                Empowering pharmacies with modern technology solutions for better patient care and business growth.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Solutions</h3>
                  <ul className="mt-4 space-y-4">
                    <li><a href="#" className="text-base text-gray-300 hover:text-white transition-colors">Online Presence</a></li>
                    <li><a href="#" className="text-base text-gray-300 hover:text-white transition-colors">Order Processing</a></li>
                    <li><a href="#" className="text-base text-gray-300 hover:text-white transition-colors">Customer Care</a></li>
                  </ul>
                </div>
                <div className="mt-12 md:mt-0">
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Support</h3>
                  <ul className="mt-4 space-y-4">
                    <li><a href="#" className="text-base text-gray-300 hover:text-white transition-colors">Documentation</a></li>
                    <li><a href="#" className="text-base text-gray-300 hover:text-white transition-colors">Help Center</a></li>
                    <li><a href="#" className="text-base text-gray-300 hover:text-white transition-colors">Contact Us</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-700 pt-8">
            <p className="text-base text-gray-400 xl:text-center">
              &copy; 2024 Pharmago. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
