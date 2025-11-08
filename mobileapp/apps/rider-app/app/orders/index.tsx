import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar, 
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../../customer-app/services/api';

interface Order {
  id: number;
  order_number: string;
  order_status: string;
  total_amount: number;
  delivery_fee: number;
  rider_earnings: number;
  items_count: number;
  pharmacy: {
    id: number;
    name: string;
    address: string;
    street_address: string;
    barangay: string;
    city: string;
  };
  delivery_address: {
    full_address: string;
    street_address: string;
    barangay: string;
    city: string;
  };
  customer_name: string;
  created_at: string;
}

interface BatchOrder {
  batch_id: string;
  is_batch: boolean;
  orders_count: number;
  total_earnings: number;
  orders: Order[];
  created_at: string;
}

export default function OrdersScreen() {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchOrder[]>([]);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingBatch, setAcceptingBatch] = useState<string | null>(null);
  const [riderProfile, setRiderProfile] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
    loadRiderProfile();
  }, []);

  const loadRiderProfile = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('rider_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        setRiderProfile(session.rider);
      } else {
        const cachedProfile = await AsyncStorage.getItem('rider_profile');
        if (cachedProfile) {
          setRiderProfile(JSON.parse(cachedProfile));
        }
      }
    } catch (error) {
      console.error('Failed to load rider profile:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiService.getAvailableOrders();
      
      if (res && res.success && res.data) {
        const batchesData = (res.data as any).batches || [];
        setBatches(batchesData);
        console.log(`📦 Loaded ${batchesData.length} batches`);
        console.log(`📊 Total orders: ${(res.data as any).total_orders || 0}`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const toggleBatchExpansion = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  const handleAcceptBatch = async (batch: BatchOrder) => {
    if (!riderProfile?.id) {
      Alert.alert('Error', 'Rider profile not loaded. Please go back and try again.');
      return;
    }

    setAcceptingBatch(batch.batch_id);

    try {
      const orderIds = batch.orders.map(o => o.id);
      console.log(`📦 Accepting ${batch.is_batch ? 'batch' : 'order'}:`, { riderId: riderProfile.id, orderIds });
      
      const response = await apiService.acceptManualOrders(riderProfile.id, orderIds);

      if (response.success && response.data) {
        const { assignment_id, total_earnings, orders_count } = response.data;
        
        console.log(`✅ ${batch.is_batch ? 'Batch' : 'Order'} accepted! Assignment ID: ${assignment_id}`);
        
        Alert.alert(
          'Success! 🎉',
          `${batch.is_batch ? 'Batch' : 'Order'} accepted!\n\nYou'll earn ₱${total_earnings.toFixed(2)} for ${orders_count} ${orders_count === 1 ? 'order' : 'orders'}`,
          [
            { 
              text: 'Start Delivery', 
              onPress: () => router.push(`/delivery/${assignment_id}` as any)
            }
          ]
        );
      } else {
        Alert.alert('Failed', response.error || 'Could not accept order. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error accepting batch:', error);
      Alert.alert('Error', 'Failed to accept order. Please try again.');
    } finally {
      setAcceptingBatch(null);
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#222222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Orders</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BF63" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : batches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>No available orders</Text>
          <Text style={styles.emptySubtext}>Check back later for delivery orders</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00BF63']} />
          }
        >
          <View style={styles.ordersContainer}>
            <Text style={styles.countText}>{batches.length} batch{batches.length !== 1 ? 'es' : ''} available</Text>
            
            {batches.map((batch) => {
              const isExpanded = expandedBatches.has(batch.batch_id);
              
              return (
                <View key={batch.batch_id} style={styles.batchCard}>
                  {/* Batch Header - Calling Card Style */}
                  <View style={styles.batchHeader}>
                    <View style={styles.batchInfo}>
                      <Text style={styles.batchTitle}>
                        {batch.is_batch 
                          ? `${batch.orders_count} orders batched`
                          : '1 order found'}
                      </Text>
                      {batch.is_batch && (
                        <View style={styles.batchBadge}>
                          <Ionicons name="layers" size={14} color="#00BF63" />
                          <Text style={styles.batchBadgeText}>Batch</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.batchEarnings}>₱{batch.total_earnings.toFixed(2)}</Text>
                  </View>

                  {/* View Details Button */}
                  <TouchableOpacity 
                    style={styles.viewDetailsButton}
                    onPress={() => toggleBatchExpansion(batch.batch_id)}
                  >
                    <Text style={styles.viewDetailsText}>View details</Text>
                    <Ionicons 
                      name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color="#00BF63" 
                    />
                  </TouchableOpacity>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {batch.orders.map((order, index) => (
                        <View key={order.id} style={styles.orderDetails}>
                          {batch.is_batch && (
                            <View style={styles.orderIndexContainer}>
                              <Text style={styles.orderIndexText}>Order {index + 1}</Text>
                            </View>
                          )}
                          
                          {/* Pharmacy Address */}
                          <View style={styles.addressSection}>
                            <View style={styles.addressIconContainer}>
                              <Ionicons name="storefront" size={18} color="#00BF63" />
                            </View>
                            <View style={styles.addressInfo}>
                              <Text style={styles.addressLabel}>Pickup</Text>
                              <Text style={styles.addressText}>{order.pharmacy?.name || 'Unknown Pharmacy'}</Text>
                              <Text style={styles.addressSubtext}>
                                {order.pharmacy?.street_address || order.pharmacy?.barangay}, {order.pharmacy?.city}
                              </Text>
                            </View>
                          </View>

                          {/* Customer Address */}
                          <View style={styles.addressSection}>
                            <View style={styles.addressIconContainer}>
                              <Ionicons name="location" size={18} color="#FF6B35" />
                            </View>
                            <View style={styles.addressInfo}>
                              <Text style={styles.addressLabel}>Deliver to</Text>
                              <Text style={styles.addressText}>{order.customer_name}</Text>
                              <Text style={styles.addressSubtext}>
                                {order.delivery_address?.street_address || order.delivery_address?.barangay}, {order.delivery_address?.city}
                              </Text>
                            </View>
                          </View>

                          {index < batch.orders.length - 1 && (
                            <View style={styles.orderSeparator} />
                          )}
                        </View>
                      ))}

                      {/* Accept Batch Button */}
                      <TouchableOpacity 
                        style={[
                          styles.acceptBatchButton,
                          acceptingBatch === batch.batch_id && styles.acceptBatchButtonDisabled
                        ]}
                        onPress={() => handleAcceptBatch(batch)}
                        disabled={acceptingBatch === batch.batch_id}
                      >
                        {acceptingBatch === batch.batch_id ? (
                          <>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.acceptBatchButtonText}>Accepting...</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.acceptBatchButtonText}>
                              {batch.is_batch ? 'Accept Batch' : 'Accept Order'}
                            </Text>
                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  placeholder: {
    width: 40,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  ordersContainer: {
    padding: 16,
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 12,
  },
  batchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  batchInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
  },
  batchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  batchBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00BF63',
  },
  batchEarnings: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00BF63',
    marginLeft: 12,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00BF63',
  },
  expandedContent: {
    backgroundColor: '#F9F9F9',
    paddingVertical: 16,
  },
  orderDetails: {
    paddingHorizontal: 16,
  },
  orderIndexContainer: {
    marginBottom: 12,
  },
  orderIndexText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00BF63',
    textTransform: 'uppercase',
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 4,
  },
  addressSubtext: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  orderSeparator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  acceptBatchButton: {
    backgroundColor: '#00BF63',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  acceptBatchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  acceptBatchButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
});

