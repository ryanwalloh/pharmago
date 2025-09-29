import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Switch,
} from 'react-native';
import ForgotPasswordPage from './ForgotPasswordPage';
import CreateAccountPage from './CreateAccountPage';
import Onboarding from './Onboarding';
import MainPage from './MainPage';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Alert, ActivityIndicator } from 'react-native';

function LoginPageContent() {
  const { user, isLoggedIn, hasCompletedOnboarding, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [registeredUsername, setRegisteredUsername] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoggingIn(true);
    
    try {
      console.log('🔐 Attempting login...');
      const response = await apiService.loginUser(email.trim(), password);
      
      console.log('📨 Login response:', {
        success: response.success,
        error: response.error,
        data: response.data,
        timestamp: new Date().toISOString()
      });

      if (response.success && response.data) {
        console.log('✅ Login successful!');
        
        // Extract user data from response (backend returns user data in 'user' field)
        const userData = response.data.user || response.data;
        
        // Store user data in session
        await login({
          username: userData.username || email.trim(),
          email: userData.email || email.trim(),
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          phone: userData.phone_number || '',
          hasCompletedOnboarding: true, // User logging in means they already completed onboarding during account creation
        });
      } else {
        console.error('❌ Login failed:', response.error);
        Alert.alert('Login Failed', response.error || 'Invalid email or password');
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // If user is logged in and completed onboarding, show main page
  if (isLoggedIn && hasCompletedOnboarding) {
    return <MainPage />;
  }

  // If user is logged in but hasn't completed onboarding, show onboarding
  if (isLoggedIn && !hasCompletedOnboarding) {
    return (
      <Onboarding 
        onComplete={() => {}} 
        onNavigateToMain={() => {
          // Navigation handled by AuthContext
        }}
      />
    );
  }

  // Show loading while checking auth status
  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (showForgotPassword) {
    return <ForgotPasswordPage onBack={() => setShowForgotPassword(false)} />;
  }

  if (showOnboarding) {
    return (
      <Onboarding 
        onComplete={() => setShowOnboarding(false)} 
        onNavigateToMain={() => {
          // Navigation handled by AuthContext
        }}
      />
    );
  }

  if (showCreateAccount) {
    return (
      <CreateAccountPage 
        onBack={() => setShowCreateAccount(false)}
        onRegistrationSuccess={() => {
          setShowOnboarding(true);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Logo at top */}
      <Image
        source={require('../assets/logo2.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      
      {/* Bottom Content Container */}
      <View style={styles.bottomContent}>
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
          
          <TouchableOpacity onPress={() => setShowForgotPassword(true)}>
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
            <Text style={styles.signInButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>
        
        {/* Google Sign In Button */}
        <TouchableOpacity style={styles.googleButton}>
          <Image
            source={require('../assets/googlelogo.png')}
            style={styles.googleLogo}
            resizeMode="contain"
          />
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
        
        {/* Create Account Link */}
        <View style={styles.createAccountContainer}>
          <Text style={styles.createAccountText}>New User? </Text>
        <TouchableOpacity onPress={() => setShowCreateAccount(true)}>
          <Text style={styles.createAccountLink}>Create Account</Text>
        </TouchableOpacity>
        </View>
        
      </View>
    </View>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  bottomContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 120,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 5,
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
    marginBottom: 70,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
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
    height: 50,
    backgroundColor: '#00bf63',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,

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
  googleButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  googleLogo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '500',
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
