import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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

  useEffect(() => {
    if (id && id !== 'undefined' && id !== 'null') {
      fetchOrderData();
    } else {
      // Try to get order from AsyncStorage if no valid ID provided
      loadOrderFromStorage();
    }
  }, [id]);

  const loadOrderFromStorage = async () => {
    try {
      const storedOrder = await AsyncStorage.getItem('currentOrder');
      if (storedOrder) {
        const order = JSON.parse(storedOrder);
        setOrderData(order);
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

  const fetchOrderData = async () => {
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
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (id) {
      await fetchOrderData();
    } else {
      await loadOrderFromStorage();
    }
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FFA500';
      case 'accepted':
        return '#4CAF50';
      case 'preparing':
        return '#2196F3';
      case 'ready_for_pickup':
        return '#9C27B0';
      case 'picked_up':
        return '#FF9800';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending Review';
      case 'accepted':
        return 'Accepted';
      case 'preparing':
        return 'Preparing';
      case 'ready_for_pickup':
        return 'Ready for Pickup';
      case 'picked_up':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getPrescriptionStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Tracking</Text>
          </View>

          {/* Order Number */}
          <View style={styles.orderNumberCard}>
            <Text style={styles.orderNumberLabel}>Order Number</Text>
            <Text style={styles.orderNumberValue}>#{orderData.order_number}</Text>
          </View>

          {/* Order Status */}
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Order Status</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(orderData.order_status) },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {getStatusText(orderData.order_status)}
                </Text>
              </View>
            </View>
          </View>

          {/* Prescription Status */}
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Prescription Status</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      orderData.prescription_status === 'approved'
                        ? '#4CAF50'
                        : orderData.prescription_status === 'rejected'
                        ? '#F44336'
                        : '#FFA500',
                  },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {getPrescriptionStatusText(orderData.prescription_status)}
                </Text>
              </View>
            </View>
          </View>

          {/* Order Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Order Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pharmacy:</Text>
              <Text style={styles.detailValue}>{orderData.pharmacy_name}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery Address:</Text>
              <Text style={styles.detailValue}>{orderData.delivery_address}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Amount:</Text>
              <Text style={styles.detailValue}>
                ₱{orderData.total_amount.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Status:</Text>
              <Text style={styles.detailValue}>{orderData.payment_status}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Date:</Text>
              <Text style={styles.detailValue}>{formatDate(orderData.created_at)}</Text>
            </View>
            
            {orderData.estimated_delivery && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estimated Delivery:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(orderData.estimated_delivery)}
                </Text>
              </View>
            )}
            
            {orderData.actual_delivery && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Delivered On:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(orderData.actual_delivery)}
                </Text>
              </View>
            )}
          </View>

          {/* Prescription Notes */}
          {orderData.prescription_notes && (
            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>Prescription Notes</Text>
              <Text style={styles.notesText}>{orderData.prescription_notes}</Text>
            </View>
          )}

          {/* Order Notes */}
          {orderData.notes && (
            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>Order Notes</Text>
              <Text style={styles.notesText}>{orderData.notes}</Text>
            </View>
          )}

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
  content: {
    padding: 20,
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
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.bold,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: fontFamily.regular,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#00bf63',
    fontFamily: fontFamily.medium,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: fontFamily.bold,
  },
  orderNumberCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  orderNumberLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontFamily: fontFamily.regular,
  },
  orderNumberValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00bf63',
    fontFamily: fontFamily.bold,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
    fontFamily: fontFamily.semiBold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
    fontFamily: fontFamily.bold,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    fontFamily: fontFamily.regular,
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    flex: 2,
    textAlign: 'right',
    fontFamily: fontFamily.medium,
  },
  notesCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    fontFamily: fontFamily.semiBold,
  },
  notesText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    fontFamily: fontFamily.regular,
  },
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
    fontFamily: fontFamily.semiBold,
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
    fontFamily: fontFamily.semiBold,
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
    fontFamily: fontFamily.semiBold,
  },
});

export default OrderTrackingScreen;
