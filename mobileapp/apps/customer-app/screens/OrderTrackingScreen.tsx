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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily } from '../utils/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get dimensions safely
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Lazy-load services to avoid import-time crashes
const getApiService = () => require('../services/api').apiService;

interface OrderData {
  order_id: number;
  order_number: string;
  order_status: string;
  prescription_status: string;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  pharmacy_name: string;
  delivery_address: string;
  prescription_image_url?: string;
  created_at: string;
  updated_at: string;
}

const OrderTrackingScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderData = useCallback(async () => {
    if (!id || id === 'undefined' || id === 'null') {
      setError('Invalid order ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📦 Fetching order data for ID:', id);
      const apiService = getApiService();
      const response = await apiService.getOrderStatus(id);

      if (response.success && response.data) {
        console.log('✅ Order data loaded:', response.data);
        setOrderData(response.data);
        
        // Save to AsyncStorage
        try {
          await AsyncStorage.setItem('currentOrder', JSON.stringify(response.data));
        } catch (storageError) {
          console.warn('⚠️ Failed to save order to storage:', storageError);
        }
      } else {
        setError(response.error || 'Failed to load order data');
        console.error('❌ Failed to load order:', response.error);
      }
    } catch (err) {
      console.error('💥 Error fetching order data:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderData();
  }, [fetchOrderData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrderData().finally(() => setRefreshing(false));
  }, [fetchOrderData]);

  const handleBack = () => {
    router.back();
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
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Tracking</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Order Info Card */}
        <View style={styles.content}>
          <View style={styles.orderCard}>
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
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{orderData.order_status.toUpperCase()}</Text>
            </View>
          </View>

          {/* Pharmacy Info */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Pharmacy</Text>
            <Text style={styles.infoText}>{orderData.pharmacy_name}</Text>
          </View>

          {/* Delivery Address */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <Text style={styles.infoText}>{orderData.delivery_address}</Text>
          </View>

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>₱{orderData.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee:</Text>
              <Text style={styles.summaryValue}>₱{orderData.delivery_fee.toFixed(2)}</Text>
            </View>
            {orderData.discount_amount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount:</Text>
                <Text style={[styles.summaryValue, styles.discountText]}>
                  -₱{orderData.discount_amount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>₱{orderData.total_amount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Test Note */}
          <View style={styles.testNote}>
            <Text style={styles.testNoteText}>
              ✅ Step 1 Complete: Basic order tracking works!
              {'\n\n'}
              Next: Adding MapView and real-time tracking features...
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
  retryButton: {
    backgroundColor: '#00bf63',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: fontFamily.heavy,
  },
  homeButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  homeButtonText: {
    color: '#00bf63',
    fontSize: 16,
    fontFamily: fontFamily.light,
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
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#00bf63',
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
    width: 50,
  },
  content: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingTop: 10,
    paddingBottom: 30,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#00bf63',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: fontFamily.heavy,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    fontFamily: fontFamily.light,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: fontFamily.heavy,
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F57C00',
    fontFamily: fontFamily.heavy,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    fontFamily: fontFamily.light,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: fontFamily.heavy,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00bf63',
    fontFamily: fontFamily.heavy,
  },
  testNote: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  testNoteText: {
    fontSize: 14,
    color: '#2E7D32',
    fontFamily: fontFamily.light,
    lineHeight: 22,
  },
});

export default OrderTrackingScreen;
