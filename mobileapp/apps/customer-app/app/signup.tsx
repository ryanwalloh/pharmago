import React, { useState } from 'react';
import { router } from 'expo-router';
import CreateAccountPage from '../components/CreateAccountPage';

export default function SignupScreen() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
    const Onboarding = require('../components/Onboarding').default;
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
        router.back();
      }}
      onRegistrationSuccess={() => {
        setShowOnboarding(true);
      }}
    />
  );
}
