import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

interface Onboarding4Props {
  onComplete?: () => void;
  onNavigateToMain?: () => void;
}

export default function Onboarding4({ onComplete, onNavigateToMain }: Onboarding4Props) {
  const { completeOnboarding } = useAuth();

  const handleGetStarted = async () => {
    try {
      // Mark onboarding as complete
      await completeOnboarding();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }

    if (onNavigateToMain) {
      onNavigateToMain();
    } else if (onComplete) {
      onComplete();
    }

    // Ensure navigation to the main home screen
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Main Content */}
      <View style={styles.content}>
        {/* Main Graphic */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../assets/onboarding4.png')} 
            style={styles.mainImage}
            resizeMode="contain"
          />
          
          {/* Text Content - Directly below image */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Ready to Make Your First Order?</Text>
            <Text style={styles.description}>
              Your Health, Delivered with Care. Get Started Today
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.getStartedButtonContainer} onPress={handleGetStarted}>
          <LinearGradient
            colors={['#B5E1E8', '#6E72FF', '#F8BDFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.getStartedButton}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 96,
    marginBottom: 72,
  },
  mainImage: {
    width: 280,
    height: 280,
    maxWidth: '90%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 20,
  },
  getStartedButtonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  getStartedButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  getStartedButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
