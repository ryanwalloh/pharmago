import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../customer-app/services/api';
import { useRouter } from 'expo-router';

// Reuse the same patterns as customer prescription upload: camera or gallery then (later) upload to S3
// For now we keep the selected URI; later, backend will return a permanent S3 URL stored in UserDocument

export default function RiderRegistration2() {
  const router = useRouter();
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const savePartial = async (patch: any) => {
    try {
      const raw = await AsyncStorage.getItem('rider_registration');
      const obj = raw ? JSON.parse(raw) : {};
      const merged = { ...obj, step2: { ...(obj?.step2 || {}), ...patch } };
      await AsyncStorage.setItem('rider_registration', JSON.stringify(merged));
    } catch {}
  };

  const ensurePermissions = async (): Promise<boolean> => {
    try {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return cam.status === 'granted' && lib.status === 'granted';
    } catch {
      return false;
    }
  };

  const takePhoto = async () => {
    try {
      const ok = await ensurePermissions();
      if (!ok) {
        Alert.alert('Permissions', 'Camera and library permissions are required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.8 });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setSelectedImageUri(uri);
      await savePartial({ drivers_license_local_uri: uri });
    } catch (e) {
      Alert.alert('Camera Error', 'Failed to open camera.');
    }
  };

  const pickFromGallery = async () => {
    try {
      const ok = await ensurePermissions();
      if (!ok) {
        Alert.alert('Permissions', 'Camera and library permissions are required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.8 });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setSelectedImageUri(uri);
      await savePartial({ drivers_license_local_uri: uri });
    } catch (e) {
      Alert.alert('Gallery Error', 'Failed to open gallery.');
    }
  };

  const uploadToS3 = async (uri: string): Promise<string | null> => {
    try {
      // Build FormData similar to prescription image upload
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) return null;
      const name = `drivers_license_${Date.now()}.${uri.split('.').pop()}`;
      const form = new FormData();
      form.append('file', { uri, name, type: 'image/jpeg' } as any);
      // Dedicated endpoint for driver's license upload
      const res = await fetch(`${apiService.getDirectBaseUrl()}/upload-driver-license/`, { method: 'POST', body: form as any });
      const json = await res.json();
      if (!res.ok || !json.success) return null;
      // Return the S3/public URL
      return json.url || null;
    } catch {
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver's License</Text>
      <Text style={styles.subtitle}>Step 2 of 3</Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload Driver's License Image</Text>
          {selectedImageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: selectedImageUri }} style={styles.previewImg} />
              <TouchableOpacity style={styles.changeBtn} onPress={() => setSelectedImageUri(null)}>
                <Text style={styles.changeText}>Change Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
                <Text style={styles.actionText}>Use Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={pickFromGallery}>
                <Text style={styles.actionText}>Choose File</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.note}>Tips: Ensure the image is clear and readable. Avoid glare and blur.</Text>
        </View>
      </ScrollView>

      <View style={styles.footerRow}>
        <TouchableOpacity style={[styles.navBtn, styles.backBtn]} onPress={() => router.back()}>
          <Text style={[styles.navText, styles.backText]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, styles.nextBtn]}
          onPress={async () => {
            if (!selectedImageUri) {
              Alert.alert('Missing Image', "Please upload a photo of your driver's license.");
              return;
            }
            try {
              setIsUploading(true);
              const url = await uploadToS3(selectedImageUri);
              if (!url) {
                Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
                setIsUploading(false);
                return;
              }
              // Save partial to AsyncStorage for last-step submission
              await savePartial({ drivers_license_url: url, uploaded_at: Date.now() });
              router.push('/RiderRegistration3');
            } finally {
              setIsUploading(false);
            }
          }}
        >
          {isUploading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.navText}>Next</Text>}
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#00BF63',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewWrap: {
    alignItems: 'center',
  },
  previewImg: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#EDEDED',
  },
  changeBtn: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeText: {
    color: '#333333',
    fontWeight: '600',
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    color: '#666666',
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


