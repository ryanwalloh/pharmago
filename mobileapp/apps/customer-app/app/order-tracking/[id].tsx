import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import ErrorBoundary from '../../components/ErrorBoundary';

// CRITICAL: DO NOT import OrderTrackingScreen at module level
// Production builds require significant delay for native bridge initialization

export default function OrderTrackingRoute() {
  const [ScreenComponent, setScreenComponent] = React.useState<any>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const [debugInfo, setDebugInfo] = React.useState<string>('Initializing...');
  
  React.useEffect(() => {
    // Extended delay for production builds - they run MUCH faster than dev
    // Dev: ~100ms for bridge, Production: ~400ms for bridge
    const delay = __DEV__ ? 200 : 500; // 500ms for production!
    
    const startTime = Date.now();
    setDebugInfo(`Waiting ${delay}ms for bridge... (${__DEV__ ? 'DEV' : 'PROD'})`);
    console.log(`📱 Waiting ${delay}ms for bridge initialization...`);
    
    const timer = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      setDebugInfo(`Loading module after ${elapsed}ms...`);
      
      try {
        console.log('🔄 Attempting to load OrderTrackingScreen module...');
        
        // NOW require the screen - bridge should be ready
        const Screen = require('../../screens/OrderTrackingScreen').default;
        
        console.log('✅ OrderTrackingScreen module loaded successfully!');
        setDebugInfo(`Success! Loaded in ${Date.now() - startTime}ms`);
        setScreenComponent(() => Screen);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Failed to load OrderTrackingScreen:', error);
        setLoadError(errorMsg);
        setDebugInfo(`Error after ${Date.now() - startTime}ms: ${errorMsg.substring(0, 50)}...`);
        
        // Retry once after additional delay
        if (loadAttempt === 0) {
          console.log('🔄 Retrying in 1 second...');
          setTimeout(() => {
            setDebugInfo('Retrying with longer delay...');
            setLoadAttempt(1);
          }, 1000);
        }
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, [loadAttempt]);
  
  if (loadError && loadAttempt > 0) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Failed to load tracking screen</Text>
        <Text style={styles.errorDetail}>{loadError}</Text>
      </View>
    );
  }
  
  if (!ScreenComponent) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#00bf63" />
        <Text style={styles.loadingText}>
          {loadAttempt > 0 ? 'Retrying...' : 'Loading order tracking...'}
        </Text>
        {/* Show debug info on screen (visible in production!) */}
        <Text style={styles.debugText}>{debugInfo}</Text>
      </View>
    );
  }
  
  // Render the dynamically loaded component wrapped in error boundary
  return (
    <ErrorBoundary
      fallback={
        <View style={styles.error}>
          <Text style={styles.errorText}>Order tracking screen error</Text>
          <Text style={styles.errorDetail}>
            The tracking screen encountered an error. Your order is still being processed.
          </Text>
        </View>
      }
      onError={(error, errorInfo) => {
        console.error('OrderTrackingScreen crashed:', error, errorInfo);
        setDebugInfo(`Render error: ${error.message}`);
      }}
    >
      <ScreenComponent />
    </ErrorBoundary>
  );
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
  debugText: {
    marginTop: 16,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
