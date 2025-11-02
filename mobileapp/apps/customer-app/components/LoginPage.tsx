import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';

// MINIMAL TEST VERSION - Removed problematic imports
// Testing if component loads without:
// - useAuth from AuthContext
// - apiService

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    Alert.alert('Test', 'Login function called - apiService disabled for testing');
  };

  return (
    <View style={styles.container}>
      {/* Top Section - Logo and Background */}
      <View style={styles.topSection}>
        <ImageBackground
          source={require('../assets/login.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          {/* Dark Overlay */}
          <View style={styles.overlay} />
          <Image
            source={require('../assets/pharmalogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </ImageBackground>
      </View>
      
      {/* Bottom Modal Container */}
      <View style={styles.bottomModalContainer}>
        {/* Title with colored text */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleHello}>Hello</Text>
          <Text style={styles.titleAgain}> Again!</Text>
        </View>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Your health, just a click away – Log in to order medicines now!
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
        
        {/* Password Input with Floating Label */}
        <View style={styles.inputContainer}>
          <Text style={[
            styles.floatingLabel,
            (passwordFocused || password) && styles.floatingLabelActive
          ]}>
            Password
          </Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={[
                styles.input,
                passwordFocused && styles.inputFocused,
                styles.passwordInput
              ]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Image
                source={showPassword ? require('../assets/hide.png') : require('../assets/eye.png')}
                style={styles.passwordToggleIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Remember Me and Forgot Password Row */}
        <View style={styles.optionsRow}>
          <View style={styles.rememberMeContainer}>
            <Switch
              value={false}
              onValueChange={() => {}}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
            <Text style={styles.rememberMeText}>Remember me</Text>
          </View>
          
          <TouchableOpacity onPress={() => Alert.alert('Info', 'Forgot password functionality disabled for test')}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
        
        {/* Sign In Button */}
        <TouchableOpacity 
          style={[styles.signInButton, isLoggingIn && styles.signInButtonDisabled]} 
          onPress={handleLogin}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.signInButtonText}>Sign In (Test)</Text>
          )}
        </TouchableOpacity>
        
        {/* Create Account Link */}
        <View style={styles.createAccountContainer}>
          <Text style={styles.createAccountText}>New User? </Text>
          <TouchableOpacity onPress={() => Alert.alert('Info', 'Create account disabled for test')}>
            <Text style={styles.createAccountLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  logo: {
    width: 120,
    height: 120,
    top: -80,
    zIndex: 1,
    left: 110,
  },
  bottomModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    top: -40,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  titleHello: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00bf63',
  },
  titleAgain: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2B2B2B',
  },
  subtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  inputContainer: {
    marginBottom: 24,
    position: 'relative',
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
  passwordInputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 0,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleIcon: {
    width: 20,
    height: 20,
    tintColor: '#999999',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 25,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#00bf63',
    fontWeight: '500',
  },
  signInButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#00bf63',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#00bf63',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signInButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAccountText: {
    fontSize: 14,
    color: '#999999',
  },
  createAccountLink: {
    fontSize: 14,
    color: '#00bf63',
    fontWeight: '500',
  },
});
