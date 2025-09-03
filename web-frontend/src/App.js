import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RegistrationProvider } from './contexts/RegistrationContext';
import LandingPage from './components/LandingPage';
import PharmacyRegistration from './components/PharmacyRegistration';
import PharmacyRegistration2 from './components/PharmacyRegistration2';

function App() {
  return (
    <RegistrationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pharmacy-registration" element={<PharmacyRegistration />} />
          <Route path="/pharmacy-registration-2" element={<PharmacyRegistration2 />} />
        </Routes>
      </Router>
    </RegistrationProvider>
  );
}

export default App;
