import React, { useState } from 'react';
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
import Onboarding2 from './Onboarding2';
import Onboarding4 from './Onboarding4';

interface OnboardingProps {
  onComplete?: () => void;
  onNavigateToMain?: () => void;
}

export default function Onboarding({ onComplete, onNavigateToMain }: OnboardingProps) {
  const [showOnboarding2, setShowOnboarding2] = useState(false);
  const [showOnboarding4, setShowOnboarding4] = useState(false);

  const handleNext = () => {
    setShowOnboarding2(true);
  };

  const handleSkip = () => {
    setShowOnboarding4(true);
  };

  if (showOnboarding4) {
    return <Onboarding4 onComplete={onComplete} onNavigateToMain={onNavigateToMain} />;
  }

  if (showOnboarding2) {
    return <Onboarding2 onComplete={onComplete} onNavigateToMain={onNavigateToMain} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Skip Button - Top Right */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Main Graphic */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../assets/onboarding1.png')} 
            style={styles.mainImage}
            resizeMode="contain"
          />
          
          {/* Text Content - Directly below image */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Medicine</Text>
            <Text style={styles.description}>
            Skip the pharmacy lines. Order your prescription and health essentials anytime, anywhere.
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomContainer}>
        {/* Progress Navigator */}
        <View style={styles.progressContainer}>
          <LinearGradient
            colors={['#B5E1E8', '#6E72FF', '#F8BDFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressBarActive}
          />
          <View style={styles.progressBar} />
          <View style={styles.progressBar} />
        </View>

        {/* Next Button */}
        <TouchableOpacity style={styles.nextButtonContainer} onPress={handleNext}>
          <LinearGradient
            colors={['#B5E1E8', '#6E72FF', '#F8BDFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>Next</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
   
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    width: 24,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    marginRight: 8,
  },
  progressBarActive: {
    width: 24,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
  },
  nextButtonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  nextButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
