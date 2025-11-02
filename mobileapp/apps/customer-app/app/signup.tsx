import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import CreateAccountPage from '../components/CreateAccountPage';

export default function SignupScreen() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
    const Onboarding = require('../components/Onboarding').default;
    return (
      <SafeAreaView style={styles.container}>
        <Onboarding 
          onComplete={() => {
            // Onboarding complete - navigation handled by AuthContext
          }} 
          onNavigateToMain={() => {
            // Navigation handled by AuthContext
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CreateAccountPage 
        onBack={() => {
          // Go back to welcome page
          router.back();
        }}
        onRegistrationSuccess={() => {
          setShowOnboarding(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

