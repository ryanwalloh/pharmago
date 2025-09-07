import React, { useState } from 'react';

const LoginModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement login logic
    console.log('Login form submitted:', formData);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto">
        {/* Close Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-8 pb-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#2C7A5D] mb-4">
              Welcome back to PharmaGo
            </h1>
            <p className="text-gray-600 leading-relaxed">
              Log in to manage your pharmacy, track deliveries, and serve your customers with ease
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="relative">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                placeholder="Enter your email"
                required
              />
              <label
                htmlFor="email"
                className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
              >
                Email Address
              </label>
            </div>

            {/* Password Field */}
            <div className="relative">
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                placeholder="Enter your password"
                required
              />
              <label
                htmlFor="password"
                className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
              >
                Password
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 bg-[#4DAF7C] hover:bg-[#2C7A5D] text-white"
            >
              Login
            </button>
          </form>

          {/* Additional Links */}
          <div className="mt-6 text-center space-y-3">
            <div className="text-sm">
              <a href="#forgot-password" className="text-[#6BBF9A] hover:text-[#4DAF7C] transition-colors duration-200">
                Forgot your password?
              </a>
            </div>
            <div className="text-sm">
              <span className="text-gray-700">Don't have an account? </span>
              <a href="#signup" className="text-[#6BBF9A] hover:text-[#4DAF7C] transition-colors duration-200">
                Sign up here
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
