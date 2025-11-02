import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface CreateAccountPageProps {
  onBack: () => void;
  onRegistrationSuccess?: () => void;
}

export default function CreateAccountPage({ onBack, onRegistrationSuccess }: CreateAccountPageProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [phoneNumberFocused, setPhoneNumberFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Log API configuration when component mounts
  useEffect(() => {
    console.log('📱 CreateAccountPage mounted');
    console.log('🔧 API Configuration:', {
      baseURL: (apiService as any).baseURL || 'Not configured',
      timestamp: new Date().toISOString()
    });
    console.log('📋 Available API methods:', {
      registerUser: 'POST /users/register/',
      loginUser: 'POST /users/login/',
      testConnection: 'GET /users/register/ (for testing)'
    });
  }, []);

  // Philippine phone number validation
  const validatePhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Philippine mobile numbers: 09XXXXXXXXX (11 digits starting with 09)
    // Philippine mobile with country code: 639XXXXXXXXX (12 digits starting with 639)
    // Philippine landline: 0X XXXXXXX (8-9 digits starting with 0X where X is 2-8)
    const mobilePattern = /^09\d{9}$/; // 09 + 9 more digits = 11 total
    const mobileWithCountryCode = /^639\d{9}$/; // 639 + 9 more digits = 12 total
    const landlinePattern = /^0[2-8]\d{7,8}$/; // 0X + 7-8 more digits
    
    return mobilePattern.test(cleanPhone) || mobileWithCountryCode.test(cleanPhone) || landlinePattern.test(cleanPhone);
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    const cleanText = text.replace(/\D/g, '');
    
    // Format Philippine mobile numbers: 09XX-XXX-XXXX (11 digits)
    if (cleanText.startsWith('09')) {
      if (cleanText.length <= 4) {
        return cleanText;
      } else if (cleanText.length <= 7) {
        return `${cleanText.slice(0, 4)}-${cleanText.slice(4)}`;
      } else if (cleanText.length <= 11) {
        return `${cleanText.slice(0, 4)}-${cleanText.slice(4, 7)}-${cleanText.slice(7)}`;
      } else {
        return `${cleanText.slice(0, 4)}-${cleanText.slice(4, 7)}-${cleanText.slice(7, 11)}`;
      }
    }
    // Format Philippine mobile with country code: 639-XXX-XXX-XXXX (12 digits)
    else if (cleanText.startsWith('639')) {
      if (cleanText.length <= 3) {
        return cleanText;
      } else if (cleanText.length <= 6) {
        return `${cleanText.slice(0, 3)}-${cleanText.slice(3)}`;
      } else if (cleanText.length <= 9) {
        return `${cleanText.slice(0, 3)}-${cleanText.slice(3, 6)}-${cleanText.slice(6)}`;
      } else if (cleanText.length <= 12) {
        return `${cleanText.slice(0, 3)}-${cleanText.slice(3, 6)}-${cleanText.slice(6, 9)}-${cleanText.slice(9)}`;
      } else {
        return `${cleanText.slice(0, 3)}-${cleanText.slice(3, 6)}-${cleanText.slice(6, 9)}-${cleanText.slice(9, 12)}`;
      }
    }
    // Format landline numbers: 0X-XXXX-XXXX (8-9 digits)
    else if (cleanText.startsWith('0') && cleanText.length >= 2 && /^0[2-8]/.test(cleanText)) {
      if (cleanText.length <= 2) {
        return cleanText;
      } else if (cleanText.length <= 6) {
        return `${cleanText.slice(0, 2)}-${cleanText.slice(2)}`;
      } else {
        return `${cleanText.slice(0, 2)}-${cleanText.slice(2, 6)}-${cleanText.slice(6)}`;
      }
    }
    // Default: just return the clean text
    else {
      return cleanText;
    }
  };

  const handlePhoneNumberChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  // Form validation
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    }

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhoneNumber(phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Philippine phone number';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle registration
  // Function to normalize phone number for backend (remove dashes and ensure proper format)
  const normalizePhoneForBackend = (phone: string): string => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Ensure it starts with country code (63 for Philippines)
    if (cleanPhone.startsWith('0')) {
      return '63' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('63')) {
      return '63' + cleanPhone;
    }
    
    return cleanPhone;
  };

  const handleSignUp = async () => {
    console.log('🎯 Starting user registration process...');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    console.log('✅ Form validation passed');
    setIsLoading(true);
    setErrors({});

    try {
      // Normalize phone number for backend
      const normalizedPhone = normalizePhoneForBackend(phoneNumber.trim());
      
      const userData = {
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: normalizedPhone, // Send normalized phone number
        email: email.trim(),
        password: password,
        password_confirm: confirmPassword,
        role: 'customer' as const,
      };

      console.log('📝 Prepared user data for registration:', {
        userData,
        originalPhone: phoneNumber.trim(),
        normalizedPhone: normalizedPhone,
        timestamp: new Date().toISOString()
      });

      console.log('🌐 Calling API service to register user...');
      const response = await apiService.registerUser(userData);

      console.log('📨 Received response from API:', {
        success: response.success,
        error: response.error,
        message: response.message,
        data: response.data,
        timestamp: new Date().toISOString()
      });

      if (response.success) {
        console.log('🎉 Registration successful!');
        
        // Store user data in session (including customer_id from response)
        try {
          // Extract customer_id and user_id from response
          const customerId = response.data?.user?.customer_id || response.data?.customer_id;
          const userId = response.data?.user?.id || response.data?.id;
          
          const userData = {
            username: username.trim(),
            email: email.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: normalizedPhone,
            // Save customer_id from API response for cart/address management
            customer_id: customerId || userId, // Prefer customer_id, fallback to user_id
            id: userId, // User ID for general use
            user_id: userId,
          };
          
          console.log('💾 Saving complete user data including customer_id:', userData);
          console.log('🆔 Extracted user ID:', userId, 'from response.data.user.id');
          
          await login(userData);
          console.log('✅ User data stored in session');
        } catch (error) {
          console.error('❌ Error storing user data:', error);
        }
        
        // Redirect to onboarding page instead of showing alert
        if (onRegistrationSuccess) {
          onRegistrationSuccess();
        } else {
          // Fallback to alert if no redirect handler provided
          Alert.alert(
            'Success',
            'Account created successfully! You can now log in.',
            [
              {
                text: 'OK',
                onPress: () => onBack(), // Go back to login page
              },
            ]
          );
        }
      } else {
        console.error('💥 Registration failed:', response.error);
        Alert.alert('Registration Failed', response.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('💥 Registration error caught:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString()
      });
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      console.log('🏁 Registration process completed');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Section - Logo and Background */}
      <View style={styles.topSection}>
        <ExpoImage
          source={require('../assets/createaccount.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
          cachePolicy="disk"
        />
        {/* Dark Overlay */}
        <View style={styles.overlay} />
        <Image
          source={require('../assets/pharmalogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      {/* Bottom Modal Container */}
      <View style={styles.bottomModalContainer}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
      {/* Title with colored text */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleCreate}>Create</Text>
        <Text style={styles.titleAccount}> Account</Text>
      </View>
      
      {/* Subtitle */}
      <Text style={styles.subtitle}>
            Fill your details to get started
      </Text>
      
      {/* Username Input with Floating Label */}
      <View style={styles.inputContainer}>
        <Text style={[
          styles.floatingLabel,
          (username && username.length > 0) && styles.floatingLabelActive
        ]}>
          Username
        </Text>
        <TextInput
          style={[
            styles.input,
            errors.username && styles.inputError
          ]}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            if (errors.username) {
              setErrors(prev => ({ ...prev, username: '' }));
            }
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
      </View>
      
      {/* First Name Input with Floating Label */}
      <View style={styles.inputContainer}>
        <Text style={[
          styles.floatingLabel,
          (firstNameFocused || firstName) && styles.floatingLabelActive
        ]}>
          First Name
        </Text>
        <TextInput
          style={[
            styles.input,
            firstNameFocused && styles.inputFocused,
            errors.firstName && styles.inputError
          ]}
          value={firstName}
          onChangeText={(text) => {
            setFirstName(text);
            if (errors.firstName) {
              setErrors(prev => ({ ...prev, firstName: '' }));
            }
          }}
          onFocus={() => setFirstNameFocused(true)}
          onBlur={() => setFirstNameFocused(false)}
          autoCapitalize="words"
        />
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
      </View>
      
      {/* Last Name Input with Floating Label */}
      <View style={styles.inputContainer}>
        <Text style={[
          styles.floatingLabel,
          (lastNameFocused || lastName) && styles.floatingLabelActive
        ]}>
          Last Name
        </Text>
        <TextInput
          style={[
            styles.input,
            lastNameFocused && styles.inputFocused,
            errors.lastName && styles.inputError
          ]}
          value={lastName}
          onChangeText={(text) => {
            setLastName(text);
            if (errors.lastName) {
              setErrors(prev => ({ ...prev, lastName: '' }));
            }
          }}
          onFocus={() => setLastNameFocused(true)}
          onBlur={() => setLastNameFocused(false)}
          autoCapitalize="words"
        />
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
      </View>
      
      {/* Phone Number Input with Floating Label */}
      <View style={styles.inputContainer}>
        <Text style={[
          styles.floatingLabel,
          (phoneNumberFocused || phoneNumber) && styles.floatingLabelActive
        ]}>
          Phone Number
        </Text>
        <TextInput
          style={[
            styles.input,
            phoneNumberFocused && styles.inputFocused,
            errors.phoneNumber && styles.inputError
          ]}
          value={phoneNumber}
          onChangeText={(text) => {
            handlePhoneNumberChange(text);
            if (errors.phoneNumber) {
              setErrors(prev => ({ ...prev, phoneNumber: '' }));
            }
          }}
          onFocus={() => setPhoneNumberFocused(true)}
          onBlur={() => setPhoneNumberFocused(false)}
          keyboardType="phone-pad"
          placeholder="0917-123-4567"
          maxLength={13} // 09XX-XXX-XXXX format (11 digits + 2 dashes)
        />
        {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
      </View>
      
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
            emailFocused && styles.inputFocused,
            errors.email && styles.inputError
          ]}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) {
              setErrors(prev => ({ ...prev, email: '' }));
            }
          }}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="user@example.com"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
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
              styles.passwordInput,
              errors.password && styles.inputError
            ]}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) {
                setErrors(prev => ({ ...prev, password: '' }));
              }
            }}
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
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>
      
      {/* Confirm Password Input with Floating Label */}
      <View style={styles.inputContainer}>
        <Text style={[
          styles.floatingLabel,
          (confirmPasswordFocused || confirmPassword) && styles.floatingLabelActive
        ]}>
          Confirm Password
        </Text>
        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={[
              styles.input,
              confirmPasswordFocused && styles.inputFocused,
              styles.passwordInput,
              errors.confirmPassword && styles.inputError
            ]}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) {
                setErrors(prev => ({ ...prev, confirmPassword: '' }));
              }
            }}
            onFocus={() => setConfirmPasswordFocused(true)}
            onBlur={() => setConfirmPasswordFocused(false)}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Image
              source={showConfirmPassword ? require('../assets/hide.png') : require('../assets/eye.png')}
              style={styles.passwordToggleIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
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
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        )}
      </TouchableOpacity>
      
      {/* Already Have Account Link */}
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
    backgroundColor: '#FFFFFF', // Green background for top section
  },
  topSection: {
    flex: 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 50% dark overlay
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
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  inputContainer: {
    marginBottom: 14,
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
  inputError: {
    borderBottomColor: '#FF4444',
    borderBottomWidth: 2,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 4,
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
  signUpButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#00bf63',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#00bf63',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    marginBottom: 10,
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
  bottomGraphicContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGraphic: {
    width: '100%',
    height: '100%',
  },
});
