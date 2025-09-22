import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { fontFamily } from '../utils/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OrderData {
  order_id: number;
  order_number: string;
  order_status: string;
  prescription_status: string;
  payment_status: string;
  total_amount: number;
  pharmacy_name: string;
  pharmacy_id?: number;
  pharmacy_barangay?: string;
  pharmacy_latitude?: number;
  pharmacy_longitude?: number;
  pharmacy_phone?: string;
  pharmacy_email?: string;
  pharmacy_storefront_image_url?: string;
  delivery_address: string;
  prescription_image_url: string;
  prescription_notes: string;
  created_at: string;
  updated_at: string;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  notes: string;
}

const OrderTrackingScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 8.2275, // Iligan City default
    longitude: 124.2456,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [customerLocation, setCustomerLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const mapInitialized = useRef(false);

  const getCustomerLocation = async () => {
    try {
      // For now, we'll use a default location in Iligan City
      // In a real app, you'd use expo-location to get the user's current location
      setCustomerLocation({
        latitude: 8.2275,
        longitude: 124.2456,
      });
    } catch (error) {
      console.error('Error getting customer location:', error);
    }
  };

  const updateMapRegion = (pharmacyLat: number, pharmacyLng: number, customerLat: number, customerLng: number) => {
    const minLat = Math.min(pharmacyLat, customerLat);
    const maxLat = Math.max(pharmacyLat, customerLat);
    const minLng = Math.min(pharmacyLng, customerLng);
    const maxLng = Math.max(pharmacyLng, customerLng);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max(maxLat - minLat, 0.01) * 1.2; // Add padding
    const deltaLng = Math.max(maxLng - minLng, 0.01) * 1.2; // Add padding
    
    setMapRegion({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    });
  };

  const loadOrderFromStorage = async () => {
    try {
      const storedOrder = await AsyncStorage.getItem('currentOrder');
      if (storedOrder) {
        const order = JSON.parse(storedOrder);
        setOrderData(order);
        console.log('📱 Order data loaded from local storage:', order.order_number || order.order_id);
        setLoading(false);
      } else {
        setError('No order found');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading order from storage:', error);
      setError('Failed to load order data');
      setLoading(false);
    }
  };

  const clearStoredOrder = async () => {
    try {
      await AsyncStorage.removeItem('currentOrder');
      console.log('🗑️ Stored order cleared from local storage');
    } catch (error) {
      console.warn('⚠️ Failed to clear stored order:', error);
    }
  };

  const fetchOrderData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!id || id === 'undefined' || id === 'null') {
        await loadOrderFromStorage();
        return;
      }

      const response = await apiService.getOrderStatus(id);
      
      if (response.success && response.data) {
        const payload: any = response.data;
        const order = payload?.data || payload; // handle direct or wrapped shape
        setOrderData(order);
        console.log('✅ Order data loaded:', order.order_number || order.order_id);
        console.log('🏥 Pharmacy data:', {
          name: order.pharmacy_name,
          id: order.pharmacy_id,
          barangay: order.pharmacy_barangay,
          latitude: order.pharmacy_latitude,
          longitude: order.pharmacy_longitude,
          phone: order.pharmacy_phone,
          email: order.pharmacy_email,
          storefront_image_url: order.pharmacy_storefront_image_url
        });
        console.log('📞 Phone number available:', !!order.pharmacy_phone, order.pharmacy_phone);
        
        // Save order data to local storage for persistence
        try {
          await AsyncStorage.setItem('currentOrder', JSON.stringify(order));
          console.log('💾 Order data saved to local storage');
        } catch (storageError) {
          console.warn('⚠️ Failed to save order to storage:', storageError);
        }
      } else {
        setError(response.error || 'Failed to load order data');
        console.error('❌ Failed to load order:', response.error);
      }
    } catch (error) {
      console.error('💥 Error fetching order data:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && id !== 'undefined' && id !== 'null') {
      fetchOrderData();
    } else {
      // Try to get order from AsyncStorage if no valid ID provided
      loadOrderFromStorage();
    }
  }, [id, fetchOrderData]);

  // Handle customer location and map updates when order data changes
  useEffect(() => {
    const initializeMap = async () => {
      if (orderData && !mapInitialized.current) {
        mapInitialized.current = true;
        
        // Get customer location
        await getCustomerLocation();
        
        // Update map region if pharmacy coordinates are available
        if (orderData.pharmacy_latitude && orderData.pharmacy_longitude && customerLocation) {
          updateMapRegion(
            orderData.pharmacy_latitude,
            orderData.pharmacy_longitude,
            customerLocation.latitude,
            customerLocation.longitude
          );
        }
      }
    };

    initializeMap();
  }, [orderData, customerLocation]);

  // Cleanup effect - clear stored order when component unmounts
  useEffect(() => {
    return () => {
      // Clear stored order when component unmounts
      clearStoredOrder();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    if (id) {
      await fetchOrderData();
    } else {
      await loadOrderFromStorage();
    }
    setRefreshing(false);
  };

  // Check if order is completed and clear storage if needed
  useEffect(() => {
    if (orderData && (orderData.order_status === 'delivered' || orderData.order_status === 'cancelled')) {
      // Clear stored order after a delay when order is completed
      const timer = setTimeout(() => {
        clearStoredOrder();
      }, 5000); // Clear after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [orderData]);


  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00bf63" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Order</Text>
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeButton} onPress={() => router.push('/')}>
            <Text style={styles.homeButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Tracking</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Google Map - Full Width */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {/* Pharmacy Marker */}
            {orderData.pharmacy_latitude && orderData.pharmacy_longitude && (
              <Marker
                coordinate={{
                  latitude: orderData.pharmacy_latitude,
                  longitude: orderData.pharmacy_longitude,
                }}
                title={orderData.pharmacy_name}
                description="Pharmacy Location"
                pinColor="red"
              />
            )}
            
            {/* Customer Marker */}
            {customerLocation && (
              <Marker
                coordinate={customerLocation}
                title="Your Location"
                description="Delivery Address"
                pinColor="blue"
              />
            )}
          </MapView>
        </View>

        <View style={styles.content}>

          {/* Pharmacy Calling Card */}
          <View style={styles.pharmacyCard}>
            <View style={styles.pharmacyInfo}>
              <View style={styles.pharmacyImageContainer}>
                {orderData.pharmacy_storefront_image_url ? (
                  <Image 
                    source={{ uri: orderData.pharmacy_storefront_image_url }} 
                    style={styles.pharmacyImage}
                    resizeMode="cover"
                    onError={() => {
                      console.log('Failed to load pharmacy storefront image');
                    }}
                  />
                ) : (
                  <Image 
                    source={require('../assets/drugstore.png')} 
                    style={styles.pharmacyImage}
                    resizeMode="contain"
                  />
                )}
              </View>
              <View style={styles.pharmacyDetails}>
                <Text style={styles.pharmacyName}>{orderData.pharmacy_name}</Text>
                <Text style={styles.pharmacyPhone}>
                  {orderData.pharmacy_phone || 'No phone available'}
                </Text>
              </View>
            </View>
            <View style={styles.pharmacyActions}>
              <TouchableOpacity style={styles.actionIcon}>
                <Ionicons name="chatbubble-outline" size={24} color="#00bf63" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon}>
                <Ionicons name="call-outline" size={24} color="#00bf63" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Status Panel */}
          <View style={styles.statusPanel}>
            <View style={styles.statusItem}>
              <View style={styles.statusItemLeft}>
                <View style={[styles.statusIconContainer, styles.activeStatus]}>
                  <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.statusConnector} />
              </View>
              <View style={styles.statusItemRight}>
                <Text style={styles.statusTitle}>Order Under Review</Text>
                <Text style={styles.statusSubtitle}>#{orderData.order_number}</Text>
                <Text style={styles.statusTime}>{formatTime(orderData.created_at)}</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusItemLeft}>
                <View style={styles.statusIconContainer}>
                  <Ionicons name="cog-outline" size={24} color="#666666" />
                </View>
                <View style={styles.statusConnector} />
              </View>
              <View style={styles.statusItemRight}>
                <Text style={styles.statusTitle}>Order Processing</Text>
                <Text style={styles.statusSubtitle}>Processing order</Text>
                <Text style={styles.statusTime}>-</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusItemLeft}>
                <View style={styles.statusIconContainer}>
                  <Ionicons name="time-outline" size={24} color="#666666" />
                </View>
                <View style={styles.statusConnector} />
              </View>
              <View style={styles.statusItemRight}>
                <Text style={styles.statusTitle}>Pick Up</Text>
                <Text style={styles.statusSubtitle}>Waiting for rider</Text>
                <Text style={styles.statusTime}>-</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusItemLeft}>
                <View style={styles.statusIconContainer}>
                  <Ionicons name="bicycle-outline" size={24} color="#666666" />
                </View>
                <View style={styles.statusConnector} />
              </View>
              <View style={styles.statusItemRight}>
                <Text style={styles.statusTitle}>Delivering</Text>
                <Text style={styles.statusSubtitle}>Delivering to {orderData.delivery_address}</Text>
                <Text style={styles.statusTime}>-</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusItemLeft}>
                <View style={styles.statusIconContainer}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#666666" />
                </View>
              </View>
              <View style={styles.statusItemRight}>
                <Text style={styles.statusTitle}>Delivered Successfully</Text>
                <Text style={styles.statusSubtitle}>Get Well Soon</Text>
                <Text style={styles.statusTime}>-</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <Text style={styles.refreshButtonText}>
                {refreshing ? 'Refreshing...' : 'Refresh Status'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.homeButtonText}>Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    top: -35,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    fontFamily: fontFamily.light,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 8,
    fontFamily: fontFamily.heavy,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: fontFamily.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    flex: 0,
  },
  headerSpacer: {
    flex: 0,
    width: 60, // Same width as back button to balance the layout
  },
  backButtonText: {
    fontSize: 16,
    color: '#00bf63',
    fontFamily: fontFamily.light,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: fontFamily.heavy,
    textAlign: 'center',
    flex: 1,
  },
  // Map Styles
  mapContainer: {
    width: '100%',
    height: 300,
    marginBottom: 0,
  },
  map: {
    flex: 1,
  },
  // Pharmacy Card Styles
  pharmacyCard: {

    backgroundColor: '#ededed',
    borderRadius: 24,
    padding: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pharmacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pharmacyImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  pharmacyImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  pharmacyDetails: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 0,
    fontFamily: fontFamily.heavy,
  },
  pharmacyPhone: {
    fontSize: 14,
    color: '#00bf63',
    fontFamily: fontFamily.light,
    fontWeight: '500',
  },
  pharmacyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Status Panel Styles
  statusPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  statusItemLeft: {
    alignItems: 'center',
    marginRight: 10,
  },
  statusItemRight: {
    flex: 1,
    paddingTop: 8,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  activeStatus: {
    backgroundColor: '#00bf63',
  },
  statusConnector: {
    width: 2,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginTop: 2,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
    fontFamily: fontFamily.heavy,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    fontFamily: fontFamily.light,
  },
  statusTime: {
    fontSize: 12,
    color: '#00bf63',
    fontFamily: fontFamily.light,
  },
  // Action Buttons
  actionButtons: {
    marginTop: 20,
    gap: 12,
  },
  refreshButton: {
    backgroundColor: '#00bf63',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.light,
  },
  homeButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  homeButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.light,
  },
  retryButton: {
    backgroundColor: '#00bf63',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    minWidth: 120,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.light,
  },
});

export default OrderTrackingScreen;
