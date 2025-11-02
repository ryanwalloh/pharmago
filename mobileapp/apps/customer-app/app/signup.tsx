import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function SignupScreen() {
  const [showSignup, setShowSignup] = useState(false);
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

  // Delay import until user explicitly requests it
  if (showSignup) {
    const CreateAccountPage = require('../components/CreateAccountPage.MINIMAL').default;
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up Loading...</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setShowSignup(true)}
      >
        <Text style={styles.buttonText}>Continue to Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#00bf63',
  },
  button: {
    backgroundColor: '#00bf63',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 15,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 10,
  },
  backText: {
    color: '#666',
    fontSize: 14,
  },
});
