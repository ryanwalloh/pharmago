import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, ImageBackground, Animated, Keyboard, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { apiService } from '../../customer-app/services/api';

export default function RiderRegistration4() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone_number, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [confirmError, setConfirmError] = useState<string>('');
  const modalTranslateY = useState(new Animated.Value(0))[0];

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

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = (event: any) => {
      const keyboardHeight = event?.endCoordinates?.height || 0;
      Animated.spring(modalTranslateY, {
        toValue: -keyboardHeight * 0.5,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    };

    const handleHide = () => {
      Animated.spring(modalTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    };

    const showListener = Keyboard.addListener(showEvent, handleShow);
    const hideListener = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [modalTranslateY]);

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/riderregistration4.png')} style={styles.background} resizeMode="cover">
        <View style={styles.overlay} />
        <View style={styles.wrapper}>
          <View style={styles.header}>
            <Image source={require('../assets/pharmarider.png')} style={styles.brandLogo} resizeMode="contain" />
          </View>

          <Animated.View style={[styles.sheet, { transform: [{ translateY: modalTranslateY }] }] }>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetContent}
            >
              <Text style={styles.title}>Create your rider login</Text>
              <Text style={styles.subtitle}>Tell us how to reach you and set a password so you can start accepting deliveries.</Text>

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
                      setConfirmError('');
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

                <Text style={[styles.label, styles.spacing]}>Confirm Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      setConfirmError('');
                    }}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#9E9E9E"
                    style={[styles.input, styles.passwordInput, confirmError ? styles.inputError : null]}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowConfirmPassword((s) => !s)}>
                    <Image
                      source={showConfirmPassword ? require('../../customer-app/assets/hide.png') : require('../../customer-app/assets/eye.png')}
                      style={styles.passwordToggleIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
                {!!confirmError && <Text style={styles.errorText}>{confirmError}</Text>}

                <Text style={[styles.label, styles.spacing]}>Phone Number</Text>
                <TextInput
                  value={phone_number}
                  onChangeText={(t) => {
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
                  if (!username || !email || !password || !confirmPassword || !phone_number) {
                    Alert.alert('Missing Information', 'Please complete all fields before submitting.');
                    return;
                  }
                  if (password !== confirmPassword) {
                    setConfirmError('Passwords do not match');
                    Alert.alert('Password Mismatch', 'Make sure your passwords match before continuing.');
                    return;
                  }
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
                    const s2 = obj?.step2 || {};
                    const s3 = obj?.step3 || {};
                    const isBicycle = s2.vehicle_type === 'bicycle';
                    if (!s1.first_name || !s1.last_name || !s1.date_of_birth || !s1.gender) {
                      Alert.alert('Incomplete Step 1', 'Please complete Step 1 details (name, date of birth, gender).');
                      setSubmitting(false);
                      router.replace('/RiderRegistration1');
                      return;
                    }
                    if (!s2.vehicle_type) {
                      Alert.alert('Incomplete Step 2', 'Please select your vehicle type.');
                      setSubmitting(false);
                      router.replace('/RiderRegistration3');
                      return;
                    }

                    let drivers_license_url: string | undefined = obj?.step3?.drivers_license_url;
                    let bike_id_url: string | undefined = s2.bike_id_url;

                    if (isBicycle) {
                      const hasBikeId = (bike_id_url || s2.bike_id_local_uri) && s2.bike_id_type;

                      if (!hasBikeId) {
                        Alert.alert('Incomplete Step 2', 'Please select a valid ID and upload the ID image.');
                        setSubmitting(false);
                        router.replace('/RiderRegistration3');
                        return;
                      }

                      const { uploadToCloudinary } = await import('../../customer-app/services/cloudinaryService');

                      if ((!bike_id_url || bike_id_url.startsWith('file:')) && s2.bike_id_local_uri) {
                        const uploadRes = await uploadToCloudinary(s2.bike_id_local_uri, 'pharmago-file-uploads/valid-ids', `valid_id_${Date.now()}.jpg`);
                        if (!uploadRes.success || !uploadRes.url) {
                          Alert.alert('Upload Failed', 'Could not upload valid ID image. Please try again.');
                          setSubmitting(false);
                          return;
                        }
                        bike_id_url = uploadRes.url;
                        obj.step2 = { ...(obj.step2 || {}), bike_id_url };
                        await AsyncStorage.setItem('rider_registration', JSON.stringify(obj));
                      }
                    } else {
                      if (!s2.vehicle_brand || !s2.vehicle_model || !s2.plate_number || !s2.vehicle_color) {
                        Alert.alert('Incomplete Step 2', 'Please complete Step 2 vehicle details.');
                        setSubmitting(false);
                        router.replace('/RiderRegistration3');
                        return;
                      }

                      const hasLicense = s3.drivers_license_url || s3.drivers_license_local_uri;
                      if (!hasLicense) {
                        Alert.alert("Incomplete Step 3", "Please upload your driver's license before proceeding.");
                        setSubmitting(false);
                        router.replace('/RiderRegistration2');
                        return;
                      }

                      const localUri: string | undefined = obj?.step3?.drivers_license_local_uri;
                      if ((!drivers_license_url || (typeof drivers_license_url === 'string' && drivers_license_url.startsWith('file:'))) && localUri) {
                        const uploadRes = await apiService.uploadDriverLicenseFile(localUri);
                        if (!uploadRes.success || !uploadRes.data?.url) {
                          Alert.alert('Upload Failed', "Could not upload driver's license. Please try again.");
                          setSubmitting(false);
                          return;
                        }
                        drivers_license_url = uploadRes.data.url;
                        obj.step3 = { ...(obj.step3 || {}), drivers_license_url };
                        await AsyncStorage.setItem('rider_registration', JSON.stringify(obj));
                        await savePartial({ drivers_license_url });
                      }
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
                        vehicle_type: s2.vehicle_type,
                        vehicle_brand: s2.vehicle_brand || null,
                        vehicle_model: s2.vehicle_model || null,
                        plate_number: s2.plate_number || null,
                        vehicle_color: s2.vehicle_color || null,
                        drivers_license_uploaded: !isBicycle && Boolean(drivers_license_url),
                        bicycle_valid_id_type: isBicycle ? s2.bike_id_type || null : null,
                        bicycle_valid_id_uploaded: isBicycle && Boolean(bike_id_url),
                      },
                      documents: [] as { id_type: string; file_url: string }[],
                    };

                    if (!isBicycle && drivers_license_url) {
                      payload.documents.push({
                        id_type: 'drivers_license',
                        file_url: drivers_license_url,
                      });
                    }

                    if (isBicycle && bike_id_url && s2.bike_id_type) {
                      payload.documents.push({
                        id_type: s2.bike_id_type,
                        file_url: bike_id_url,
                      });
                    }

                    const res = await apiService.completeRiderRegistration(payload);
                    if (!res.success) {
                      Alert.alert('Registration Failed', res.error || 'Please try again.');
                      setSubmitting(false);
                      return;
                    }

                    // Clear temp data and navigate to finish
                    await AsyncStorage.removeItem('rider_registration');
                    router.replace('/RiderRegistrationFinish');
                  } catch {
                    Alert.alert('Error', 'Unexpected error during submission.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.navText}>Submit</Text>}
              </TouchableOpacity>
            </View>
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
    paddingTop: 60,
    alignItems: 'flex-start',
  },
  brandLogo: {
    width: 160,
    height: 80,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
  },
  sheetContent: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 6,
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  spacing: {
    marginTop: 16,
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
  footerRow: {
    marginTop: 24,
    flexDirection: 'row',
  },
  navBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
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



