import React, { useState, useEffect, useCallback } from 'react';
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

// PRODUCTION VERSION: AsyncStorage only, no MapView, no WebSocket, no polling
// Simple, robust, functional order tracking
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [error, setError] = useState<string | null>(null);
  const [pharmacyImageError, setPharmacyImageError] = useState(false);

  // Load order from AsyncStorage (saved during checkout)
  const loadOrderFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('currentOrder');
      if (stored) {
        const parsed = JSON.parse(stored);
        setOrderData(parsed);
        setError(null);
      } else {
        setError('Order data not found. Please place an order first.');
      }
    } catch (err) {
      console.error('Error loading order from storage:', err);
      setError('Failed to load order data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh order data from API
  const refreshOrderData = useCallback(async () => {
    if (!id || id === 'undefined' || id === 'null') {
      return;
    }

    try {
      console.log('🔄 Refreshing order data for ID:', id);
      
      // Dynamic import inside async function
      const { apiService } = await import('../services/api');
      const response = await apiService.getOrderStatus(id);

      if (response.success && response.data) {
        console.log('✅ Order data refreshed');
        setOrderData(response.data);
        setError(null);
        
        // Update AsyncStorage
        await AsyncStorage.setItem('currentOrder', JSON.stringify(response.data));
      } else {
        console.warn('⚠️ Failed to refresh:', response.error);
        // Don't set error - keep showing cached data
      }
    } catch (err) {
      console.error('💥 Refresh error:', err);
      // Don't set error - keep showing cached data
    }
  }, [id]);

  // Initial load from AsyncStorage only
  useEffect(() => {
    loadOrderFromStorage();
  }, [loadOrderFromStorage]);

  // Pull-to-refresh triggers API call
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshOrderData();
    setRefreshing(false);
  }, [refreshOrderData]);

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

  if (error || !orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Unable to Load Order</Text>
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
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
              <View style={styles.pharmacyIconRow}>
                <Ionicons name="location" size={14} color="#666" />
                <Text style={styles.pharmacyAddress}>{orderData.delivery_address}</Text>
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
              Pull down to refresh order status
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
    paddingHorizontal: SCREEN_WIDTH * 0.1,
    paddingVertical: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
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
  homeButton: {
    backgroundColor: '#00bf63',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#00bf63',
    fontWeight: 'bold',
    marginLeft: 4,
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
    paddingTop: 10,
    paddingBottom: 30,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00bf63',
  },
  orderNumber: {
    fontSize: 24,
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
    fontSize: 14,
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
  },
  pharmacyImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  pharmacyImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  pharmacyIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pharmacyAddress: {
    fontSize: 13,
    color: '#666',
    fontFamily: fontFamily.light,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: fontFamily.heavy,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    fontSize: 14,
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
    fontSize: 22,
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
