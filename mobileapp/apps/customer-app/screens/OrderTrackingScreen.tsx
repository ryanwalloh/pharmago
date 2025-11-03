import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

// MINIMAL TEST VERSION
// This version has NO heavy imports to isolate the crash point
// If this works, we'll add features back one by one

const OrderTrackingScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
      setOrderData({
        order_number: 'TEST123',
        order_status: 'pending',
        total_amount: 500,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [id]);

  const handleBack = () => {
    try {
      router.back();
    } catch {
      Alert.alert('Navigation Error', 'Unable to go back');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00bf63" />
          <Text style={styles.loadingText}>Loading order #{id}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Order Tracking (Test)</Text>
        <Text style={styles.subtitle}>Order ID: {id}</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.label}>Order Number:</Text>
          <Text style={styles.value}>{orderData?.order_number}</Text>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{orderData?.order_status}</Text>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.label}>Total:</Text>
          <Text style={styles.value}>₱{orderData?.total_amount}</Text>
        </View>
        
        <Text style={styles.testNote}>
          ✅ If you see this screen, navigation works!
          {'\n\n'}
          Next: Add back features one by one to find the crash.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#00bf63',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  testNote: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 22,
  },
});

export default OrderTrackingScreen;
