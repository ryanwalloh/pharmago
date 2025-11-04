import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily } from '../utils/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe Dimensions with fallback
let SCREEN_WIDTH = 400;
try {
  SCREEN_WIDTH = Dimensions.get('window').width;
} catch {
  // Fallback
}

interface OrderData {
  order_id: number;
  order_number: string;
  order_status: string;
  prescription_status?: string;
  payment_status?: string;
  pharmacy_name: string;
  pharmacy_storefront_image_url?: string;
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
  prescription_image_url?: string;
  items?: any[];
}

const OrderTrackingScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pharmacyImageError, setPharmacyImageError] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const apiInitializedRef = useRef(false);
  const apiCallTimeoutRef = useRef<any>(null);

  // Load order from AsyncStorage immediately (fast, stable)
  const loadOrderFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('currentOrder');
      if (stored) {
        const parsed = JSON.parse(stored);
        setOrderData(parsed);
        console.log('✅ Loaded order from AsyncStorage:', parsed.order_number);
        return parsed;
      } else {
        console.warn('⚠️ No stored order found');
        setOrderData({
          order_id: parseInt(id as string) || 0,
          order_number: `Order #${id}`,
          order_status: 'pending',
          pharmacy_name: 'Loading...',
          delivery_address: 'Loading...',
          subtotal: 0,
          delivery_fee: 0,
          discount_amount: 0,
          total_amount: 0,
          created_at: new Date().toISOString(),
        });
        return null;
      }
    } catch (error) {
      console.error('Error loading order from storage:', error);
      setOrderData({
        order_id: parseInt(id as string) || 0,
        order_number: `Order #${id}`,
        order_status: 'pending',
        pharmacy_name: 'Unknown',
        delivery_address: 'Unknown',
        subtotal: 0,
        delivery_fee: 0,
        discount_amount: 0,
        total_amount: 0,
        created_at: new Date().toISOString(),
      });
      return null;
    }
  }, [id]);

  // Fetch order from API (delayed, after screen is stable)
  const fetchOrderFromAPI = useCallback(async (orderId: string) => {
    // Prevent multiple simultaneous API calls
    if (apiLoading) {
      console.log('⏳ API call already in progress, skipping...');
      return;
    }

    try {
      setApiLoading(true);
      console.log('🔄 Fetching order from API...');

      // Dynamically import apiService to avoid import-time crashes
      // This ensures the service is only loaded when we're ready to use it
      const { apiService } = await import('../services/api');
      
      const response = await apiService.getOrderById(orderId);
      
      if (response.success && response.data) {
        const freshData = response.data;
        console.log('✅ Fetched fresh order data from API:', freshData.order_number);
        
        // Update state with fresh data
        setOrderData(freshData);
        setLastUpdateTime(new Date());
        
        // Update AsyncStorage with fresh data
        try {
          await AsyncStorage.setItem('currentOrder', JSON.stringify(freshData));
          console.log('💾 Updated AsyncStorage with fresh data');
        } catch (storageError) {
          console.warn('⚠️ Failed to update AsyncStorage:', storageError);
        }
      } else {
        console.warn('⚠️ API response not successful:', response.error);
        // Keep showing cached data - don't fail the screen
      }
    } catch (error) {
      console.error('❌ Error fetching order from API:', error);
      // Don't crash - keep showing cached data
      // The screen is already functional with AsyncStorage data
    } finally {
      setApiLoading(false);
    }
  }, [apiLoading]);

  // Initial load: Storage first, then API after delay
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      // Step 1: Load from AsyncStorage immediately (fast, stable)
      await loadOrderFromStorage();
      
      if (isMounted) {
        setLoading(false);
      }

      // Step 2: Wait 2 seconds for screen to be fully stable, then fetch from API
      // This delay ensures React Native and native modules are fully initialized
      apiCallTimeoutRef.current = setTimeout(() => {
        if (isMounted && !apiInitializedRef.current && id) {
          apiInitializedRef.current = true;
          console.log('⏰ Screen stable, fetching from API after 2s delay...');
          fetchOrderFromAPI(id);
        }
      }, 2000); // 2 seconds delay - enough time for screen to be stable
    };

    initialize();

    return () => {
      isMounted = false;
      if (apiCallTimeoutRef.current) {
        clearTimeout(apiCallTimeoutRef.current);
      }
    };
  }, [id, loadOrderFromStorage, fetchOrderFromAPI]);

  // Manual refresh: Storage + API
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Reload from storage first (fast)
    await loadOrderFromStorage();
    
    // Then fetch from API (slower, but fresh)
    if (id) {
      await fetchOrderFromAPI(id);
    }
    
    setRefreshing(false);
  }, [id, loadOrderFromStorage, fetchOrderFromAPI]);

  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string } } = {
      pending: { bg: '#FFF3E0', text: '#F57C00' },
      accepted: { bg: '#E3F2FD', text: '#1976D2' },
      ready_for_pickup: { bg: '#F3E5F5', text: '#7B1FA2' },
      picked_up: { bg: '#E8F5E9', text: '#388E3C' },
      delivered: { bg: '#C8E6C9', text: '#2E7D32' },
      cancelled: { bg: '#FFEBEE', text: '#C62828' },
    };
    return statusMap[status] || { bg: '#F5F5F5', text: '#666' };
  };

  const getStatusIcon = (status: string) => {
    const iconMap: { [key: string]: string } = {
      pending: 'time-outline',
      accepted: 'checkmark-circle-outline',
      ready_for_pickup: 'cube-outline',
      picked_up: 'bicycle-outline',
      delivered: 'checkmark-done-circle-outline',
      cancelled: 'close-circle-outline',
    };
    return iconMap[status] || 'help-circle-outline';
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

  if (!orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <TouchableOpacity style={styles.homeButton} onPress={() => router.push('/')}>
            <Text style={styles.homeButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColors = getStatusColor(orderData.order_status);

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
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#00bf63" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Tracking</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <View style={styles.content}>
          {/* Update Status Indicator */}
          {(apiLoading || lastUpdateTime) && (
            <View style={styles.updateIndicator}>
              {apiLoading ? (
                <>
                  <ActivityIndicator size="small" color="#1976D2" />
                  <Text style={styles.updateText}>Updating from server...</Text>
                </>
              ) : (
                <Text style={styles.updateText}>
                  Last updated: {lastUpdateTime?.toLocaleTimeString() || 'Just now'}
                </Text>
              )}
            </View>
          )}

          {/* Order Number Card */}
          <View style={styles.orderCard}>
            <Ionicons name="receipt-outline" size={40} color="#00bf63" />
            <Text style={styles.orderNumber}>{orderData.order_number}</Text>
            <Text style={styles.orderDate}>
              {new Date(orderData.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons name={getStatusIcon(orderData.order_status) as any} size={32} color={statusColors.text} />
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusLabel}>Order Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.statusText, { color: statusColors.text }]}>
                    {orderData.order_status.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Pharmacy Card */}
          <View style={styles.pharmacyCard}>
            <View style={styles.pharmacyImageContainer}>
              {orderData.pharmacy_storefront_image_url && !pharmacyImageError ? (
                <Image
                  source={{ uri: orderData.pharmacy_storefront_image_url }}
                  style={styles.pharmacyImage}
                  onError={() => setPharmacyImageError(true)}
                />
              ) : (
                <Ionicons name="storefront" size={32} color="#00bf63" />
              )}
            </View>
            <View style={styles.pharmacyInfo}>
              <Text style={styles.pharmacyName}>{orderData.pharmacy_name}</Text>
              <View style={styles.pharmacyRow}>
                <Ionicons name="location" size={14} color="#666" />
                <Text style={styles.pharmacyAddress} numberOfLines={2}>
                  {orderData.delivery_address}
                </Text>
              </View>
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₱{orderData.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₱{orderData.delivery_fee.toFixed(2)}</Text>
            </View>
            {orderData.discount_amount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, styles.discountText]}>
                  -₱{orderData.discount_amount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₱{orderData.total_amount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Info Note */}
          <View style={styles.infoNote}>
            <Ionicons name="information-circle" size={20} color="#1976D2" />
            <Text style={styles.infoNoteText}>
              Pull down to refresh • Order updates automatically every 2 seconds
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
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
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 20,
    fontFamily: fontFamily.heavy,
  },
  homeButton: {
    backgroundColor: '#00bf63',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: fontFamily.heavy,
  },
  headerContainer: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#00bf63',
    fontWeight: 'bold',
    marginLeft: 6,
    fontFamily: fontFamily.heavy,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: fontFamily.heavy,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 80,
  },
  content: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingTop: 16,
    paddingBottom: 30,
  },
  updateIndicator: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateText: {
    fontSize: 12,
    color: '#1976D2',
    fontFamily: fontFamily.light,
    marginLeft: 8,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#00bf63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  orderNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: fontFamily.heavy,
    marginTop: 12,
    marginBottom: 8,
  },
  orderDate: {
    fontSize: 13,
    color: '#999',
    fontFamily: fontFamily.light,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  statusLabel: {
    fontSize: 13,
    color: '#666',
    fontFamily: fontFamily.light,
    marginBottom: 8,
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: fontFamily.heavy,
  },
  pharmacyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pharmacyImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  pharmacyImage: {
    width: 64,
    height: 64,
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: fontFamily.heavy,
    marginBottom: 6,
  },
  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pharmacyAddress: {
    fontSize: 13,
    color: '#666',
    fontFamily: fontFamily.light,
    marginLeft: 4,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: fontFamily.heavy,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: fontFamily.light,
  },
  summaryValue: {
    fontSize: 15,
    color: '#333',
    fontFamily: fontFamily.light,
  },
  discountText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: fontFamily.heavy,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00bf63',
    fontFamily: fontFamily.heavy,
  },
  infoNote: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoNoteText: {
    fontSize: 13,
    color: '#1976D2',
    fontFamily: fontFamily.light,
    marginLeft: 10,
    flex: 1,
  },
});

export default OrderTrackingScreen;
