import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { loadFonts } from '../utils/fonts';

export default function LandingPage() {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Load fonts first
    loadFonts().then(() => {
      console.log('✅ Nexa fonts loaded successfully');
    }).catch((error) => {
      console.error('❌ Failed to load fonts:', error);
    });

    // Start the transition after 2 seconds
    const timer = setTimeout(() => {
      // Fade out the landing page
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Navigate to welcome page after fade out completes
        router.replace('/welcome' as any);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: '80%',
    maxWidth: 300,
    height: 150,
  },
});
