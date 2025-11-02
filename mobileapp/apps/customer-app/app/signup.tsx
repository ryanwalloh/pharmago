import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import CreateAccountPage from '../components/CreateAccountPage';
import Onboarding from '../components/Onboarding';

export default function SignupScreen() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
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

