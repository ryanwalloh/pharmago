import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import MapView, { Marker, Region } from 'react-native-maps';
import { fontFamily } from '../utils/fonts';
import { apiService } from '../services/api';

interface AddressData {
  label: 'home' | 'work' | 'parent_house' | 'other';
  street_address: string;
  barangay: string;
  city: string;
  province: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  building_name: string;
  floor_number: string;
  unit_number: string;
  landmark: string;
  is_default: boolean;
}

const AddressSelectionScreen: React.FC = () => {
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Region | null>(null);
  const [addressData, setAddressData] = useState<AddressData>({
    label: 'home',
    street_address: '',
    barangay: '',
    city: 'Iligan City',
    province: 'Lanao del Norte',
    postal_code: '',
    latitude: 0,
    longitude: 0,
    building_name: '',
    floor_number: '',
    unit_number: '',
    landmark: '',
    is_default: true,
  });

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadSelectedData();
    requestLocationPermission();
  }, []);

  const loadSelectedData = async () => {
    try {
      const [storedPharmacy, storedPaymentMethod] = await Promise.all([
        AsyncStorage.getItem('selectedPharmacy'),
        AsyncStorage.getItem('selectedPaymentMethod'),
      ]);

      if (storedPharmacy) {
        const pharmacy = JSON.parse(storedPharmacy);
        setSelectedPharmacy(pharmacy);
        console.log('📱 Loaded selected pharmacy for address:', pharmacy.pharmacy_name);
      }

      if (storedPaymentMethod) {
        const paymentMethod = JSON.parse(storedPaymentMethod);
        setSelectedPaymentMethod(paymentMethod);
        console.log('💳 Loaded selected payment method for address:', paymentMethod.name);
      }
    } catch (error) {
      console.error('💥 Error loading selected data:', error);
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationPermission(granted);
      if (!granted) {
        Alert.alert('Permission Needed', 'Please allow location permission to use your current location.');
      }
      return granted;
    } catch (error) {
      console.error('💥 Error requesting location permission:', error);
      setLocationPermission(false);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);

      let granted = locationPermission === true;
      if (!granted) {
        granted = await requestLocationPermission();
      }
      if (!granted) {
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const region: Region = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setSelectedLocation(region);
      setAddressData(prev => ({ ...prev, latitude: coords.latitude, longitude: coords.longitude }));

      if (mapRef.current) {
        mapRef.current.animateToRegion(region, 750);
      }

      // Also reverse geocode to prefill address
      reverseGeocode(coords.latitude, coords.longitude);
    } catch (error) {
      console.error('💥 Error getting current location:', error);
      Alert.alert('Error', 'Failed to get your current location.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const region: Region = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setSelectedLocation(region);
    setAddressData(prev => ({
      ...prev,
      latitude,
      longitude,
    }));

    console.log('📍 Location selected on map:', { latitude, longitude });
    reverseGeocode(latitude, longitude);
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      // Prefer Expo reverseGeocodeAsync (no extra billing)
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const r = results[0];
        // Build a readable address string similar to Google format when possible
        const parts = [
          r.name,
          r.street,
          r.district || r.subregion,
          r.city || r.subregion,
          r.postalCode,
          r.region,
          r.country,
        ].filter(Boolean);

        const formatted = parts.join(', ');
        // Update our form with best-effort mapping
        setAddressData(prev => ({
          ...prev,
          street_address: [r.name, r.street].filter(Boolean).join(', ') || prev.street_address,
          barangay: (r.district || r.subregion || prev.barangay || ''),
          city: (r.city || r.subregion || prev.city),
          province: (r.region || prev.province),
          postal_code: (r.postalCode || prev.postal_code),
        }));

        console.log('📫 Reverse geocoded address:', formatted);
        return;
      }

      // Fallback to Google Geocoding API for Plus Code and full formatted_address
      const apiKey = (Constants.expoConfig?.extra as any)?.googleMapsApiKey;
      if (!apiKey) return;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const primary = data.results[0];
        const formatted = primary.formatted_address as string;

        let barangay = addressData.barangay;
        let city = addressData.city;
        let province = addressData.province;
        let postal = addressData.postal_code;

        // Extract common components
        const components: any[] = primary.address_components || [];
        components.forEach(c => {
          if (c.types.includes('sublocality') || c.types.includes('neighborhood')) {
            barangay = barangay || c.long_name;
          }
          if (c.types.includes('locality')) {
            city = city || c.long_name;
          }
          if (c.types.includes('administrative_area_level_1')) {
            province = province || c.long_name;
          }
          if (c.types.includes('postal_code')) {
            postal = postal || c.long_name;
          }
        });

        setAddressData(prev => ({
          ...prev,
          street_address: formatted,
          barangay: barangay || prev.barangay,
          city: city || prev.city,
          province: province || prev.province,
          postal_code: postal || prev.postal_code,
        }));

        console.log('📫 Google formatted address:', formatted);
      }
    } catch (error) {
      console.error('💥 Reverse geocoding failed:', error);
    }
  };

  const handleInputChange = (field: keyof AddressData, value: string) => {
    setAddressData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateAddressData = (): boolean => {
    const required = ['street_address', 'barangay', 'city', 'province'];
    
    for (const field of required) {
      if (!addressData[field as keyof AddressData]) {
        Alert.alert('Missing Information', `Please fill in the ${field.replace('_', ' ')} field.`);
        return false;
      }
    }

    if (addressData.latitude === 0 || addressData.longitude === 0) {
      Alert.alert('Location Required', 'Please select a location on the map or use your current location.');
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!selectedPharmacy) {
      Alert.alert('No Pharmacy Selected', 'Please go back and select a pharmacy first.');
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert('No Payment Method Selected', 'Please go back and select a payment method first.');
      return;
    }

    if (!validateAddressData()) {
      return;
    }

    try {
      setLoading(true);

      // Get prescription data from AsyncStorage
      const tempPrescription = await AsyncStorage.getItem('tempPrescription');
      if (!tempPrescription) {
        Alert.alert('No Prescription Found', 'Please upload a prescription first.');
        return;
      }

      const prescriptionData = JSON.parse(tempPrescription);
      
      // Get current user data
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        Alert.alert('Not Logged In', 'Please log in to place an order.');
        return;
      }

      const user = JSON.parse(userData);

      // If local file URI, upload first to get http(s) URL
      let prescriptionImageUrl: string | undefined = prescriptionData.imageUri;
      if (prescriptionImageUrl && prescriptionImageUrl.startsWith('file:')) {
        const uploadRes = await apiService.uploadPrescriptionFile(prescriptionImageUrl as string);
        if (!uploadRes.success || !uploadRes.data?.url) {
          Alert.alert('Upload Failed', 'Could not upload prescription image. Please try again.');
          return;
        }
        prescriptionImageUrl = uploadRes.data.url;
      }

      // Prepare order data for API
      const orderData = {
        customer_username: user.username,
        pharmacy_id: selectedPharmacy.id,
        prescription_image_url: prescriptionImageUrl || '',
        prescription_notes: prescriptionData.notes || '',
        address: {
          street_address: addressData.street_address,
          barangay: addressData.barangay,
          city: addressData.city,
          province: addressData.province,
          postal_code: addressData.postal_code,
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          building_name: addressData.building_name,
          floor_number: addressData.floor_number,
          unit_number: addressData.unit_number,
          landmark: addressData.landmark,
          label: addressData.label,
          is_default: addressData.is_default,
        },
        payment_method: {
          name: selectedPaymentMethod.name,
        },
        prescription_details: {
          doctorName: prescriptionData.doctorName || '',
          prescriptionDate: prescriptionData.prescriptionDate || '',
          notes: prescriptionData.notes || '',
        }
      };

      console.log('📦 Creating prescription order with data:', orderData);

      // Create order via API
      const response = await apiService.createPrescriptionOrder(orderData);

      // Unwrap server payload shape: { success, message, data: { order_id, ... } }
      const serverPayload = response?.data as any;
      const createdOrder = serverPayload?.data;

      if (response.success && createdOrder?.order_id) {
        // Store order data for tracking
        await AsyncStorage.setItem('currentOrder', JSON.stringify(createdOrder));
        
        // Clear temporary prescription data
        await AsyncStorage.removeItem('tempPrescription');
        await AsyncStorage.removeItem('selectedPharmacy');
        await AsyncStorage.removeItem('selectedPaymentMethod');
        
        console.log('✅ Order created successfully:', createdOrder.order_number || createdOrder.order_id);
        
        Alert.alert(
          'Order Placed Successfully! 🎉',
          createdOrder.order_number
            ? `Your prescription order #${createdOrder.order_number} has been submitted. The pharmacy will review your prescription and contact you with pricing details through our chat system.`
            : 'Your prescription order has been submitted. The pharmacy will review your prescription and contact you with pricing details through our chat system.',
          [
            {
              text: 'Track Order',
              onPress: () => {
                // Navigate to order tracking screen only with a valid ID
                router.push(`/order-tracking/${createdOrder.order_id}` as any);
              },
            },
            {
              text: 'Go Home',
              onPress: () => {
                router.push('/');
              },
            },
          ]
        );
      } else {
        const err = (response as any)?.error || (serverPayload && serverPayload.error) || 'Unknown error';
        console.error('❌ Order creation failed:', err);
        Alert.alert(
          'Order Not Saved',
          'We could not confirm your order was saved. Please try again, or check your connection and try later.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('💥 Error placing order:', error);
      Alert.alert('Error', 'Failed to place your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Image source={require('../assets/onboarding3.png')} style={styles.headerImage} resizeMode="contain" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Set Delivery Address</Text>
              <Text style={styles.headerSubtitle}>
                Choose where you&apos;d like your prescription delivered.
                You can use your current location or select a specific address on the map.
              </Text>
            </View>
          </View>

          {/* Location Services Section */}
          <View style={styles.locationSection}>
            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={getCurrentLocation}
              disabled={loading || !locationPermission}
            >
              <Text style={styles.currentLocationIcon}>📍</Text>
              <Text style={styles.currentLocationText}>
                {loading ? 'Getting Location...' : 'Use My Current Location'}
              </Text>
              {loading && <ActivityIndicator size="small" color="#9DD49D" style={styles.loadingSpinner} />}
            </TouchableOpacity>
            
            {locationPermission === false && (
              <Text style={styles.permissionWarning}>
                Location permission is required to use your current location.
              </Text>
            )}
          </View>

          {/* Map Section */}
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Select Location on Map</Text>
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: 8.2289, // Iligan City coordinates
                  longitude: 124.2452,
                  latitudeDelta: 0.1,
                  longitudeDelta: 0.1,
                }}
                onPress={handleMapPress}
                showsUserLocation={locationPermission === true}
                showsMyLocationButton={false}
              >
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                    }}
                    title="Delivery Address"
                    description="Tap and hold to move this marker"
                  />
                )}
              </MapView>
            </View>
            <Text style={styles.mapInstruction}>
              Tap anywhere on the map to set your delivery location
            </Text>
          </View>

          {/* Address Form Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Delivery Address Details</Text>
            
            {/* Address Label */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address Type</Text>
              <View style={styles.labelOptions}>
                {[
                  { value: 'home', label: 'Home', icon: '🏠' },
                  { value: 'work', label: 'Work', icon: '🏢' },
                  { value: 'parent_house', label: 'Parent\'s House', icon: '👨‍👩‍👧‍👦' },
                  { value: 'other', label: 'Other', icon: '📍' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.labelOption,
                      addressData.label === option.value && styles.selectedLabelOption
                    ]}
                    onPress={() => handleInputChange('label', option.value)}
                  >
                    <Text style={styles.labelOptionIcon}>{option.icon}</Text>
                    <Text style={[
                      styles.labelOptionText,
                      addressData.label === option.value && styles.selectedLabelOptionText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Street Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Street Address *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your street address"
                value={addressData.street_address}
                onChangeText={(value) => handleInputChange('street_address', value)}
                multiline
              />
            </View>

            {/* Barangay */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Barangay *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your barangay"
                value={addressData.barangay}
                onChangeText={(value) => handleInputChange('barangay', value)}
              />
            </View>

            {/* City and Province */}
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="City"
                  value={addressData.city}
                  onChangeText={(value) => handleInputChange('city', value)}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Province *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Province"
                  value={addressData.province}
                  onChangeText={(value) => handleInputChange('province', value)}
                />
              </View>
            </View>

            {/* Postal Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Postal Code</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Postal code (optional)"
                value={addressData.postal_code}
                onChangeText={(value) => handleInputChange('postal_code', value)}
                keyboardType="numeric"
              />
            </View>

            {/* Building Details */}
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Building Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Building name"
                  value={addressData.building_name}
                  onChangeText={(value) => handleInputChange('building_name', value)}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Floor/Unit</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Floor/Unit"
                  value={addressData.floor_number}
                  onChangeText={(value) => handleInputChange('floor_number', value)}
                />
              </View>
            </View>

            {/* Landmark */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Landmark</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Nearby landmark (optional)"
                value={addressData.landmark}
                onChangeText={(value) => handleInputChange('landmark', value)}
              />
            </View>
          </View>

          {/* Order Summary */}
          {selectedPharmacy && selectedPaymentMethod && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Pharmacy:</Text>
                <Text style={styles.summaryValue}>{selectedPharmacy.pharmacy_name}</Text>
                
                <Text style={styles.summaryLabel}>Payment Method:</Text>
                <Text style={styles.summaryValue}>{selectedPaymentMethod.name}</Text>
                
                <Text style={styles.summaryLabel}>Delivery Address:</Text>
                <Text style={styles.summaryValue}>
                  {addressData.street_address ? `${addressData.street_address}, ${addressData.barangay}, ${addressData.city}` : 'Not set'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            loading && styles.placeOrderButtonDisabled
          ]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.placeOrderButtonText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for the fixed button
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  headerImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fontFamily.heavy,
    color: '#2A2A2A',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#666666',
    lineHeight: 16,
    textAlign: 'center',
  },
  // Location Section
  locationSection: {
    marginBottom: 24,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9DD49D',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  currentLocationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  currentLocationText: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
  },
  loadingSpinner: {
    marginLeft: 8,
  },
  permissionWarning: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#FF6B6B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Map Section
  mapSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fontFamily.heavy,
    color: '#2A2A2A',
    marginBottom: 16,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  map: {
    flex: 1,
  },
  mapInstruction: {
    fontSize: 12,
    fontFamily: fontFamily.light,
    color: '#888888',
    textAlign: 'left',
    marginTop: 8,
    fontStyle: 'italic',
    marginBottom: 26,
  },
  // Form Section
  formSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#2A2A2A',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fontFamily.light,
    color: '#2A2A2A',
  },
  // Label Options
  labelOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedLabelOption: {
    borderColor: '#9DD49D',
    backgroundColor: '#F8FFF8',
  },
  labelOptionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  labelOptionText: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#2A2A2A',
  },
  selectedLabelOptionText: {
    fontFamily: fontFamily.heavy,
    color: '#28A745',
  },
  // Summary Section
  summarySection: {
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    padding: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#666666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: fontFamily.light,
    color: '#2A2A2A',
    marginBottom: 12,
  },
  // Bottom Section
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  placeOrderButton: {
    backgroundColor: '#9DD49D',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#B0D9B0',
  },
  placeOrderButtonText: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
  },
});

export default AddressSelectionScreen;
