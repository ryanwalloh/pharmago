import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
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

const CACHE_KEY = 'rider_history_cache';
const CACHE_TTL_MINUTES = 5;

const HistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    'Nexa-ExtraLight': require('../../assets/fonts/Nexa-ExtraLight.ttf'),
    'Nexa-Heavy': require('../../assets/fonts/Nexa-Heavy.ttf'),
  });
  const [riderId, setRiderId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<AssignmentHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAssignments, setExpandedAssignments] = useState<Record<number, boolean>>({});

  const parseAssignments = (data: any): AssignmentHistory[] => {
    if (!data) return [];
    const payload = Array.isArray(data.assignments) ? data.assignments : [];
    return payload as AssignmentHistory[];
  };

  const hydrateFromCache = useCallback(async (): Promise<boolean> => {
    try {
      const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
      if (!cachedRaw) return false;

      const cached = JSON.parse(cachedRaw);
      if (!cached || !cached.data || !cached.timestamp) return false;

      const cacheAgeMinutes =
        (Date.now() - Number(cached.timestamp)) / (1000 * 60);

      if (Array.isArray(cached.data)) {
        setAssignments(cached.data as AssignmentHistory[]);
        setLoading(false);
      }

      return cacheAgeMinutes <= CACHE_TTL_MINUTES;
    } catch (error) {
      console.warn('⚠️ Failed to hydrate history cache', error);
      return false;
    }
  }, []);

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
          const parsedAssignments = parseAssignments(response.data);
          setAssignments(parsedAssignments);

          try {
            await AsyncStorage.setItem(
              CACHE_KEY,
              JSON.stringify({
                data: parsedAssignments,
                timestamp: Date.now(),
              })
            );
          } catch (cacheError) {
            console.warn('⚠️ Failed to write history cache', cacheError);
          }
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
    let isMounted = true;

    const bootstrap = async () => {
      if (!riderId || !isMounted) return;

      const cacheFresh = await hydrateFromCache();
      if (!cacheFresh) {
        fetchHistory();
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [riderId, fetchHistory, hydrateFromCache]);

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
          <View style={styles.proofContainer}>
            <Text style={styles.orderLabel}>Proof:</Text>
            <Image
              source={{ uri: order.proof_of_delivery_url }}
              style={styles.proofImage}
              resizeMode="cover"
            />
          </View>
        ) : null}
      </View>
    );
  };

  const renderAssignment = ({ item }: { item: AssignmentHistory }) => {
    const isExpanded = expandedAssignments[item.assignment_db_id] ?? false;

    const toggleExpanded = () => {
      setExpandedAssignments((prev) => ({
        ...prev,
        [item.assignment_db_id]: !isExpanded,
      }));
    };

    return (
      <View style={styles.assignmentCard}>
        <TouchableOpacity
          onPress={toggleExpanded}
          activeOpacity={0.7}
          style={styles.assignmentHeaderRow}
        >
          <View>
            <Text style={styles.assignmentTitle}>{item.assignment_id}</Text>
            <Text style={styles.assignmentMeta}>
              Completed: {formatDateTime(item.completed_at)}
            </Text>
          </View>
          <Text style={styles.expandIndicator}>{isExpanded ? 'Hide' : 'View More'}</Text>
        </TouchableOpacity>

        <View style={styles.assignmentSummaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Orders</Text>
            <Text style={styles.summaryItemValue}>{item.orders.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Earnings</Text>
            <Text style={styles.summaryItemValue}>{formatCurrency(item.rider_earnings)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Type</Text>
            <Text style={styles.summaryItemValue}>{item.assignment_type.toUpperCase()}</Text>
          </View>
        </View>

        {isExpanded && (
          <>
            {item.notes ? (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesContent}>{item.notes}</Text>
              </View>
            ) : null}

            <View style={styles.orderList}>
              {item.orders.map((order, index) => renderOrder(order, index))}
            </View>
          </>
        )}
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

  const totalEarnings = useMemo(
    () =>
      assignments.reduce((accumulator, assignment) => accumulator + assignment.rider_earnings, 0),
    [assignments]
  );

  const todaysEarnings = useMemo(() => {
    const today = new Date();
    return assignments.reduce((total, assignment) => {
      if (!assignment.completed_at) {
        return total;
      }

      const completedDate = new Date(assignment.completed_at);
      const isSameDay =
        completedDate.getFullYear() === today.getFullYear() &&
        completedDate.getMonth() === today.getMonth() &&
        completedDate.getDate() === today.getDate();

      if (!isSameDay) {
        return total;
      }

      return total + assignment.rider_earnings;
    }, 0);
  }, [assignments]);

const renderHeader = () => (
  <View>
    <View
      style={[
        styles.headerBanner,
        {
          marginTop: -insets.top,
          paddingTop: insets.top + 6,
        },
      ]}
    >
      <Text style={styles.headerBannerText}>History</Text>
    </View>
      <View style={styles.summaryStack}>
      <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
        <Text style={[styles.summaryLabel, styles.summaryLabelPrimary]}>Total Rider Earnings</Text>
        <Text style={[styles.summaryValue, styles.summaryValuePrimary]}>
          {formatCurrency(totalEarnings)}
        </Text>
        <Text style={[styles.summaryMeta, styles.summaryMetaPrimary]}>
          {assignments.length
            ? `${assignments.length} completed assignment${assignments.length > 1 ? 's' : ''}`
            : 'No completed assignments yet'}
        </Text>
      </View>
      <View style={[styles.summaryCard, styles.summaryCardSecondary]}>
        <Text style={[styles.summaryLabel, styles.summaryLabelSecondary]}>Today’s Earnings</Text>
        <Text style={[styles.summaryValue, styles.summaryValueSecondary]}>
          {formatCurrency(todaysEarnings)}
        </Text>
        <Text style={[styles.summaryMeta, styles.summaryMetaSecondary]}>
          Based on deliveries completed today
        </Text>
      </View>
    </View>
    <Text style={styles.sectionHeading}>Recent Deliveries</Text>
  </View>
);

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#00BF63" />
          <Text style={styles.loadingText}>Loading experience...</Text>
          <BottomNav active="history" />
        </View>
      </SafeAreaView>
    );
  }

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#00BF63" />
          <Text style={styles.loadingText}>Fetching recent deliveries...</Text>
          <BottomNav active="history" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={assignments.length ? <View style={{ height: 96 }} /> : null}
        />
        <BottomNav active="history" />
      </View>
    </SafeAreaView>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#00BF63',
  },
  container: {
    flex: 1,
    backgroundColor: '#F6F9FC',
  },
  headerBanner: {
    backgroundColor: '#00BF63',
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
    paddingTop: 0,
    paddingBottom: 24,
    paddingHorizontal: 24,
    marginHorizontal: -20,
    marginBottom: 24,
  },
  headerBannerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nexa-Heavy',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
    fontFamily: 'Nexa-ExtraLight',
  },
  errorText: {
    fontSize: 16,
    color: '#D93025',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Nexa-Heavy',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    fontFamily: 'Nexa-Heavy',
  },
  hintText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    fontFamily: 'Nexa-ExtraLight',
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
  summaryStack: {
    gap: 14,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  summaryCardPrimary: {
    backgroundColor: '#D1FAE5',
  },
  summaryCardSecondary: {
    backgroundColor: '#DBEAFE',
  },
  summaryLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Nexa-Heavy',
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Nexa-Heavy',
  },
  summaryMeta: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'Nexa-ExtraLight',
  },
  summaryLabelPrimary: {
    color: '#047857',
  },
  summaryLabelSecondary: {
    color: '#1D4ED8',
  },
  summaryValuePrimary: {
    color: '#065F46',
  },
  summaryValueSecondary: {
    color: '#1E3A8A',
  },
  summaryMetaPrimary: {
    color: '#047857',
  },
  summaryMetaSecondary: {
    color: '#1D4ED8',
  },
  sectionHeading: {
    marginTop: 28,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Nexa-Heavy',
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  assignmentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: 'Nexa-Heavy',
  },
  assignmentMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Nexa-ExtraLight',
  },
  expandIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00BF63',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    fontFamily: 'Nexa-Heavy',
  },
  assignmentSummaryRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
  },
  summaryItemLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: 'Nexa-ExtraLight',
  },
  summaryItemValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: 'Nexa-Heavy',
  },
  notesSection: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
    fontFamily: 'Nexa-Heavy',
  },
  notesContent: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'Nexa-ExtraLight',
  },
  orderList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    fontFamily: 'Nexa-Heavy',
  },
  orderStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    textTransform: 'capitalize',
    fontFamily: 'Nexa-Heavy',
  },
  orderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  orderLabel: {
    width: 90,
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Nexa-ExtraLight',
  },
  orderValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontFamily: 'Nexa-ExtraLight',
  },
  orderAddress: {
    lineHeight: 18,
  },
  proofContainer: {
    marginTop: 8,
  },
  proofImage: {
    marginTop: 6,
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
});

