import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function RiderRegistration1() {
  const router = useRouter();

  const [first_name, setFirstName] = useState('');
  const [middle_name, setMiddleName] = useState('');
  const [last_name, setLastName] = useState('');
  const [date_of_birth, setDateOfBirth] = useState(''); // YYYY-MM-DD for easy backend storage
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');

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
        <TextInput
          value={date_of_birth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9E9E9E"
          style={styles.input}
          keyboardType={Platform.select({ ios: 'numbers-and-punctuation', default: 'numeric' })}
        />

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


