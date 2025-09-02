import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RegistrationProvider } from './contexts/RegistrationContext';
import LandingPage from './components/LandingPage';
import PharmacyRegistration from './components/PharmacyRegistration';

function App() {
  return (
    <RegistrationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pharmacy-registration" element={<PharmacyRegistration />} />
        </Routes>
      </Router>
    </RegistrationProvider>
  );
}

export default App;
