import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Image,
  ImageBackground,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { apiService } from '../../../customer-app/services/api';

// ⚙️ DEVELOPMENT FLAG: Set to false to disable WebSocket (use polling only)
const ENABLE_WEBSOCKET = false;

interface RiderUser {
  id: number;
  email: string;
  phone_number: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

export default function RiderHome() {
  const router = useRouter();
  const [user, setUser] = useState<RiderUser | null>(null);
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(1247.50);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [stats, setStats] = useState({
    totalDeliveries: 342,
    rating: 4.8,
  });
  const [availableOrdersCount, setAvailableOrdersCount] = useState(0);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Mock data
  const recentTransactions = [
    { id: 1, type: '5 batch deliveries', time: 'Today, 1:23pm', amount: 120.90 },
    { id: 2, type: '3 batch deliveries', time: 'Today, 10:15am', amount: 85.50 },
    { id: 3, type: '7 batch deliveries', time: 'Yesterday, 4:32pm', amount: 156.20 },
  ];

  const loadRiderData = async () => {
    try {
      // Try to load complete session first
      const sessionData = await AsyncStorage.getItem('rider_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        console.log('📦 Loading session data:', session);
        
        setUser(session.user);
        setRiderProfile(session.rider);
        
        if (session.stats) {
          setStats({
            totalDeliveries: session.stats.total_deliveries || 342,
            rating: session.stats.rating || 4.8,
          });
          setTotalEarnings(session.stats.total_earnings || 1247.50);
        }
        
        console.log('✅ Session loaded:', {
          name: `${session.rider?.first_name} ${session.rider?.last_name}`,
          earnings: session.stats?.total_earnings,
          deliveries: session.stats?.total_deliveries,
        });
        
        return;
      }
      
      // Fallback to individual storage items
      const cachedUser = await AsyncStorage.getItem('rider_user');
      const cachedProfile = await AsyncStorage.getItem('rider_profile');
      const cachedStats = await AsyncStorage.getItem('rider_stats');
      
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }
      
      if (cachedProfile) {
        setRiderProfile(JSON.parse(cachedProfile));
      }
      
      if (cachedStats) {
        const parsedStats = JSON.parse(cachedStats);
        setStats({
          totalDeliveries: parsedStats.total_deliveries || 342,
          rating: parsedStats.rating || 4.8,
        });
        setTotalEarnings(parsedStats.total_earnings || 1247.50);
      }
    } catch (error) {
      console.error('Failed to load rider data:', error);
    }
  };

  const fetchAvailableOrders = useCallback(async () => {
    try {
      const res = await apiService.getAvailableOrdersCount();
      
      if (res && res.success && res.data) {
        const count = res.data.count || 0;
        
        setAvailableOrdersCount((prevCount) => {
          // Log with timestamp
          const timestamp = new Date().toLocaleTimeString();
          if (count !== prevCount) {
            console.log(`🔄 [${timestamp}] Order count updated: ${prevCount} → ${count}`);
          } else {
            console.log(`✅ [${timestamp}] Order count unchanged: ${count}`);
          }
          return count;
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch available orders:', error);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    // Get WebSocket URL from environment or derive from API URL
    const getWebSocketUrl = () => {
      // For Railway deployment
      if (process.env.EXPO_PUBLIC_WS_URL) {
        return process.env.EXPO_PUBLIC_WS_URL;
      }
      
      // Derive from current API configuration
      // In production (Railway), this will be wss://your-app.railway.app/ws/rider/orders/
      // In development, this will be ws://192.168.x.x:8000/ws/rider/orders/
      const envBase = process.env.EXPO_PUBLIC_API_BASE;
      if (envBase) {
        const wsProtocol = envBase.startsWith('https') ? 'wss' : 'ws';
        const host = envBase.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        return `${wsProtocol}://${host}/ws/rider/orders/`;
      }
      
      // Fallback to localhost for development
      return 'ws://localhost:8000/ws/rider/orders/';
    };

    try {
      const wsUrl = getWebSocketUrl();
      console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsWebSocketConnected(true);
        
        // Send initial subscription message
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'available_orders'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message:', data);
          
          if (data.type === 'order_count_update' && typeof data.count === 'number') {
            setAvailableOrdersCount((prevCount) => {
              const timestamp = new Date().toLocaleTimeString();
              if (data.count !== prevCount) {
                console.log(`⚡ [${timestamp}] WebSocket: Order count updated: ${prevCount} → ${data.count}`);
              }
              return data.count;
            });
          }
        } catch (error) {
          console.error('❌ WebSocket message parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsWebSocketConnected(false);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsWebSocketConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect WebSocket...');
          connectWebSocket();
        }, 5000) as any;
      };

    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      setIsWebSocketConnected(false);
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      console.log('🔌 Closing WebSocket connection');
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsWebSocketConnected(false);
  }, []);

  useEffect(() => {
    loadRiderData();
    fetchAvailableOrders();
    
    // Try to connect to WebSocket (only if enabled)
    if (ENABLE_WEBSOCKET) {
      console.log('🔌 WebSocket enabled - attempting connection');
      connectWebSocket();
    } else {
      console.log('⚠️ WebSocket disabled - using polling only');
    }
    
    // Set up polling as fallback (only runs if WebSocket is not connected)
    // Polling every 15 seconds
    const orderPollingInterval = setInterval(() => {
      if (!ENABLE_WEBSOCKET || !isWebSocketConnected) {
        console.log('📡 Polling for order updates');
        fetchAvailableOrders();
      }
    }, 15000); // 15 seconds
    
    // Cleanup on unmount
    return () => {
      clearInterval(orderPollingInterval);
      if (ENABLE_WEBSOCKET) {
        disconnectWebSocket();
      }
    };
  }, [fetchAvailableOrders, connectWebSocket, disconnectWebSocket, isWebSocketConnected]);

  const riderFirstName = riderProfile?.first_name || user?.first_name || user?.email?.split('@')[0] || 'Rider';
  
  // Capitalize first letter of rider's name
  const capitalizedRiderName = riderFirstName.charAt(0).toUpperCase() + riderFirstName.slice(1).toLowerCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00BF63" />
      
      {/* Header Container with Background Image */}
      <ImageBackground 
        source={require('../../assets/riderheader.png')} 
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={styles.headerContent}>
          {/* Pharmago Badge */}
          <View style={styles.pharmogoBadge}>
            <Text style={styles.pharmagoText}>Pharmago</Text>
          </View>
          
          {/* Partner Name */}
          <Text style={styles.partnerTitle}>Partner {capitalizedRiderName}</Text>
          
          {/* Your Earnings Label */}
          <Text style={styles.earningsLabel}>YOUR EARNINGS</Text>
          
          {/* Total Earnings */}
          <Text style={styles.earningsAmount}>₱{totalEarnings.toFixed(2)}</Text>
        </View>
      </ImageBackground>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Container */}
        <View style={styles.statusContainer}>
          <View style={styles.statusLeft}>
            <Text style={styles.statusTitle}>Status: {isOnline ? 'Online' : 'Offline'}</Text>
            <Text style={styles.statusSubtitle}>
              {isOnline ? 'Open to any delivery' : 'Not accepting deliveries'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={() => setIsOnline(!isOnline)}
          >
            <View style={[styles.toggleTrack, isOnline && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, isOnline && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Orders Container */}
        <View style={styles.ordersContainer}>
          <View style={styles.ordersContent}>
            <Image 
              source={require('../../assets/order-icon.png')} 
              style={styles.orderIcon}
              resizeMode="contain"
            />
            <View style={styles.ordersText}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.ordersTitle}>{availableOrdersCount} delivery orders found!</Text>
                <View style={[
                  styles.liveBadge, 
                  ENABLE_WEBSOCKET && isWebSocketConnected && styles.liveBadgeConnected
                ]}>
                  <Text style={styles.liveBadgeText}>
                    {ENABLE_WEBSOCKET 
                      ? (isWebSocketConnected ? '⚡ LIVE' : 'LIVE')
                      : 'POLLING'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/orders/' as any)}>
                <Text style={styles.viewDetailsLink}>View details &gt;</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recent Transactions Container */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.transactionsTitle}>Recent Transactions</Text>
          
          {recentTransactions.map((transaction, index) => (
            <View key={transaction.id}>
              <View style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <Image 
                    source={require('../../assets/down.png')} 
                    style={styles.transactionIcon}
                    resizeMode="contain"
                  />
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionType}>{transaction.type}</Text>
                    <Text style={styles.transactionTime}>{transaction.time}</Text>
                  </View>
                </View>
                <Text style={styles.transactionAmount}>+₱{transaction.amount.toFixed(2)}</Text>
              </View>
              {index < recentTransactions.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>

        {/* Bottom Padding for Navigation */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Image 
            source={require('../../assets/home.png')} 
            style={styles.navIcon}
            resizeMode="contain"
          />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Image 
            source={require('../../assets/wallet.png')} 
            style={styles.navIcon}
            resizeMode="contain"
          />
          <Text style={styles.navLabel}>Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Image 
            source={require('../../assets/chat.png')} 
            style={styles.navIcon}
            resizeMode="contain"
          />
          <Text style={styles.navLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile/' as any)}>
          <Image 
            source={require('../../assets/profile.png')} 
            style={styles.navIcon}
            resizeMode="contain"
          />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerImage: {
    width: '100%',
    height: 320,
    justifyContent: 'flex-end',
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  pharmogoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    bottom: 60,
  },
  pharmagoText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  partnerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    bottom: 70,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
    bottom: 30,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    bottom: 40,
  },
  scrollView: {
    flex: 1,
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 22,
  },
  statusLeft: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 0,
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#999999',
  },
  toggleButton: {
    padding: 4,
  },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DDDDDD',
    justifyContent: 'center',
    padding: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#00BF63',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  ordersContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 22,
    paddingHorizontal: 16,
    paddingVertical: 22,
  },
  ordersContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIcon: {
    width: 78,
    height: 78,
    marginRight: 26,
  },
  ordersText: {
    flex: 1,
  },
  ordersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
  },
  viewDetailsLink: {
    fontSize: 12,
    color: '#00BF63',
    fontWeight: '500',
  },
  liveBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  liveBadgeConnected: {
    backgroundColor: '#00C853',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  transactionsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 22,
    padding: 16,
    paddingLeft: 24,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#999999',
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
    opacity: 0.8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: '#999999',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00BF63',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    width: '90%',
    left: 44,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#00BF63',
    fontWeight: '600',
  },
});
