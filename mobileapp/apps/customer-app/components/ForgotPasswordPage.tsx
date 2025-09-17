import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';

export default function ForgotPasswordPage({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);

  return (
    <View style={styles.container}>
      {/* Background Circle with Sticker */}
      <View style={styles.circleContainer}>
        <View style={styles.backgroundCircle}>
          <Image
            source={require('../assets/sticker1.png')}
            style={styles.sticker}
            resizeMode="contain"
          />
        </View>
      </View>
      
      {/* Title with colored text */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleForgot}>Forgot</Text>
        <Text style={styles.titlePassword}> Password?</Text>
      </View>
      
      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Enter your email to receive a password reset link
      </Text>
      
      {/* Email Input with Floating Label */}
      <View style={styles.inputContainer}>
        <Text style={[
          styles.floatingLabel,
          (emailFocused || email) && styles.floatingLabelActive
        ]}>
          Email
        </Text>
        <TextInput
          style={[
            styles.input,
            emailFocused && styles.inputFocused
          ]}
          value={email}
          onChangeText={setEmail}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      
      {/* Reset Password Button */}
      <TouchableOpacity style={styles.resetButton}>
        <Text style={styles.resetButtonText}>Reset Password</Text>
      </TouchableOpacity>
      
      {/* Back to Login Link */}
      <TouchableOpacity style={styles.backLink} onPress={onBack}>
        <Text style={styles.backLinkText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
   
  },
  circleContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 0,
  },
  backgroundCircle: {
    width: 580,
    height: 580,
    borderRadius: '50%',
    backgroundColor: '#00bf63',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [
      { translateY: -250 },
      { translateX: -50 }, // Move the circle up by 100px
    ],
  },
  sticker: {
    width: 320,
    height: 320,
    marginTop: 380,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    top: -140,
  },
  titleForgot: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00bf63',
  },
  titlePassword: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2B2B2B',
  },
  subtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    top: -140,
  },
  inputContainer: {
    marginBottom: 30,
    position: 'relative',
    paddingTop: 10,
    bottom: 70,
  },
  floatingLabel: {
    position: 'absolute',
    left: 0,
    top: 15,
    fontSize: 16,
    color: '#999999',
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
  },
  floatingLabelActive: {
    top: -8,
    fontSize: 12,
    color: '#00bf63',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 0,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  inputFocused: {
    borderBottomColor: '#00bf63',
    borderBottomWidth: 2,
  },
  resetButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#00bf63',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    bottom: 70,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    
  },
  backLink: {
    alignItems: 'center',
    marginTop: 20,
    bottom: 70,
    
  },
  backLinkText: {
    fontSize: 14,
    color: '#00bf63',
    fontWeight: '500',
  },
});
