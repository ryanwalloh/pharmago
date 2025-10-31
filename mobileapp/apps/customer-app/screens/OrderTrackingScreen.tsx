import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  Modal,
  Alert,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Region, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { apiService, ApiResponse } from '../services/api';
import { fontFamily } from '../utils/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

interface OrderData {
  order_id: number;
  order_number: string;
  order_status: string;
  prescription_status: string;
  payment_status: string;
  total_amount: number;
  pharmacy_name: string;
  pharmacy_id?: number;
  pharmacy_barangay?: string;
  pharmacy_latitude?: number;
  pharmacy_longitude?: number;
  pharmacy_phone?: string;
  pharmacy_email?: string;
  pharmacy_storefront_image_url?: string;
  delivery_address: string;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  prescription_image_url: string;
  prescription_notes: string;
  created_at: string;
  updated_at: string;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  notes: string;
}

// Helper function to get backend URL (same logic as apiService)
const getBackendBaseUrl = (): string => {
  // Web (localhost)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000';
  }

  // Optional: EXPO_PUBLIC_API_BASE override
  const envBase: string | undefined = process.env.EXPO_PUBLIC_API_BASE as string | undefined;
  if (envBase) {
    return envBase.endsWith('/') ? envBase.slice(0, -1) : envBase;
  }

  // Try to derive host from Expo packager/SourceCode script URL
  try {
    const expHostUri: string | undefined = (Constants as any)?.expoConfig?.hostUri
      || (Constants as any)?.manifest?.debuggerHost
      || (NativeModules as any)?.SourceCode?.scriptURL;

    if (expHostUri) {
      const withoutScheme = expHostUri.replace(/^\w+:\/\//, '');
      const host = withoutScheme.split(':')[0].split('/')[0];
      if (host && /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
        return `http://${host}:8000`;
      }
    }
  } catch {}

  // Fallback: Use Railway backend for production/testing
  // For local development, set EXPO_PUBLIC_API_BASE environment variable
  return 'https://pharmago-backend-production.up.railway.app';
};

const OrderTrackingScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 8.2275, // Iligan City default
    longitude: 124.2456,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [customerLocation, setCustomerLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const mapInitialized = useRef(false);
  const [storefrontImageError, setStorefrontImageError] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [showProceedConfirmModal, setShowProceedConfirmModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionButtonsHidden, setActionButtonsHidden] = useState(false);
  const [chatRoom, setChatRoom] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatPollRef = useRef<any>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatTyping, setChatTyping] = useState<{ customer?: boolean; pharmacy?: boolean }>({});
  const chatTypingPollRef = useRef<any>(null);
  const chatFetchInFlightRef = useRef<boolean>(false);
  const typingTimerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const [, setShowPriceApprove] = useState(false);
  const [approving, setApproving] = useState(false);
  const [dismissedPricingPrompt, setDismissedPricingPrompt] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadPollRef = useRef<any>(null);
  const [autoOpenedChat, setAutoOpenedChat] = useState(false);

  // Fetch chat messages - can optionally take roomId parameter
  const fetchChatMessages = useCallback(async (roomId?: number) => {
    try {
      const targetRoomId = roomId || chatRoom?.id;
      if (!targetRoomId) return;
      if (chatFetchInFlightRef.current) return;
      chatFetchInFlightRef.current = true;
      const msgs = await apiService.getOrderChatMessages(targetRoomId, 100);
      if (msgs.success && (msgs.data as any)?.messages) {
        if (!isMountedRef.current) return;
        setChatMessages((msgs.data as any).messages);
        
        // Check if action buttons should be hidden based on recent messages
        const messages = (msgs.data as any).messages;
        const hasCancellationMessage = messages.some((msg: any) => 
          msg.content && typeof msg.content === 'string' && 
          (msg.content.includes('cancelled this order') || msg.content.includes('proceed with the order'))
        );
        if (hasCancellationMessage) {
          setActionButtonsHidden(true);
        }
        
        // After fetching, mark others' messages as read (customer context)
        try {
          await apiService.markOrderChatRead(targetRoomId);
          setUnreadCount(0); // Clear unread count after marking as read
        } catch {}
      } else if (!msgs.success) {
        if (!isMountedRef.current) return;
        setChatError(msgs.error || 'Failed to load messages');
      }
    } catch {
      if (!isMountedRef.current) return;
      setChatError('Unexpected error loading messages');
    } finally {
      chatFetchInFlightRef.current = false;
    }
  }, [chatRoom?.id]);

  // Poll for unread messages in the background
  const checkUnreadMessages = useCallback(async () => {
    try {
      if (!orderData?.order_id || !orderData?.pharmacy_id || showChatModal) return;
      
      // Get or check chat room
      const roomRes = await apiService.getOrCreateOrderChatRoom(orderData.order_id, orderData.pharmacy_id);
      if (!roomRes.success || !roomRes.data?.room) return;
      
      const room = roomRes.data.room;
      
      // Get unread count
      const msgs = await apiService.getOrderChatMessages(room.id, 100);
      if (msgs.success && (msgs.data as any)?.messages) {
        const messages = (msgs.data as any).messages;
        // Count unread messages from pharmacy
        const unreadPharmacyMessages = messages.filter((m: any) => {
          const roleRaw = String(m.sender_role_code ?? m.sender_role ?? '').toLowerCase();
          const isPharmacy = roleRaw.includes('pharmacy');
          return isPharmacy && !m.read_at;
        });
        
        const newUnreadCount = unreadPharmacyMessages.length;
        
        // Auto-open chat if new message arrives and not already auto-opened
        if (newUnreadCount > 0 && newUnreadCount > unreadCount && !autoOpenedChat && !showChatModal) {
          console.log('🔔 New pharmacy message detected! Auto-opening chat...');
          setUnreadCount(newUnreadCount);
          setChatRoom(room);
          setShowChatModal(true);
          setAutoOpenedChat(true);
          // Fetch messages with the room ID
          await fetchChatMessages(room.id);
        } else {
          setUnreadCount(newUnreadCount);
        }
      }
    } catch (error) {
      console.log('Error checking unread messages:', error);
    }
  }, [orderData?.order_id, orderData?.pharmacy_id, showChatModal, unreadCount, autoOpenedChat, fetchChatMessages]);

  const getCustomerLocation = async () => {
    try {
      // For now, we'll use a default location in Iligan City
      // In a real app, you'd use expo-location to get the user's current location
      setCustomerLocation({
        latitude: 8.2275,
        longitude: 124.2456,
      });
    } catch (error) {
      console.error('Error getting customer location:', error);
    }
  };

  const updateMapRegion = (pharmacyLat: number, pharmacyLng: number, customerLat: number, customerLng: number) => {
    const minLat = Math.min(pharmacyLat, customerLat);
    const maxLat = Math.max(pharmacyLat, customerLat);
    const minLng = Math.min(pharmacyLng, customerLng);
    const maxLng = Math.max(pharmacyLng, customerLng);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max(maxLat - minLat, 0.01) * 1.2; // Add padding
    const deltaLng = Math.max(maxLng - minLng, 0.01) * 1.2; // Add padding
    
    setMapRegion({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    });
  };

  const loadOrderFromStorage = async () => {
    try {
      const storedOrder = await AsyncStorage.getItem('currentOrder');
      if (storedOrder) {
        const order = JSON.parse(storedOrder);
        setOrderData(order);
        console.log('📱 Order data loaded from local storage:', order.order_number || order.order_id);
        setLoading(false);
      } else {
        setError('No order found');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading order from storage:', error);
      setError('Failed to load order data');
      setLoading(false);
    }
  };

  const clearStoredOrder = async () => {
    try {
      await AsyncStorage.removeItem('currentOrder');
      console.log('🗑️ Stored order cleared from local storage');
    } catch (error) {
      console.warn('⚠️ Failed to clear stored order:', error);
    }
  };

  const fetchOrderData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!id || id === 'undefined' || id === 'null') {
        await loadOrderFromStorage();
        return;
      }

      const response = await apiService.getOrderStatus(id);
      
      if (response.success && response.data) {
        const payload: any = response.data;
        const order = payload?.data || payload; // handle direct or wrapped shape
        setOrderData(order);
        console.log('✅ Order data loaded:', order.order_number || order.order_id);
        console.log('🏥 Pharmacy data:', {
          name: order.pharmacy_name,
          id: order.pharmacy_id,
          barangay: order.pharmacy_barangay,
          latitude: order.pharmacy_latitude,
          longitude: order.pharmacy_longitude,
          phone: order.pharmacy_phone,
          email: order.pharmacy_email,
          storefront_image_url: order.pharmacy_storefront_image_url
        });
        console.log('📦 Delivery coords:', order.delivery_latitude, order.delivery_longitude);
        console.log('📞 Phone number available:', !!order.pharmacy_phone, order.pharmacy_phone);
        
        // Save order data to local storage for persistence
        try {
          await AsyncStorage.setItem('currentOrder', JSON.stringify(order));
          console.log('💾 Order data saved to local storage');
        } catch (storageError) {
          console.warn('⚠️ Failed to save order to storage:', storageError);
        }
      } else {
        setError(response.error || 'Failed to load order data');
        console.error('❌ Failed to load order:', response.error);
      }
    } catch (error) {
      console.error('💥 Error fetching order data:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && id !== 'undefined' && id !== 'null') {
      fetchOrderData();
    } else {
      // Try to get order from AsyncStorage if no valid ID provided
      loadOrderFromStorage();
    }
  }, [id, fetchOrderData]);

  // Handle customer location and map updates when order data changes
  useEffect(() => {
    const initializeMap = async () => {
      if (orderData && !mapInitialized.current) {
        mapInitialized.current = true;

        let customerLatLng = customerLocation;

        // Prefer delivery coordinates if provided in order
        if (orderData.delivery_latitude && orderData.delivery_longitude) {
          customerLatLng = {
            latitude: Number(orderData.delivery_latitude),
            longitude: Number(orderData.delivery_longitude),
          };
          setCustomerLocation(customerLatLng);
        } else {
          // Fallback to device location
          await getCustomerLocation();
          customerLatLng = customerLocation;
        }

        // Update map region if pharmacy and customer coordinates are available
        if (
          orderData.pharmacy_latitude &&
          orderData.pharmacy_longitude &&
          customerLatLng
        ) {
          updateMapRegion(
            orderData.pharmacy_latitude,
            orderData.pharmacy_longitude,
            customerLatLng.latitude,
            customerLatLng.longitude
          );
        }
      }
    };

    initializeMap();
  }, [orderData, customerLocation]);

  // Trigger pricing approval prompt when pending and total > 0
  useEffect(() => {
    if (!orderData) return;
    const shouldPrompt = orderData.order_status === 'pending' && Number(orderData.total_amount || 0) > 0;
    setShowPriceApprove(shouldPrompt && !dismissedPricingPrompt);
    if (!shouldPrompt) setDismissedPricingPrompt(false);
  }, [orderData, dismissedPricingPrompt]);

  // Cleanup effect - clear stored order when component unmounts
  useEffect(() => {
    return () => {
      // Clear stored order when component unmounts
      clearStoredOrder();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    if (id) {
      await fetchOrderData();
    } else {
      await loadOrderFromStorage();
    }
    setRefreshing(false);
  };

  // Check if order is completed and clear storage if needed
  useEffect(() => {
    if (orderData && (orderData.order_status === 'delivered' || orderData.order_status === 'cancelled')) {
      // Clear stored order after a delay when order is completed
      const timer = setTimeout(() => {
        clearStoredOrder();
      }, 5000); // Clear after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [orderData]);

  // Background polling for unread messages
  useEffect(() => {
    if (!orderData?.order_id || !orderData?.pharmacy_id) return;
    
    // Initial check
    checkUnreadMessages();
    
    // Start polling every 10 seconds
    if (unreadPollRef.current) clearInterval(unreadPollRef.current);
    unreadPollRef.current = setInterval(() => {
      checkUnreadMessages();
    }, 10000); // Check every 10 seconds
    
    return () => {
      if (unreadPollRef.current) {
        clearInterval(unreadPollRef.current);
        unreadPollRef.current = null;
      }
    };
  }, [orderData?.order_id, orderData?.pharmacy_id, checkUnreadMessages]);

  // Reset auto-open flag when chat is manually closed
  useEffect(() => {
    if (!showChatModal) {
      setAutoOpenedChat(false);
    }
  }, [showChatModal]);

  // Reset action buttons state when order data changes
  useEffect(() => {
    if (orderData) {
      setActionButtonsHidden(false);
    }
  }, [orderData]);

  // Start/stop typing polling with modal
  useEffect(() => {
    isMountedRef.current = true;
    const start = async () => {
      try {
        if (showChatModal && chatRoom?.id) {
          const poll = async () => {
            const res = await apiService.getOrderChatTypingStatus(chatRoom.id);
            if (res.success && (res.data as any)?.typing) setChatTyping((res.data as any).typing);
          };
          await poll();
          if (chatTypingPollRef.current) clearInterval(chatTypingPollRef.current);
          chatTypingPollRef.current = setInterval(poll, 4000);
        } else if (chatTypingPollRef.current) {
          clearInterval(chatTypingPollRef.current);
          chatTypingPollRef.current = null;
          setChatTyping({});
        }
      } catch {}
    };
    start();
    return () => {
      isMountedRef.current = false;
      if (chatTypingPollRef.current) {
        clearInterval(chatTypingPollRef.current);
        chatTypingPollRef.current = null;
      }
    };
  }, [showChatModal, chatRoom?.id]);


  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '-';
    }
  };

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

  if (error || !orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Order</Text>
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeButton} onPress={() => router.push('/')}>
            <Text style={styles.homeButtonText}>Go Home</Text>
          </TouchableOpacity>
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
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Tracking</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Google Map - Full Width */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
            showsUserLocation={Boolean(!orderData?.delivery_latitude && !orderData?.delivery_longitude)}
            showsMyLocationButton={Boolean(!orderData?.delivery_latitude && !orderData?.delivery_longitude)}
          >
            {/* Pharmacy Marker */}
            {orderData.pharmacy_latitude && orderData.pharmacy_longitude && (
              <Marker
                coordinate={{
                  latitude: orderData.pharmacy_latitude,
                  longitude: orderData.pharmacy_longitude,
                }}
                title={orderData.pharmacy_name}
                description="Pharmacy Location"
                pinColor="red"
              />
            )}
            
            {/* Customer Marker */}
            {customerLocation && (
              <Marker
                coordinate={customerLocation}
                title="Delivery Location"
                description={orderData.delivery_address}
                pinColor="blue"
              />
            )}

            {/* Connecting line between pharmacy and customer */}
            {orderData.pharmacy_latitude && orderData.pharmacy_longitude && customerLocation && (
              <Polyline
                coordinates={[
                  { latitude: orderData.pharmacy_latitude, longitude: orderData.pharmacy_longitude },
                  { latitude: customerLocation.latitude, longitude: customerLocation.longitude }
                ]}
                strokeColor="#00bf63"
                strokeWidth={4}
                geodesic
                lineDashPattern={[6, 4]}
              />
            )}
          </MapView>
        </View>

        <View style={styles.content}>

          {/* Pharmacy Calling Card */}
          <View style={styles.pharmacyCard}>
            <View style={styles.pharmacyInfo}>
              <View style={styles.pharmacyImageContainer}>
                {orderData.pharmacy_storefront_image_url && !storefrontImageError ? (
                  <Image 
                    source={{ 
                      uri: (() => {
                        const url = orderData.pharmacy_storefront_image_url;
                        // Check if it's a Cloudinary URL or already a full URL
                        if (url.includes('cloudinary.com') || url.startsWith('http://') || url.startsWith('https://')) {
                          console.log('Using Cloudinary/full URL for storefront:', url);
                          return url;
                        }
                        // Otherwise, it's a relative path - prepend backend URL
                        const backendUrl = getBackendBaseUrl();
                        const fullUrl = url.startsWith('/') ? `${backendUrl}${url}` : `${backendUrl}/${url}`;
                        console.log('Using backend proxy URL for storefront:', fullUrl);
                        return fullUrl;
                      })()
                    }} 
                    style={styles.pharmacyImage}
                    resizeMode="cover"
                    onError={(e) => {
                      console.log('Failed to load pharmacy storefront image:', orderData.pharmacy_storefront_image_url);
                      console.log('Error details:', e.nativeEvent);
                      setStorefrontImageError(true);
                    }}
                  />
                ) : (
                  <Image 
                    source={require('../assets/drugstore.png')} 
                    style={styles.pharmacyImage}
                    resizeMode="contain"
                  />
                )}
              </View>
              <View style={styles.pharmacyDetails}>
                <Text style={styles.pharmacyName}>{orderData.pharmacy_name}</Text>
                <Text style={styles.pharmacyPhone}>
                  {orderData.pharmacy_phone || 'No phone available'}
                </Text>
              </View>
            </View>
            <View style={styles.pharmacyActions}>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={async () => {
                  try {
                    setChatError(null);
                    setChatLoading(true);
                    const roomRes = await apiService.getOrCreateOrderChatRoom(orderData.order_id, orderData.pharmacy_id);
                    if (!roomRes.success || !roomRes.data?.room) {
                      setChatError(roomRes.error || 'Failed to open chat');
                      setShowChatModal(true);
                      setChatLoading(false);
                      return;
                    }
                    const room = roomRes.data.room;
                    setChatRoom(room);
                    // Pass room ID directly to fetchChatMessages to fix timing issue
                    await fetchChatMessages(room.id);
                    // start polling
                    if (chatPollRef.current) clearInterval(chatPollRef.current);
                    chatPollRef.current = setInterval(() => {
                      fetchChatMessages(room.id);
                    }, 12000);
                    setShowChatModal(true);
                  } catch {
                    setChatError('Unexpected error opening chat');
                    setShowChatModal(true);
                  } finally {
                    setChatLoading(false);
                  }
                }}
              >
                <Ionicons name="chatbubble-outline" size={24} color="#00bf63" />
                {/* Unread badge */}
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon}>
                <Ionicons name="call-outline" size={24} color="#00bf63" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Status Panel */}
          <View style={styles.statusPanel}>
            <View style={styles.statusItem}>
              <View style={styles.statusItemLeft}>
                <View style={[
                  styles.statusIconContainer,
                  orderData?.order_status === 'pending' ? styles.activeStatus : null
                ]}>
                  <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.statusConnector} />
              </View>
              <View style={styles.statusItemRight}>
                <Text style={styles.statusTitle}>Order Under Review</Text>
                <Text style={styles.statusSubtitle}>#{orderData.order_number}</Text>
                <Text style={styles.statusTime}>{formatTime(orderData.created_at)}</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusItemLeft}>
                <View style={[
                  styles.statusIconContainer,
                  (orderData?.order_status === 'accepted' || orderData?.order_status === 'preparing') ? styles.activeStatus : null
                ]}>
                  <Ionicons name="cog-outline" size={24} color="#666666" />
                </View>
                <View style={styles.statusConnector} />
              </View>
              <View style={styles.statusItemRight}>
                <Text style={styles.statusTitle}>Order Processing</Text>
                <Text style={styles.statusSubtitle}>Processing order</Text>
                <Text style={styles.statusTime}>
                  {orderData?.updated_at ? formatTime(orderData.updated_at) : '-'}
                </Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusItemLeft}>
                <View style={styles.statusIconContainer}>
                  <Ionicons name="time-outline" size={24} color="#666666" />
                </View>
                <View style={styles.statusConnector} />
              </View>
              <View style={styles.statusItemRight}>
                <Text style={styles.statusTitle}>Pick Up</Text>
                <Text style={styles.statusSubtitle}>Waiting for rider</Text>
                <Text style={styles.statusTime}>-</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusItemLeft}>
                <View style={styles.statusIconContainer}>
                  <Ionicons name="bicycle-outline" size={24} color="#666666" />
                </View>
                <View style={styles.statusConnector} />
              </View>
              <View style={styles.statusItemRight}>
                <Text style={styles.statusTitle}>Delivering</Text>
                <Text style={styles.statusSubtitle}>Delivering to {orderData.delivery_address}</Text>
                <Text style={styles.statusTime}>-</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusItemLeft}>
                <View style={styles.statusIconContainer}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#666666" />
                </View>
              </View>
              <View style={styles.statusItemRight}>
                <Text style={styles.statusTitle}>Delivered Successfully</Text>
                <Text style={styles.statusSubtitle}>Get Well Soon</Text>
                <Text style={styles.statusTime}>-</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <Text style={styles.refreshButtonText}>
                {refreshing ? 'Refreshing...' : 'Refresh Status'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.homeButtonText}>Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {chatTyping?.pharmacy ? (
        <Text style={{ paddingHorizontal: 16, paddingBottom: 6, color: '#00bf63', fontSize: 12, fontFamily: fontFamily.light }}>
          Pharmacy is typing…
        </Text>
      ) : null}
      {/* Cleanup polling when modal closes */}
      {showChatModal ? null : (chatPollRef.current ? (clearInterval(chatPollRef.current), chatPollRef.current = null, null) : null)}
      {/* Chat Modal - full width, bottom-aligned (touching left/right/bottom) */}
      <Modal visible={showChatModal} animationType="slide" transparent>
        <View style={styles.chatModalOverlay}>
          <View style={styles.chatModalContainer}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                Chat with {orderData?.pharmacy_name || 'Pharmacy'}
              </Text>
              <TouchableOpacity onPress={() => setShowChatModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatMessages}
              contentContainerStyle={{ padding: 16 }}
              onContentSizeChange={() => {
                if (chatScrollRef.current) {
                  chatScrollRef.current.scrollToEnd({ animated: true });
                }
              }}
            >
              {chatError && (
                <Text style={styles.chatError}>{chatError}</Text>
              )}
              {!chatError && chatMessages.length === 0 && !chatLoading && (
                <Text style={styles.chatEmpty}>No messages yet.</Text>
              )}
              {chatMessages.map((m) => {
                const roleRaw = String(m.sender_role_code ?? m.sender_role ?? '').toLowerCase();
                const isPharmacy = roleRaw.includes('pharmacy');
                const isCustomer = roleRaw.includes('customer');
                const isPricingPrompt = isPharmacy && typeof m.content === 'string' && /price quote/i.test(m.content);
                return (
                  <View key={m.id} style={{ marginBottom: 12, alignItems: isCustomer ? 'flex-end' : 'flex-start' }}>
                    <Text style={styles.chatMeta}>{m.sender_name} • {new Date(m.timestamp).toLocaleString()}</Text>
                    <View style={[
                      styles.chatBubble,
                      m.is_system_message ? styles.chatSystem : (isPharmacy ? styles.chatPharmacy : styles.chatUser),
                      { flexDirection: 'column', alignItems: 'stretch' }
                    ]}>
                      <Text style={styles.chatText}>{m.content}</Text>
                      {!m.is_system_message && isCustomer ? (
                        <Text style={{ marginTop: 6, fontSize: 10, color: '#9E9E9E', alignSelf: 'flex-end' }}>
                          {m.read_at ? '✓✓' : (m.delivered_at ? '✓' : '')}
                        </Text>
                      ) : null}
                      
                      {/* Senior Discount Rejection - Action Buttons */}
                      {isPharmacy && typeof m.content === 'string' && /proceed with your order at the regular price/i.test(m.content) && orderData?.order_status === 'pending' && !actionButtonsHidden && (
                        <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                              backgroundColor: '#EF4444',
                              borderRadius: 8,
                              alignItems: 'center'
                            }}
                            onPress={() => setShowCancelConfirmModal(true)}
                          >
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                              Cancel Order
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                              backgroundColor: '#10B981',
                              borderRadius: 8,
                              alignItems: 'center'
                            }}
                            onPress={() => setShowProceedConfirmModal(true)}
                          >
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                              Proceed
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      {isPricingPrompt && orderData?.order_status === 'pending' && (
                        <View style={{ flexDirection: 'row', marginTop: 10 }}>
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#eeeeee', alignItems: 'center', marginRight: 8 }}
                            onPress={() => setDismissedPricingPrompt(true)}
                          >
                            <Text style={{ color: '#333', fontFamily: fontFamily.heavy }}>Refuse</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#00bf63', alignItems: 'center', marginLeft: 8, opacity: approving ? 0.6 : 1 }}
                            disabled={approving}
                            onPress={async () => {
                              try {
                                setApproving(true);
                                
                                // Step 1: Approve the pricing
                                const res = await apiService.approvePricing(orderData.order_id, true);
                                if (res.success) {
                                  // Step 2: Fetch updated order data to get the actual total amount
                                  const updatedOrderRes = await apiService.getOrderStatus(String(orderData.order_id));
                                  let actualTotal = orderData.total_amount;
                                  
                                  if (updatedOrderRes.success && updatedOrderRes.data) {
                                    const updatedOrder: any = updatedOrderRes.data?.data || updatedOrderRes.data;
                                    actualTotal = updatedOrder.total_amount || orderData.total_amount;
                                    console.log('💰 Updated order total:', actualTotal);
                                  }
                                  
                                  // Step 3: Send automatic confirmation message to pharmacy
                                  if (chatRoom?.id && actualTotal > 0) {
                                    try {
                                      const confirmationMessage = `✅ I've approved the price quote of ₱${actualTotal.toFixed(2)}. Thank you! Please proceed with preparing my order.`;
                                      await apiService.sendOrderChatMessage(chatRoom.id, confirmationMessage);
                                      console.log('✅ Sent approval confirmation message to pharmacy');
                                      // Refresh messages to show the new message
                                      await fetchChatMessages(chatRoom.id);
                                    } catch (msgError) {
                                      console.log('⚠️ Failed to send confirmation message:', msgError);
                                      // Continue anyway - approval already succeeded
                                    }
                                  }
                                  
                                  // Step 4: Refresh order data and close
                                  await fetchOrderData();
                                  setDismissedPricingPrompt(true);
                                  setShowChatModal(false);
                                }
                              } finally {
                                setApproving(false);
                              }
                            }}
                          >
                            <Text style={{ color: '#fff', fontFamily: fontFamily.heavy }}>Accept</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
              {chatLoading && (
                <Text style={styles.chatEmpty}>Loading…</Text>
              )}
            </ScrollView>

            {/* Composer */}
            <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={{ flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333333', fontFamily: fontFamily.light }}
                  placeholder="Type a message..."
                  value={chatInput}
                  onChangeText={(text) => {
                    setChatInput(text);
                    try {
                      if (chatRoom?.id) {
                        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                        apiService.setOrderChatTyping(chatRoom.id, true);
                        typingTimerRef.current = setTimeout(() => {
                          apiService.setOrderChatTyping(chatRoom.id, false);
                        }, 2000);
                      }
                    } catch {}
                  }}
                  editable={!chatSending}
                  returnKeyType="send"
                  onSubmitEditing={async () => {
                    if (!chatRoom?.id || !chatInput.trim() || chatSending) return;
                    const sendWithTimeout = async <T,>(p: Promise<ApiResponse<T>>, ms: number): Promise<ApiResponse<T>> => {
                      return await new Promise<ApiResponse<T>>((resolve) => {
                        let done = false;
                        const t = setTimeout(() => {
                          if (!done) resolve({ success: false, error: 'Timeout sending message' } as any);
                        }, ms);
                        p.then((r) => { done = true; clearTimeout(t); resolve(r); })
                         .catch(() => { done = true; clearTimeout(t); resolve({ success: false, error: 'Network error' } as any); });
                      });
                    };
                    try {
                      setChatSending(true);
                      const res = await sendWithTimeout(apiService.sendOrderChatMessage(chatRoom.id, chatInput.trim()), 10000);
                      if (!res.success) {
                        setChatError(res.error || 'Failed to send message');
                      } else {
                        setChatInput('');
                        await fetchChatMessages();
                        requestAnimationFrame(() => {
                          if (chatScrollRef.current) chatScrollRef.current.scrollToEnd({ animated: true });
                        });
                      }
                    } catch {
                      setChatError('Unexpected error sending message');
                    } finally {
                      setChatSending(false);
                    }
                  }}
                />
                <TouchableOpacity
                  style={{ 
                    marginLeft: 8, 
                    paddingHorizontal: 12, 
                    paddingVertical: 12, 
                    
                  
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                  }}
                  disabled={chatSending || !chatInput.trim() || !chatRoom?.id}
                  onPress={async () => {
                    if (!chatRoom?.id || !chatInput.trim() || chatSending) return;
                    const sendWithTimeout = async <T,>(p: Promise<ApiResponse<T>>, ms: number): Promise<ApiResponse<T>> => {
                      return await new Promise<ApiResponse<T>>((resolve) => {
                        let done = false;
                        const t = setTimeout(() => {
                          if (!done) resolve({ success: false, error: 'Timeout sending message' } as any);
                        }, ms);
                        p.then((r) => { done = true; clearTimeout(t); resolve(r); })
                         .catch(() => { done = true; clearTimeout(t); resolve({ success: false, error: 'Network error' } as any); });
                      });
                    };
                    try {
                      setChatSending(true);
                      const res = await sendWithTimeout(apiService.sendOrderChatMessage(chatRoom.id, chatInput.trim()), 10000);
                      if (!res.success) {
                        setChatError(res.error || 'Failed to send message');
                      } else {
                        setChatInput('');
                        await fetchChatMessages();
                        requestAnimationFrame(() => {
                          if (chatScrollRef.current) chatScrollRef.current.scrollToEnd({ animated: true });
                        });
                      }
                    } catch {
                      setChatError('Unexpected error sending message');
                    } finally {
                      setChatSending(false);
                    }
                  }}
                >
                  {chatSending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Image 
                      source={require('../assets/send.png')} 
                      style={{ width: 32, height: 32, }}
                      resizeMode="contain"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Order Confirmation Modal */}
      <Modal
        visible={showCancelConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customModalContainer}>
            <Text style={styles.customModalTitle}>Cancel Order</Text>
            <Text style={styles.customModalMessage}>
              Are you sure you want to cancel this order? This action cannot be undone.
            </Text>
            
            <View style={styles.customModalButtons}>
              <TouchableOpacity
                style={[styles.customModalButton, styles.modalButtonSecondary]}
                onPress={() => setShowCancelConfirmModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalButtonSecondaryText}>No, Keep Order</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.customModalButton, styles.modalButtonDanger]}
                onPress={async () => {
                  setActionLoading(true);
                  try {
                    const customerId = await AsyncStorage.getItem('customer_id');
                    if (!customerId) {
                      setShowCancelConfirmModal(false);
                      Alert.alert('Error', 'Customer ID not found');
                      return;
                    }
                    
                    const response = await apiService.cancelOrder(orderData.order_id, {
                      customer_id: parseInt(customerId),
                      reason: 'Senior discount rejected, customer cancelled'
                    });
                    
                    if (response.success) {
                      // Send cancellation message to pharmacy
                      if (chatRoom?.id) {
                        await apiService.sendOrderChatMessage(
                          chatRoom.id,
                          "I have cancelled this order."
                        );
                      }
                      
                      setActionButtonsHidden(true); // Hide the action buttons
                      setShowCancelConfirmModal(false);
                      setTimeout(() => {
                        Alert.alert('Order Cancelled', 'Your order has been cancelled.', [
                          { text: 'OK', onPress: () => router.back() }
                        ]);
                      }, 300);
                    } else {
                      setShowCancelConfirmModal(false);
                      setTimeout(() => {
                        Alert.alert('Error', response.error || 'Failed to cancel order');
                      }, 300);
                    }
                  } catch (error) {
                    console.error('Cancel order error:', error);
                    setShowCancelConfirmModal(false);
                    setTimeout(() => {
                      Alert.alert('Error', 'Failed to cancel order. Please try again.');
                    }, 300);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalButtonDangerText}>Yes, Cancel Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Proceed with Order Confirmation Modal */}
      <Modal
        visible={showProceedConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProceedConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customModalContainer}>
            <Text style={styles.customModalTitle}>Proceed with Order</Text>
            <Text style={styles.customModalMessage}>
              You will proceed with this order at the regular price (without senior discount).
            </Text>
            
            <View style={styles.customModalButtons}>
              <TouchableOpacity
                style={[styles.customModalButton, styles.modalButtonSecondary]}
                onPress={() => setShowProceedConfirmModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.customModalButton, styles.modalButtonPrimary]}
                onPress={async () => {
                  setActionLoading(true);
                  try {
                    if (chatRoom?.id) {
                      await apiService.sendOrderChatMessage(
                        chatRoom.id,
                        "I will proceed with the order at the regular price."
                      );
                      
                      // Refresh messages
                      const msgs = await apiService.getOrderChatMessages(chatRoom.id);
                      if (msgs.success) {
                        setChatMessages(msgs.data?.messages || msgs.data || []);
                      }
                      
                      setActionButtonsHidden(true); // Hide the action buttons
                      setShowProceedConfirmModal(false);
                      console.log('✅ Proceed message sent to pharmacy successfully');
                    } else {
                      setShowProceedConfirmModal(false);
                      setTimeout(() => {
                        Alert.alert('Error', 'Chat room not available');
                      }, 300);
                    }
                  } catch (error) {
                    console.error('Proceed order error:', error);
                    setShowProceedConfirmModal(false);
                    setTimeout(() => {
                      Alert.alert('Error', 'Failed to send message. Please try again.');
                    }, 300);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    top: -35,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 8,
    fontFamily: fontFamily.heavy,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: fontFamily.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    flex: 0,
  },
  headerSpacer: {
    flex: 0,
    width: 60, // Same width as back button to balance the layout
  },
  backButtonText: {
    fontSize: 16,
    color: '#00bf63',
    fontFamily: fontFamily.light,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: fontFamily.heavy,
    textAlign: 'center',
    flex: 1,
  },
  // Map Styles
  mapContainer: {
    width: '100%',
    height: 300,
    marginBottom: 0,
  },
  map: {
    flex: 1,
  },
  // Pharmacy Card Styles
  pharmacyCard: {

    backgroundColor: '#ededed',
    borderRadius: 24,
    padding: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pharmacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pharmacyImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  pharmacyImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  pharmacyDetails: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 0,
    fontFamily: fontFamily.heavy,
  },
  pharmacyPhone: {
    fontSize: 14,
    color: '#00bf63',
    fontFamily: fontFamily.light,
    fontWeight: '500',
  },
  pharmacyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: fontFamily.heavy,
  },
  // Status Panel Styles
  statusPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  statusItemLeft: {
    alignItems: 'center',
    marginRight: 10,
  },
  statusItemRight: {
    flex: 1,
    paddingTop: 8,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  activeStatus: {
    backgroundColor: '#00bf63',
  },
  statusConnector: {
    width: 2,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginTop: 2,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
    fontFamily: fontFamily.heavy,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    fontFamily: fontFamily.light,
  },
  statusTime: {
    fontSize: 12,
    color: '#00bf63',
    fontFamily: fontFamily.light,
  },
  // Action Buttons
  actionButtons: {
    marginTop: 20,
    gap: 12,
  },
  refreshButton: {
    backgroundColor: '#00bf63',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.light,
  },
  homeButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  homeButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.light,
  },
  // Chat modal styles
  chatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  chatModalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 60, // leaves some space at top; touches left/right/bottom edges
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  chatHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    fontFamily: fontFamily.heavy,
    flex: 1,
    marginRight: 12,
  },
  chatMessages: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  chatEmpty: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 12,
    fontFamily: fontFamily.light
  },
  chatError: {
    textAlign: 'center',
    color: '#D32F2F',
    fontSize: 12,
    marginBottom: 8,
    fontFamily: fontFamily.light
  },
  chatMeta: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 4,
    fontFamily: fontFamily.light
  },
  chatBubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '90%'
  },
  chatSystem: {
    backgroundColor: '#EDEDED',
  },
  chatUser: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  chatPharmacy: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  chatText: {
    color: '#333333',
    fontSize: 14,
    fontFamily: fontFamily.light
  },
  retryButton: {
    backgroundColor: '#00bf63',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    minWidth: 120,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.light,
  },
  // Custom Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  customModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  customModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: fontFamily.heavy,
  },
  customModalMessage: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fontFamily.light,
  },
  customModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  customModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonPrimary: {
    backgroundColor: '#10B981',
  },
  modalButtonPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.heavy,
  },
  modalButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonSecondaryText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.heavy,
  },
  modalButtonDanger: {
    backgroundColor: '#EF4444',
  },
  modalButtonDangerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.heavy,
  },
});

export default OrderTrackingScreen;
