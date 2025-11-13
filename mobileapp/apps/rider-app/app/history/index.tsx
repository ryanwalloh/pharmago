import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

import BottomNav from '../../components/BottomNav';
import { apiService } from '../../../customer-app/services/api';

interface AssignmentOrder {
  order_id: number;
  order_number: string;
  order_status: string;
  delivery_fee: number;
  picked_up_at: string | null;
  delivered_at: string | null;
  pickup_sequence: number;
  delivery_sequence: number;
  delivery_address: {
    street_address: string;
    barangay: string;
    city: string;
    full_address: string;
  };
  customer: {
    name: string;
    phone?: string | null;
  };
  proof_of_delivery_url?: string | null;
}

interface AssignmentHistory {
  assignment_id: string;
  assignment_db_id: number;
  completed_at: string | null;
  started_delivery_at: string | null;
  batch_size: number;
  assignment_type: string;
  rider_earnings: number;
  total_delivery_fee: number;
  notes?: string | null;
  orders: AssignmentOrder[];
}

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    return date.toLocaleString();
  } catch {
    return value;
  }
};

const formatCurrency = (value: number) => {
  return `₱${value.toFixed(2)}`;
};

const HistoryScreen: React.FC = () => {
  const [riderId, setRiderId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<AssignmentHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const parseAssignments = (data: any): AssignmentHistory[] => {
    if (!data) return [];
    const payload = Array.isArray(data.assignments) ? data.assignments : [];
    return payload as AssignmentHistory[];
  };

  const fetchHistory = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!riderId) {
        return;
      }

      setError(null);
      const silent = options?.silent ?? false;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await apiService.getRiderAssignmentHistory(riderId, {
          limit: 25,
          offset: 0,
        });

        if (response.success && response.data) {
          setAssignments(parseAssignments(response.data));
        } else {
          setError(response.error || response.message || 'Unable to load history.');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Unexpected error while loading history.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [riderId]
  );

  const loadSession = useCallback(async () => {
    try {
      const storedSession = await AsyncStorage.getItem('rider_session');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed?.rider?.id) {
          setRiderId(Number(parsed.rider.id));
          return;
        }
      }

      const fallbackProfile = await AsyncStorage.getItem('rider_profile');
      if (fallbackProfile) {
        const parsedProfile = JSON.parse(fallbackProfile);
        if (parsedProfile?.id) {
          setRiderId(Number(parsedProfile.id));
        }
      }
    } catch (err) {
      console.error('❌ Failed to load rider session:', err);
      setError('Unable to load rider profile.');
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (riderId) {
      fetchHistory();
    }
  }, [riderId, fetchHistory]);

  useFocusEffect(
    useCallback(() => {
      if (riderId) {
        fetchHistory({ silent: true });
      }
    }, [riderId, fetchHistory])
  );

  const onRefresh = useCallback(() => {
    fetchHistory({ silent: true });
  }, [fetchHistory]);

  const renderOrder = (order: AssignmentOrder, index: number) => {
    return (
      <View key={`${order.order_id}-${index}`} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderTitle}>{order.order_number}</Text>
          <Text style={styles.orderStatus}>{order.order_status.replace(/_/g, ' ')}</Text>
        </View>

        <View style={styles.orderRow}>
          <Text style={styles.orderLabel}>Customer:</Text>
          <Text style={styles.orderValue}>{order.customer.name}</Text>
        </View>

        {order.customer.phone ? (
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Phone:</Text>
            <Text style={styles.orderValue}>{order.customer.phone}</Text>
          </View>
        ) : null}

        <View style={styles.orderRow}>
          <Text style={styles.orderLabel}>Fee:</Text>
          <Text style={styles.orderValue}>{formatCurrency(order.delivery_fee)}</Text>
        </View>

        <View style={styles.orderRow}>
          <Text style={styles.orderLabel}>Delivered:</Text>
          <Text style={styles.orderValue}>{formatDateTime(order.delivered_at)}</Text>
        </View>

        <View style={styles.orderRow}>
          <Text style={styles.orderLabel}>Address:</Text>
          <Text style={[styles.orderValue, styles.orderAddress]}>
            {order.delivery_address.full_address ||
              `${order.delivery_address.street_address}, ${order.delivery_address.barangay}, ${order.delivery_address.city}`}
          </Text>
        </View>

        {order.proof_of_delivery_url ? (
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Proof:</Text>
            <Text style={[styles.orderValue, styles.proofLink]}>
              {order.proof_of_delivery_url}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderAssignment = ({ item }: { item: AssignmentHistory }) => {
    return (
      <View style={styles.assignmentCard}>
        <View style={styles.assignmentHeader}>
          <Text style={styles.assignmentTitle}>{item.assignment_id}</Text>
          <Text style={styles.assignmentMeta}>
            Completed: {formatDateTime(item.completed_at)}
          </Text>
        </View>

        <View style={styles.assignmentStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Orders</Text>
            <Text style={styles.statValue}>{item.orders.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Earnings</Text>
            <Text style={styles.statValue}>{formatCurrency(item.rider_earnings)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Type</Text>
            <Text style={styles.statValue}>{item.assignment_type.toUpperCase()}</Text>
          </View>
        </View>

        {item.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesContent}>{item.notes}</Text>
          </View>
        ) : null}

        <View style={styles.orderList}>
          {item.orders.map((order, index) => renderOrder(order, index))}
        </View>
      </View>
    );
  };

  const isInitialLoading = loading && assignments.length === 0 && !error;

  const listEmptyComponent = () => (
    <View style={styles.centerContent}>
      {error ? (
        <>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.hintText}>Pull down to try again.</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>No completed deliveries yet</Text>
          <Text style={styles.hintText}>
            Completed orders will appear here for quick review.
          </Text>
        </>
      )}
    </View>
  );

  if (isInitialLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#00BF63" />
        <Text style={styles.loadingText}>Fetching recent deliveries...</Text>
        <BottomNav active="history" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={assignments}
        keyExtractor={(item) => `${item.assignment_db_id}`}
        renderItem={renderAssignment}
        contentContainerStyle={[
          styles.listContent,
          assignments.length === 0 ? styles.emptyListPadding : undefined,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00BF63" />
        }
        ListHeaderComponent={<Text style={styles.screenTitle}>Recent Deliveries</Text>}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={assignments.length ? <View style={{ height: 96 }} /> : null}
      />
      <BottomNav active="history" />
    </View>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F9FC',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#D93025',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  hintText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 140,
    flexGrow: 1,
  },
  emptyListPadding: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  assignmentHeader: {
    marginBottom: 12,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  assignmentMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  assignmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  notesSection: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 14,
    color: '#1F2937',
  },
  orderList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    textTransform: 'capitalize',
  },
  orderRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  orderLabel: {
    width: 90,
    fontSize: 13,
    color: '#6B7280',
  },
  orderValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  orderAddress: {
    lineHeight: 18,
  },
  proofLink: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
});

