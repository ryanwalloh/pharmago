import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function RiderRegistrationFinish() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registration Complete</Text>
      <Text style={styles.subtitle}>Your rider application has been submitted successfully.</Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/') }>
        <Text style={styles.primaryText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: '#00BF63',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});



