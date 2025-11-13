import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ImageBackground, ActivityIndicator, Alert, Animated, Keyboard, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { apiService } from '../../customer-app/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RiderLoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const modalTranslateY = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = (event: any) => {
      const keyboardHeight = event?.endCoordinates?.height || 0;
      Animated.spring(modalTranslateY, {
        toValue: -keyboardHeight * 0.5,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    };

    const handleKeyboardHide = () => {
      Animated.spring(modalTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    };

    const keyboardShowListener = Keyboard.addListener(showEvent, handleKeyboardShow);
    const keyboardHideListener = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [modalTranslateY]);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Missing credentials', 'Please enter your phone/email and password.');
      return;
    }
    try {
      setSubmitting(true);
      
      // Use rider-specific login endpoint
      const res = await apiService.makeDirectRequest('/rider-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier.trim(),
          password: password,
        }),
      });
      
      console.log('🔐 Rider login response:', res);
      
      if (!res || !(res as any).success) {
        Alert.alert('Login failed', (res as any)?.error || 'Invalid credentials');
        setSubmitting(false);
        return;
      }
      
      const loginData = res as any;
      
      // Extract data from nested structure
      const userData = loginData.data?.user || loginData.user;
      const riderData = loginData.data?.rider || loginData.rider;
      const statsData = loginData.data?.stats || loginData.stats;
      const tokensData = loginData.data?.tokens || loginData.tokens;
      
      console.log('📦 Extracted data:', {
        hasUser: !!userData,
        hasRider: !!riderData,
        hasStats: !!statsData,
        hasTokens: !!tokensData,
      });
      
      // Store complete session data
      try {
        // Store full rider session
        const riderSession = {
          user: userData,
          rider: riderData,
          stats: statsData,
          loginTime: new Date().toISOString(),
        };
        
        await AsyncStorage.setItem('rider_session', JSON.stringify(riderSession));
        
        // Store individual pieces for backward compatibility
        await AsyncStorage.setItem('rider_user', JSON.stringify(userData));
        await AsyncStorage.setItem('rider_profile', JSON.stringify(riderData));
        await AsyncStorage.setItem('rider_stats', JSON.stringify(statsData));
        
        console.log('✅ Rider session stored successfully');
        console.log('👤 Rider:', `${riderData.first_name} ${riderData.last_name}`);
        console.log('📊 Stats:', statsData);
      } catch (storageError) {
        console.error('❌ Failed to store session:', storageError);
      }
      
      // Store auth token
      try {
        const accessToken = tokensData?.access;
        if (accessToken) {
          await AsyncStorage.setItem('auth_token', accessToken);
          apiService.setAuthToken(accessToken);
          console.log('🔑 Auth token stored');
        }
      } catch (tokenError) {
        console.error('❌ Failed to store token:', tokenError);
      }
      
      // Navigate to rider home page
      console.log('🚀 Navigating to rider home...');
      router.replace('/home');
      
    } catch (e) {
      console.error('❌ Login error:', e);
      Alert.alert('Network error', 'Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/loginpage.png')} style={styles.background} resizeMode="cover">
        <View style={styles.overlay} />
        <View style={styles.wrapper}>
          <View style={styles.header}>
            <Image source={require('../assets/pharmarider.png')} style={styles.brandLogo} resizeMode="contain" />
          </View>
          <Animated.View style={[styles.formSheet, { transform: [{ translateY: modalTranslateY }] }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}
            >
              <Text style={styles.formTitle}>Welcome back</Text>
              <Text style={styles.formSubtitle}>Log in to manage deliveries</Text>
              <View style={styles.form}>
                <Text style={styles.label}>Phone or Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0917***4567 or you@example.com"
                  placeholderTextColor="#9E9E9E"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                />
                <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, paddingRight: 44 }]}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9E9E9E"
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                    <Image
                      source={showPassword ? require('../assets/hide.png') : require('../assets/eye.png')}
                      style={styles.eyeIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.loginButton} activeOpacity={0.8} onPress={handleLogin} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginText}>Login</Text>}
                </TouchableOpacity>
                <View style={styles.metaRow}>
                  <TouchableOpacity style={styles.forgot}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/RiderRegistration1')}>
                    <Text style={styles.signupLinkText}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  wrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 70,
  },
  brandLogo: {
    width: 160,
    height: 80,
    marginBottom: 12,
  },
  formSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  formContent: {
    paddingBottom: 32,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
    marginBottom: 24,
  },
  form: {
    marginTop: 16,
  },
  label: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#222222',
    backgroundColor: '#FFFFFF',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {
    height: 20,
    width: 20,
    tintColor: '#828282',
  },
  loginButton: {
    marginTop: 24,
    backgroundColor: '#00BF63',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  metaRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forgot: {
    paddingVertical: 6,
  },
  forgotText: {
    color: '#666666',
    fontWeight: '500',
  },
  signupLinkText: {
    color: '#00BF63',
    fontWeight: '700',
  },
});


