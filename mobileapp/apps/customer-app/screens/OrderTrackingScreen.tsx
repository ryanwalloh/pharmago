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

// PHASE 1.7: Added Dimensions.get() back
// Testing if Dimensions causes the crash
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OrderData {
  order_id: number;
  order_number: string;
  order_status: string;
  total_amount: number;
}

const OrderTrackingScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOrderData({
        order_id: parseInt(id as string) || 0,
        order_number: `ORD-TEST-${id}`,
        order_status: 'pending',
        total_amount: 500,
      });
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
          <View style={styles.orderCard}>
            <Ionicons name="receipt-outline" size={32} color="#00bf63" />
            <Text style={styles.orderNumber}>{orderData?.order_number}</Text>
            <Text style={styles.orderStatus}>{orderData?.order_status.toUpperCase()}</Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="cash-outline" size={24} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Total Amount</Text>
              <Text style={styles.infoValue}>₱{orderData?.total_amount.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.testNote}>
            <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
            <Text style={styles.testNoteText}>
              Phase 1.7: Testing WITH Dimensions.get()
              {'\n'}
              SCREEN_WIDTH = {SCREEN_WIDTH}
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
  headerContainer: {
    paddingHorizontal: SCREEN_WIDTH * 0.05, // Using responsive padding
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
    padding: SCREEN_WIDTH * 0.05, // Using responsive padding
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
  orderStatus: {
    fontSize: 14,
    color: '#F57C00',
    fontWeight: 'bold',
    fontFamily: fontFamily.heavy,
    backgroundColor: '#FFF3E0',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: fontFamily.light,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: fontFamily.heavy,
  },
  testNote: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  testNoteText: {
    fontSize: 14,
    color: '#2E7D32',
    fontFamily: fontFamily.light,
    lineHeight: 22,
    marginLeft: 12,
    flex: 1,
  },
});

export default OrderTrackingScreen;
