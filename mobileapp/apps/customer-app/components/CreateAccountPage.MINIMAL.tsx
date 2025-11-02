import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

// MINIMAL TEST VERSION - Removed problematic imports
interface CreateAccountPageProps {
  onBack: () => void;
  onRegistrationSuccess?: () => void;
}

export default function CreateAccountPage({ onBack, onRegistrationSuccess }: CreateAccountPageProps) {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    Alert.alert('Test', 'Sign up function called - apiService disabled for testing');
  };

  return (
    <View style={styles.container}>
      {/* Top Section - Logo and Background */}
      <View style={styles.topSection}>
        <ImageBackground
          source={require('../assets/createaccount.png')}
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
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.titleCreate}>Create</Text>
            <Text style={styles.titleAccount}> Account</Text>
          </View>
          
          <Text style={styles.subtitle}>Fill your details to get started (Test Mode)</Text>
          
          {/* Username Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.floatingLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
          
          {/* Sign Up Button */}
          <TouchableOpacity 
            style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]} 
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signUpButtonText}>Sign Up (Test)</Text>
            )}
          </TouchableOpacity>
          
          {/* Back Link */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>Already Have Account? </Text>
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    flex: 0.3,
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
    marginBottom: 10,
    zIndex: 1,
    right: 120,
  },
  bottomModalContainer: {
    flex: 0.8,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    top: -40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 5,
  },
  titleCreate: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#00bf63',
  },
  titleAccount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2B2B2B',
  },
  subtitle: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 14,
  },
  floatingLabel: {
    fontSize: 12,
    color: '#00bf63',
    fontWeight: '500',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 0,
    fontSize: 16,
  },
  signUpButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#00bf63',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signUpButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#999999',
  },
  loginLink: {
    fontSize: 14,
    color: '#00bf63',
    fontWeight: '500',
  },
});

