import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { fontFamily } from '../utils/fonts';
import apiService from '../services/api';

// Back Arrow Icon
const BackArrowIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M20,11H7.83l5.59-5.59L12,4l-8,8l8,8l1.41-1.41L7.83,13H20V11z"
      fill={color}
    />
  </Svg>
);

// Payment Method Icons
const VisaIcon = () => (
  <View style={styles.paymentIconPlaceholder}>
    <Text style={styles.paymentIconText}>VISA</Text>
  </View>
);

const GCashIcon = () => (
  <View style={[styles.paymentIconPlaceholder, { backgroundColor: '#007AFF' }]}>
    <Text style={styles.paymentIconText}>GCash</Text>
  </View>
);

const PayPalIcon = () => (
  <View style={[styles.paymentIconPlaceholder, { backgroundColor: '#0070BA' }]}>
    <Text style={styles.paymentIconText}>PayPal</Text>
  </View>
);

const CODIcon = () => (
  <View style={[styles.paymentIconPlaceholder, { backgroundColor: '#00bf63' }]}>
    <Text style={styles.paymentIconText}>COD</Text>
  </View>
);

export default function CheckoutScreen() {
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod');
  const [userLocation, setUserLocation] = useState<any>(null);
  const [address, setAddress] = useState<string>('');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Address Edit Modal States
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [addressForm, setAddressForm] = useState({
    label: 'home',
    street_address: '',
    barangay: '',
    building_name: '',
    floor_number: '',
    unit_number: '',
    landmark: '',
  });
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    loadOrderData();
    getUserLocation();
  }, []);

  const loadOrderData = async () => {
    try {
      const data = await AsyncStorage.getItem('pending_order');
      if (data) {
        const parsed = JSON.parse(data);
        // Parse nested JSON strings
        if (typeof parsed.pharmacy === 'string') {
          parsed.pharmacy = JSON.parse(parsed.pharmacy);
        }
        if (typeof parsed.cartItems === 'string') {
          parsed.cartItems = JSON.parse(parsed.cartItems);
        }
        if (typeof parsed.deliveryInfo === 'string') {
          parsed.deliveryInfo = JSON.parse(parsed.deliveryInfo);
        }
        setOrderData(parsed);
        console.log('📦 Loaded order data:', parsed);
      } else {
        Alert.alert('Error', 'No order data found');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load order data:', error);
      Alert.alert('Error', 'Failed to load order data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const addr = geocode[0];
        const fullAddress = `${addr.street || ''} ${addr.name || ''}, ${addr.city || ''}, ${addr.region || ''}, ${addr.country || ''}`.trim();
        setAddress(fullAddress);
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  // Address Edit Modal Functions
  const handleEditAddress = () => {
    if (userLocation) {
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setSelectedLocation(userLocation);
    }
    setShowAddressModal(true);
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    
    // Reverse geocode to get address details
    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocode.length > 0) {
        const addr = geocode[0];
        setAddressForm(prev => ({
          ...prev,
          street_address: `${addr.street || ''} ${addr.name || ''}`.trim(),
          barangay: addr.district || addr.subregion || '',
        }));
      }
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
    }
  };

  const handleSaveAddress = async () => {
    if (!selectedLocation || !addressForm.street_address || !addressForm.barangay) {
      Alert.alert('Missing Information', 'Please select a location on the map and fill in the required fields.');
      return;
    }

    setSavingAddress(true);
    try {
      // Prepare address data for API
      const addressData = {
        customer_id: 24, // TODO: Get actual customer ID from auth context
        label: addressForm.label,
        street_address: addressForm.street_address,
        barangay: addressForm.barangay,
        building_name: addressForm.building_name,
        floor_number: addressForm.floor_number,
        unit_number: addressForm.unit_number,
        landmark: addressForm.landmark,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        city: 'Iligan City',
        province: 'Lanao del Norte',
        is_default: true,
      };

      console.log('📍 Saving address:', addressData);

      // Call API to save address
      const response = await apiService.createOrUpdateAddress(addressData);
      
      if (response.success) {
        // Update local state with saved address
        setUserLocation(selectedLocation);
        setAddress(`${addressForm.street_address}, ${addressForm.barangay}, Iligan City, Lanao del Norte`);
        
        setShowAddressModal(false);
        Alert.alert('Success', 'Address updated successfully!');
      } else {
        throw new Error(response.error || 'Failed to save address');
      }
    } catch (error: any) {
      console.error('Failed to save address:', error);
      Alert.alert('Error', `Failed to save address: ${error.message}`);
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!orderData) return;

    setPlacingOrder(true);
    try {
      // TODO: Call API to create order
      // const response = await apiService.createOrder({
      //   ...orderData,
      //   payment_method: selectedPaymentMethod,
      //   delivery_location: userLocation,
      //   delivery_address: address,
      // });

      console.log('🛒 Placing order:', {
        ...orderData,
        payment_method: selectedPaymentMethod,
        delivery_location: userLocation,
        delivery_address: address,
      });

      // Clear pending order from storage
      await AsyncStorage.removeItem('pending_order');
      await AsyncStorage.removeItem('temp_cart_items');

      // Show success message
      Alert.alert(
        'Order Placed Successfully!',
        orderData.apply_senior_discount 
          ? 'Your order has been placed! The senior citizen discount is pending pharmacy approval.' 
          : 'Your order has been placed successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to orders list or home
              router.replace('/' as any);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to place order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00bf63" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No order data found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <BackArrowIcon size={24} color="#00bf63" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Delivery Address Container */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={handleEditAddress}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Map */}
            {userLocation ? (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    }}
                    title="Delivery Location"
                  />
                </MapView>
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <ActivityIndicator color="#00bf63" />
                <Text style={styles.mapPlaceholderText}>Loading map...</Text>
              </View>
            )}

            {/* Address Details */}
            <View style={styles.addressDetails}>
              <Text style={styles.addressText}>
                {address || 'Fetching address...'}
              </Text>
            </View>
          </View>

          {/* Payment Method Container */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>

            <View style={styles.paymentMethods}>
              {/* Visa */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPaymentMethod === 'visa' && styles.paymentOptionActive,
                ]}
                onPress={() => setSelectedPaymentMethod('visa')}
              >
                <VisaIcon />
                <Text style={styles.paymentLabel}>Visa</Text>
                <View style={styles.radioOuter}>
                  {selectedPaymentMethod === 'visa' && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>

              {/* GCash */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPaymentMethod === 'gcash' && styles.paymentOptionActive,
                ]}
                onPress={() => setSelectedPaymentMethod('gcash')}
              >
                <GCashIcon />
                <Text style={styles.paymentLabel}>GCash</Text>
                <View style={styles.radioOuter}>
                  {selectedPaymentMethod === 'gcash' && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>

              {/* PayPal */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPaymentMethod === 'paypal' && styles.paymentOptionActive,
                ]}
                onPress={() => setSelectedPaymentMethod('paypal')}
              >
                <PayPalIcon />
                <Text style={styles.paymentLabel}>PayPal</Text>
                <View style={styles.radioOuter}>
                  {selectedPaymentMethod === 'paypal' && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>

              {/* COD */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPaymentMethod === 'cod' && styles.paymentOptionActive,
                ]}
                onPress={() => setSelectedPaymentMethod('cod')}
              >
                <CODIcon />
                <Text style={styles.paymentLabel}>Cash on Delivery</Text>
                <View style={styles.radioOuter}>
                  {selectedPaymentMethod === 'cod' && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Summary Container */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>

            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>₱{orderData.subtotal?.toFixed(2)}</Text>
              </View>

              {orderData.apply_senior_discount && orderData.senior_id_image_url && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, styles.discountLabel]}>
                    Senior Discount (20%)*:
                  </Text>
                  <Text style={[styles.summaryValue, styles.discountValue]}>
                    -₱{orderData.potential_discount?.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee:</Text>
                <Text style={styles.summaryValue}>₱{orderData.deliveryFee?.toFixed(2)}</Text>
              </View>

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>
                  ₱{orderData.total?.toFixed(2)}
                  {orderData.apply_senior_discount && orderData.senior_id_image_url && '*'}
                </Text>
              </View>

              {orderData.apply_senior_discount && orderData.senior_id_image_url && (
                <Text style={styles.pendingNote}>* Pending pharmacy approval</Text>
              )}
            </View>
          </View>

          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By placing this order, you agree to our terms of service and privacy policy. 
              Your payment will be processed securely. For Cash on Delivery orders, please 
              have the exact amount ready for our delivery partner. We&apos;re committed to 
              delivering your medicines safely and on time! 🚚💊
            </Text>
          </View>

          {/* Spacing for button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Place Order Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.placeOrderButton}
            onPress={handlePlaceOrder}
            disabled={placingOrder}
          >
            {placingOrder ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.placeOrderButtonText}>Place Order</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Address Edit Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddressModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Delivery Address</Text>
            <TouchableOpacity onPress={handleSaveAddress} disabled={savingAddress}>
              <Text style={[styles.modalSaveButton, savingAddress && styles.modalSaveButtonDisabled]}>
                {savingAddress ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView 
            style={styles.modalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Map Section */}
            <View style={styles.modalMapContainer}>
              {mapRegion ? (
                <MapView
                  style={styles.modalMap}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={mapRegion}
                  onPress={handleMapPress}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                >
                  {selectedLocation && (
                    <Marker
                      coordinate={{
                        latitude: selectedLocation.latitude,
                        longitude: selectedLocation.longitude,
                      }}
                      title="Selected Location"
                    />
                  )}
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <ActivityIndicator color="#00bf63" />
                  <Text style={styles.mapPlaceholderText}>Loading map...</Text>
                </View>
              )}
            </View>

            {/* Form Section */}
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Address Label */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Address Label</Text>
                <View style={styles.labelButtonsContainer}>
                  {[
                    { value: 'home', label: 'Home' },
                    { value: 'work', label: 'Work' },
                    { value: 'parent_house', label: 'Parent\'s House' },
                    { value: 'other', label: 'Other' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.labelButton,
                        addressForm.label === option.value && styles.labelButtonActive,
                      ]}
                      onPress={() => setAddressForm(prev => ({ ...prev, label: option.value }))}
                    >
                      <Text style={[
                        styles.labelButtonText,
                        addressForm.label === option.value && styles.labelButtonTextActive,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Required Fields */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Street Address *</Text>
                <TextInput
                  style={styles.formInput}
                  value={addressForm.street_address}
                  onChangeText={(text) => setAddressForm(prev => ({ ...prev, street_address: text }))}
                  placeholder="Enter street address"
                  placeholderTextColor="#999999"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Barangay *</Text>
                <TextInput
                  style={styles.formInput}
                  value={addressForm.barangay}
                  onChangeText={(text) => setAddressForm(prev => ({ ...prev, barangay: text }))}
                  placeholder="Enter barangay"
                  placeholderTextColor="#999999"
                />
              </View>

              {/* Optional Fields */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Building Name (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={addressForm.building_name}
                  onChangeText={(text) => setAddressForm(prev => ({ ...prev, building_name: text }))}
                  placeholder="Enter building name"
                  placeholderTextColor="#999999"
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formRowItem}>
                  <Text style={styles.formLabel}>Floor Number (Optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={addressForm.floor_number}
                    onChangeText={(text) => setAddressForm(prev => ({ ...prev, floor_number: text }))}
                    placeholder="Floor"
                    placeholderTextColor="#999999"
                  />
                </View>

                <View style={styles.formRowItem}>
                  <Text style={styles.formLabel}>Unit Number (Optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={addressForm.unit_number}
                    onChangeText={(text) => setAddressForm(prev => ({ ...prev, unit_number: text }))}
                    placeholder="Unit"
                    placeholderTextColor="#999999"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Landmark (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={addressForm.landmark}
                  onChangeText={(text) => setAddressForm(prev => ({ ...prev, landmark: text }))}
                  placeholder="Enter nearby landmark"
                  placeholderTextColor="#999999"
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#00bf63',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 15,
    fontFamily: fontFamily.heavy,
  },
  scrollView: {
    flex: 1,
  },
  // Section
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 20,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#333333',
  },
  editButton: {
    fontSize: 14,
    color: '#00bf63',
    fontWeight: '600',
  },
  // Map
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,

  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  mapPlaceholderText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666666',
  },
  addressDetails: {
    padding: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  // Payment Methods
  paymentMethods: {
    marginTop: 15,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  paymentOptionActive: {
    borderColor: '#00bf63',
    backgroundColor: '#F0F9F4',
  },
  paymentIconPlaceholder: {
    width: 50,
    height: 32,
    backgroundColor: '#1434CB',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  paymentIconText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  paymentLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00bf63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00bf63',
  },
  // Order Summary
  summaryContent: {
    marginTop: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  discountLabel: {
    color: '#00bf63',
  },
  discountValue: {
    color: '#00bf63',
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#333333',
  },
  totalValue: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#00bf63',
  },
  pendingNote: {
    fontSize: 11,
    color: '#996600',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Terms
  termsContainer: {
    padding: 20,
    backgroundColor: '#FFF9E6',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 12,
  },
  termsText: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
    textAlign: 'center',
  },
  // Bottom Container
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  placeOrderButton: {
    backgroundColor: '#00bf63',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  placeOrderButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
  },
  // Address Edit Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#666666',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#333333',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#00bf63',
    fontWeight: '600',
  },
  modalSaveButtonDisabled: {
    color: '#CCCCCC',
  },
  modalContent: {
    flex: 1,
  },
  modalMapContainer: {
    height: 300,
  },
  modalMap: {
    width: '100%',
    height: '100%',
  },
  modalForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#333333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  formRowItem: {
    flex: 1,
    marginHorizontal: 5,
  },
  labelButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  labelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  labelButtonActive: {
    borderColor: '#00bf63',
    backgroundColor: '#F0F9F4',
  },
  labelButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  labelButtonTextActive: {
    color: '#00bf63',
    fontWeight: '600',
  },
});


