import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RiderRegistration3() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Rider Registration - Step 3</Text>
      <Text style={styles.hint}>This page is intentionally left blank for now.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.75,
  },
});


