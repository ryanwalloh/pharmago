import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const InitialLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validatingToken, setValidatingToken] = useState(false);

  // Extract token from URL parameters and validate it
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      validateTokenAndFetchEmail(urlToken);
    } else {
      setError('No login token found in URL. Please use the link from your welcome email.');
    }
  }, [searchParams]);

  // Validate token and fetch pharmacy email
  const validateTokenAndFetchEmail = async (token) => {
    try {
      setValidatingToken(true);
      setError('');
      
      console.log('Validating token:', token);
      
      // Call the backend to validate token and get pharmacy info
      const response = await axios.get(`http://127.0.0.1:8000/api/validate-login-token/${token}/`);
      console.log('Token validation response:', response.data);
      
      if (response.data.success) {
        // Update form with pharmacy email
        setFormData(prev => ({
          ...prev,
          email: response.data.pharmacy_email || response.data.business_email || ''
        }));
        console.log('Pharmacy email populated:', response.data.pharmacy_email || response.data.business_email);
      } else {
        setError(response.data.message || 'Invalid or expired token. Please use the link from your welcome email.');
      }
    } catch (error) {
      console.error('Error validating token:', error);
      setError('Failed to validate token. Please check your internet connection and try again.');
    } finally {
      setValidatingToken(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.username || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    // TODO: Implement backend integration
    console.log('Form submission:', {
      token,
      username: formData.username,
      password: formData.password,
      email: formData.email
    });

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      // TODO: Redirect to pharmacy dashboard after successful setup
    }, 2000);
  };

  // Handle back to home
  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D5E8D4] to-[#C2DEDB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/assets/logosvgdark.svg" 
              alt="PharmaGo Logo" 
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#2C7A5D] mb-2">
            Complete Your Account Setup
          </h1>
          <p className="text-[#666666]">
            Welcome to PharmaGo! Please create your username and password to get started.
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E8D4] p-8">
          {success ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#2C7A5D] mb-2">
                Account Setup Complete!
              </h2>
              <p className="text-[#666666] mb-6">
                Your pharmacy account has been successfully created. You can now access your dashboard.
              </p>
              <button
                onClick={() => navigate('/pharmacy-dashboard')}
                className="w-full px-6 py-3 bg-[#4DAF7C] text-white rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200 font-semibold"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            // Form State
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Token Status */}
              {validatingToken ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium text-blue-800">Validating login token...</span>
                  </div>
                </div>
              ) : token && formData.email ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">Valid login token detected</span>
                  </div>
                </div>
              ) : token ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-yellow-800">Token found, validating...</span>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-red-800">No valid token found</span>
                  </div>
                </div>
              )}

              {/* Email Field (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-[#666666] mb-2">
                  Business Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Your business email will appear here"
                  className="w-full px-4 py-3 border border-[#D5E8D4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 focus:border-[#6BBF9A] transition-all duration-200 bg-gray-50"
                  disabled
                />
                <p className="text-xs text-[#999999] mt-1">
                  This will be populated automatically from your pharmacy registration
                </p>
              </div>

              {/* Username Field */}
              <div>
                <label className="block text-sm font-medium text-[#666666] mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Choose a unique username"
                  className="w-full px-4 py-3 border border-[#D5E8D4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 focus:border-[#6BBF9A] transition-all duration-200"
                  required
                />
                <p className="text-xs text-[#999999] mt-1">
                  This will be used to log into your pharmacy account
                </p>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-[#666666] mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create a secure password"
                  className="w-full px-4 py-3 border border-[#D5E8D4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 focus:border-[#6BBF9A] transition-all duration-200"
                  required
                />
                <p className="text-xs text-[#999999] mt-1">
                  Must be at least 8 characters long
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-[#666666] mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 border border-[#D5E8D4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 focus:border-[#6BBF9A] transition-all duration-200"
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-red-800">{error}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !token || validatingToken || !formData.email}
                className="w-full px-6 py-3 bg-[#4DAF7C] text-white rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Setting up your account...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Complete Setup</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <button
              onClick={handleBackToHome}
              className="text-[#666666] hover:text-[#4DAF7C] transition-colors duration-200 text-sm"
            >
              ← Back to Home
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-white rounded-xl border border-[#D5E8D4] p-4">
          <div className="flex items-start space-x-3">
            <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-[#2C7A5D] mb-1">Security Notice</h3>
              <p className="text-xs text-[#666666]">
                This link is valid for 48 hours and can only be used once. If you didn't request this setup, please ignore this email.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitialLogin;
