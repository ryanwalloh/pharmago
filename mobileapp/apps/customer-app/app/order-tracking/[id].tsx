import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function OrderTrackingRoute() {
  const [screenLoaded, setScreenLoaded] = React.useState(false);
  
  React.useEffect(() => {
    // Small delay to ensure React Native is fully initialized
    const timer = setTimeout(() => {
      setScreenLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!screenLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#00bf63" />
        <Text style={styles.loadingText}>Loading tracking...</Text>
      </View>
    );
  }
  
  // Lazy load the heavy component after React Native is ready
  const OrderTrackingScreen = require('../../screens/OrderTrackingScreen').default;
  return <OrderTrackingScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
