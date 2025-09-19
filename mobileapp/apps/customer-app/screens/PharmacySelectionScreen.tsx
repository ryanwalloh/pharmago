import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PharmacySelectionScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Pharmacy Selection</Text>
        <Text style={styles.subtitle}>Choose a pharmacy to process your prescription</Text>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            This page is ready for your design details!
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Nexa-Heavy',
    color: '#2A2A2A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    fontFamily: 'Nexa-ExtraLight',
    textAlign: 'center',
    marginBottom: 40,
  },
  placeholder: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666666',
    fontFamily: 'Nexa-ExtraLight',
    textAlign: 'center',
  },
});

export default PharmacySelectionScreen;
