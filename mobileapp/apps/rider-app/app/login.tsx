import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { apiService } from '../../customer-app/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RiderLoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTestBackend = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await apiService.makeDirectRequest('/ping/');
      if (res && (res as any).success !== false) {
        setTestResult('Connected to backend ✔');
      } else {
        setTestResult('Backend ping failed');
      }
    } catch (e) {
      setTestResult('Backend connection error');
    } finally {
      setTesting(false);
    }
  };
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
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Rider Login</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Phone or Email</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 0917 123 4567 or you@example.com"
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
        <TouchableOpacity style={styles.googleButton} activeOpacity={0.8}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={require('../assets/googlelogo.png')} style={styles.googleIcon} resizeMode="contain" />
            <Text style={styles.googleText}>Login with Google</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.testButton} activeOpacity={0.8} onPress={handleTestBackend} disabled={testing}>
          {testing ? <ActivityIndicator color="#333333" /> : <Text style={styles.testText}>Test Backend</Text>}
        </TouchableOpacity>
        {testResult ? (
          <Text style={styles.testResult}>{testResult}</Text>
        ) : null}
        <TouchableOpacity style={styles.forgot}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.signupFooterButton} activeOpacity={0.8} onPress={() => router.push('/RiderRegistration1')}>
          <Text style={styles.signupText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 140,
    height: 60,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#222',
    marginBottom: 24,
  },
  form: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  label: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#222',
    backgroundColor: '#FFFFFF',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {
    height: 20,
    width: 20,
    tintColor: '#828282',
  },
  loginButton: {
    marginTop: 18,
    backgroundColor: '#00BF63',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  googleButton: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleText: {
    color: '#333333',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  googleIcon: {
    height: 18,
    width: 18,
  },
  testButton: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  testText: {
    color: '#333333',
    fontWeight: '600',
    fontSize: 14,
  },
  testResult: {
    marginTop: 8,
    textAlign: 'center',
    color: '#4CAF50',
    fontSize: 12,
  },
  signupText: {
    color: '#00BF63',
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: 16,
  },
  signupFooterButton: {
    backgroundColor: '#FFFFFF',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00BF63',
  },
  forgot: {
    marginTop: 12,
    alignItems: 'center',
  },
  forgotText: {
    color: '#666666',
  },
});


