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
import { useFonts } from 'expo-font';
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

interface RecentTransaction {
  id: string;
  type: string;
  time: string;
  amount: number;
}

const RECENT_TRANSACTIONS_CACHE_TTL_MINUTES = 5;
const getRecentTransactionsCacheKey = (riderId: number) =>
  `rider_recent_transactions_${riderId}`;

const formatTransactionTime = (timestamp: string | null) => {
  if (!timestamp) {
    return 'Completion time unavailable';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Completion time unavailable';
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeString = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) {
    return `Today, ${timeString}`;
  }

  if (isYesterday) {
    return `Yesterday, ${timeString}`;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const mapAssignmentToTransaction = (assignment: any): RecentTransaction => {
  const orders = Array.isArray(assignment.orders) ? assignment.orders : [];
  const ordersCount = orders.length;
  const isBatch = String(assignment.assignment_type || '').toLowerCase() === 'batch';

  let typeLabel = 'Delivery completed';
  if (isBatch && ordersCount > 1) {
    typeLabel = `${ordersCount} batch deliveries`;
  } else if (ordersCount > 1) {
    typeLabel = `${ordersCount} deliveries completed`;
  } else if (ordersCount === 1) {
    const orderNumber = orders[0]?.order_number;
    typeLabel = orderNumber ? `Delivered ${orderNumber}` : 'Single delivery completed';
  }

  return {
    id: String(assignment.assignment_db_id ?? assignment.assignment_id ?? Math.random()),
    type: typeLabel,
    time: formatTransactionTime(assignment.completed_at),
    amount: typeof assignment.rider_earnings === 'number'
      ? assignment.rider_earnings
      : Number(assignment.rider_earnings || 0),
  };
};

export default function RiderHome() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    'Nexa-ExtraLight': require('../../assets/fonts/Nexa-ExtraLight.ttf'),
    'Nexa-Heavy': require('../../assets/fonts/Nexa-Heavy.ttf'),
  });
  const [user, setUser] = useState<RiderUser | null>(null);
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [stats, setStats] = useState({
    totalDeliveries: 342,
    rating: 4.8,
  });
  const [availableOrdersCount, setAvailableOrdersCount] = useState(0);
  const [orderCountConnected, setOrderCountConnected] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherInfo, setWeatherInfo] = useState<{
    temperature: number;
    description: string;
    friendlyMessage: string;
    precipitationChance: number | null;
  } | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [recentTransactionsLoading, setRecentTransactionsLoading] = useState<boolean>(false);
  const [recentTransactionsError, setRecentTransactionsError] = useState<string | null>(null);

  // Dispatch Offer Modal State
  const [currentDispatchOffer, setCurrentDispatchOffer] = useState<DispatchOffer | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [rejectingOffer, setRejectingOffer] = useState(false);
  
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

  const getWeatherDescription = (code: number) => {
    const descriptions: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mostly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Freezing drizzle',
      57: 'Freezing drizzle',
      61: 'Light rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Freezing rain',
      67: 'Freezing rain',
      71: 'Light snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Light showers',
      81: 'Moderate showers',
      82: 'Heavy showers',
      85: 'Snow showers',
      86: 'Snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm & hail',
      99: 'Severe thunderstorm'
    };

    return descriptions[code] || 'Weather unavailable';
  };

  const getFriendlyWeatherMessage = (code: number, precipitationChance: number | null, temperature: number) => {
    if (precipitationChance !== null) {
      if (precipitationChance >= 70) {
        return `${precipitationChance}% chance of rain, bring your raincoat!`;
      }
      if (precipitationChance >= 40) {
        return `${precipitationChance}% chance of showers, stay alert on the road.`;
      }
    }

    if (temperature >= 34) {
      return 'It\'s a hot day, stay hydrated between trips!';
    }
    if (temperature <= 24) {
      return 'Cool breeze today, perfect for smooth deliveries.';
    }

    const codeGroups: Record<string, number[]> = {
      thunderstorms: [95, 96, 99],
      heavyRain: [65, 67, 82],
      lightRain: [61, 63, 80, 81],
      drizzleFog: [45, 48, 51, 53, 55, 56, 57],
      snow: [71, 73, 75, 77, 85, 86],
      clear: [0, 1],
      clouds: [2, 3]
    };

    if (codeGroups.thunderstorms.includes(code)) {
      return 'Stormy skies ahead, plan safe routes and take it slow.';
    }
    if (codeGroups.heavyRain.includes(code)) {
      return 'Heavy rain incoming, double-check your gear.';
    }
    if (codeGroups.lightRain.includes(code)) {
      return 'Light rain outside, keep deliveries covered.';
    }
    if (codeGroups.drizzleFog.includes(code)) {
      return 'Foggy vibes, keep your lights on and ride safe.';
    }
    if (codeGroups.snow.includes(code)) {
      return 'Cold and slippery. Maintain extra caution out there.';
    }
    if (codeGroups.clear.includes(code)) {
      return 'Bright day for deliveries, enjoy the ride!';
    }
    if (codeGroups.clouds.includes(code)) {
      return 'Good day for deliveries, keep the momentum going!';
    }

    return 'Weather looks manageable, deliveries are good to go!';
  };

  const fetchRecentTransactions = useCallback(async (riderId: number) => {
    try {
      setRecentTransactionsLoading(true);
      setRecentTransactionsError(null);

      const response = await apiService.getRiderAssignmentHistory(riderId, {
        limit: 5,
        offset: 0,
      });

      if (response.success && response.data) {
        const assignments = Array.isArray(response.data.assignments)
          ? response.data.assignments
          : [];
        const mapped = assignments.slice(0, 5).map(mapAssignmentToTransaction);
        setRecentTransactions(mapped);

        try {
          await AsyncStorage.setItem(
            getRecentTransactionsCacheKey(riderId),
            JSON.stringify({
              timestamp: Date.now(),
              entries: mapped,
            })
          );
        } catch (cacheError) {
          console.warn('⚠️ Failed to write recent transactions cache', cacheError);
        }
      } else {
        setRecentTransactions([]);
        setRecentTransactionsError(response.error || response.message || 'Unable to load recent deliveries.');
      }
    } catch (error) {
      console.error('❌ Failed to load recent transactions:', error);
      setRecentTransactions([]);
      setRecentTransactionsError(
        error instanceof Error ? error.message : 'Unable to load recent deliveries.'
      );
    } finally {
      setRecentTransactionsLoading(false);
    }
  }, []);

  const hydrateRecentTransactionsFromCache = useCallback(
    async (riderId: number): Promise<boolean> => {
      try {
        const cacheKey = getRecentTransactionsCacheKey(riderId);
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        if (!cachedRaw) {
          return false;
        }

        const cached = JSON.parse(cachedRaw);
        if (!cached || !Array.isArray(cached.entries) || !cached.timestamp) {
          return false;
        }

        const cacheAgeMinutes = (Date.now() - Number(cached.timestamp)) / (1000 * 60);
        setRecentTransactions(cached.entries as RecentTransaction[]);
        setRecentTransactionsError(null);
        setRecentTransactionsLoading(false);

        return cacheAgeMinutes <= RECENT_TRANSACTIONS_CACHE_TTL_MINUTES;
      } catch (error) {
        console.warn('⚠️ Failed to hydrate recent transactions cache', error);
        return false;
      }
    },
    []
  );

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeatherLoading(true);
        setWeatherError(null);

        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=8.2325853&longitude=124.2680082&current_weather=true&hourly=precipitation_probability,weather_code&forecast_days=1&timezone=auto'
        );

        if (!response.ok) {
          throw new Error(`Weather request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data?.current_weather) {
          throw new Error('Weather data missing from response');
        }

        const currentWeather = data.current_weather;
        const weatherCode: number = currentWeather.weathercode;
        const temperature: number = currentWeather.temperature;

        let precipitationChance: number | null = null;

        if (data.hourly?.time && data.hourly.precipitation_probability) {
          const currentTimeIndex = data.hourly.time.indexOf(currentWeather.time);
          if (currentTimeIndex !== -1) {
            const chance = data.hourly.precipitation_probability[currentTimeIndex];
            if (typeof chance === 'number') {
              precipitationChance = chance;
            }
          }
        }

        const description = getWeatherDescription(weatherCode);
        const friendlyMessage = getFriendlyWeatherMessage(weatherCode, precipitationChance, temperature);

        setWeatherInfo({
          temperature,
          description,
          friendlyMessage,
          precipitationChance
        });
      } catch (error) {
        console.error('❌ Failed to fetch weather:', error);
        setWeatherInfo(null);
        setWeatherError('Weather currently unavailable. Please try again later.');
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, []);

  useEffect(() => {
    const riderId = riderProfile?.id;
    if (!riderId) {
      return;
    }

    let isCancelled = false;

    const loadRecentTransactions = async () => {
      setRecentTransactionsLoading(true);
      const cacheFresh = await hydrateRecentTransactionsFromCache(Number(riderId));
      if (isCancelled) {
        return;
      }
      if (!cacheFresh) {
        fetchRecentTransactions(Number(riderId));
      }
    };

    loadRecentTransactions();

    return () => {
      isCancelled = true;
    };
  }, [riderProfile?.id, fetchRecentTransactions, hydrateRecentTransactionsFromCache]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#00BF63" />
        <Text style={styles.loadingText}>Loading experience...</Text>
      </View>
    );
  }

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
          
          <View style={styles.weatherContainer}>
            <Text style={styles.weatherCity}>Iligan City</Text>
            {weatherLoading && (
              <Text style={styles.weatherLoading}>Checking today&apos;s weather...</Text>
            )}
            {!weatherLoading && weatherInfo && (
              <>
                <Text style={styles.weatherTemperature}>{Math.round(weatherInfo.temperature)}°C</Text>
                <Text style={styles.weatherDescription}>{weatherInfo.description}</Text>
                <Text style={styles.weatherMessage}>{weatherInfo.friendlyMessage}</Text>
              </>
            )}
            {!weatherLoading && weatherError && (
              <>
                <Text style={styles.weatherFallbackTitle}>Weather currently unavailable</Text>
                <Text style={styles.weatherMessage}>{weatherError}</Text>
              </>
            )}
          </View>
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
          
          {recentTransactionsLoading ? (
            <Text style={styles.transactionPlaceholder}>Loading recent deliveries...</Text>
          ) : recentTransactionsError ? (
            <Text style={styles.transactionError}>{recentTransactionsError}</Text>
          ) : recentTransactions.length === 0 ? (
            <Text style={styles.transactionPlaceholder}>No completed deliveries yet.</Text>
          ) : (
            recentTransactions.map((transaction, index) => (
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
            ))
          )}
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
    bottom: 30,
  },
  pharmagoText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Nexa-Heavy',
  },
  partnerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    bottom: 40,
    fontFamily: 'Nexa-Heavy',
  },
  weatherContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 240,
    bottom: 0,
  },
  weatherCity: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    marginBottom: 0,
    textTransform: 'uppercase',
    fontFamily: 'Nexa-Heavy',
  },
  weatherLoading: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  weatherTemperature: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nexa-Heavy',
  },
  weatherDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 0,
    textTransform: 'capitalize',
    fontFamily: 'Nexa-Heavy',
  },
  weatherMessage: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
    lineHeight: 16,
    fontFamily: 'Nexa-ExtraLight',
  },
  weatherFallbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
    fontFamily: 'Nexa-Heavy',
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
    fontFamily: 'Nexa-Heavy',
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#999999',
    fontFamily: 'Nexa-ExtraLight',
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
    fontFamily: 'Nexa-Heavy',
  },
  viewDetailsLink: {
    fontSize: 12,
    color: '#00BF63',
    fontWeight: '500',
    fontFamily: 'Nexa-Heavy',
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
    fontFamily: 'Nexa-Heavy',
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
    fontFamily: 'Nexa-Heavy',
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
    fontFamily: 'Nexa-Heavy',
  },
  transactionTime: {
    fontSize: 12,
    color: '#999999',
    fontFamily: 'Nexa-ExtraLight',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00BF63',
    fontFamily: 'Nexa-Heavy',
  },
  transactionPlaceholder: {
    fontSize: 14,
    color: '#999999',
    paddingVertical: 8,
    textAlign: 'center',
    fontFamily: 'Nexa-ExtraLight',
  },
  transactionError: {
    fontSize: 14,
    color: '#FF5252',
    paddingVertical: 8,
    textAlign: 'center',
    fontFamily: 'Nexa-Heavy',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    width: '90%',
    left: 44,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 14,
    color: '#777777',
  },
});
