import React, { useState } from 'react';
import CreateAccountPage from '../components/CreateAccountPage';
import Onboarding from '../components/Onboarding';

export default function SignupScreen() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
    return (
      <Onboarding 
        onComplete={() => {
          // Onboarding complete - navigation handled by AuthContext
        }} 
        onNavigateToMain={() => {
          // Navigation handled by AuthContext
        }}
      />
    );
  }

  return (
    <CreateAccountPage 
      onBack={() => {
        // Go back to welcome page
        const { router } = require('expo-router');
        router.back();
      }}
      onRegistrationSuccess={() => {
        setShowOnboarding(true);
      }}
    />
  );
}

