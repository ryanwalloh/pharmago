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
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
// MapView lazy-loaded inside component to avoid import-time native module crash
import { Ionicons } from '@expo/vector-icons';
import { apiService, ApiResponse } from '../services/api';
import { fontFamily } from '../utils/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { orderTrackingWS } from '../services/orderTrackingWebSocket';

// Type definitions for react-native-maps (used without importing to avoid crash)
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Lazy dimension getters - ONLY called when styles are accessed (not at import time)
// CRITICAL: Do NOT call these at module scope - defer until component render
let cachedScreenWidth: number | null = null;
let cachedScreenHeight: number | null = null;

const getScreenWidth = (): number => {
  if (cachedScreenWidth === null) {
    try {
      cachedScreenWidth = Dimensions.get('window').width;
    } catch {
      cachedScreenWidth = 400; // Fallback width
    }
  }
  return cachedScreenWidth;
};

const getScreenHeight = (): number => {
  if (cachedScreenHeight === null) {
    try {
      cachedScreenHeight = Dimensions.get('window').height;
    } catch {
      cachedScreenHeight = 800; // Fallback height
    }
  }
  return cachedScreenHeight;
};

interface RiderInfo {
  rider_id: number;
  rider_name: string;
  rider_phone: string | null;
  vehicle_type: string;
  vehicle_plate: string | null;
}

interface AssignmentStatus {
  status: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
}

interface RiderLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  timestamp: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  prescription_required?: boolean;
}

interface OrderData {
  order_id: number;
  order_number: string;
  order_status: string;
  prescription_status: string;
  payment_status: string;
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  items?: OrderItem[];
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
  senior_discount_requested: boolean;
  senior_discount_status: string;
  senior_citizen_id_image?: string;
  // Rider assignment and tracking
  rider_info: RiderInfo | null;
  assignment_status: AssignmentStatus | null;
  rider_location: RiderLocation | null;
}

const OrderTrackingScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initStatus, setInitStatus] = React.useState<string>('Component mounted');
  
  // Lazy-load MapView components - CRITICAL: wrap in try-catch and delay
  const [MapComponents, setMapComponents] = React.useState<any>(null);
  
  React.useEffect(() => {
    setInitStatus('Initializing maps...');
    // Additional delay before loading maps to ensure native modules are ready
    const timer = setTimeout(() => {
      try {
        const maps = require('react-native-maps');
        setMapComponents({
          MapView: maps.default,
          Marker: maps.Marker,
          Polyline: maps.Polyline,
        });
        console.log('✅ Maps loaded successfully');
        setInitStatus('Maps loaded');
      } catch (error) {
        console.error('Failed to load react-native-maps:', error);
        setInitStatus('Maps failed (continuing without)');
        // Continue without maps - order tracking will work without live map
      }
    }, 200); // Increased delay for production
    
    return () => clearTimeout(timer);
  }, []);
  
  // Destructure after loading (with fallbacks)
  const MapView = MapComponents?.MapView;
  const Marker = MapComponents?.Marker;
  const Polyline = MapComponents?.Polyline;
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setMapRegion] = useState<Region>({
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
  
  // Route tracking for rider
  const [routeCoordinates, setRouteCoordinates] = useState<{latitude: number, longitude: number}[]>([]);
  const [, setRouteLoading] = useState(false);
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

  // Fetch route from rider to customer using Google Directions API
  const fetchRiderRoute = useCallback(async () => {
    if (!orderData?.rider_location || !orderData?.delivery_latitude || !orderData?.delivery_longitude) {
      return;
    }

    setRouteLoading(true);
    try {
      const origin = `${orderData.rider_location.latitude},${orderData.rider_location.longitude}`;
      const destination = `${orderData.delivery_latitude},${orderData.delivery_longitude}`;
      
      // Use the configured Google Maps API key from app.config.js
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCCuDLJMhB-23kQiXYpXwi-yYGvKz7OgSQ';

      console.log('🗺️ Fetching route from rider to customer...');
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}&mode=driving`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const points = data.routes[0].overview_polyline.points;
        const decodedPoints = decodePolyline(points);
        setRouteCoordinates(decodedPoints);
        console.log('✅ Route fetched successfully:', decodedPoints.length, 'points');
      } else if (data.error_message) {
        console.warn('⚠️ Google Directions API error:', data.error_message);
        // Fallback to straight line
        setRouteCoordinates([
          { latitude: orderData.rider_location.latitude, longitude: orderData.rider_location.longitude },
          { latitude: orderData.delivery_latitude, longitude: orderData.delivery_longitude }
        ]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch route:', error);
      // Fallback to straight line if API fails
      if (orderData?.rider_location && orderData?.delivery_latitude && orderData?.delivery_longitude) {
        setRouteCoordinates([
          { latitude: orderData.rider_location.latitude, longitude: orderData.rider_location.longitude },
          { latitude: orderData.delivery_latitude, longitude: orderData.delivery_longitude }
        ]);
        console.log('📍 Using fallback straight line route');
      }
    } finally {
      setRouteLoading(false);
    }
  }, [orderData?.rider_location, orderData?.delivery_latitude, orderData?.delivery_longitude]);

  // Decode Google polyline
  const decodePolyline = (encoded: string) => {
    const coords: {latitude: number, longitude: number}[] = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return coords;
  };

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
        setStorefrontImageError(false); // Reset error state when new order data loads
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
    try {
      setInitStatus('Fetching order data...');
      if (id && id !== 'undefined' && id !== 'null') {
        fetchOrderData().catch(err => {
          console.error('Error in fetchOrderData:', err);
          setError('Failed to load order. Please try again.');
          setLoading(false);
          setInitStatus('Order fetch failed');
        });
      } else {
        setInitStatus('Loading from storage...');
        // Try to get order from AsyncStorage if no valid ID provided
        loadOrderFromStorage();
      }
    } catch (error) {
      console.error('Error in order fetch useEffect:', error);
      setError('Failed to initialize order tracking');
      setLoading(false);
      setInitStatus('Init failed');
    }
  }, [id]); // Removed fetchOrderData from dependencies to prevent loops

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


  // Get status display info (title, subtitle, image)
  // CRITICAL: All require() calls must be static for Metro bundler
  const STATUS_IMAGES = {
    pending: require('../assets/pending.png'),
    accepted: require('../assets/accepted.png'),
    ready_for_pickup: require('../assets/ready_for_pickup.png'),
    delivered: require('../assets/delivered.png'),
  };

  const getStatusInfo = () => {
    if (!orderData) return { title: 'Loading...', subtitle: '', showMap: false, image: null };

    switch (orderData.order_status) {
      case 'pending':
        return {
          title: 'Order Placed',
          subtitle: 'Your order is waiting for pharmacy confirmation',
          image: STATUS_IMAGES.pending,
          showMap: false
        };
      case 'accepted':
      case 'preparing':
        return {
          title: 'Being Prepared',
          subtitle: 'The pharmacy is preparing your medicines',
          image: STATUS_IMAGES.accepted,
          showMap: false
        };
      case 'ready_for_pickup':
        return {
          title: 'Ready for Pickup',
          subtitle: 'Your order is ready and waiting for the rider',
          image: STATUS_IMAGES.ready_for_pickup,
          showMap: false
        };
      case 'picked_up':
        return {
          title: 'Out for Delivery',
          subtitle: '', // No subtitle for map view
          showMap: true
        };
      case 'delivered':
        return {
          title: 'Delivered Successfully',
          subtitle: 'Your order has been delivered. Get well soon!',
          image: STATUS_IMAGES.delivered,
          showMap: false
        };
      case 'cancelled':
        return {
          title: 'Order Cancelled',
          subtitle: 'This order has been cancelled',
          image: STATUS_IMAGES.pending,
          showMap: false
        };
      default:
        return {
          title: 'Processing',
          subtitle: 'Your order is being processed',
          image: STATUS_IMAGES.pending,
          showMap: false
        };
    }
  };

  // Determine if we should show pharmacy or rider card
  const showRiderCard = orderData?.order_status === 'picked_up' && orderData?.rider_info;

  // Update route when rider location changes
  useEffect(() => {
    if (orderData?.order_status === 'picked_up' && orderData?.rider_location) {
      fetchRiderRoute();
    }
  }, [orderData?.order_status, orderData?.rider_location, fetchRiderRoute]);

  // WebSocket connection for real-time updates (replaces polling)
  useEffect(() => {
    if (!id || !orderData) return;

    console.log('🔌 Setting up WebSocket for order', id);

    // Connect to WebSocket
    orderTrackingWS.connect(id);

    // Handler for order status updates
    const handleStatusUpdate = (data: any) => {
      console.log('📨 Order status updated via WebSocket:', data.order_status);
      // Refresh order data to get full updated info
      fetchOrderData();
    };

    // Handler for rider assignment
    const handleRiderAssigned = (data: any) => {
      console.log('🚴 Rider assigned via WebSocket:', data.rider_info);
      fetchOrderData();
    };

    // Handler for rider location updates
    const handleRiderLocation = (data: any) => {
      console.log('📍 Rider location updated via WebSocket');
      
      // Update order data with new rider location
      if (orderData) {
        setOrderData(prev => prev ? {
          ...prev,
          rider_location: data.location
        } : null);
        
        // Fetch new route with updated location
        if (orderData.order_status === 'picked_up') {
          fetchRiderRoute();
        }
      }
    };

    // Handler for order completion
    const handleOrderComplete = (data: any) => {
      console.log('✅ Order completed via WebSocket');
      fetchOrderData();
    };

    // Register handlers
    orderTrackingWS.on('order_status_update', handleStatusUpdate);
    orderTrackingWS.on('rider_assigned', handleRiderAssigned);
    orderTrackingWS.on('rider_location_update', handleRiderLocation);
    orderTrackingWS.on('order_complete', handleOrderComplete);

    // Cleanup
    return () => {
      console.log('🔌 Cleaning up WebSocket handlers');
      orderTrackingWS.off('order_status_update', handleStatusUpdate);
      orderTrackingWS.off('rider_assigned', handleRiderAssigned);
      orderTrackingWS.off('rider_location_update', handleRiderLocation);
      orderTrackingWS.off('order_complete', handleOrderComplete);
      
      // Disconnect when component unmounts
      orderTrackingWS.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, orderData?.order_status, fetchOrderData, fetchRiderRoute]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00bf63" />
          <Text style={styles.loadingText}>Loading order details...</Text>
          {/* Show status on screen for debugging */}
          <Text style={{ marginTop: 12, fontSize: 12, color: '#999', textAlign: 'center' }}>
            {initStatus}
          </Text>
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
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Tracking</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Dynamic Status Display - Image or Map */}
        <View style={styles.statusDisplayContainer}>
          {getStatusInfo().showMap && orderData.rider_location && MapView ? (
            // Show map with rider tracking when picked_up (only if maps loaded)
            <View style={styles.trackingMapContainer}>
              <MapView
                style={styles.trackingMap}
                region={{
                  latitude: (orderData.rider_location.latitude + (orderData.delivery_latitude || 0)) / 2,
                  longitude: (orderData.rider_location.longitude + (orderData.delivery_longitude || 0)) / 2,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                showsUserLocation={false}
              >
                {/* Rider Marker */}
                <Marker
                  coordinate={{
                    latitude: orderData.rider_location.latitude,
                    longitude: orderData.rider_location.longitude,
                  }}
                  title={orderData.rider_info?.rider_name || 'Your Rider'}
                  description={`${orderData.rider_info?.vehicle_type || 'Vehicle'} - ${orderData.rider_info?.vehicle_plate || ''}`}
                >
                  <View style={styles.riderMarker}>
                    <Ionicons name="bicycle" size={30} color="#00bf63" />
                  </View>
                </Marker>
                
                {/* Customer Delivery Marker */}
                {orderData.delivery_latitude && orderData.delivery_longitude && (
                  <Marker
                    coordinate={{
                      latitude: orderData.delivery_latitude,
                      longitude: orderData.delivery_longitude,
                    }}
                    title="Your Location"
                    description={orderData.delivery_address}
                    pinColor="blue"
                  />
                )}

                {/* Route polyline from rider to customer */}
                {routeCoordinates.length > 0 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#00bf63"
                    strokeWidth={5}
                    geodesic
                  />
                )}
              </MapView>
              
              {/* Status Title Overlay */}
              <View style={styles.mapOverlay}>
                <Text style={styles.mapOverlayTitle}>{getStatusInfo().title}</Text>
                {orderData.rider_info && (
                  <Text style={styles.mapOverlaySubtitle}>
                    {orderData.rider_info.rider_name} is on the way
                  </Text>
                )}
              </View>
            </View>
          ) : (
            // Show status image for other states
            <View style={styles.statusImageContainer}>
              <Image
                source={getStatusInfo().image}
                style={styles.statusImage}
                resizeMode="contain"
              />
              <Text style={styles.statusDisplayTitle}>{getStatusInfo().title}</Text>
              {getStatusInfo().subtitle && (
                <Text style={styles.statusDisplaySubtitle}>{getStatusInfo().subtitle}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.content}>

          {/* Dynamic Calling Card - Pharmacy or Rider */}
          {showRiderCard ? (
            // RIDER CARD
            <View style={styles.pharmacyCard}>
              <View style={styles.pharmacyInfo}>
                <View style={styles.pharmacyImageContainer}>
                  <View style={styles.riderAvatarContainer}>
                    <Ionicons name="person" size={40} color="#00bf63" />
                  </View>
                </View>
                <View style={styles.pharmacyDetails}>
                  <Text style={styles.cardLabel}>Your Rider</Text>
                  <Text style={styles.pharmacyName}>{orderData.rider_info?.rider_name}</Text>
                  <Text style={styles.pharmacyPhone}>
                    {orderData.rider_info?.vehicle_type} • {orderData.rider_info?.vehicle_plate || 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.pharmacyActions}>
                <TouchableOpacity
                  style={styles.actionIcon}
                  onPress={() => {
                    const phoneNumber = orderData.rider_info?.rider_phone;
                    if (phoneNumber) {
                      Linking.openURL(`tel:${phoneNumber}`);
                    } else {
                      Alert.alert('No Phone Number', 'Rider phone number not available');
                    }
                  }}
                >
                  <Ionicons name="call-outline" size={24} color="#00bf63" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // PHARMACY CARD
            <View style={styles.pharmacyCard}>
              <View style={styles.pharmacyInfo}>
                <View style={styles.pharmacyImageContainer}>
                  {(() => {
                    const imageUrl = orderData.pharmacy_storefront_image_url;
                    console.log('🖼️ Rendering pharmacy image:', {
                      hasUrl: !!imageUrl,
                      url: imageUrl,
                      urlType: typeof imageUrl,
                      urlLength: imageUrl?.length,
                      hasError: storefrontImageError,
                      pharmacyName: orderData.pharmacy_name
                    });
                    
                    if (imageUrl && !storefrontImageError) {
                      return (
                        <Image 
                          source={{ uri: imageUrl }} 
                          style={styles.pharmacyImage}
                          resizeMode="cover"
                          onError={(e) => {
                            console.log('❌ Failed to load pharmacy storefront image');
                            console.log('  URL:', imageUrl);
                            console.log('  Error:', e.nativeEvent.error);
                            setStorefrontImageError(true);
                          }}
                          onLoad={() => {
                            console.log('✅ Pharmacy storefront image loaded successfully:', imageUrl?.substring(0, 50));
                          }}
                          onLoadStart={() => {
                            console.log('⏳ Started loading pharmacy storefront image...');
                          }}
                        />
                      );
                    } else {
                      console.log('📦 Using fallback drugstore image. Reason:', !imageUrl ? 'No URL' : 'Error occurred');
                      return (
                        <Image 
                          source={require('../assets/drugstore.png')} 
                          style={styles.pharmacyImage}
                          resizeMode="cover"
                        />
                      );
                    }
                  })()}
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
          )}

          {/* Order Summary */}
          <View style={styles.orderSummary}>
            <Text style={styles.orderSummaryTitle}>Order Summary</Text>
            
            {/* Order Number & Date */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Order Number</Text>
              <Text style={styles.summaryValue}>#{orderData.order_number}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Order Date</Text>
              <Text style={styles.summaryValue}>{new Date(orderData.created_at).toLocaleDateString()}</Text>
            </View>

            {/* Items Section - Dynamic based on order type */}
            {orderData.items && orderData.items.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Items</Text>
                {orderData.items.map((item: any, index: number) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {item.quantity}x {item.name}
                    </Text>
                    <Text style={styles.itemPrice}>
                      ₱{item.total_price?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Prescription Info - For prescription orders */}
            {orderData.prescription_image_url && (
              <View style={styles.prescriptionSection}>
                <Text style={styles.sectionTitle}>Prescription Order</Text>
                <Text style={styles.prescriptionNote}>
                  {orderData.prescription_notes || 'Prescription will be verified by pharmacy'}
                </Text>
              </View>
            )}

            {/* Senior Discount Info */}
            {orderData.senior_discount_requested && (
              <View style={styles.discountSection}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Senior Discount</Text>
                  <Text style={[
                    styles.summaryValue,
                    orderData.senior_discount_status === 'approved' && styles.approvedText,
                    orderData.senior_discount_status === 'rejected' && styles.rejectedText
                  ]}>
                    {orderData.senior_discount_status === 'pending' && '⏳ Pending'}
                    {orderData.senior_discount_status === 'approved' && `✓ Approved (-₱${orderData.discount_amount?.toFixed(2) || '0.00'})`}
                    {orderData.senior_discount_status === 'rejected' && '✗ Not Applicable'}
                  </Text>
                </View>
              </View>
            )}

            {/* Delivery Address */}
            <View style={styles.addressSection}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <Text style={styles.addressText}>{orderData.delivery_address}</Text>
            </View>

            {/* Payment Summary */}
            <View style={styles.paymentSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₱{orderData.subtotal?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service Fee</Text>
                <Text style={styles.summaryValue}>₱{orderData.tax_amount?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>₱{orderData.delivery_fee?.toFixed(2) || '0.00'}</Text>
              </View>
              
              {orderData.discount_amount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, styles.discountValue]}>
                    -₱{orderData.discount_amount?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              )}
              
              <View style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₱{orderData.total_amount?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Method</Text>
                <Text style={styles.summaryValue}>
                  {orderData.payment_status === 'paid' ? 'Paid via Card' : 'Cash on Delivery'}
                </Text>
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

// Lazy styles getter - only create styles when component first renders
let cachedStyles: any = null;

const getStyles = () => {
  if (!cachedStyles) {
    cachedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: getScreenWidth() * 0.05, // 5% responsive padding
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: getScreenWidth() * 0.05, // 5% responsive padding
    paddingVertical: 20,
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
    paddingHorizontal: getScreenWidth() * 0.1, // 10% responsive padding
    paddingVertical: 20,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: getScreenWidth() * 0.02, // 2% responsive padding
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
    width: Math.min(getScreenWidth() * 0.15, 60), // Responsive, max 60
    height: Math.min(getScreenWidth() * 0.15, 60),
    borderRadius: Math.min(getScreenWidth() * 0.075, 30),
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pharmacyImage: {
    width: Math.min(getScreenWidth() * 0.15, 60), // Responsive, max 60
    height: Math.min(getScreenWidth() * 0.15, 60),
    borderRadius: Math.min(getScreenWidth() * 0.075, 30),
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
    padding: getScreenWidth() * 0.04, // 4% responsive padding
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
    marginBottom: 20, // Extra bottom margin
  },
  refreshButton: {
    backgroundColor: '#00bf63',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: getScreenWidth() * 0.04, // 4% responsive padding
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
    paddingVertical: 16,
    paddingHorizontal: getScreenWidth() * 0.04, // 4% responsive padding
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
    paddingHorizontal: getScreenWidth() * 0.04, // 4% responsive padding
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
    padding: getScreenWidth() * 0.06, // 6% responsive padding
    width: '90%',
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
  
  // NEW STYLES FOR REDESIGNED UI
  statusDisplayContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
  },
  statusImageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: getScreenWidth() * 0.05, // 5% responsive padding
    paddingBottom: 50,
  },
  statusImage: {
    width: Math.min(getScreenWidth() * 0.5, 200), // Responsive, max 200
    height: Math.min(getScreenWidth() * 0.5, 200),
    marginBottom: 20,
    opacity: 0.8,
  },
  statusDisplayTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2B2B2B',
    marginBottom: 8,
    fontFamily: fontFamily.heavy,
    textAlign: 'center',
  },
  statusDisplaySubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontFamily: fontFamily.light,
    paddingHorizontal: 20,
  },
  trackingMapContainer: {
    width: '100%',
    height: Math.min(getScreenHeight() * 0.4, 350), // Responsive, max 350
    position: 'relative',
  },
  trackingMap: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    top: 20,
    left: getScreenWidth() * 0.05, // 5% responsive margin
    right: getScreenWidth() * 0.05,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: getScreenWidth() * 0.04, // 4% responsive padding
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mapOverlayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2B2B2B',
    marginBottom: 4,
    fontFamily: fontFamily.heavy,
  },
  mapOverlaySubtitle: {
    fontSize: 14,
    color: '#00bf63',
    fontFamily: fontFamily.light,
  },
  riderMarker: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#00bf63',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  riderAvatarContainer: {
    width: Math.min(getScreenWidth() * 0.15, 60), // Responsive, max 60
    height: Math.min(getScreenWidth() * 0.15, 60),
    backgroundColor: '#E8F5E9',
    borderRadius: Math.min(getScreenWidth() * 0.075, 30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
    fontFamily: fontFamily.light,
  },
  
  // Order Summary Styles
  orderSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: getScreenWidth() * 0.04, // 4% responsive padding
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  orderSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2B2B2B',
    marginBottom: 16,
    fontFamily: fontFamily.heavy,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
    fontFamily: fontFamily.light,
  },
  summaryValue: {
    fontSize: 14,
    color: '#2B2B2B',
    fontWeight: '500',
    fontFamily: fontFamily.light,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B2B2B',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: fontFamily.heavy,
  },
  itemsSection: {
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingLeft: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#2B2B2B',
    flex: 1,
    fontFamily: fontFamily.light,
  },
  itemPrice: {
    fontSize: 14,
    color: '#2B2B2B',
    fontWeight: '500',
    fontFamily: fontFamily.light,
  },
  prescriptionSection: {
    marginTop: 8,
    padding: getScreenWidth() * 0.03, // 3% responsive padding
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00bf63',
  },
  prescriptionNote: {
    fontSize: 13,
    color: '#666666',
    fontStyle: 'italic',
    fontFamily: fontFamily.light,
  },
  discountSection: {
    marginTop: 8,
    padding: getScreenWidth() * 0.03, // 3% responsive padding
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
  },
  addressSection: {
    marginTop: 8,
    padding: getScreenWidth() * 0.03, // 3% responsive padding
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#2B2B2B',
    fontFamily: fontFamily.light,
  },
  paymentSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B2B2B',
    fontFamily: fontFamily.heavy,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00bf63',
    fontFamily: fontFamily.heavy,
  },
  approvedText: {
    color: '#00bf63',
  },
  rejectedText: {
    color: '#EF4444',
  },
  discountValue: {
    color: '#00bf63',
  },
});
  }
  return cachedStyles;
};

// Lazy styles - deferred with safety wrapper to prevent any import-time issues
let styles: any;
try {
  styles = new Proxy({} as any, {
    get(target, prop) {
      try {
        return getStyles()[prop];
      } catch (error) {
        console.error('Error getting style:', prop, error);
        return {};
      }
    }
  });
} catch (proxyError) {
  console.error('Failed to create styles Proxy, using direct getter:', proxyError);
  // Fallback if Proxy creation fails
  styles = new Proxy({}, {
    get() {
      return getStyles();
    }
  });
}

export default OrderTrackingScreen;
