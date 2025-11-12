import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, ImageBackground, Animated, Keyboard, Platform, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function RiderRegistration3() {
  const router = useRouter();

  const [vehicle_type, setVehicleType] = useState<'motorcycle' | 'bicycle'>('motorcycle');
  const [vehicle_brand, setVehicleBrand] = useState('');
  const [vehicle_model, setVehicleModel] = useState('');
  const [plate_number, setPlateNumber] = useState('');
  const [vehicle_color, setVehicleColor] = useState('');
  const [bikeIdType, setBikeIdType] = useState<string>('');
  const [bikeIdUri, setBikeIdUri] = useState<string | null>(null);
  const [showIdModal, setShowIdModal] = useState(false);
  const modalTranslateY = useState(new Animated.Value(0))[0];

  const PRIMARY_VALID_IDS = [
    { value: 'philsys_id', label: 'PhilSys ID (PhilID/ePhilID)' },
    { value: 'passport', label: 'Passport' },
    { value: 'drivers_license', label: "Driver's License" },
    { value: 'umid', label: 'UMID' },
    { value: 'prc_id', label: 'PRC ID' },
    { value: 'postal_id', label: 'Postal ID' },
    { value: 'voters_id', label: "Voter's ID" },
    { value: 'sss_id', label: 'SSS ID' },
    { value: 'philhealth_id', label: 'PhilHealth ID' },
  ];

  const handleSelectBikeIdType = (value: string) => {
    setBikeIdType(value);
    savePartial({ bike_id_type: value });
    setShowIdModal(false);
  };

  const handleSelectVehicleType = (val: 'motorcycle' | 'bicycle') => {
    setVehicleType(val);

    if (val === 'bicycle') {
      // Clear motorized-only fields when switching to bicycle
      setVehicleBrand('');
      setVehicleModel('');
      setPlateNumber('');
      setVehicleColor('');
      savePartial({
        vehicle_type: val,
        vehicle_brand: '',
        vehicle_model: '',
        plate_number: '',
        vehicle_color: '',
      });
    } else {
      // Clear bicycle-only fields when returning to motorized flow
      setBikeIdType('');
      setBikeIdUri(null);
      savePartial({
        vehicle_type: val,
        bike_id_type: null,
        bike_id_local_uri: null,
      });
    }
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

  const pickImage = async (
     source: 'camera' | 'library',
     setter: (uri: string | null) => void,
     storageKey: string,
   ) => {
     const ok = await ensurePermissions();
     if (!ok) {
       Alert.alert('Permissions', 'Camera and library permissions are required.');
       return;
     }
 
    const pickerOptions: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled) {
      return;
    }

    const uri = result.assets[0].uri;
    setter(uri);
    await savePartial({ [storageKey]: uri } as any);
  };

  const savePartial = async (patch: any) => {
    try {
      const raw = await AsyncStorage.getItem('rider_registration');
      const obj = raw ? JSON.parse(raw) : {};
      const merged = { ...obj, step2: { ...(obj?.step2 || {}), ...patch } };
      await AsyncStorage.setItem('rider_registration', JSON.stringify(merged));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('rider_registration');
        if (raw) {
          const obj = JSON.parse(raw);
          const s2 = obj?.step2 || {};
          if (s2.vehicle_type) setVehicleType(s2.vehicle_type);
          if (s2.vehicle_brand) setVehicleBrand(s2.vehicle_brand);
          if (s2.vehicle_model) setVehicleModel(s2.vehicle_model);
          if (s2.plate_number) setPlateNumber(s2.plate_number);
          if (s2.vehicle_color) setVehicleColor(s2.vehicle_color);
          if (s2.bike_id_type) setBikeIdType(s2.bike_id_type);
          if (s2.bike_id_local_uri) setBikeIdUri(s2.bike_id_local_uri);
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

  const selectedIdLabel = bikeIdType
    ? PRIMARY_VALID_IDS.find((id) => id.value === bikeIdType)?.label || 'Select valid ID'
    : 'Select valid ID';

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../assets/riderregistration2.png')} style={styles.background} resizeMode="cover">
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
              <Text style={styles.sheetTitle}>Tell us about your ride</Text>
              <Text style={styles.sheetSubtitle}>Help us keep your profile complete with the details of the vehicle you use on deliveries.</Text>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Vehicle Type</Text>
                <View style={styles.chipsRow}>
                  {(['motorcycle', 'bicycle'] as const).map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.chip, vehicle_type === val ? styles.chipActive : null]}
                      onPress={() => handleSelectVehicleType(val)}
                    >
                      <Text style={[styles.chipText, vehicle_type === val ? styles.chipTextActive : null]}>
                        {val.charAt(0).toUpperCase() + val.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {vehicle_type === 'bicycle' ? (
                  <>
                    <Text style={[styles.label, styles.spacing]}>Valid ID Type</Text>
                    <TouchableOpacity
                      style={styles.selectInput}
                      activeOpacity={0.8}
                      onPress={() => setShowIdModal(true)}
                    >
                      <Text style={bikeIdType ? styles.selectText : styles.selectPlaceholder}>{selectedIdLabel}</Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, styles.spacing]}>Upload Valid ID</Text>
                    {bikeIdUri ? (
                      <View style={styles.previewWrap}>
                        <Image source={{ uri: bikeIdUri }} style={styles.previewImg} />
                        <TouchableOpacity
                          style={styles.changeBtn}
                          onPress={async () => {
                            setBikeIdUri(null);
                            await savePartial({ bike_id_local_uri: null });
                          }}
                        >
                          <Text style={styles.changeText}>Remove ID Image</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => pickImage('camera', setBikeIdUri, 'bike_id_local_uri')}
                      >
                        <Text style={styles.actionText}>Use Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnLast]}
                        onPress={() => pickImage('library', setBikeIdUri, 'bike_id_local_uri')}
                      >
                        <Text style={styles.actionText}>Choose File</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </View>
            </ScrollView>

            <View style={styles.footerRow}>
              <TouchableOpacity style={[styles.navBtn, styles.backBtn]} onPress={() => router.back()}>
                <Text style={[styles.navText, styles.backText]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtn, styles.nextBtn]}
                onPress={async () => {
                  if (vehicle_type === 'bicycle') {
                    if (!bikeIdType || !bikeIdUri) {
                      Alert.alert('Missing Information', 'Please select a valid ID and upload the ID image.');
                      return;
                    }
                    await savePartial({
                      vehicle_type,
                      bike_id_type: bikeIdType,
                      bike_id_local_uri: bikeIdUri,
                      saved_at: Date.now(),
                    });
                    router.push('/RiderRegistration4');
                    return;
                  }

                  if (!vehicle_brand || !vehicle_model || !plate_number || !vehicle_color) {
                    Alert.alert('Missing Information', 'Please complete all fields before proceeding.');
                    return;
                  }
                  await savePartial({ vehicle_type, vehicle_brand, vehicle_model, plate_number, vehicle_color, saved_at: Date.now() });
                  router.push('/RiderRegistration2');
                }}
              >
                <Text style={styles.navText}>Next</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </ImageBackground>
      <Modal
        visible={showIdModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIdModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowIdModal(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Valid ID</Text>
            <ScrollView style={styles.modalList}>
              {PRIMARY_VALID_IDS.map((id) => (
                <TouchableOpacity
                  key={id.value}
                  style={[styles.modalOption, bikeIdType === id.value && styles.modalOptionActive]}
                  onPress={() => handleSelectBikeIdType(id.value)}
                >
                  <Text style={[styles.modalOptionText, bikeIdType === id.value && styles.modalOptionTextActive]}>
                    {id.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowIdModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    alignItems: 'flex-start',
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
    paddingBottom: 28,
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
  },
  sectionTitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
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
  selectInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  selectText: {
    color: '#222222',
    fontWeight: '600',
  },
  selectPlaceholder: {
    color: '#9E9E9E',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#00BF63',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewWrap: {
    marginTop: 12,
    alignItems: 'center',
  },
  previewImg: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#EDEDED',
  },
  changeBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeText: {
    color: '#333333',
    fontWeight: '600',
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
  actionBtnLast: {
    marginRight: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 16,
  },
  modalList: {
    maxHeight: 260,
  },
  modalOption: {
    paddingVertical: 12,
  },
  modalOptionActive: {
    backgroundColor: '#E9F9F1',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  modalOptionText: {
    color: '#333333',
    fontSize: 15,
  },
  modalOptionTextActive: {
    color: '#00BF63',
    fontWeight: '700',
  },
  modalCancel: {
    marginTop: 18,
    alignSelf: 'flex-end',
  },
  modalCancelText: {
    color: '#666666',
    fontWeight: '600',
  },
});


