import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import LoginPage from '../components/LoginPage';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LoginPage />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

