import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RegistrationProvider } from './contexts/RegistrationContext';
import LandingPage from './components/LandingPage';
import PharmacyRegistration from './components/PharmacyRegistration';
import PharmacyRegistration2 from './components/PharmacyRegistration2';
import PharmacyRegistration3 from './components/PharmacyRegistration3';
import PharmacyRegistration4 from './components/PharmacyRegistration4';
import PharmacyRegistration5 from './components/PharmacyRegistration5';
import PharmacyRegistrationSubmission from './components/PharmacyRegistrationSubmission';

function App() {
  return (
    <RegistrationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pharmacy-registration" element={<PharmacyRegistration />} />
          <Route path="/pharmacy-registration-2" element={<PharmacyRegistration2 />} />
          <Route path="/pharmacy-registration-3" element={<PharmacyRegistration3 />} />
          <Route path="/pharmacy-registration-4" element={<PharmacyRegistration4 />} />
          <Route path="/pharmacy-registration-5" element={<PharmacyRegistration5 />} />
          <Route path="/pharmacy-registration-submission" element={<PharmacyRegistrationSubmission />} />
          <Route path="/registration-success" element={<div className="min-h-screen flex items-center justify-center bg-green-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-green-600 mb-4">Registration Successful!</h1>
              <p className="text-lg text-gray-600 mb-8">Your pharmacy registration has been submitted for review.</p>
              <button 
                onClick={() => window.location.href = '/'}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>} />
        </Routes>
      </Router>
    </RegistrationProvider>
  );
}

export default App;
