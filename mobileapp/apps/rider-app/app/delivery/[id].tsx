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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { apiService } from '../../../customer-app/services/api';

const { width, height } = Dimensions.get('window');

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
  const mapRef = useRef<MapView>(null);

  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [riderLocation, setRiderLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [allPickedUp, setAllPickedUp] = useState(false);

  // Fetch delivery data
  useEffect(() => {
    fetchDeliveryData();
  }, [id]);

  // Start location tracking
  useEffect(() => {
    startLocationTracking();
  }, []);

  const fetchDeliveryData = async () => {
    try {
      setLoading(true);
      
      console.log('📦 Fetching assignment details for ID:', id);
      
      // Fetch real assignment data from backend
      const response = await apiService.makeDirectRequest(`/assignment/${id}/`, {
        method: 'GET',
      });
      
      console.log('📦 Assignment response:', response);
      
      if (!(response as any).success) {
        Alert.alert('Error', 'Failed to load delivery details');
        setLoading(false);
        return;
      }
      
      const data = (response as any);
      
      // Transform backend data to match our interface
      const deliveryInfo: DeliveryData = {
        assignment_id: data.assignment.assignment_id,
        is_batch: data.assignment.is_batch,
        orders_count: data.assignment.orders_count,
        total_earnings: data.assignment.total_earnings,
        pharmacy: data.pharmacy,
        orders: data.orders,
        all_picked_up: data.assignment.all_picked_up,
      };
      
      setDeliveryData(deliveryInfo);
      setAllPickedUp(deliveryInfo.all_picked_up);
      setLoading(false);
      
      console.log('✅ Assignment loaded:', deliveryInfo.assignment_id);

      // Fit map to show all markers
      if (mapRef.current && data.pharmacy.latitude && data.pharmacy.longitude) {
        const coordinates = [
          { latitude: data.pharmacy.latitude, longitude: data.pharmacy.longitude },
          ...data.orders
            .filter((o: any) => o.delivery_address.latitude && o.delivery_address.longitude)
            .map((o: any) => ({ 
              latitude: o.delivery_address.latitude, 
              longitude: o.delivery_address.longitude 
            })),
        ];

        if (coordinates.length > 0) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(coordinates, {
              edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
              animated: true,
            });
          }, 500);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching delivery data:', error);
      Alert.alert('Error', 'Failed to load delivery details. Please try again.');
      setLoading(false);
    }
  };

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

  const handleMarkPickedUp = () => {
    Alert.alert(
      'Mark as Picked Up?',
      deliveryData?.is_batch 
        ? `Confirm you have picked up all ${deliveryData.orders_count} orders from ${deliveryData.pharmacy.name}`
        : 'Confirm you have picked up this order',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setAllPickedUp(true);
            Alert.alert('Success', 'Orders marked as picked up. You can now deliver to customers.');
            // TODO: Call backend API to update status
          },
        },
      ]
    );
  };

  const handleMarkDelivered = (order: DeliveryOrder) => {
    Alert.alert(
      'Mark as Delivered?',
      `Confirm delivery to ${order.customer_name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            // Update local state
            const updatedOrders = deliveryData?.orders.map(o =>
              o.id === order.id ? { ...o, is_delivered: true } : o
            );

            if (updatedOrders && deliveryData) {
              setDeliveryData({
                ...deliveryData,
                orders: updatedOrders,
              });

              // Check if all delivered
              const allDelivered = updatedOrders.every(o => o.is_delivered);
              if (allDelivered) {
                Alert.alert(
                  'All Delivered! 🎉',
                  `You earned ₱${deliveryData.total_earnings.toFixed(2)}!`,
                  [
                    {
                      text: 'Done',
                      onPress: () => router.push('/home'),
                    },
                  ]
                );
              } else {
                Alert.alert('Success', `Order delivered to ${order.customer_name}`);
              }
            }

            // TODO: Call backend API to update status
          },
        },
      ]
    );
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
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: deliveryData.pharmacy.latitude,
          longitude: deliveryData.pharmacy.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Pharmacy Marker (Pickup) */}
        <Marker
          coordinate={{
            latitude: deliveryData.pharmacy.latitude,
            longitude: deliveryData.pharmacy.longitude,
          }}
          title={deliveryData.pharmacy.name}
          description="Pickup Location"
          pinColor="green"
        >
          <View style={styles.pharmacyMarker}>
            <Ionicons name="medkit" size={24} color="#FFFFFF" />
          </View>
        </Marker>

        {/* Customer Markers (Delivery) */}
        {deliveryData.orders.map((order, index) => (
          <Marker
            key={order.id}
            coordinate={{
              latitude: order.delivery_address.latitude,
              longitude: order.delivery_address.longitude,
            }}
            title={order.customer_name}
            description={order.delivery_address.street_address}
            pinColor={order.is_delivered ? "gray" : "red"}
          >
            <View style={[
              styles.customerMarker,
              order.is_delivered && styles.customerMarkerDelivered
            ]}>
              <Text style={styles.customerMarkerText}>
                {deliveryData.is_batch ? index + 1 : ''}
              </Text>
              <Ionicons name={order.is_delivered ? "checkmark-circle" : "location"} size={20} color="#FFFFFF" />
            </View>
          </Marker>
        ))}

        {/* Rider Marker (Current Location) */}
        {riderLocation && (
          <Marker
            coordinate={riderLocation}
            title="You"
            description="Your current location"
          >
            <View style={styles.riderMarker}>
              <Ionicons name="bicycle" size={24} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </MapView>

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
              <Text style={styles.earningsLabel}>You'll Earn</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    width: width,
    height: height * 0.5,
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
  pharmacyMarker: {
    backgroundColor: '#00BF63',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  customerMarker: {
    backgroundColor: '#FF6B35',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  customerMarkerDelivered: {
    backgroundColor: '#999999',
  },
  customerMarkerText: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    color: '#FF6B35',
    fontWeight: '700',
    fontSize: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  riderMarker: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
});

