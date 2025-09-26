import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { apiService } from '../../customer-app/services/api';

export default function RiderLoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

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
  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Rider Login</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Phone or Email</Text>
        <TextInput style={styles.input} placeholder="e.g. 0917 123 4567" placeholderTextColor="#9E9E9E" />
        <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1, paddingRight: 44 }]}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            placeholderTextColor="#9E9E9E"
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={showPassword ? require('../assets/hide.png') : require('../assets/eye.png')}
              style={styles.eyeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.loginButton} activeOpacity={0.8}>
          <Text style={styles.loginText}>Login</Text>
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


