import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert, Modal } from 'react-native';
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
      <Text style={styles.title}>Rider Registration</Text>
      <Text style={styles.subtitle}>Step 1 of 3</Text>

      <View style={styles.form}>
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
            <Text style={{ color: date_of_birth ? '#222' : '#9E9E9E' }}>
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
            router.push('/RiderRegistration2');
          }}
        >
          <Text style={styles.navText}>Next</Text>
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
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genderChip: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
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
});


