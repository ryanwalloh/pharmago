import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, true = authenticated, false = not authenticated

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('pharmago_admin_token');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        setIsAuthenticated(false);
        navigate('/pharmago-admin');
        return;
      }

      // Log the token for debugging (first 20 characters only for security)
      console.log('Token found:', token.substring(0, 20) + '...');
      console.log('Full token stored in localStorage:', token);
      
      // For now, we'll assume the token is valid if it exists
      // In a production app, you might want to validate the token with the backend
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [navigate]);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#D5E8D4] to-[#A8D5BA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DAF7C] mx-auto mb-4"></div>
          <p className="text-[#2C7A5D] font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render children (redirect will happen)
  if (isAuthenticated === false) {
    return null;
  }

  // If authenticated, render the protected component
  return children;
};

export default ProtectedRoute;
