import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [showLogin, setShowLogin] = React.useState(false);

  // Delay import until user explicitly requests it
  if (showLogin) {
    const LoginPage = require('../components/LoginPage').default;
    return <LoginPage />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Loading...</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setShowLogin(true)}
      >
        <Text style={styles.buttonText}>Continue to Login</Text>
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
