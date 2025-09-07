import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('pharmago_admin_token');
    if (token) {
      console.log('User already logged in, redirecting to dashboard');
      navigate('/pharmago-admin/dashboard');
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // API call to Django backend
      const response = await fetch('http://127.0.0.1:8000/api/v1/pharmago-admin/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Store admin session token
        const data = await response.json();
        console.log('Login successful! Received token:', data.token);
        localStorage.setItem('pharmago_admin_token', data.token);
        
        // Verify token was stored correctly
        const storedToken = localStorage.getItem('pharmago_admin_token');
        console.log('Token stored in localStorage:', storedToken);
        console.log('Token verification - stored correctly:', storedToken === data.token);
        
        // Navigate to admin dashboard
        navigate('/pharmago-admin/dashboard');
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D5E8D4] to-[#A8D5BA] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <img 
                src="/assets/logosvgdark.svg" 
                alt="PharmaGo Logo" 
                className="h-12 w-auto"
              />
            </div>
            <h1 className="text-2xl font-bold text-[#2C7A5D] mb-2">
              PharmaGo Admin Portal
            </h1>
            <p className="text-gray-600 text-sm">
              Platform Management Access
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="px-8 pb-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Username Field */}
            <div className="relative">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                placeholder="Enter your username"
                required
              />
              <label
                htmlFor="username"
                className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
              >
                Username
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

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                isLoading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-[#4DAF7C] hover:bg-[#2C7A5D] text-white'
              }`}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Restricted Access - Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
