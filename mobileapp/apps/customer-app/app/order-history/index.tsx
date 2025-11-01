import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily } from '../../utils/fonts';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Svg, { Path } from 'react-native-svg';
import PrescriptionUploadModal from '../../components/PrescriptionUploadModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OrderItem {
  order_id: number;
  order_number: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  pharmacy_name: string;
  pharmacy_id: number | null;
  item_count: number;
  created_at: string;
  updated_at: string;
  delivered_at?: string | null;
  is_prescription: boolean;
}

export default function OrderHistoryScreen() {
  const { user } = useAuth();
  const [activeOrders, setActiveOrders] = useState<OrderItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  const fetchOrders = async () => {
    if (!user?.customer_id) {
      setError('Customer ID not found');
      setLoading(false);
      return;
    }

    try {
      console.log('📋 Fetching orders for customer ID:', user.customer_id);
      const response = await apiService.getCustomerOrders(user.customer_id);
      
      console.log('📦 API Response:', {
        success: response.success,
        hasData: !!response.data,
        data: response.data
      });
      
      if (response.success && response.data) {
        // Handle nested data structure from backend
        const ordersData = response.data.data || response.data;
        
        console.log('📊 Orders data:', ordersData);
        
        setActiveOrders(ordersData.active_orders || []);
        setRecentOrders(ordersData.recent_orders || []);
        setError(null);
        console.log('✅ Loaded orders:', {
          active: ordersData.active_orders?.length || 0,
          recent: ordersData.recent_orders?.length || 0
        });
      } else {
        setError(response.error || 'Failed to load orders');
        console.error('❌ Failed to load orders:', response.error);
      }
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handlePrescriptionUpload = () => {
    console.log('📋 Opening prescription upload modal...');
    setShowPrescriptionModal(true);
  };

  const handlePrescriptionSuccess = (prescriptionId: string) => {
    console.log('✅ Prescription uploaded successfully:', prescriptionId);
    setShowPrescriptionModal(false);
  };

  const handlePrescriptionModalClose = () => {
    console.log('❌ Closing prescription upload modal...');
    setShowPrescriptionModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'accepted':
      case 'preparing': return '#2196F3';
      case 'ready_for_pickup': return '#9C27B0';
      case 'picked_up': return '#00bf63';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#999999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'preparing': return 'Preparing';
      case 'ready_for_pickup': return 'Ready';
      case 'picked_up': return 'In Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderOrderCard = (order: OrderItem, isActive: boolean) => (
    <TouchableOpacity
      key={order.order_id}
      style={styles.orderCard}
      onPress={() => router.push(`/order-tracking/${order.order_id}` as any)}
    >
      {/* Header */}
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <Text style={styles.orderNumber}>#{order.order_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.order_status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(order.order_status) }]}>
              {getStatusLabel(order.order_status)}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999999" />
      </View>

      {/* Order Info */}
      <View style={styles.orderInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={16} color="#666666" />
          <Text style={styles.infoText}>{order.pharmacy_name}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name={order.is_prescription ? "document-text-outline" : "cart-outline"} size={16} color="#666666" />
          <Text style={styles.infoText}>
            {order.is_prescription ? 'Prescription Order' : `${order.item_count} item${order.item_count > 1 ? 's' : ''}`}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666666" />
          <Text style={styles.infoText}>{formatDate(order.created_at)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>₱{order.total_amount.toFixed(2)}</Text>
      </View>

      {/* Status Progress Bar (only for active orders) */}
      {isActive && (
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: getProgressWidth(order.order_status),
                  backgroundColor: getStatusColor(order.order_status)
                }
              ]} 
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const getProgressWidth = (status: string) => {
    switch (status) {
      case 'pending': return '20%';
      case 'accepted':
      case 'preparing': return '40%';
      case 'ready_for_pickup': return '60%';
      case 'picked_up': return '80%';
      case 'delivered': return '100%';
      default: return '0%';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2B2B2B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order History</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00bf63" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2B2B2B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00bf63']} />
        }
      >
        <View style={styles.content}>
          {/* Active Orders Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Orders</Text>
            <Text style={styles.sectionSubtitle}>
              Track your ongoing orders
            </Text>

            {activeOrders.length > 0 ? (
              activeOrders.map(order => renderOrderCard(order, true))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#CCCCCC" />
                <Text style={styles.emptyText}>No active orders</Text>
                <Text style={styles.emptySubtext}>Your ongoing orders will appear here</Text>
              </View>
            )}
          </View>

          {/* Recent Orders Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <Text style={styles.sectionSubtitle}>
              Last 30 days
            </Text>

            {recentOrders.length > 0 ? (
              recentOrders.map(order => renderOrderCard(order, false))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#CCCCCC" />
                <Text style={styles.emptyText}>No recent orders</Text>
                <Text style={styles.emptySubtext}>Your completed orders will appear here</Text>
              </View>
            )}
          </View>

          {/* Bottom padding for nav bar */}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.replace('/home' as any)}>
          <HomeIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.bottomNavItem, styles.activeNavItem]}>
          <CompareIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bottomNavItem}
          onPress={handlePrescriptionUpload}
        >
          <AddPrescriptionIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.push('/profile' as any)}>
          <ProfileIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Prescription Upload Modal */}
      <PrescriptionUploadModal
        visible={showPrescriptionModal}
        onClose={handlePrescriptionModalClose}
        onSuccess={handlePrescriptionSuccess}
      />
    </SafeAreaView>
  );
}

// SVG Icon Components (same as Profile page)
const HomeIcon = ({ size = 24, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.702,8.948L15.01,1.154c-1.717-1.542-4.303-1.543-6.042,.021L1.297,8.948c-.836,.849-1.297,1.971-1.297,3.161v8.391c0,1.93,1.57,3.5,3.5,3.5H20.5c1.93,0,3.5-1.57,3.5-3.5V12.109c0-1.19-.461-2.313-1.298-3.161Zm-6.702,14.052H8v-6c0-2.206,1.794-4,4-4s4,1.794,4,4v6Zm7-2.5c0,1.379-1.121,2.5-2.5,2.5h-3.5v-6c0-2.757-2.243-5-5-5s-5,2.243-5,5v6H3.5c-1.378,0-2.5-1.121-2.5-2.5V12.109c0-.926,.358-1.799,1.009-2.458L9.659,1.898c.67-.604,1.511-.903,2.349-.903,.831,0,1.658,.295,2.312,.883l7.671,7.773c.65,.659,1.009,1.532,1.009,2.458v8.391Z"
      fill={color}
    />
  </Svg>
);

const CompareIcon = ({ size = 24, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M24,4.5c0-1.93-1.57-3.5-3.5-3.5s-3.5,1.57-3.5,3.5c0,1.76,1.306,3.221,3,3.464v9.536c0,.827-.673,1.5-1.5,1.5h-6.157l3.056-3.056-.707-.707-3.256,3.256c-.281,.281-.436,.655-.436,1.053s.155,.771,.436,1.052l3.256,3.256,.707-.707-3.146-3.146h6.247c1.378,0,2.5-1.122,2.5-2.5V7.964c1.694-.243,3-1.704,3-3.464Zm-3.5,2.5c-1.378,0-2.5-1.122-2.5-2.5s1.122-2.5,2.5-2.5,2.5,1.122,2.5,2.5-1.122,2.5-2.5,2.5Zm-7.936-3.553L9.308,.192l-.707,.707,3.102,3.101H5.5c-1.378,0-2.5,1.122-2.5,2.5v9.536c-1.694,.243-3,1.704-3,3.464,0,1.93,1.57,3.5,3.5,3.5s3.5-1.57,3.5-3.5c0-1.76-1.306-3.221-3-3.464V6.5c0-.827,.673-1.5,1.5-1.5h6.203l-3.102,3.101,.707,.707,3.256-3.255c.581-.581,.581-1.525,0-2.105ZM6,19.5c0,1.378-1.122,2.5-2.5,2.5s-2.5-1.122-2.5-2.5,1.122-2.5,2.5-2.5,2.5,1.122,2.5,2.5Z"
      fill={color}
    />
  </Svg>
);

const AddPrescriptionIcon = ({ size = 24, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="m13,15v-4h-4v-1h4v-4h1v4h4v1h-4v4h-1ZM24,2.5v12.707l-5.793,5.793H3V2.5c0-1.379,1.121-2.5,2.5-2.5h16c1.379,0,2.5,1.121,2.5,2.5ZM4,20h13v-6h6V2.5c0-.827-.673-1.5-1.5-1.5H5.5c-.827,0-1.5,.673-1.5,1.5v17.5Zm18.793-5h-4.793v4.793l4.793-4.793ZM1,4.514c-.604.456-1,1.172-1,1.986v17.5h18v-1H1V4.514Z"
      fill={color}
    />
  </Svg>
);

const ProfileIcon = ({ size = 24, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12,12c2.21,0,4-1.79,4-4s-1.79-4-4-4-4,1.79-4,4,1.79,4,4,4Zm0,2c-2.67,0-8,1.34-8,4v2h16v-2c0-2.66-5.33-4-8-4Z"
      fill={color}
    />
  </Svg>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2B2B2B',
    marginLeft: 12,
    fontFamily: fontFamily.heavy,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
    fontFamily: fontFamily.light,
  },
  
  // Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2B2B2B',
    marginBottom: 4,
    fontFamily: fontFamily.heavy,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999999',
    marginBottom: 16,
    fontFamily: fontFamily.light,
  },

  // Order Cards
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B2B2B',
    fontFamily: fontFamily.heavy,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fontFamily.heavy,
  },
  orderInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: fontFamily.light,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#999999',
    fontFamily: fontFamily.light,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00bf63',
    fontFamily: fontFamily.heavy,
  },

  // Progress Bar
  progressBarContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666',
    marginTop: 12,
    fontFamily: fontFamily.heavy,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999999',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: fontFamily.light,
  },

  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 40,
    left: 75,
    right: 75,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 40,
    paddingVertical: 5,
    paddingHorizontal: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.3)'
  },
  bottomNavItem: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    paddingVertical: 25,
    paddingHorizontal: 25,
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  activeNavItem: {
    backgroundColor: '#00bf63'
  }
});

