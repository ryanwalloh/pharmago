import React from 'react';
import { useRegistration } from '../contexts/RegistrationContext';

const PharmacyRegistration = () => {
  const { logRegistrationData, getAllRegistrationData } = useRegistration();

  // Log the current registration data when component mounts
  React.useEffect(() => {
    logRegistrationData();
  }, [logRegistrationData]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Pharmacy Registration
            </h1>
            <p className="text-lg text-gray-600">
              Complete your pharmacy registration in a few simple steps
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                <div key={step} className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full text-sm font-medium text-gray-600">
                    {step}
                  </div>
                  {step < 7 && (
                    <div className="w-16 h-1 bg-gray-200 ml-2"></div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-500 text-center">
              Step 1 of 7: User Account Information
            </div>
          </div>

          {/* Placeholder Content */}
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Registration Form Wizard
            </h3>
            <p className="text-gray-500 mb-4">
              This is where the step-by-step registration form will be implemented.
            </p>
            <p className="text-sm text-gray-400">
              Check the browser console to see the collected registration data.
            </p>
          </div>

          {/* Debug Information (remove in production) */}
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Debug: Current Registration Data</h4>
            <pre className="text-xs text-gray-600 overflow-auto max-h-40">
              {JSON.stringify(getAllRegistrationData(), null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyRegistration;
