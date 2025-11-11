import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert, Modal, Image, ImageBackground, Animated, Keyboard, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore - ensure this package is installed in the project
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function RiderRegistration1() {
  const router = useRouter();

  const [first_name, setFirstName] = useState('');
  const [middle_name, setMiddleName] = useState('');
  const [last_name, setLastName] = useState('');
  const [date_of_birth, setDateOfBirth] = useState(''); // YYYY-MM-DD for easy backend storage
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [dobTempDate, setDobTempDate] = useState<Date>(new Date(2000, 0, 1));
  const modalTranslateY = useState(new Animated.Value(0))[0];

  const savePartial = async (patch: any) => {
    try {
      const raw = await AsyncStorage.getItem('rider_registration');
      const obj = raw ? JSON.parse(raw) : {};
      const merged = { ...obj, step1: { ...(obj?.step1 || {}), ...patch } };
      await AsyncStorage.setItem('rider_registration', JSON.stringify(merged));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('rider_registration');
        if (raw) {
          const obj = JSON.parse(raw);
          const s1 = obj?.step1 || {};
          if (s1.first_name) setFirstName(s1.first_name);
          if (s1.middle_name) setMiddleName(s1.middle_name);
          if (s1.last_name) setLastName(s1.last_name);
          if (s1.date_of_birth) setDateOfBirth(s1.date_of_birth);
          if (s1.gender) setGender(s1.gender);
        }
      } catch {}
    })();
  }, []);

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

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const openDobPicker = () => {
    const base = date_of_birth ? new Date(date_of_birth) : new Date(2000, 0, 1);
    setDobTempDate(base);
    setShowDobPicker(true);
  };

  const onDobChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && selectedDate) {
        const formatted = formatDate(selectedDate);
        setDateOfBirth(formatted);
        savePartial({ date_of_birth: formatted });
      }
      setShowDobPicker(false);
    } else {
      if (selectedDate) setDobTempDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/riderregistration1.png')} style={styles.background} resizeMode="cover">
        <View style={styles.imageOverlay} />
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
              <Text style={styles.sheetTitle}>{"Let's get to know you"}</Text>
              <Text style={styles.sheetSubtitle}>Tell us a bit about yourself so we can set up your rider profile.</Text>

              <View style={styles.formSection}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  value={first_name}
                  onChangeText={setFirstName}
                  placeholder="Juan"
                  placeholderTextColor="#9E9E9E"
                  style={styles.input}
                  autoCapitalize="words"
                />

                <Text style={[styles.label, styles.spacing]}>Middle Name</Text>
                <TextInput
                  value={middle_name}
                  onChangeText={setMiddleName}
                  placeholder="Santos"
                  placeholderTextColor="#9E9E9E"
                  style={styles.input}
                  autoCapitalize="words"
                />

                <Text style={[styles.label, styles.spacing]}>Last Name</Text>
                <TextInput
                  value={last_name}
                  onChangeText={setLastName}
                  placeholder="Dela Cruz"
                  placeholderTextColor="#9E9E9E"
                  style={styles.input}
                  autoCapitalize="words"
                />

                <Text style={[styles.label, styles.spacing]}>Date of Birth</Text>
                <TouchableOpacity onPress={openDobPicker} activeOpacity={0.8}>
                  <View style={styles.input}>
                    <Text style={{ color: date_of_birth ? '#222222' : '#9E9E9E' }}>
                      {date_of_birth || 'Select date'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {showDobPicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={dobTempDate}
                    mode="date"
                    display="calendar"
                    onChange={onDobChange}
                    maximumDate={new Date()}
                  />
                )}

                {Platform.OS === 'ios' && (
                  <Modal
                    visible={showDobPicker}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setShowDobPicker(false)}
                  >
                    <View style={styles.iosModalOverlay}>
                      <View style={styles.iosModalContent}>
                        <DateTimePicker
                          value={dobTempDate}
                          mode="date"
                          display="spinner"
                          onChange={onDobChange}
                          maximumDate={new Date()}
                          style={{ alignSelf: 'stretch' }}
                        />
                        <View style={styles.iosActionsRow}>
                          <TouchableOpacity style={[styles.iosBtn, styles.iosCancel]} onPress={() => setShowDobPicker(false)}>
                            <Text style={styles.iosBtnTextCancel}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iosBtn, styles.iosConfirm]}
                            onPress={() => {
                              const formatted = formatDate(dobTempDate);
                              setDateOfBirth(formatted);
                              savePartial({ date_of_birth: formatted });
                              setShowDobPicker(false);
                            }}
                          >
                            <Text style={styles.iosBtnTextConfirm}>Done</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
                )}

                <Text style={[styles.label, styles.spacing]}>Gender</Text>
                <View style={styles.genderRow}>
                  {(['male', 'female', 'other'] as const).map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.genderChip, gender === val ? styles.genderChipActive : null]}
                      onPress={() => setGender(val)}
                    >
                      <Text style={[styles.genderText, gender === val ? styles.genderTextActive : null]}>
                        {val.charAt(0).toUpperCase() + val.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.footerRow}>
              <TouchableOpacity style={[styles.navBtn, styles.backBtn]} onPress={() => router.back()}>
                <Text style={[styles.navText, styles.backText]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtn, styles.nextBtn]}
                activeOpacity={0.9}
                onPress={() => {
                  if (!first_name || !last_name || !date_of_birth || !gender) {
                    Alert.alert('Missing Information', 'Please complete all fields before proceeding.');
                    return;
                  }
                  savePartial({ first_name, middle_name, last_name, date_of_birth, gender, saved_at: Date.now() });
                  router.push('/RiderRegistration3');
                }}
              >
                <Text style={styles.navText}>Next</Text>
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
  imageOverlay: {
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
    alignItems: 'flex-end',
  },
  brandLogo: {
    width: 160,
    height: 80,
  },
  formSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  formContent: {
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 6,
    marginBottom: 24,
  },
  formSection: {
    marginTop: 12,
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
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  genderChip: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  genderChipActive: {
    borderColor: '#00BF63',
    backgroundColor: '#E9F9F1',
  },
  genderText: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '600',
  },
  genderTextActive: {
    color: '#00BF63',
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
    marginRight: 8,
  },
  nextBtn: {
    backgroundColor: '#00BF63',
    marginLeft: 8,
  },
  navText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  backText: {
    color: '#333333',
  },
  iosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosModalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },
  iosActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  iosBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  iosCancel: {
    backgroundColor: '#F3F3F3',
    marginRight: 8,
  },
  iosConfirm: {
    backgroundColor: '#00BF63',
    marginLeft: 8,
  },
  iosBtnTextCancel: {
    color: '#333333',
    fontWeight: '600',
  },
  iosBtnTextConfirm: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});


