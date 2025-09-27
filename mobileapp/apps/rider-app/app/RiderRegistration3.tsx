import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function RiderRegistration3() {
  const router = useRouter();

  const [vehicle_type, setVehicleType] = useState<'motorcycle' | 'bicycle'>('motorcycle');
  const [vehicle_brand, setVehicleBrand] = useState('');
  const [vehicle_model, setVehicleModel] = useState('');
  const [plate_number, setPlateNumber] = useState('');
  const [vehicle_color, setVehicleColor] = useState('');

  const savePartial = async (patch: any) => {
    try {
      const raw = await AsyncStorage.getItem('rider_registration');
      const obj = raw ? JSON.parse(raw) : {};
      const merged = { ...obj, step3: { ...(obj?.step3 || {}), ...patch } };
      await AsyncStorage.setItem('rider_registration', JSON.stringify(merged));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('rider_registration');
        if (raw) {
          const obj = JSON.parse(raw);
          const s3 = obj?.step3 || {};
          if (s3.vehicle_type) setVehicleType(s3.vehicle_type);
          if (s3.vehicle_brand) setVehicleBrand(s3.vehicle_brand);
          if (s3.vehicle_model) setVehicleModel(s3.vehicle_model);
          if (s3.plate_number) setPlateNumber(s3.plate_number);
          if (s3.vehicle_color) setVehicleColor(s3.vehicle_color);
        }
      } catch {}
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rider Registration</Text>
      <Text style={styles.subtitle}>Step 3 of 3</Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicle Type</Text>
          <View style={styles.chipsRow}>
            {(['motorcycle', 'bicycle'] as const).map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.chip, vehicle_type === val ? styles.chipActive : null]}
                onPress={() => {
                  setVehicleType(val);
                  savePartial({ vehicle_type: val });
                }}
              >
                <Text style={[styles.chipText, vehicle_type === val ? styles.chipTextActive : null]}>
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, styles.spacing]}>Vehicle Brand</Text>
          <TextInput
            value={vehicle_brand}
            onChangeText={(t) => {
              setVehicleBrand(t);
              savePartial({ vehicle_brand: t });
            }}
            placeholder="e.g., Honda"
            placeholderTextColor="#9E9E9E"
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={[styles.label, styles.spacing]}>Vehicle Model</Text>
          <TextInput
            value={vehicle_model}
            onChangeText={(t) => {
              setVehicleModel(t);
              savePartial({ vehicle_model: t });
            }}
            placeholder="e.g., Click 125"
            placeholderTextColor="#9E9E9E"
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={[styles.label, styles.spacing]}>Plate Number</Text>
          <TextInput
            value={plate_number}
            onChangeText={(t) => {
              setPlateNumber(t);
              savePartial({ plate_number: t });
            }}
            placeholder="e.g., ABC-1234"
            placeholderTextColor="#9E9E9E"
            style={styles.input}
            autoCapitalize="characters"
          />

          <Text style={[styles.label, styles.spacing]}>Vehicle Color</Text>
          <TextInput
            value={vehicle_color}
            onChangeText={(t) => {
              setVehicleColor(t);
              savePartial({ vehicle_color: t });
            }}
            placeholder="e.g., Black"
            placeholderTextColor="#9E9E9E"
            style={styles.input}
            autoCapitalize="words"
          />
        </View>
      </ScrollView>

      <View style={styles.footerRow}>
        <TouchableOpacity style={[styles.navBtn, styles.backBtn]} onPress={() => router.back()}>
          <Text style={[styles.navText, styles.backText]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, styles.nextBtn]}
          onPress={async () => {
            if (!vehicle_type || !vehicle_brand || !vehicle_model || !plate_number || !vehicle_color) {
              Alert.alert('Missing Information', 'Please complete all fields before proceeding.');
              return;
            }
            await savePartial({ vehicle_type, vehicle_brand, vehicle_model, plate_number, vehicle_color, saved_at: Date.now() });
            router.push('/RiderRegistration4');
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
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: '#00BF63',
    backgroundColor: '#E9F9F1',
  },
  chipText: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#00BF63',
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
});


