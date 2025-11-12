import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, ImageBackground } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Reuse the same patterns as customer prescription upload: camera or gallery then (later) upload to S3
// For now we keep the selected URI; later, backend will return a permanent S3 URL stored in UserDocument

export default function RiderRegistration2() {
  const router = useRouter();
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const savePartial = async (patch: any) => {
    try {
      const raw = await AsyncStorage.getItem('rider_registration');
      const obj = raw ? JSON.parse(raw) : {};
      const merged = { ...obj, step3: { ...(obj?.step3 || {}), ...patch } };
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

  // Load any previously selected local file when returning to this step
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('rider_registration');
        if (raw) {
          const obj = JSON.parse(raw);
          const uri = obj?.step3?.drivers_license_local_uri as string | undefined;
          if (uri) setSelectedImageUri(uri);
        }
      } catch {}
    })();
  }, []);

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
    } catch {
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
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: (ImagePicker as any).MediaType?.Images || (ImagePicker as any).MediaTypeOptions?.Images, allowsEditing: true, aspect: [3, 4], quality: 0.8 });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setSelectedImageUri(uri);
      await savePartial({ drivers_license_local_uri: uri });
    } catch {
      Alert.alert('Gallery Error', 'Failed to open gallery.');
    }
  };

  // Defer actual upload to a later step; we only persist local URI here

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/driverlicensebg.png')} style={styles.background} resizeMode="cover">
        <View style={styles.overlay} />
        <View style={styles.wrapper}>
          <View style={styles.header}>
            <Image source={require('../assets/pharmarider.png')} style={styles.brandLogo} resizeMode="contain" />
          </View>

          <View style={styles.sheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetContent}
            >
              <Text style={styles.title}>{"Verify your driver's license"}</Text>
              <Text style={styles.subtitle}>Upload a clear photo of your license to help us finish your rider verification.</Text>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>{"Upload Driver's License Image"}</Text>
                {selectedImageUri ? (
                  <View style={styles.previewWrap}>
                    <Image source={{ uri: selectedImageUri }} style={styles.previewImg} />
                    <TouchableOpacity style={styles.changeBtn} onPress={() => setSelectedImageUri(null)}>
                      <Text style={styles.changeText}>Change Image</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.cameraBtn]} onPress={takePhoto}>
                      <Text style={styles.actionText}>Use Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.galleryBtn]} onPress={pickFromGallery}>
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
                  await savePartial({ drivers_license_local_uri: selectedImageUri, saved_at: Date.now() });
                  router.push('/RiderRegistration4');
                }}
              >
                <Text style={styles.navText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingBottom: 24,
  },
  sheetContent: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 6,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CCCCCC',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionText: {
    color: '#00BF63',
    fontWeight: '700',
  },
  previewWrap: {
    alignItems: 'center',
  },
  previewImg: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    backgroundColor: '#EDEDED',
  },
  changeBtn: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeText: {
    color: '#333333',
    fontWeight: '600',
  },
  note: {
    marginTop: 14,
    fontSize: 13,
    color: '#666666',
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
  cameraBtn: {},
  galleryBtn: {},
});


