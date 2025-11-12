import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Image,
  ImageBackground,
  StatusBar,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiService } from '../../../customer-app/services/api';
import { dispatchService, DispatchOffer } from '../../../customer-app/services/dispatchService';
import { orderCountService } from '../../../customer-app/services/orderCountService';
import DispatchOfferModal from '../../components/DispatchOfferModal';
import BottomNav from '../../components/BottomNav';

// ⚙️ DEVELOPMENT FLAG: Set to true to enable dispatch WebSocket
const ENABLE_DISPATCH_WEBSOCKET = true;

// ⚙️ NEW FLAG: Set to true to enable order count WebSocket (replaces polling)
const ENABLE_ORDER_COUNT_WEBSOCKET = true;

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
  const [orderCountConnected, setOrderCountConnected] = useState(false);

  // Dispatch Offer Modal State
  const [currentDispatchOffer, setCurrentDispatchOffer] = useState<DispatchOffer | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [rejectingOffer, setRejectingOffer] = useState(false);
  
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


  // ========== DISPATCH OFFER HANDLERS ==========

  /**
   * Handle incoming dispatch offer from WebSocket
   */
  const handleDispatchOffer = useCallback((offer: DispatchOffer) => {
    console.log('🚨 NEW DISPATCH OFFER RECEIVED!', offer);
    setCurrentDispatchOffer(offer);
    setShowDispatchModal(true);
  }, []);

  /**
   * Handle offer cancellation from WebSocket
   */
  const handleOfferCancelled = useCallback((offerId: string) => {
    console.log('🚫 Offer cancelled:', offerId);
    setCurrentDispatchOffer((prev) => {
      if (prev?.offer_id === offerId) {
        setShowDispatchModal(false);
        Alert.alert('Offer Cancelled', 'This order was assigned to another rider.');
        return null;
      }
      return prev;
    });
  }, []);

  /**
   * Accept dispatch offer
   */
  const handleAcceptOffer = async () => {
    if (!currentDispatchOffer || !riderProfile?.id) return;

    setAcceptingOffer(true);
    
    try {
      const result = await dispatchService.acceptOffer(
        currentDispatchOffer.offer_id,
        riderProfile.id
      );

      if (result.success) {
        // Close modal
        setShowDispatchModal(false);
        
        // Navigate to delivery tracking screen using assignment_id from backend
        const assignmentId = (result as any).assignment_id;
        if (assignmentId) {
          console.log(`🚀 Navigating to delivery tracking: /delivery/${assignmentId}`);
          router.push(`/delivery/${assignmentId}` as any);
        } else {
          Alert.alert('Success', 'Order accepted! Check Active Deliveries.');
        }
        
        // Clear offer state
        setCurrentDispatchOffer(null);
        
        // Refresh available orders count
        fetchAvailableOrders();
      } else {
        Alert.alert('Failed to Accept', result.message || 'Please try again.');
      }
    } catch (error) {
      console.error('❌ Error accepting offer:', error);
      Alert.alert('Error', 'Failed to accept offer. Please try again.');
    } finally {
      setAcceptingOffer(false);
    }
  };

  /**
   * Reject dispatch offer
   */
  const handleRejectOffer = async () => {
    if (!currentDispatchOffer || !riderProfile?.id) return;

    setRejectingOffer(true);
    
    try {
      const result = await dispatchService.rejectOffer(
        currentDispatchOffer.offer_id,
        riderProfile.id,
        'not_interested'
      );

      if (result.success) {
        console.log('✅ Offer rejected successfully');
        setShowDispatchModal(false);
        setCurrentDispatchOffer(null);
      } else {
        Alert.alert('Failed to Reject', result.message || 'Please try again.');
      }
    } catch (error) {
      console.error('❌ Error rejecting offer:', error);
      Alert.alert('Error', 'Failed to reject offer. Please try again.');
    } finally {
      setRejectingOffer(false);
    }
  };

  /**
   * Toggle rider online/offline status
   */
  const handleToggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    
    // Update UI immediately
    setIsOnline(newStatus);
    
    // Update backend
    if (riderProfile?.id) {
      try {
        await dispatchService.updateRiderStatus(
          riderProfile.id,
          newStatus ? 'online' : 'offline'
        );
        console.log(`✅ Rider status updated to: ${newStatus ? 'online' : 'offline'}`);
      } catch (error) {
        console.error('❌ Failed to update rider status:', error);
      }
    }
    
    // Connect/disconnect dispatch WebSocket
    if (ENABLE_DISPATCH_WEBSOCKET && riderProfile?.id) {
      if (newStatus) {
        // Going online - connect to dispatch channel
        console.log('🔌 Connecting to dispatch WebSocket (rider going online)');
        dispatchService.connectToDispatchChannel(
          riderProfile.id,
          handleDispatchOffer,
          handleOfferCancelled
        );
      } else {
        // Going offline - disconnect
        console.log('🔌 Disconnecting from dispatch WebSocket (rider going offline)');
        dispatchService.disconnect();
      }
    }
  };

  useEffect(() => {
    loadRiderData();
    
    if (!ENABLE_ORDER_COUNT_WEBSOCKET) {
      fetchAvailableOrders();
      const orderPollingInterval = setInterval(() => {
        console.log('📡 Polling for order updates (LEGACY MODE)');
        fetchAvailableOrders();
      }, 15000);
      
      return () => {
        clearInterval(orderPollingInterval);
        if (ENABLE_DISPATCH_WEBSOCKET) {
          dispatchService.disconnect();
        }
      };
    }
    
    if (ENABLE_ORDER_COUNT_WEBSOCKET) {
      console.log('🔌 Connecting to order count WebSocket');
      orderCountService.connectToOrderCount(
        (count) => {
          setAvailableOrdersCount((prevCount) => {
            const timestamp = new Date().toLocaleTimeString();
            if (count !== prevCount) {
              console.log(`🔄 [${timestamp}] Order count updated (WebSocket): ${prevCount} → ${count}`);
            }
            return count;
          });
        },
        () => {
          console.log('✅ Order count WebSocket connected');
          setOrderCountConnected(true);
        },
        () => {
          console.log('🔌 Order count WebSocket disconnected');
          setOrderCountConnected(false);
        }
      );
    }
    
    return () => {
      if (ENABLE_ORDER_COUNT_WEBSOCKET) {
        orderCountService.disconnect();
      }
      if (ENABLE_DISPATCH_WEBSOCKET) {
        dispatchService.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!(ENABLE_DISPATCH_WEBSOCKET && riderProfile?.id && isOnline)) {
        return () => {};
      }

      console.log('🔌 Connecting to dispatch WebSocket (home focused)');
      dispatchService.connectToDispatchChannel(
        riderProfile.id,
        handleDispatchOffer,
        handleOfferCancelled
      );

      return () => {
        console.log('🔌 Disconnecting dispatch WebSocket (home blurred)');
        dispatchService.disconnect();
        setShowDispatchModal(false);
        setCurrentDispatchOffer(null);
      };
    }, [riderProfile?.id, isOnline, handleDispatchOffer, handleOfferCancelled])
  );

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
            onPress={handleToggleOnlineStatus}
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
                  orderCountConnected && ENABLE_ORDER_COUNT_WEBSOCKET && styles.liveBadgeConnected
                ]}>
                  <Text style={styles.liveBadgeText}>
                    {ENABLE_ORDER_COUNT_WEBSOCKET ? (orderCountConnected ? 'LIVE' : 'CONNECTING') : 'POLLING'}
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

      <BottomNav active="home" />

      {/* Dispatch Offer Modal */}
      <DispatchOfferModal
        visible={showDispatchModal}
        offer={currentDispatchOffer}
        onAccept={handleAcceptOffer}
        onReject={handleRejectOffer}
        accepting={acceptingOffer}
        rejecting={rejectingOffer}
      />
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
});
