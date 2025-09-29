import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { apiService } from '../../customer-app/services/api';

export default function RiderRegistration4() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone_number, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');

  const savePartial = async (patch: any) => {
    try {
      const raw = await AsyncStorage.getItem('rider_registration');
      const obj = raw ? JSON.parse(raw) : {};
      const merged = { ...obj, step4: { ...(obj?.step4 || {}), ...patch } };
      await AsyncStorage.setItem('rider_registration', JSON.stringify(merged));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('rider_registration');
        if (raw) {
          const obj = JSON.parse(raw);
          const s4 = obj?.step4 || {};
          if (s4.username) setUsername(s4.username);
          if (s4.email) setEmail(s4.email);
          if (s4.password) setPassword(s4.password);
          if (s4.phone_number) setPhoneNumber(s4.phone_number);
        }
      } catch {}
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rider Registration</Text>
      <Text style={styles.subtitle}>Step 4 of 4</Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={(t) => {
              setUsername(t);
              savePartial({ username: t });
            }}
            placeholder="Choose a username"
            placeholderTextColor="#9E9E9E"
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={[styles.label, styles.spacing]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setEmailError('');
              savePartial({ email: t });
            }}
            onBlur={() => {
              const valid = /\S+@\S+\.\S+/.test(email.trim());
              if (!valid) setEmailError('Please enter a valid email address');
            }}
            placeholder="you@example.com"
            placeholderTextColor="#9E9E9E"
            style={[styles.input, emailError ? styles.inputError : null]}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

          <Text style={[styles.label, styles.spacing]}>Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                savePartial({ password: t });
              }}
              placeholder="Create a password"
              placeholderTextColor="#9E9E9E"
              style={[styles.input, styles.passwordInput]}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword((s) => !s)}>
              <Image
                source={showPassword ? require('../../customer-app/assets/hide.png') : require('../../customer-app/assets/eye.png')}
                style={styles.passwordToggleIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, styles.spacing]}>Phone Number</Text>
          <TextInput
            value={phone_number}
            onChangeText={(t) => {
              // Keep digits only and limit to 11 characters
              const digits = t.replace(/\D/g, '').slice(0, 11);
              setPhoneNumber(digits);
              setPhoneError('');
              savePartial({ phone_number: digits });
            }}
            onBlur={() => {
              const valid = /^09\d{9}$/.test(phone_number);
              if (!valid) setPhoneError('Enter a valid PH mobile number (09XXXXXXXXX)');
            }}
            placeholder="e.g., 09XXXXXXXXX"
            placeholderTextColor="#9E9E9E"
            style={[styles.input, phoneError ? styles.inputError : null]}
            keyboardType="phone-pad"
            maxLength={11}
          />
          {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
        </View>
      </ScrollView>

      <View style={styles.footerRow}>
        <TouchableOpacity style={[styles.navBtn, styles.backBtn]} onPress={() => router.back()}>
          <Text style={[styles.navText, styles.backText]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, styles.nextBtn]}
          onPress={async () => {
            if (!username || !email || !password || !phone_number) {
              Alert.alert('Missing Information', 'Please complete all fields before submitting.');
              return;
            }
            // Validate email and phone before submit
            if (!/\S+@\S+\.\S+/.test(email.trim())) {
              setEmailError('Please enter a valid email address');
              Alert.alert('Invalid Email', 'Please enter a valid email address.');
              return;
            }
            if (!/^09\d{9}$/.test(phone_number)) {
              setPhoneError('Enter a valid PH mobile number (09XXXXXXXXX)');
              Alert.alert('Invalid Phone Number', 'Enter a valid PH mobile number (09XXXXXXXXX).');
              return;
            }
            await savePartial({ username, email, password, phone_number, saved_at: Date.now() });

            try {
              setSubmitting(true);
              // Gather all steps data
              const raw = await AsyncStorage.getItem('rider_registration');
              const obj = raw ? JSON.parse(raw) : {};

              // Validate required data from previous steps
              const s1 = obj?.step1 || {};
              const s3 = obj?.step3 || {};
              if (!s1.first_name || !s1.last_name || !s1.date_of_birth || !s1.gender) {
                Alert.alert('Incomplete Step 1', 'Please complete Step 1 details (name, date of birth, gender).');
                setSubmitting(false);
                router.replace('/RiderRegistration1');
                return;
              }
              if (!s3.vehicle_type || !s3.vehicle_brand || !s3.vehicle_model || !s3.plate_number || !s3.vehicle_color) {
                Alert.alert('Incomplete Step 3', 'Please complete Step 3 vehicle details.');
                setSubmitting(false);
                router.replace('/RiderRegistration3');
                return;
              }

              // Upload driver's license first if local file path
              let drivers_license_url: string | undefined = obj?.step2?.drivers_license_url;
              const localUri: string | undefined = obj?.step2?.drivers_license_local_uri;
              if ((!drivers_license_url || (typeof drivers_license_url === 'string' && drivers_license_url.startsWith('file:'))) && localUri) {
                const uploadRes = await apiService.uploadDriverLicenseFile(localUri);
                if (!uploadRes.success || !uploadRes.data?.url) {
                  Alert.alert('Upload Failed', "Could not upload driver's license. Please try again.");
                  setSubmitting(false);
                  return;
                }
                drivers_license_url = uploadRes.data.url;
                await savePartial({ drivers_license_url });
              }

              // Build payload per models
              const payload = {
                user: {
                  username,
                  email,
                  phone_number,
                  password,
                  role: 'rider',
                  first_name: s1.first_name,
                  last_name: s1.last_name,
                },
                rider: {
                  first_name: s1.first_name,
                  last_name: s1.last_name,
                  middle_name: s1.middle_name || null,
                  date_of_birth: s1.date_of_birth,
                  gender: s1.gender,
                  vehicle_type: s3.vehicle_type,
                  vehicle_brand: s3.vehicle_brand,
                  vehicle_model: s3.vehicle_model,
                  plate_number: s3.plate_number,
                  vehicle_color: s3.vehicle_color,
                  drivers_license_uploaded: Boolean(drivers_license_url),
                },
                documents: drivers_license_url ? [
                  {
                    id_type: 'drivers_license',
                    file_url: drivers_license_url,
                  }
                ] : [],
              };

              const res = await apiService.completeRiderRegistration(payload);
              if (!res.success) {
                Alert.alert('Registration Failed', res.error || 'Please try again.');
                setSubmitting(false);
                return;
              }

              // Clear temp data and navigate to finish
              await AsyncStorage.removeItem('rider_registration');
              router.replace('/RiderRegistrationFinish');
            } catch (e) {
              Alert.alert('Error', 'Unexpected error during submission.');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.navText}>Submit</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  card: {
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
  spacing: {
    marginTop: 12,
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
  footerRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    gap: 10,
  },
  navBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  nextBtn: {
    backgroundColor: '#00BF63',
  },
  navText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  backText: {
    color: '#333333',
  },
  // Added for password toggle inside input
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 44,
  },
  passwordToggle: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleIcon: {
    width: 20,
    height: 20,
    tintColor: '#999999',
  },
  inputError: {
    borderColor: '#FF4444',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 4,
  },
});



