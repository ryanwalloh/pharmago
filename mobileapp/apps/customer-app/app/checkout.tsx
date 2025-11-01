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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useStripe } from '@stripe/stripe-react-native';
import { fontFamily } from '../utils/fonts';
import { apiService } from '../services/api';

// Back Arrow Icon
const BackArrowIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M20,11H7.83l5.59-5.59L12,4l-8,8l8,8l1.41-1.41L7.83,13H20V11z"
      fill={color}
    />
  </Svg>
);

// Payment Method Icons using custom assets
const CardIcon = () => (
  <Image source={require('../assets/card2.png')} style={styles.paymentIcon} resizeMode="contain" />
);

const BankTransferIcon = () => (
  <Image source={require('../assets/bank.png')} style={styles.paymentIcon} resizeMode="contain" />
);

const PayPalIcon = () => (
  <Image source={require('../assets/paypal.png')} style={styles.paymentIcon} resizeMode="contain" />
);

const CODIcon = () => (
  <Image source={require('../assets/cod.png')} style={styles.paymentIcon} resizeMode="contain" />
);

// Custom Map Style - Clean, minimal design
const customMapStyle = [
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.neighborhood",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.business",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  }
];

export default function CheckoutScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod');
  const [userLocation, setUserLocation] = useState<any>(null);
  const [address, setAddress] = useState<string>('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentIntentClientSecret, setPaymentIntentClientSecret] = useState<string | null>(null);

  // Small Order Fee - matches backend default
  const BASE_SERVICE_FEE = 19.00;

  // Payment method expansion state
  const [paymentMethodExpanded, setPaymentMethodExpanded] = useState(false);

  // Check if senior discount is pending
  const hasPendingSeniorDiscount = orderData?.apply_senior_discount && orderData?.senior_id_image_url;

  // Get payment method display name
  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'card': return 'Card (Visa, Mastercard, etc.)';
      case 'bank_transfer': return 'Bank Transfer';
      case 'paypal': return 'PayPal';
      case 'cod': return 'Cash on Delivery';
      default: return 'Cash on Delivery';
    }
  };

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
        latitudeDelta: 0.002,  // Tight zoom on customer address (smaller = more zoom)
        longitudeDelta: 0.002, // Tight zoom on customer address (smaller = more zoom)
      });
      setSelectedLocation(userLocation);
    }
    setShowAddressModal(true);
  };

  // Handle map region change (when user pans the map)
  const handleRegionChangeComplete = async (region: Region) => {
    // Update map region state
    setMapRegion(region);
    
    // Update selected location to map center
    const centerLocation = {
      latitude: region.latitude,
      longitude: region.longitude,
    };
    setSelectedLocation(centerLocation);
    
    console.log('📍 Location updated:', centerLocation);
    
    // Reverse geocode to get address details
    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude,
      });

      if (geocode.length > 0) {
        const addr = geocode[0];
        setAddressForm(prev => ({
          ...prev,
          street_address: `${addr.street || ''} ${addr.name || ''}`.trim(),
          barangay: addr.district || addr.subregion || '',
        }));
        console.log('📍 Address updated:', addr.street, addr.district);
      }
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
    }
  };

  const initializeStripePaymentSheet = async (orderId: number) => {
    try {
      console.log('💳 Initializing Stripe payment sheet for order:', orderId);
      
      // Get user data from AsyncStorage for billing details
      const userData = await AsyncStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      
      // Create payment intent on backend
      const response = await apiService.createStripePaymentIntent(orderId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create payment intent');
      }
      
      // Extract payment intent data (handle nested response structure)
      const paymentData = response.data.data || response.data;
      const { client_secret, amount } = paymentData;
      
      if (!client_secret) {
        throw new Error('No client secret received from backend');
      }
      
      setPaymentIntentClientSecret(client_secret);
      
      console.log('✅ Payment intent created:', { amount, client_secret: client_secret.substring(0, 20) + '...' });
      
      // Prepare billing details with customer information
      const deliveryInfo = orderData?.deliveryInfo || {};
      const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Customer';
      
      // Initialize payment sheet with pre-filled billing details
      const { error } = await initPaymentSheet({
        merchantDisplayName: 'PharmGo',
        paymentIntentClientSecret: client_secret,
        defaultBillingDetails: {
          name: customerName || 'Customer',
          email: user?.email || undefined,
          phone: user?.phone || undefined,
          address: {
            country: 'PH', // Philippines
            city: deliveryInfo?.city || 'Iligan City',
            postalCode: deliveryInfo?.postal_code || undefined,
            line1: deliveryInfo?.street_address || address || undefined,
            state: deliveryInfo?.province || 'Lanao del Norte',
          },
        },
        returnURL: 'mobileapp://checkout',
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      console.log('✅ Payment sheet initialized with billing details');
      return true;
    } catch (error: any) {
      console.error('❌ Error initializing payment sheet:', error);
      Alert.alert('Payment Error', error.message || 'Failed to initialize payment');
      return false;
    }
  };

  const handleStripePayment = async (orderId: number) => {
    try {
      console.log('💳 Presenting Stripe payment sheet');
      
      // Small delay to ensure payment sheet is ready (helps with StripeKeepJsAwakeTask warning)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Present payment sheet
      const { error } = await presentPaymentSheet();
      
      if (error) {
        if (error.code === 'Canceled') {
          console.log('ℹ️ Payment canceled by user');
          return false;
        }
        console.error('❌ presentPaymentSheet error:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ Payment completed successfully');
      
      // Confirm payment on backend
      if (paymentIntentClientSecret) {
        // Extract payment_intent_id from client_secret (format: pi_xxx_secret_yyy)
        const paymentIntentId = paymentIntentClientSecret.split('_secret_')[0];
        const confirmResponse = await apiService.confirmStripePayment(orderId, paymentIntentId);
        
        if (!confirmResponse.success) {
          throw new Error(confirmResponse.error || 'Failed to confirm payment');
        }
        
        console.log('✅ Payment confirmed on backend');
      }
      
      return true;
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Payment could not be completed');
      return false;
    }
  };

  const handleSaveAddress = async () => {
    if (!selectedLocation || !addressForm.street_address || !addressForm.barangay) {
      Alert.alert('Missing Information', 'Please select a location on the map and fill in the required fields.');
      return;
    }

    setSavingAddress(true);
    try {
      // Get customer ID from AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        Alert.alert('Error', 'User not found. Please log in again.');
        setSavingAddress(false);
        return;
      }
      
      const user = JSON.parse(userData);
      console.log('👤 User data from AsyncStorage:', user);
      
      // Try multiple possible field names for customer ID
      const customerId = user.customer_id || user.id || user.user_id || user.customer?.id;
      
      console.log('🔍 Customer ID found:', customerId);
      
      if (!customerId) {
        console.error('❌ No customer ID found in user data:', user);
        Alert.alert(
          'Setup Required',
          'Please complete your profile setup first. Your customer ID could not be found.',
          [{ text: 'OK' }]
        );
        setSavingAddress(false);
        return;
      }

      // Prepare address data for API
      const addressData = {
        customer_id: customerId,
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

      console.log('📍 Saving address to database:', addressData);

      // Call API to save address to database
      const response = await apiService.createOrUpdateAddress(addressData);
      
      if (response.success) {
        console.log('✅ Address saved successfully to database:', response.data);
        
        // Update local state with saved address
        setUserLocation(selectedLocation);
        setAddress(`${addressForm.street_address}, ${addressForm.barangay}, Iligan City, Lanao del Norte`);
        
        // Close modal
        setShowAddressModal(false);
      } else {
        throw new Error(response.error || 'Failed to save address');
      }
    } catch (error: any) {
      console.error('❌ Failed to save address:', error);
      Alert.alert(
        'Error', 
        `Failed to save address: ${error.message || 'Please try again.'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!orderData) {
      Alert.alert('Error', 'Order data not found. Please try again.');
      return;
    }

    if (!userLocation) {
      Alert.alert('Error', 'Delivery location not found. Please enable location services.');
      return;
    }

    setPlacingOrder(true);
    try {
      // Get customer ID from AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        Alert.alert('Error', 'User not found. Please log in again.');
        setPlacingOrder(false);
        return;
      }
      
      const user = JSON.parse(userData);
      const customerId = user.customer_id || user.id || user.user_id;
      
      if (!customerId) {
        Alert.alert('Error', 'Customer ID not found. Please log in again.');
        setPlacingOrder(false);
        return;
      }

      // Get or create delivery address
      let addressId = null;
      
      // Try to get existing address
      const addressResponse = await apiService.getCustomerAddresses(customerId);
      if (addressResponse.success && addressResponse.data?.addresses?.length > 0) {
        // Use default address or first address
        const defaultAddress = addressResponse.data.addresses.find((addr: any) => addr.is_default);
        addressId = defaultAddress?.id || addressResponse.data.addresses[0].id;
        console.log('📍 Using existing address ID:', addressId);
      } else {
        // Create new address if none exists
        const newAddressData = {
          customer_id: customerId,
          label: 'home',
          street_address: address || 'Address not set',
          barangay: 'Default Barangay',
          city: 'Iligan City',
          province: 'Lanao del Norte',
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          is_default: true,
        };
        
        const createAddressResponse = await apiService.createOrUpdateAddress(newAddressData);
        if (createAddressResponse.success && createAddressResponse.data?.address) {
          addressId = createAddressResponse.data.address.id;
          console.log('📍 Created new address ID:', addressId);
        } else {
          throw new Error('Failed to create delivery address');
        }
      }

      // Parse pharmacy and cart items
      const pharmacy = typeof orderData.pharmacy === 'string' 
        ? JSON.parse(orderData.pharmacy) 
        : orderData.pharmacy;
      
      const cartItems = typeof orderData.cartItems === 'string'
        ? JSON.parse(orderData.cartItems)
        : orderData.cartItems;

      // Prepare order data for API
      const apiOrderData = {
        customer_id: customerId,
        pharmacy_id: pharmacy.pharmacy_id,
        delivery_address_id: addressId,
        cart_items: cartItems.map((item: any) => ({
          inventory_id: item.inventory_id,
          quantity: item.quantity
        })),
        delivery_fee: orderData.deliveryFee || 0,
        payment_method: selectedPaymentMethod,
        senior_discount_requested: orderData.apply_senior_discount || false,
        senior_id_image_url: orderData.senior_id_image_url || '',
        notes: ''
      };

      console.log('🛒 Creating cart order via API:', apiOrderData);

      // Call API to create order
      const response = await apiService.createCartOrder(apiOrderData);
      
      if (response.success && response.data?.order) {
        const createdOrder = response.data.order;
        console.log('✅ Order created successfully:', createdOrder.order_number);
        
        // Handle Stripe payment for card payment method
        if (selectedPaymentMethod === 'card') {
          console.log('💳 Card payment selected - initializing Stripe payment');
          
          // Initialize Stripe payment sheet
          const initSuccess = await initializeStripePaymentSheet(createdOrder.order_id);
          if (!initSuccess) {
            throw new Error('Failed to initialize payment');
          }
          
          // Present payment sheet and process payment
          const paymentSuccess = await handleStripePayment(createdOrder.order_id);
          if (!paymentSuccess) {
            // Payment was canceled or failed
            Alert.alert(
              'Payment Incomplete',
              'Your order was created but payment was not completed. You can complete payment later.',
              [
                {
                  text: 'View Order',
                  onPress: () => {
                    router.replace(`/order-tracking/${createdOrder.order_id}` as any);
                  }
                }
              ]
            );
            setPlacingOrder(false);
            return;
          }
          
          console.log('✅ Stripe payment completed successfully');
        }
        
        // Clear pending order from storage
        await AsyncStorage.removeItem('pending_order');
        await AsyncStorage.removeItem('temp_cart_items');
        await AsyncStorage.removeItem('temp_cart_pharmacy_id');
        
        // Save order to AsyncStorage for tracking page
        await AsyncStorage.setItem('currentOrder', JSON.stringify(createdOrder));
        console.log('💾 Order saved to AsyncStorage for tracking');
        
        // Navigate to order tracking page
        router.replace(`/order-tracking/${createdOrder.order_id}` as any);
      } else {
        throw new Error(response.error || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('❌ Failed to place order:', error);
      Alert.alert(
        'Error', 
        `Failed to place order: ${error.message || 'Please try again.'}`,
        [{ text: 'OK' }]
      );
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
                  customMapStyle={customMapStyle}
                  initialRegion={{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.002,
                    longitudeDelta: 0.002,
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
                    pinColor="#00bf63"
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <TouchableOpacity onPress={() => setPaymentMethodExpanded(!paymentMethodExpanded)}>
                <Text style={styles.editButton}>{paymentMethodExpanded ? 'Done' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>

            {!paymentMethodExpanded ? (
              // Collapsed view - show only selected method + total
              <View style={styles.paymentSummary}>
                <View style={styles.paymentSummaryLeft}>
                  {selectedPaymentMethod === 'card' && <CardIcon />}
                  {selectedPaymentMethod === 'bank_transfer' && <BankTransferIcon />}
                  {selectedPaymentMethod === 'paypal' && <PayPalIcon />}
                  {selectedPaymentMethod === 'cod' && <CODIcon />}
                  <Text style={styles.paymentSummaryLabel}>{getPaymentMethodName(selectedPaymentMethod)}</Text>
                </View>
                <Text style={styles.paymentSummaryTotal}>₱{orderData?.total?.toFixed(2)}</Text>
              </View>
            ) : (
              // Expanded view - show all payment options
              <View style={styles.paymentMethods}>
                {/* Card */}
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    selectedPaymentMethod === 'card' && styles.paymentOptionActive,
                    hasPendingSeniorDiscount && selectedPaymentMethod !== 'card' && styles.paymentOptionDisabled,
                  ]}
                  onPress={() => {
                    if (!hasPendingSeniorDiscount) {
                      setSelectedPaymentMethod('card');
                    }
                  }}
                  disabled={hasPendingSeniorDiscount && selectedPaymentMethod !== 'card'}
                >
                  <CardIcon />
                  <View style={styles.paymentLabelContainer}>
                    <Text style={[styles.paymentLabel, hasPendingSeniorDiscount && selectedPaymentMethod !== 'card' && styles.paymentLabelDisabled]}>Card (Visa, Mastercard, etc.)</Text>
                    {hasPendingSeniorDiscount && selectedPaymentMethod !== 'card' && (
                      <Text style={styles.paymentRestrictionText}>Not available for pending senior discount</Text>
                    )}
                  </View>
                  <View style={styles.radioOuter}>
                    {selectedPaymentMethod === 'card' && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>

                {/* Bank Transfer - Coming Soon */}
                <View style={[styles.paymentOption, styles.paymentOptionDisabled]}>
                  <BankTransferIcon />
                  <View style={styles.paymentLabelContainer}>
                    <Text style={[styles.paymentLabel, styles.paymentLabelDisabled]}>Bank Transfer</Text>
                  </View>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                </View>

                {/* PayPal - Coming Soon */}
                <View style={[styles.paymentOption, styles.paymentOptionDisabled]}>
                  <PayPalIcon />
                  <View style={styles.paymentLabelContainer}>
                    <Text style={[styles.paymentLabel, styles.paymentLabelDisabled]}>PayPal</Text>
                  </View>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                </View>

                {/* COD */}
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    selectedPaymentMethod === 'cod' && styles.paymentOptionActive,
                  ]}
                  onPress={() => setSelectedPaymentMethod('cod')}
                >
                  <CODIcon />
                  <View style={styles.paymentLabelContainer}>
                    <Text style={styles.paymentLabel}>Cash on Delivery</Text>
                    {hasPendingSeniorDiscount && (
                      <Text style={styles.paymentAvailableText}>✓ Available for senior discount</Text>
                    )}
                  </View>
                  <View style={styles.radioOuter}>
                    {selectedPaymentMethod === 'cod' && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Order Summary Container */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>

            <View style={styles.summaryContent}>
              {/* Medicine Items List */}
              {orderData?.cartItems && orderData.cartItems.length > 0 && (
                <>
                  {orderData.cartItems.map((item: any, index: number) => (
                    <View key={index} style={styles.medicineItemRow}>
                      <Text style={styles.medicineItemText}>
                        {item.quantity}x {item.name}
                      </Text>
                      <Text style={styles.medicineItemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={styles.separatorLine} />
                </>
              )}

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
                <Text style={styles.summaryLabel}>Small Order Fee:</Text>
                <Text style={[styles.summaryValue, orderData.apply_senior_discount && orderData.senior_id_image_url && styles.strikethroughText]}>
                  ₱{BASE_SERVICE_FEE.toFixed(2)}
                </Text>
              </View>

              {orderData.apply_senior_discount && orderData.senior_id_image_url && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, styles.seniorBenefitLabel]}>No order fee for seniors*:</Text>
                  <Text style={[styles.summaryValue, styles.seniorBenefitValue]}>
                    -₱{BASE_SERVICE_FEE.toFixed(2)}
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
              By placing this order, you agree to our <Text style={styles.termsHighlight}>terms of service</Text> and <Text style={styles.termsHighlight}>privacy policy</Text>. 
              Your payment will be processed securely. For Cash on Delivery orders, please 
              have the exact amount ready for our delivery partner. We&apos;re committed to 
              delivering your medicines safely and on time!
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
                <>
                  <MapView
                    style={styles.modalMap}
                    provider={PROVIDER_GOOGLE}
                    region={mapRegion}
                    customMapStyle={customMapStyle}
                    onRegionChangeComplete={handleRegionChangeComplete}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                    zoomEnabled={true}
                    zoomControlEnabled={true}
                    zoomTapEnabled={true}
                    scrollEnabled={true}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    minZoomLevel={10}
                    maxZoomLevel={20}
                  />
                  
                  {/* Fixed center marker overlay */}
                  <View style={styles.centerMarkerContainer}>
                    {/* Shadow circle under pin */}
                    <View style={styles.markerShadow} />
                    
                    {/* Pin icon */}
                    <View style={styles.centerMarker}>
                      <Svg width={40} height={50} viewBox="0 0 40 50">
                        {/* Pin shadow */}
                        <Path
                          d="M20 46 C20 46, 12 38, 12 28 C12 22, 15 18, 20 18 C25 18, 28 22, 28 28 C28 38, 20 46, 20 46"
                          fill="rgba(0,0,0,0.2)"
                        />
                        {/* Pin body */}
                        <Path
                          d="M20 2 C11 2, 4 9, 4 18 C4 28, 20 42, 20 42 C20 42, 36 28, 36 18 C36 9, 29 2, 20 2 Z"
                          fill="#00bf63"
                        />
                        {/* Pin center dot */}
                        <Path
                          d="M20 12 C17 12, 14 15, 14 18 C14 21, 17 24, 20 24 C23 24, 26 21, 26 18 C26 15, 23 12, 20 12 Z"
                          fill="#FFFFFF"
                        />
                      </Svg>
                    </View>
                  </View>
                </>
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
                    { value: 'parent_house', label: 'Parents' },
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
  paymentSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginTop: 15,
  },
  paymentSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentSummaryLabel: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  paymentSummaryTotal: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#00bf63',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentOptionActive: {
    borderColor: '#00bf63',
    backgroundColor: '#F0F9F4',
    
  },
  paymentOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  paymentIcon: {
    width: 50,
    height: 32,
    opacity: 0.7,
  },
  paymentLabelContainer: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  paymentLabelDisabled: {
    color: '#999999',
  },
  paymentRestrictionText: {
    fontSize: 11,
    color: '#FF6B6B',
    marginTop: 2,
    fontStyle: 'italic',
  },
  paymentAvailableText: {
    fontSize: 11,
    color: '#00bf63',
    marginTop: 2,
    fontWeight: '600',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00bf63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: '#00bf63',
  },
  // Order Summary
  summaryContent: {
    marginTop: 15,
  },
  medicineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingVertical: 4,
  },
  medicineItemText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    paddingRight: 10,
  },
  medicineItemPrice: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  separatorLine: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
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
  strikethroughText: {
    textDecorationLine: 'line-through',
    color: '#999999',
  },
  seniorBenefitLabel: {
    color: '#00bf63',
    fontSize: 13,
  },
  seniorBenefitValue: {
    color: '#00bf63',
    fontWeight: '700',
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
    textAlign: 'justify',
  },
  termsHighlight: {
    color: '#00bf63',
    fontWeight: '600',
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
    paddingBottom: 20,
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
    height: 200,
    position: 'relative',
  },
  modalMap: {
    width: '100%',
    height: '100%',
  },
  centerMarkerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMarker: {
    width: 40,
    height: 50,
  },
  markerShadow: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
  // Coming Soon Badge
  comingSoonBadge: {
    backgroundColor: '#FFE0B2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F57C00',
  },
});


