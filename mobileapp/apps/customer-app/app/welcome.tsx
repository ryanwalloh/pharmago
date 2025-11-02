import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { fontFamily } from '../utils/fonts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomePage() {
  return (
    <ImageBackground
      source={require('../assets/welcomepage.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {/* Dark Overlay */}
      <View style={styles.overlay} />
      
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.container}>
        {/* Top Section - Logo and Subtitle */}
        <View style={styles.topSection}>
          <Image
            source={require('../assets/pharmalogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Your health delivered with care</Text>
        </View>

        {/* Bottom Section - Buttons and Copyright */}
        <View style={styles.bottomSection}>
          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login' as any)}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          {/* Signup Button */}
          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push('/signup' as any)}
          >
            <Text style={styles.signupButtonText}>Sign Up</Text>
          </TouchableOpacity>

          {/* Copyright Text */}
          <Text style={styles.copyrightText}>© 2025 PharmaGo. All rights reserved.</Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // 40% dark overlay
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.1, // 10% from top
  },
  logo: {
    width: Math.min(SCREEN_WIDTH * 0.5, 200), // 50% of screen width, max 200
    height: Math.min(SCREEN_WIDTH * 0.5, 200),
    marginBottom: 0, // Reduced to bring subtitle closer
  },
  subtitle: {
    fontSize: 18,
    fontFamily: fontFamily.light,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.1, // 10% side padding
    marginTop: -50, // Negative margin to pull closer to logo
  },
  bottomSection: {
    paddingHorizontal: SCREEN_WIDTH * 0.08, // 8% side padding
    paddingBottom: 40,
    alignItems: 'stretch',
  },
  loginButton: {
    backgroundColor: '#00bf63',
    borderRadius: 42,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    opacity: 0.8,

  },
  loginButtonText: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
  },
  signupButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 42,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  signupButtonText: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#00bf63',
  },
  copyrightText: {
    fontSize: 12,
    fontFamily: fontFamily.light,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.8,

  },
});

