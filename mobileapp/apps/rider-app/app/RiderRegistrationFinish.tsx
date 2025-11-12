import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';

export default function RiderRegistrationFinish() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/completed.png')} style={styles.background} resizeMode="cover">
        <View style={styles.overlay} />
        <View style={styles.wrapper}>
          <View style={styles.header}>
            <Image source={require('../assets/pharmarider.png')} style={styles.brandLogo} resizeMode="contain" />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>You&rsquo;re all set!</Text>
            <Text style={styles.subtitle}>
              Thanks for completing your rider profile. We&rsquo;ll review your details and send a confirmation to your email soon.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/') }>
              <Text style={styles.primaryText}>Return to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.66)',
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'flex-start',
  },
  brandLogo: {
    width: 160,
    height: 80,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#F1F1F1',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 24,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    height: 54,
    paddingHorizontal: 62,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  primaryText: {
    color: '#72bf6a',
    fontWeight: '700',
    fontSize: 16,
  },
});



