/**
 * Active Delivery Tracking Screen
 * Shows Google Maps with pharmacy, customer, and rider locations
 * Handles both single orders and batched orders
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Linking,
  Dimensions,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// ❌ REMOVED: import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
// ✅ MapView will be lazy-loaded inside component to avoid import-time native module crash
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../../../customer-app/services/api';
import { uploadProofOfDelivery } from '../../../customer-app/services/cloudinaryService';

// ✅ FIX: Lazy dimensions to prevent import-time crashes
let cachedWidth: number | null = null;
let cachedHeight: number | null = null;

const getScreenWidth = (): number => {
  if (cachedWidth === null) {
    cachedWidth = Dimensions.get('window').width;
  }
  return cachedWidth;
};

const getScreenHeight = (): number => {
  if (cachedHeight === null) {
    cachedHeight = Dimensions.get('window').height;
  }
  return cachedHeight;
};

// Custom Map Style - Clean minimal design
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

interface DeliveryOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  delivery_address: {
    street_address: string;
    barangay: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  earnings: number;
  is_delivered: boolean;
}

interface DeliveryData {
  assignment_id: string;
  is_batch: boolean;
  orders_count: number;
  total_earnings: number;
  pharmacy: {
    name: string;
    phone?: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  orders: DeliveryOrder[];
  all_picked_up: boolean;
}

export default function ActiveDeliveryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const mapRef = useRef<any>(null); // Changed from MapView to any due to lazy loading

  // ✅ Lazy-load MapView components - CRITICAL: wrap in try-catch and delay
  const [MapComponents, setMapComponents] = React.useState<any>(null);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      (async () => {
        try {
          const maps = await import('react-native-maps');
          setMapComponents({
            MapView: maps.default,
            Marker: maps.Marker,
            Polyline: maps.Polyline,
            PROVIDER_GOOGLE: maps.PROVIDER_GOOGLE,
          });
          console.log('✅ Maps loaded successfully in rider app');
        } catch (error) {
          console.error('❌ Failed to load react-native-maps in rider app:', error);
        }
      })();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Destructure after loading (with fallbacks)
  const MapView = MapComponents?.MapView;
  const Marker = MapComponents?.Marker;
  const Polyline = MapComponents?.Polyline;
  const PROVIDER_GOOGLE = MapComponents?.PROVIDER_GOOGLE;

  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [riderLocation, setRiderLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [allPickedUp, setAllPickedUp] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<{latitude: number; longitude: number}[]>([]);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deliveredOrderEarnings, setDeliveredOrderEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [allDelivered, setAllDelivered] = useState(false);

  const fetchDeliveryData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('📦 Fetching assignment details for ID:', id);
      
      // Fetch real assignment data from backend
      const response = await (apiService as any).makeDirectRequest(`/assignment/${id}/`, {
        method: 'GET',
      });
      
      console.log('📦 Assignment response:', response);
      
      if (!(response as any).success) {
        Alert.alert('Error', 'Failed to load delivery details');
        setLoading(false);
        return;
      }
      
      const responseData = (response as any);
      const backendData = responseData.data || {}; // Extract nested data from makeDirectRequest wrapper
      
      console.log('📦 Backend data extracted:', {
        hasAssignment: !!backendData.assignment,
        hasPharmacy: !!backendData.pharmacy,
        ordersCount: backendData.orders?.length || 0,
      });
      
      // Validate required data exists
      if (!backendData.assignment || !backendData.pharmacy || !backendData.orders) {
        console.error('❌ Missing required data in response:', backendData);
        Alert.alert('Error', 'Incomplete delivery data received. Please try again.');
        setLoading(false);
        return;
      }
      
      // Validate pharmacy has valid coordinates
      if (!backendData.pharmacy.latitude || !backendData.pharmacy.longitude) {
        console.error('❌ Pharmacy missing coordinates');
        Alert.alert('Error', 'Pharmacy location not available. Cannot display map.');
        setLoading(false);
        return;
      }
      
      // Transform backend data to match our interface
      const deliveryInfo: DeliveryData = {
        assignment_id: backendData.assignment.assignment_id,
        is_batch: backendData.assignment.is_batch,
        orders_count: backendData.assignment.orders_count,
        total_earnings: backendData.assignment.total_earnings,
        pharmacy: backendData.pharmacy,
        orders: backendData.orders,
        all_picked_up: backendData.assignment.all_picked_up,
      };
      
      setDeliveryData(deliveryInfo);
      setAllPickedUp(deliveryInfo.all_picked_up);
      setLoading(false);
      
      console.log('✅ Assignment loaded:', deliveryInfo.assignment_id);

      // Fit map to show all markers (including rider location if available)
      if (mapRef.current && backendData.pharmacy.latitude && backendData.pharmacy.longitude) {
        const coordinates = [
          { latitude: backendData.pharmacy.latitude, longitude: backendData.pharmacy.longitude },
          ...backendData.orders
            .filter((o: any) => o.delivery_address.latitude && o.delivery_address.longitude)
            .map((o: any) => ({ 
              latitude: o.delivery_address.latitude, 
              longitude: o.delivery_address.longitude 
            })),
        ];

        // Add rider location if available
        if (riderLocation) {
          coordinates.push(riderLocation);
        }

        if (coordinates.length > 0) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(coordinates, {
              edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
              animated: true,
            });
          }, 800);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching delivery data:', error);
      Alert.alert('Error', 'Failed to load delivery details. Please try again.');
      setLoading(false);
    }
  }, [id, riderLocation, mapRef]);

  // Fetch delivery data
  useEffect(() => {
    fetchDeliveryData();
  }, [id, fetchDeliveryData]);

  // Start location tracking
  useEffect(() => {
    startLocationTracking();
  }, []);

  // Decode Google Maps polyline
  const decodePolyline = (encoded: string): {latitude: number; longitude: number}[] => {
    const points: {latitude: number; longitude: number}[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  // Fetch route from Google Maps Directions API
  const fetchRoute = React.useCallback(async () => {
    if (!deliveryData || !riderLocation) {
      console.log('⏭️ Skipping route fetch - missing data');
      return;
    }

    try {
      console.log('🗺️ Fetching route from Google Maps...');
      
      // Build waypoints: Rider -> Pharmacy -> Customers
      const waypoints = [
        `${riderLocation.latitude},${riderLocation.longitude}`,
        `${deliveryData.pharmacy.latitude},${deliveryData.pharmacy.longitude}`,
        ...deliveryData.orders
          .filter(o => o.delivery_address.latitude && o.delivery_address.longitude)
          .map(o => `${o.delivery_address.latitude},${o.delivery_address.longitude}`)
      ];

      console.log('📍 Waypoints:', waypoints);

      if (waypoints.length < 2) {
        console.log('⚠️ Not enough waypoints for route');
        return;
      }

      const origin = waypoints[0];
      const destination = waypoints[waypoints.length - 1];
      const waypointsParam = waypoints.slice(1, -1).join('|');

      const apiKey = 'AIzaSyCCuDLJMhB-23kQiXYpXwi-yYGvKz7OgSQ'; // Correct API key from app.json
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsParam ? `&waypoints=${waypointsParam}` : ''}&key=${apiKey}`;

      console.log('🌐 API URL:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('📡 API Response status:', data.status);

      if (data.error_message) {
        console.error('❌ Google Maps API Error:', data.error_message);
        console.warn('⚠️ Falling back to straight-line route');
        
        // Fallback: Use straight lines if API fails
        const fallbackRoute = waypoints.map(wp => {
          const [lat, lng] = wp.split(',');
          return { latitude: parseFloat(lat), longitude: parseFloat(lng) };
        });
        setRouteCoordinates(fallbackRoute);
        console.log('✅ Using fallback straight-line route:', fallbackRoute.length, 'points');
        return;
      }

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = decodePolyline(route.overview_polyline.points);
        setRouteCoordinates(points);
        console.log('✅ Route fetched successfully:', points.length, 'points');
      } else {
        console.warn('⚠️ No routes found in response');
        
        // Fallback: Use straight lines
        const fallbackRoute = waypoints.map(wp => {
          const [lat, lng] = wp.split(',');
          return { latitude: parseFloat(lat), longitude: parseFloat(lng) };
        });
        setRouteCoordinates(fallbackRoute);
        console.log('✅ Using fallback straight-line route:', fallbackRoute.length, 'points');
      }
    } catch (error) {
      console.error('❌ Error fetching route:', error);
      
      // Fallback on error: Use straight lines
      const waypoints = [
        `${riderLocation.latitude},${riderLocation.longitude}`,
        `${deliveryData.pharmacy.latitude},${deliveryData.pharmacy.longitude}`,
        ...deliveryData.orders
          .filter(o => o.delivery_address.latitude && o.delivery_address.longitude)
          .map(o => `${o.delivery_address.latitude},${o.delivery_address.longitude}`)
      ];
      
      const fallbackRoute = waypoints.map(wp => {
        const [lat, lng] = wp.split(',');
        return { latitude: parseFloat(lat), longitude: parseFloat(lng) };
      });
      setRouteCoordinates(fallbackRoute);
      console.log('✅ Using fallback straight-line route after error:', fallbackRoute.length, 'points');
    }
  }, [deliveryData, riderLocation]);

  // Fetch route when rider location or delivery data changes
  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  // Debug: Log when route coordinates change
  useEffect(() => {
    console.log('🛣️ Route coordinates updated. Count:', routeCoordinates.length);
    if (routeCoordinates.length > 0) {
      console.log('✅ Route line should now be visible on map');
    }
  }, [routeCoordinates]);

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for deliveries.');
        return;
      }

      // Get initial location
      const location = await Location.getCurrentPositionAsync({});
      setRiderLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Update location every 10 seconds
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // 10 seconds
          distanceInterval: 10, // 10 meters
        },
        (newLocation) => {
          setRiderLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          });

          // TODO: Send location to backend
          console.log('📍 Rider location updated:', newLocation.coords);
        }
      );

      // Cleanup on unmount
      return () => {
        locationSubscription.remove();
      };
    } catch (error) {
      console.error('Error tracking location:', error);
    }
  };

  const handleNavigateToPickup = () => {
    if (!deliveryData) return;

    const { latitude, longitude } = deliveryData.pharmacy;
    
    if (!latitude || !longitude) {
      Alert.alert('Error', 'Pharmacy location not available');
      return;
    }

    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${deliveryData.pharmacy.name})`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Failed to open maps');
      });
    }
  };

  const handleNavigateToDelivery = (order: DeliveryOrder) => {
    const { latitude, longitude } = order.delivery_address;
    
    if (!latitude || !longitude) {
      Alert.alert('Error', 'Delivery location not available');
      return;
    }

    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${order.customer_name})`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Failed to open maps');
      });
    }
  };

  const handleCallPhone = (phone?: string) => {
    if (!phone) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }

    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Failed to initiate call');
    });
  };

  const handleMarkPickedUp = async () => {
    if (!deliveryData) return;

    Alert.alert(
      'Mark as Picked Up?',
      deliveryData.is_batch 
        ? `Confirm you have picked up all ${deliveryData.orders_count} orders from ${deliveryData.pharmacy.name}`
        : 'Confirm you have picked up this order',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              // Call backend API to update status
              const response = await (apiService as any).makeDirectRequest(
                `/assignment/${id}/mark-picked-up/`,
                {
                  method: 'POST',
                }
              );

              console.log('📦 Mark picked up response:', response);

              if ((response as any).success) {
                // Update local state
                setAllPickedUp(true);
                
                // Refresh delivery data to get updated statuses
                await fetchDeliveryData();
              } else {
                Alert.alert('Error', (response as any).error || 'Failed to mark as picked up');
              }
            } catch (error) {
              console.error('❌ Error marking as picked up:', error);
              Alert.alert('Error', 'Failed to mark as picked up. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleMarkDelivered = async (order: DeliveryOrder) => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take proof of delivery photo.');
        return;
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const photoUri = result.assets[0].uri;
      
      setUploadingProof(true);

      try {
        // Upload to Cloudinary
        console.log('📸 Uploading proof of delivery...');
        const uploadResult = await uploadProofOfDelivery(photoUri);

        if (!uploadResult.success || !uploadResult.url) {
          Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload proof photo. Please try again.');
          setUploadingProof(false);
          return;
        }

        console.log('✅ Proof uploaded:', uploadResult.url);

        // Call backend to mark as delivered
        const response = await (apiService as any).makeDirectRequest(
          `/assignment/${id}/order/${order.id}/mark-delivered/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              proof_of_delivery_url: uploadResult.url,
            }),
          }
        );

        console.log('📦 Mark delivered response:', response);

        if ((response as any).success) {
          const responseData = (response as any).data || response;
          
          // Store earnings data
          setDeliveredOrderEarnings(responseData.order_earnings || 0);
          setTotalEarnings(responseData.total_earnings || 0);
          setAllDelivered(responseData.all_delivered || false);
          
          // Refresh delivery data
          await fetchDeliveryData();
          
          // Show success modal
          setShowSuccessModal(true);
        } else {
          Alert.alert('Error', (response as any).error || 'Failed to mark as delivered');
        }
      } catch (error) {
        console.error('❌ Error in delivery process:', error);
        Alert.alert('Error', 'Failed to complete delivery. Please try again.');
      } finally {
        setUploadingProof(false);
      }
    } catch (error) {
      console.error('❌ Error launching camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  if (loading || !deliveryData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading delivery details...</Text>
      </View>
    );
  }

  const remainingDeliveries = deliveryData.orders.filter(o => !o.is_delivered);

  return (
    <View style={styles.container}>
      {/* Map - Only render when MapView is loaded */}
      {MapView && (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={customMapStyle}
        initialRegion={{
          latitude: riderLocation?.latitude || deliveryData.pharmacy.latitude,
          longitude: riderLocation?.longitude || deliveryData.pharmacy.longitude,
          latitudeDelta: 0.01,  // Closer zoom
          longitudeDelta: 0.01,
        }}
      >
        {/* Route Polyline - Following actual roads */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#00BF63"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}

        <Marker
          coordinate={{
            latitude: deliveryData.pharmacy.latitude,
            longitude: deliveryData.pharmacy.longitude,
          }}
          title={deliveryData.pharmacy.name}
          description="Pickup Location"
          anchor={{ x: 0.5, y: 1 }}
        >
          <Image
            source={require('../../assets/PharmacyCustomMarker.png')}
            style={styles.markerImage}
            resizeMode="contain"
          />
        </Marker>

        {deliveryData.orders
          .filter(order => order.delivery_address.latitude && order.delivery_address.longitude)
          .map((order, index) => (
          <Marker
            key={order.id}
            coordinate={{
              latitude: order.delivery_address.latitude,
              longitude: order.delivery_address.longitude,
            }}
            title={order.customer_name}
            description={order.delivery_address.street_address}
            anchor={{ x: 0.5, y: 1 }}
          >
                <View style={styles.markerImageContainer}>
                  <Image
                    source={require('../../assets/CustomerCustomMarker.png')}
                    style={[
                      styles.markerImage,
                      order.is_delivered && styles.deliveredMarker,
                    ]}
                    resizeMode="contain"
                  />
                  {deliveryData.is_batch && (
                    <View style={styles.markerBadge}>
                      <Text style={styles.markerBadgeText}>{index + 1}</Text>
                    </View>
                  )}
                </View>
          </Marker>
        ))}

        {riderLocation && (
          <Marker
            coordinate={riderLocation}
            title="You"
            description="Your current location"
            anchor={{ x: 0.5, y: 1 }}
          >
            <Image
              source={require('../../assets/RiderCustomMarker.png')}
              style={styles.markerImage}
              resizeMode="contain"
            />
          </Marker>
        )}
      </MapView>
      )}
      
      {/* Placeholder if maps not loaded */}
      {!MapView && (
        <View style={[styles.map, { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#00BF63" />
          <Text style={{ marginTop: 12, color: '#666666' }}>Loading map...</Text>
        </View>
      )}

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                {deliveryData.is_batch 
                  ? `Batch Delivery (${deliveryData.orders_count} Orders)`
                  : 'Single Delivery'}
              </Text>
              <Text style={styles.headerSubtitle}>
                Assignment ID: {deliveryData.assignment_id}
              </Text>
            </View>
            <View style={styles.earningsBox}>
              <Text style={styles.earningsLabel}>You&apos;ll Earn</Text>
              <Text style={styles.earningsAmount}>₱{deliveryData.total_earnings.toFixed(2)}</Text>
            </View>
          </View>

          {/* Pickup Section */}
          {!allPickedUp && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="medkit" size={20} color="#00BF63" />
                <Text style={styles.sectionTitle}>Pickup Location</Text>
              </View>
              <Text style={styles.pharmacyName}>{deliveryData.pharmacy.name}</Text>
              <Text style={styles.address}>{deliveryData.pharmacy.address}</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleNavigateToPickup}
                >
                  <Ionicons name="navigate" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Navigate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => handleCallPhone(deliveryData.pharmacy.phone)}
                >
                  <Ionicons name="call" size={20} color="#00BF63" />
                  <Text style={styles.secondaryButtonText}>Call</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.completeButton}
                onPress={handleMarkPickedUp}
              >
                <Text style={styles.completeButtonText}>
                  ✓ Mark as Picked Up
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Deliveries Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color="#FF6B35" />
              <Text style={styles.sectionTitle}>
                {allPickedUp ? 'Deliver Orders' : 'Delivery Locations'}
              </Text>
            </View>

            {deliveryData.orders.map((order, index) => (
              <View
                key={order.id}
                style={[
                  styles.deliveryCard,
                  order.is_delivered && styles.deliveryCardDelivered
                ]}
              >
                <View style={styles.deliveryHeader}>
                  <View style={styles.deliveryNumber}>
                    <Text style={styles.deliveryNumberText}>
                      {deliveryData.is_batch ? index + 1 : ''}
                    </Text>
                  </View>
                  <View style={styles.deliveryInfo}>
                    <Text style={styles.customerName}>
                      {order.customer_name}
                      {order.is_delivered && ' ✓'}
                    </Text>
                    <Text style={styles.orderNumber}>{order.order_number}</Text>
                    <Text style={styles.address}>
                      {order.delivery_address.street_address}, {order.delivery_address.barangay}
                    </Text>
                  </View>
                  <Text style={styles.orderEarnings}>₱{order.earnings.toFixed(2)}</Text>
                </View>

                {allPickedUp && !order.is_delivered && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => handleNavigateToDelivery(order)}
                    >
                      <Ionicons name="navigate" size={20} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Navigate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleCallPhone(order.customer_phone)}
                    >
                      <Ionicons name="call" size={20} color="#00BF63" />
                      <Text style={styles.secondaryButtonText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deliverButton}
                      onPress={() => handleMarkDelivered(order)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {remainingDeliveries.length > 0 && allPickedUp && (
              <Text style={styles.remainingText}>
                {remainingDeliveries.length} {remainingDeliveries.length === 1 ? 'delivery' : 'deliveries'} remaining
              </Text>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Uploading Proof Overlay */}
      {uploadingProof && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadOverlayContent}>
            <ActivityIndicator size="large" color="#00BF63" />
            <Text style={styles.uploadOverlayText}>Uploading proof of delivery...</Text>
          </View>
        </View>
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#00BF63" />
            </View>
            
            <Text style={styles.successTitle}>Delivery Complete! 🎉</Text>
            
            <View style={styles.earningsContainer}>
              <Text style={styles.earningsLabelModal}>You Earned</Text>
              <Text style={styles.earningsValue}>₱{deliveredOrderEarnings.toFixed(2)}</Text>
            </View>

            {!allDelivered && (
              <View style={styles.remainingOrdersContainer}>
                <Ionicons name="information-circle" size={20} color="#666666" />
                <Text style={styles.remainingOrdersText}>
                  You have more orders to deliver
                </Text>
              </View>
            )}

            {allDelivered && (
              <View style={styles.totalEarningsContainer}>
                <Text style={styles.totalEarningsLabel}>Total Earnings for this batch</Text>
                <Text style={styles.totalEarningsValue}>₱{totalEarnings.toFixed(2)}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.moreOrdersButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.push('/home');
              }}
            >
              <Text style={styles.moreOrdersButtonText}>More Orders</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ✅ FIX: Lazy stylesheet with Proxy for transparent access
const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: getScreenWidth(),
    height: getScreenHeight() * 0.5,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#00BF63',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  markerImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    position: 'relative',
  },
  markerImage: {
    width: 40,
    height: 40,
  },
  deliveredMarker: {
    opacity: 0.55,
  },
  markerBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#00BF63',
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    marginTop: -20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  earningsBox: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  earningsLabel: {
    fontSize: 10,
    color: '#666666',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00BF63',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BF63',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#00BF63',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#00BF63',
    fontWeight: '600',
    fontSize: 14,
  },
  deliverButton: {
    backgroundColor: '#00BF63',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#00BF63',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  deliveryCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deliveryCardDelivered: {
    backgroundColor: '#E0E0E0',
    opacity: 0.6,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deliveryNumber: {
    backgroundColor: '#FF6B35',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deliveryNumberText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  deliveryInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  orderEarnings: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00BF63',
  },
  remainingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  // Upload Overlay Styles
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadOverlayContent: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
  },
  uploadOverlayText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: getScreenWidth() * 0.85,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
    textAlign: 'center',
  },
  earningsContainer: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  earningsLabelModal: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  earningsValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#00BF63',
  },
  remainingOrdersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  remainingOrdersText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
  },
  totalEarningsContainer: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  totalEarningsLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  totalEarningsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B35',
  },
  moreOrdersButton: {
    backgroundColor: '#00BF63',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  moreOrdersButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

// ✅ FIX: Proxy wrapper for lazy style initialization
const styles = new Proxy({} as ReturnType<typeof getStyles>, {
  get: (target, prop) => {
    const styleSheet = getStyles();
    return styleSheet[prop as keyof typeof styleSheet];
  }
});

