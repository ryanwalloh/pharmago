import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const PharmacyDashboard = () => {
  const navigate = useNavigate();
  const [pharmacyInfo, setPharmacyInfo] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [rejectingDiscount, setRejectingDiscount] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [addingMedicines, setAddingMedicines] = useState(false);
  const [medicinePrices, setMedicinePrices] = useState({}); // {medicineId: {price, original_price, cost_price}}
  const [pricingError, setPricingError] = useState('');
  
  // Custom product states
  const [customProducts, setCustomProducts] = useState([]);
  const [customProductForm, setCustomProductForm] = useState({
    name: '',
    form: '',
    customForm: '',
    category: '',
    dosage: '',
    description: '',
    prescription_required: false,
    price: '',
    original_price: '',
    cost_price: ''
  });
  const [addingCustomProducts, setAddingCustomProducts] = useState(false);
  const [showCustomAdd, setShowCustomAdd] = useState(false);
  const [medicineCategories, setMedicineCategories] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [successModalType, setSuccessModalType] = useState('custom'); // 'custom' or 'quick'
  
  // Menu/Inventory states
  const [activeView, setActiveView] = useState('orders'); // 'orders' or 'menu'
  const [inventoryData, setInventoryData] = useState({
    categories: [],
    totalItems: 0,
    availableItems: 0,
    outOfStockItems: 0,
    lowStockItems: 0
  });
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState(null);
  
  // State for search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInventoryData, setFilteredInventoryData] = useState({
    categories: [],
    totalItems: 0,
    availableItems: 0,
    outOfStockItems: 0,
    lowStockItems: 0
  });

  // Review modal search state
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [reviewSearchResults, setReviewSearchResults] = useState([]);
  const [reviewSelectedItems, setReviewSelectedItems] = useState([]);
  const [reviewSearching, setReviewSearching] = useState(false);
  const reviewSearchDebounceRef = useRef(null);
  const [isPrescriptionImagePreviewOpen, setIsPrescriptionImagePreviewOpen] = useState(false);
  const [prescriptionImagePreviewUrl, setPrescriptionImagePreviewUrl] = useState('');
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatRoom, setChatRoom] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatMessagesLoading, setChatMessagesLoading] = useState(false);
  const chatPollRef = useRef(null);
  const chatMessagesContainerRef = useRef(null);
  const [chatTyping, setChatTyping] = useState({ customer: false, pharmacy: false });
  const chatTypingPollRef = useRef(null);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);

  // State for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    form: '',
    dosage: '',
    description: '',
    prescription_required: false,
    price: '',
    original_price: '',
    cost_price: '',
    is_available: true,
    is_featured: false,
    is_on_sale: false,
    discount_percentage: '',
    expiry_date: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  // Medicine form options
  const medicineForms = [
    'Capsule',
    'Tablet',
    'Injection',
    'Syrup',
    'Cream',
    'Ointment',
    'Drops',
    'Spray',
    'Patch',
    'Suppository',
    'Powder',
    'Solution',
    'Suspension',
    'Gel',
    'Lotion',
    'Custom'
  ];

  // Mock data for orders
  const [orders, setOrders] = useState({
    pending: [],
    preparing: [],
    ready: []
  });
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Pharmacy statistics
  const [stats, setStats] = useState({
    totalOrders: 156,
    totalProducts: 0, // Will be updated from inventory data
    pendingOrders: orders.pending.length,
    preparingOrders: orders.preparing.length,
    readyOrders: orders.ready.length
  });

  // Function to fetch orders from API
  const fetchOrders = async (pharmacyId) => {
    try {
      setOrdersLoading(true);
      console.log(`Fetching orders for pharmacy ID: ${pharmacyId}`);
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/pharmacy-orders/${pharmacyId}/`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Orders API Response:', data);
        
        if (data.success) {
          setOrders({
            pending: Array.isArray(data.orders?.pending) ? data.orders.pending : [],
            preparing: Array.isArray(data.orders?.preparing) ? data.orders.preparing : [],
            ready: Array.isArray(data.orders?.ready) ? data.orders.ready : []
          });
          setStats(prev => ({
            ...prev,
            totalOrders: data.totalOrders || 0,
            pendingOrders: data.pendingOrders || 0,
            preparingOrders: data.preparingOrders || 0,
            readyOrders: data.readyOrders || 0
          }));
          console.log(`✅ Loaded ${data.totalOrders} orders from database`);
        } else {
          console.error('API returned error:', data.error);
        }
      } else {
        console.error('Failed to fetch orders:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      }
    } catch (err) {
      console.error('Unexpected error fetching orders', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Lightweight auto-refresh using backend cache version key emitted by signals
  useEffect(() => {
    let cancelled = false;
    let intervalId = null;
    const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
    const pharmacy = storedPharmacyInfo ? JSON.parse(storedPharmacyInfo) : null;
    const pid = pharmacy?.id;
    let lastVersion = null;

    const poll = async () => {
      if (!pid) return;
      try {
        const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
        const resp = await fetch(`${base}/api/cache-version/?key=${encodeURIComponent(`orders:version:pharmacy:${pid}`)}`);
        if (!resp.ok) {
          if (intervalId) {
            clearInterval(intervalId);
          }
          return;
        }
        const json = await resp.json();
        const ver = json?.value || null;
        if (ver && ver !== lastVersion) {
          lastVersion = ver;
          await fetchOrders(pid);
        }
      } catch (_) {}
    };

    // initial read and then light polling
    poll();
    intervalId = setInterval(poll, 7000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    // Load pharmacy and user info from localStorage
    const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
    const storedUserInfo = localStorage.getItem('pharmacy_user');

    if (storedPharmacyInfo) {
      const pharmacyData = JSON.parse(storedPharmacyInfo);
      setPharmacyInfo(pharmacyData);
      if (pharmacyData && pharmacyData.id) {
        fetchOrders(pharmacyData.id);
      }
    }
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    }

    setLoading(false);
  }, []);

  const handleLogout = () => {
    // Clear stored data
    localStorage.removeItem('pharmacy_user');
    localStorage.removeItem('pharmacy_info');
    
    // Redirect to home
    navigate('/');
  };

  const handleOnlineToggle = () => {
    setIsOnline(!isOnline);
  };

  const handleViewOrder = async (order) => {
    const safeOrder = {
      ...order,
      items: Array.isArray(order?.items) ? order.items : [],
      orderNumber: order?.orderNumber || order?.order_number || order?.id,
      prescriptionNotes: order?.prescriptionNotes || '',
      prescriptionImageUrl: order?.prescriptionImageUrl || '',
    };
    setSelectedOrder(safeOrder);
    
    // Auto-activate chat for cart orders (non-prescription orders)
    const isCartOrder = !safeOrder.isPrescriptionOrder;
    if (isCartOrder) {
      try {
        setChatLoading(true);
        const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
        const pharmacy = storedPharmacyInfo ? JSON.parse(storedPharmacyInfo) : null;
        const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
        const resp = await fetch(`${base}/api/order-chat-room/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: safeOrder.id, pharmacy_id: pharmacy?.id })
        });
        const data = await resp.json();
        if (data.success) {
          const roomId = data.room_id || data.room?.id;
          setChatRoom({ id: roomId, room_id: data.room_key || data.room?.room_id });
          await fetchChatMessages(roomId);
          if (chatPollRef.current) clearInterval(chatPollRef.current);
          chatPollRef.current = setInterval(() => fetchChatMessages(roomId, { silent: true }), 12000);
          if (chatTypingPollRef.current) clearInterval(chatTypingPollRef.current);
          chatTypingPollRef.current = setInterval(() => pollTypingStatus(roomId), 4000);
        }
      } catch (e) {
        console.error('Error auto-opening chat:', e);
      } finally {
        setChatLoading(false);
      }
    }
    
    // Ensure inventory is loaded for review search (for prescription orders)
    if (!inventoryData.categories || inventoryData.categories.length === 0) {
      fetchPharmacyInventory();
    }
    // Reset review search state when opening
    setReviewSearchQuery('');
    setReviewSearchResults([]);
    setReviewSelectedItems([]);
    setReviewSearching(false);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    setReviewSearchQuery('');
    setReviewSearchResults([]);
    setReviewSelectedItems([]);
    setReviewSearching(false);
    if (reviewSearchDebounceRef.current) {
      clearTimeout(reviewSearchDebounceRef.current);
      reviewSearchDebounceRef.current = null;
    }
    // Cleanup chat polling when closing modal
    if (chatPollRef.current) {
      clearInterval(chatPollRef.current);
      chatPollRef.current = null;
    }
    setShowChatPanel(false);
    setChatRoom(null);
    setChatMessages([]);
    setChatError('');
  };

  const handlePrepareOrder = (orderId) => {
    // Move order from pending to preparing
    const orderToMove = orders.pending.find(order => order.id === orderId);
    if (orderToMove) {
      setOrders(prev => ({
        ...prev,
        pending: prev.pending.filter(order => order.id !== orderId),
        preparing: [...prev.preparing, orderToMove]
      }));
    }
    setSelectedOrder(null);
  };

  const handleReadyOrder = (orderId) => {
    // Move order from preparing to ready
    const orderToMove = orders.preparing.find(order => order.id === orderId);
    if (orderToMove) {
      setOrders(prev => ({
        ...prev,
        preparing: prev.preparing.filter(order => order.id !== orderId),
        ready: [...prev.ready, orderToMove]
      }));
    }
    setSelectedOrder(null);
  };

  const handleArrivedOrder = (orderId) => {
    // Remove order from ready (delivered)
    setOrders(prev => ({
      ...prev,
      ready: prev.ready.filter(order => order.id !== orderId)
    }));
  };

  // Cart Order Handlers
  const handleApproveSeniorDiscount = async (orderId) => {
    if (!userInfo?.id) {
      alert('User information not found. Please log in again.');
      return;
    }

    try {
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/pharmacy-review-senior-discount/${orderId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pharmacy_user_id: userInfo.id,
          action: 'approve',
          notes: 'Senior ID verified and approved'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Senior discount approved:', data);
        
        // Update selected order with new totals
        setSelectedOrder(prev => ({
          ...prev,
          seniorDiscountStatus: 'approved',
          discount_amount: data.discount_amount,
          totalAmount: data.new_total
        }));
        
        // Refresh orders to show updated data
        if (pharmacyInfo?.id) {
          fetchOrders(pharmacyInfo.id);
        }
        
        alert(`Senior discount approved! New total: ₱${data.new_total.toFixed(2)}`);
      } else {
        console.error('Failed to approve senior discount:', data);
        alert(data.error || 'Failed to approve senior discount');
      }
    } catch (error) {
      console.error('Error approving senior discount:', error);
      alert('Failed to approve senior discount. Please try again.');
    }
  };

  const handleRejectSeniorDiscount = (orderId) => {
    // Show rejection modal
    setShowRejectModal(true);
    setSelectedRejectReason('');
    setCustomRejectReason('');
  };

  const handleSubmitRejection = async () => {
    if (!userInfo?.id) {
      alert('User information not found. Please log in again.');
      return;
    }

    if (!selectedRejectReason) {
      alert('Please select a reason for rejection');
      return;
    }

    if (selectedRejectReason === 'other' && !customRejectReason.trim()) {
      alert('Please specify the reason');
      return;
    }

    try {
      setRejectingDiscount(true);
      
      const REJECTION_MESSAGES = {
        'unclear_image': "We're sorry, but we couldn't verify your senior citizen ID because the image is unclear.",
        'expired_id': "We're sorry, but the senior citizen ID appears to be expired.",
        'mismatch_info': "We're sorry, but the ID information doesn't match your order details.",
        'age_verification': "We're sorry, but we couldn't verify senior citizen eligibility.",
        'other': `We're sorry, but we couldn't verify your senior citizen ID. ${customRejectReason}.`
      };

      const selectedMessage = REJECTION_MESSAGES[selectedRejectReason] || REJECTION_MESSAGES['other'];
      const notes = selectedRejectReason === 'other' ? customRejectReason : selectedRejectReason;

      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/pharmacy-review-senior-discount/${selectedOrder.id}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pharmacy_user_id: userInfo.id,
          action: 'reject',
          notes: notes
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Senior discount rejected:', data);
        
        // Update selected order
        setSelectedOrder(prev => ({
          ...prev,
          seniorDiscountStatus: 'rejected',
          discount_amount: 0,
          totalAmount: data.new_total
        }));
        
        // Send friendly rejection message to customer via chat
        if (chatRoom) {
          try {
            const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
            const pharmacy = storedPharmacyInfo ? JSON.parse(storedPharmacyInfo) : null;
            
            const rejectionMessage = `${selectedMessage}\n\nYour order total is now ₱${data.new_total.toFixed(2)} (regular price).\n\nWould you like to proceed with your order at the regular price?`;
            
            await fetch(`${base}/api/order-chat-send/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                room_id: chatRoom.id, 
                pharmacy_id: pharmacy?.id, 
                content: rejectionMessage 
              })
            });
            
            // Refresh chat messages
            await fetchChatMessages(chatRoom.id, { silent: true });
          } catch (chatError) {
            console.error('Error sending rejection message:', chatError);
          }
        }
        
        // Refresh orders
        if (pharmacyInfo?.id) {
          fetchOrders(pharmacyInfo.id);
        }
        
        // Close rejection modal
        setShowRejectModal(false);
        
        alert(`Senior discount rejected. New total: ₱${data.new_total.toFixed(2)}`);
      } else {
        console.error('Failed to reject senior discount:', data);
        alert(data.error || 'Failed to reject senior discount');
      }
    } catch (error) {
      console.error('Error rejecting senior discount:', error);
      alert('Failed to reject senior discount. Please try again.');
    } finally {
      setRejectingDiscount(false);
    }
  };

  const handleAcceptCartOrder = async (orderId) => {
    if (!userInfo?.id) {
      alert('User information not found. Please log in again.');
      return;
    }

    try {
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/accept-cart-order/${orderId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pharmacy_user_id: userInfo.id,
          notes: ''
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Cart order accepted:', data);
        
        // Send confirmation message to customer via chat
        if (chatRoom) {
          try {
            const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
            const pharmacy = storedPharmacyInfo ? JSON.parse(storedPharmacyInfo) : null;
            
            let confirmMessage;
            if (data.senior_discount_auto_approved) {
              // Senior discount was auto-approved
              confirmMessage = data.senior_discount_message || 
                `Your order has been accepted! Your senior citizen discount of ₱${data.discount_amount.toFixed(2)} has been approved. Total: ₱${data.total_amount.toFixed(2)}`;
            } else {
              // Regular acceptance message
              confirmMessage = "Your order has been accepted and is being prepared!";
            }
            
            await fetch(`${base}/api/order-chat-send/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                room_id: chatRoom.id, 
                pharmacy_id: pharmacy?.id, 
                content: confirmMessage 
              })
            });
            
            // Refresh chat messages
            await fetchChatMessages(chatRoom.id, { silent: true });
          } catch (chatError) {
            console.error('Error sending confirmation message:', chatError);
          }
        }
        
        // Move order from pending to preparing
        const orderToMove = orders.pending.find(order => order.id === orderId);
        if (orderToMove) {
          setOrders(prev => ({
            ...prev,
            pending: prev.pending.filter(order => order.id !== orderId),
            preparing: [...prev.preparing, { ...orderToMove, order_status: 'accepted' }]
          }));
        }
        
        // Close modal
        handleCloseModal();
        
        const message = data.senior_discount_auto_approved 
          ? `Order accepted with senior discount approved! Total: ₱${data.total_amount.toFixed(2)}`
          : 'Order accepted successfully! Moving to preparing queue.';
        alert(message);
      } else {
        console.error('Failed to accept cart order:', data);
        alert(data.error || 'Failed to accept cart order');
      }
    } catch (error) {
      console.error('Error accepting cart order:', error);
      alert('Failed to accept cart order. Please try again.');
    }
  };

  const handleAttachPrescriptionItems = async (order) => {
    try {
      console.log('🔗 Attaching prescription items - start', { orderId: order?.id, selectedCount: reviewSelectedItems.length });
      const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
      if (!storedPharmacyInfo) {
        alert('Pharmacy information not found. Please log in again.');
        console.error('No pharmacy_info in localStorage');
        return;
      }
      const pharmacy = JSON.parse(storedPharmacyInfo);
      if (!pharmacy?.id) {
        alert('Invalid pharmacy data.');
        console.error('Invalid pharmacy parsed from localStorage', storedPharmacyInfo);
        return;
      }

      if (!reviewSelectedItems.length) {
        alert('Please select at least one item to add.');
        console.warn('No items selected');
        return;
      }

      const payload = {
        order_id: order.id,
        pharmacy_id: pharmacy.id,
        items: reviewSelectedItems.map(item => ({
          inventory_item_id: item.id,
          quantity: 1
        })),
        notes: reviewSearchQuery ? `Matched items for: ${reviewSearchQuery}` : ''
      };
      console.log('📤 Attach payload', payload);

      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/attach-prescription-items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { success: false, error: 'Invalid JSON from server', raw: text };
      }
      console.log('📥 Attach response', { status: response.status, ok: response.ok, data });
      if (!response.ok || !data.success) {
        console.error('Attach items failed:', data);
        alert(data.error || 'Failed to add items to order.');
        return;
      }

      // Refresh orders to reflect updated totals and items
      fetchOrders(pharmacy.id);

      // Clear selection and close modal
      setReviewSelectedItems([]);
      setReviewSearchQuery('');
      setReviewSearchResults([]);
      console.log('✅ Attach success', data);
      // Keep the modal open so pharmacist can send pricing
    } catch (err) {
      console.error('❌ Error attaching items:', err);
      alert('An unexpected error occurred.');
    }
  };

  // Fetch chat messages (polling)
  const chatFetchInFlightRef = useRef(false);
  const fetchChatMessages = async (roomId, { silent = false } = {}) => {
    try {
      if (chatFetchInFlightRef.current) return;
      chatFetchInFlightRef.current = true;
      if (!silent) setChatMessagesLoading(true);
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const resp = await fetch(`${base}/api/order-chat-messages/?room_id=${roomId}&limit=100`);
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        console.error('Fetch messages failed', data);
        setChatError(data.error || 'Failed to fetch messages');
        return;
      }
      setChatMessages(data.messages || []);
      // Auto-scroll to bottom
      requestAnimationFrame(() => {
        if (chatMessagesContainerRef.current) {
          chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
        }
      });
      // Mark as read for pharmacy side (do not await)
      try {
        const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
        const pharmacy = storedPharmacyInfo ? JSON.parse(storedPharmacyInfo) : null;
        const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
        fetch(`${base}/api/order-chat-mark-read/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: roomId, pharmacy_id: pharmacy?.id }),
        });
        // Immediately re-poll typing to ensure indicator shows promptly
        try { pollTypingStatus(roomId); } catch (_) {}
      } catch (_) {}
    } catch (e) {
      console.error('Fetch messages error', e);
      setChatError('Unexpected error fetching messages');
    } finally {
      chatFetchInFlightRef.current = false;
      setChatMessagesLoading(false);
    }
  };

  // Typing: send pharmacy typing state (debounced on input change)
  const sendTypingState = useRef(null);
  if (!sendTypingState.current) {
    let typingTimeout;
    sendTypingState.current = async (roomId, isTyping) => {
      try {
        const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
        const pharmacy = storedPharmacyInfo ? JSON.parse(storedPharmacyInfo) : null;
        const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
        await fetch(`${base}/api/order-chat-typing/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: roomId, pharmacy_id: pharmacy?.id, is_typing: !!isTyping }),
        });
      } catch (_) {}
      clearTimeout(typingTimeout);
      if (isTyping) {
        typingTimeout = setTimeout(() => sendTypingState.current(roomId, false), 5000);
      }
    };
  }

  const pollTypingStatus = async (roomId) => {
    try {
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const resp = await fetch(`${base}/api/order-chat-typing-status/?room_id=${roomId}`);
      const data = await resp.json();
      if (resp.ok && data.success && data.typing) {
        setChatTyping(data.typing);
      }
    } catch (_) {}
  };

  // Ensure typing status polling only runs when chat panel is open
  useEffect(() => {
    if (showChatPanel && chatRoom) {
      if (chatTypingPollRef.current) clearInterval(chatTypingPollRef.current);
      chatTypingPollRef.current = setInterval(() => {
        pollTypingStatus(chatRoom.id);
      }, 4000);
    } else if (chatTypingPollRef.current) {
      clearInterval(chatTypingPollRef.current);
      chatTypingPollRef.current = null;
      setChatTyping({ customer: false, pharmacy: false });
    }
    return () => {
      if (chatTypingPollRef.current) {
        clearInterval(chatTypingPollRef.current);
        chatTypingPollRef.current = null;
      }
    };
  }, [showChatPanel, chatRoom?.id]);

  // Quick Add functionality
  const handleQuickAdd = async () => {
    setShowQuickAdd(true);
    setCatalogLoading(true);
    
    try {
      // Fetch medicines from the direct API endpoint (bypasses authentication)
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/medicine-catalog/?limit=200`);
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        
        // Check if the response is successful and has medicines
        if (data.success && Array.isArray(data.medicines)) {
          setMedicines(data.medicines);
          setFilteredMedicines(data.medicines);
          console.log(`✅ Loaded ${data.medicines.length} medicines from database`);
      } else {
          console.error('Invalid response format:', data);
          throw new Error('Invalid response format');
        }
      } else {
        console.error('Failed to fetch medicines:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`API request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
      console.log('Falling back to mock data for development...');
      
      // Fallback to mock data
      const mockMedicines = [
        { id: 1, name: 'Paracetamol 500mg', generic_name: 'Acetaminophen', form: 'tablet', dosage: '500mg', category: { name: 'Pain Relief' }, prescription_required: false, therapeutic_class: 'Analgesic' },
        { id: 2, name: 'Amoxicillin 250mg', generic_name: 'Amoxicillin', form: 'capsule', dosage: '250mg', category: { name: 'Antibiotics' }, prescription_required: true, therapeutic_class: 'Antibiotic' },
        { id: 3, name: 'Vitamin C 1000mg', generic_name: 'Ascorbic Acid', form: 'tablet', dosage: '1000mg', category: { name: 'Vitamins & Supplements' }, prescription_required: false, therapeutic_class: 'Vitamin Supplement' },
      ];
      setMedicines(mockMedicines);
      setFilteredMedicines(mockMedicines);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleCatalogSearch = async (query) => {
    setCatalogSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredMedicines(medicines);
    } else {
      // Try backend search first if we have a substantial query
      if (query.length >= 3) {
        try {
          const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
          const response = await fetch(`${base}/api/medicine-catalog/?search=${encodeURIComponent(query)}&limit=100`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.medicines)) {
              setFilteredMedicines(data.medicines);
              console.log(`🔍 Backend search found ${data.medicines.length} medicines for "${query}"`);
              return;
            }
          }
        } catch (error) {
          console.log('Backend search failed, using frontend search:', error);
        }
      }
      
      // Fallback to frontend search - optimized to search by product name only
      const searchTerm = query.toLowerCase().trim();
      const filtered = medicines.filter(medicine => 
        medicine.name?.toLowerCase().includes(searchTerm)
      );
      setFilteredMedicines(filtered);
      console.log(`🔍 Name search found ${filtered.length} medicines for "${query}"`);
    }
  };

  const handleSelectMedicine = (medicine) => {
    setSelectedMedicines(prev => {
      const isSelected = prev.some(selected => selected.id === medicine.id);
      if (isSelected) {
        // Remove medicine and its pricing data
        setMedicinePrices(prevPrices => {
          const newPrices = { ...prevPrices };
          delete newPrices[medicine.id];
          return newPrices;
        });
        return prev.filter(selected => selected.id !== medicine.id);
      } else {
        // Add medicine and initialize pricing data
        setMedicinePrices(prevPrices => ({
          ...prevPrices,
          [medicine.id]: {
            price: 0.00,
            original_price: 0.00,
            cost_price: 0.00
          }
        }));
        return [...prev, medicine];
      }
    });
    
    // Clear pricing error when medicines are selected/deselected
    if (pricingError) {
      setPricingError('');
    }
  };

  const handlePriceChange = (medicineId, field, value) => {
    const numValue = parseFloat(value) || 0;
    setMedicinePrices(prev => ({
      ...prev,
      [medicineId]: {
        ...prev[medicineId],
        [field]: numValue
      }
    }));
    
    // Clear pricing error when user starts entering prices
    if (pricingError) {
      setPricingError('');
    }
  };

  // Fetch medicine categories
  const fetchMedicineCategories = async () => {
    try {
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/medicine-categories/`);
      const data = await response.json();
      if (data.success) {
        setMedicineCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching medicine categories:', error);
      // Fallback to default categories
      setMedicineCategories([
        { id: 1, name: 'Pain Relief' },
        { id: 2, name: 'Antibiotics' },
        { id: 3, name: 'Vitamins & Supplements' },
        { id: 4, name: 'Cardiovascular' },
        { id: 5, name: 'Respiratory' },
        { id: 6, name: 'Gastrointestinal' },
        { id: 7, name: 'Dermatology' },
        { id: 8, name: 'Neurology' },
        { id: 9, name: 'Endocrinology' },
        { id: 10, name: 'Custom Products' }
      ]);
    }
  };

  // Fetch pharmacy inventory data
  const fetchPharmacyInventory = async () => {
    if (!pharmacyInfo?.id) {
      console.error('No pharmacy ID available');
      return;
    }

    setInventoryLoading(true);
    setInventoryError(null);

    try {
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/pharmacy-inventory/${pharmacyInfo.id}/`);
      const data = await response.json();
      
      if (data.success) {
        const inventoryData = {
          categories: data.categories,
          totalItems: data.total_items,
          availableItems: data.available_items,
          outOfStockItems: data.out_of_stock_items,
          lowStockItems: data.low_stock_items
        };
        
        setInventoryData(inventoryData);
        
        // Initialize filtered data with the same data
        setFilteredInventoryData(inventoryData);
        
        // Update stats with inventory data
        setStats(prev => ({
          ...prev,
          totalProducts: data.total_items
        }));
        
        console.log('✅ Inventory data loaded:', data);
      } else {
        throw new Error(data.error || 'Failed to fetch inventory data');
      }
    } catch (error) {
      console.error('Error fetching pharmacy inventory:', error);
      setInventoryError(error.message);
      
      // Fallback to empty data
      setInventoryData({
        categories: [],
        totalItems: 0,
        availableItems: 0,
        outOfStockItems: 0,
        lowStockItems: 0
      });
    } finally {
      setInventoryLoading(false);
    }
  };

  // Function to toggle item availability
  const toggleItemAvailability = async (itemId) => {
    if (!pharmacyInfo?.id) {
      console.error('No pharmacy ID available');
      return;
    }
    
    try {
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/toggle-availability/${pharmacyInfo.id}/${itemId}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setInventoryData(prevData => {
          const updatedCategories = prevData.categories.map(category => ({
            ...category,
            items: category.items.map(item => 
              item.id === itemId 
                ? { ...item, is_available: data.is_available }
                : item
            )
          }));
          
          // Recalculate available items count
          const availableItems = updatedCategories.reduce((total, category) => 
            total + category.items.filter(item => item.is_available).length, 0
          );
          
          const updatedData = {
            ...prevData,
            categories: updatedCategories,
            availableItems: availableItems
          };
          
          // Also update filtered data if it exists
          if (searchQuery.trim()) {
            const filtered = filterInventoryData(updatedData, searchQuery);
            setFilteredInventoryData(filtered);
          } else {
            setFilteredInventoryData(updatedData);
          }
          
          return updatedData;
        });
        
        console.log('✅ Availability toggled:', data.message);
      } else {
        console.error('Failed to toggle availability:', data.error);
        alert('Failed to update availability. Please try again.');
      }
    } catch (error) {
      console.error('Error toggling item availability:', error);
      alert('Failed to update availability. Please try again.');
    }
  };

  // Function to filter inventory data based on search query
  const filterInventoryData = (data, query) => {
    if (!query.trim()) {
      return data;
    }
    
    const searchTerm = query.toLowerCase().trim();
    const filteredCategories = [];
    
    data.categories.forEach(category => {
      const filteredItems = category.items.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.form.toLowerCase().includes(searchTerm) ||
        item.dosage.toLowerCase().includes(searchTerm) ||
        (item.description && item.description.toLowerCase().includes(searchTerm)) ||
        (item.manufacturer && item.manufacturer.toLowerCase().includes(searchTerm))
      );
      
      if (filteredItems.length > 0) {
        filteredCategories.push({
          ...category,
          items: filteredItems
        });
      }
    });
    
    // Recalculate statistics
    const totalItems = filteredCategories.reduce((total, category) => total + category.items.length, 0);
    const availableItems = filteredCategories.reduce((total, category) => 
      total + category.items.filter(item => item.is_available).length, 0
    );
    
    return {
      categories: filteredCategories,
      totalItems: totalItems,
      availableItems: availableItems,
      outOfStockItems: data.outOfStockItems, // Keep original for reference
      lowStockItems: data.lowStockItems // Keep original for reference
    };
  };

  // Function to handle search input changes
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Filter inventory data in real-time
    const filtered = filterInventoryData(inventoryData, query);
    setFilteredInventoryData(filtered);
  };

  // Function to clear search
  const clearSearch = () => {
    setSearchQuery('');
    setFilteredInventoryData(inventoryData);
  };

  // Function to open edit modal
  const openEditModal = async (itemId) => {
    if (!pharmacyInfo?.id) {
      console.error('No pharmacy ID available');
      return;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/update-inventory-item/${pharmacyInfo.id}/${itemId}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        const item = data.item;
        setEditingItem(item);
        setEditForm({
          name: item.name || '',
          form: item.form || '',
          dosage: item.dosage || '',
          description: item.description || '',
          prescription_required: item.prescription_required || false,
          price: item.price || '',
          original_price: item.original_price || '',
          cost_price: item.cost_price || '',
          is_available: item.is_available || true,
          is_featured: item.is_featured || false,
          is_on_sale: item.is_on_sale || false,
          discount_percentage: item.discount_percentage || '',
          expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : ''
        });
        setShowEditModal(true);
      } else {
        setEditError(data.error || 'Failed to load item data');
      }
    } catch (error) {
      console.error('Error loading item for editing:', error);
      setEditError('Failed to load item data');
    } finally {
      setEditLoading(false);
    }
  };

  // Function to close edit modal
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setEditForm({
      name: '',
      form: '',
      dosage: '',
      description: '',
      prescription_required: false,
      price: '',
      original_price: '',
      cost_price: '',
      is_available: true,
      is_featured: false,
      is_on_sale: false,
      discount_percentage: '',
      expiry_date: ''
    });
    setEditError(null);
  };

  // Function to handle edit form input changes
  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Function to save edited item
  const saveEditedItem = async () => {
    if (!pharmacyInfo?.id || !editingItem) {
      console.error('Missing pharmacy ID or editing item');
      return;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/update-inventory-item/${pharmacyInfo.id}/${editingItem.id}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setInventoryData(prevData => {
          const updatedCategories = prevData.categories.map(category => ({
            ...category,
            items: category.items.map(item => 
              item.id === editingItem.id 
                ? { ...item, ...data.item }
                : item
            )
          }));
          
          // Recalculate available items count
          const availableItems = updatedCategories.reduce((total, category) => 
            total + category.items.filter(item => item.is_available).length, 0
          );
          
          const updatedData = {
            ...prevData,
            categories: updatedCategories,
            availableItems: availableItems
          };
          
          // Also update filtered data if it exists
          if (searchQuery.trim()) {
            const filtered = filterInventoryData(updatedData, searchQuery);
            setFilteredInventoryData(filtered);
          } else {
            setFilteredInventoryData(updatedData);
          }
          
          return updatedData;
        });
        
        closeEditModal();
        console.log('✅ Item updated successfully:', data.message);
      } else {
        setEditError(data.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setEditError('Failed to update item');
    } finally {
      setEditLoading(false);
    }
  };

  // Custom product handlers
  const handleCustomProductInputChange = (field, value) => {
    setCustomProductForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddAnotherProduct = () => {
    // Validate required fields
    if (!customProductForm.name.trim() || !customProductForm.form || !customProductForm.category || !customProductForm.price) {
      // Add error handling here if needed - for now just return
      return;
    }

    // Create product object
    const product = {
      id: Date.now(), // Temporary ID
      name: customProductForm.name.trim(),
      form: customProductForm.form === 'Custom' ? customProductForm.customForm.trim() : customProductForm.form,
      category: customProductForm.category,
      dosage: customProductForm.dosage.trim(),
      description: customProductForm.description.trim(),
      prescription_required: customProductForm.prescription_required,
      price: parseFloat(customProductForm.price) || 0,
      original_price: parseFloat(customProductForm.original_price) || 0,
      cost_price: parseFloat(customProductForm.cost_price) || 0
    };

    // Add to custom products list
    setCustomProducts(prev => [...prev, product]);

    // Clear form
    setCustomProductForm({
      name: '',
      form: '',
      customForm: '',
      category: '',
      dosage: '',
      description: '',
      prescription_required: false,
      price: '',
      original_price: '',
      cost_price: ''
    });
  };

  const handleRemoveCustomProduct = (productId) => {
    setCustomProducts(prev => prev.filter(product => product.id !== productId));
  };

  const handleAddMoreProducts = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    
    if (successModalType === 'custom') {
      // Keep the custom add modal open for adding more products
    } else if (successModalType === 'quick') {
      // Keep the quick add modal open for adding more products
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setShowCustomAdd(false);
    setShowQuickAdd(false);
    setShowAddProductModal(false);
    setSuccessData(null);
  };

  // View switching handlers
  const handleViewSwitch = (view) => {
    setActiveView(view);
    // Clear search when switching views
    setSearchQuery('');
    setFilteredInventoryData(inventoryData);
    
    if (view === 'menu') {
      fetchPharmacyInventory();
    }
  };

  const handleAddCustomProducts = async () => {
    if (customProducts.length === 0) {
      console.log('No custom products to add');
      return;
    }

    setAddingCustomProducts(true);

    try {
      // Get pharmacy info from localStorage
      const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
      if (!storedPharmacyInfo) {
        console.error('Pharmacy information not found');
        return;
      }

      const pharmacyInfo = JSON.parse(storedPharmacyInfo);
      console.log('Adding custom products to inventory:', customProducts);

      // Prepare request data
      const requestData = {
        pharmacy_id: pharmacyInfo.id,
        custom_products: customProducts
      };

      // Call the API
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/add-custom-products-to-inventory/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data.success) {
        console.log(`Successfully added ${data.total_added} custom products to inventory!`);
        
        // Show success modal with data
        setSuccessData({
          totalAdded: data.total_added,
          totalRequested: data.total_requested,
          addedProducts: data.added_products || [],
          skippedProducts: data.skipped_products || []
        });
        setSuccessModalType('custom');
        setShowSuccessModal(true);
        
        // Reset custom add form but keep modal open for success display
        setCustomProducts([]);
        setCustomProductForm({
          name: '',
          form: '',
          customForm: '',
          category: '',
          dosage: '',
          description: '',
          prescription_required: false,
          price: '',
          original_price: '',
          cost_price: ''
        });
      } else {
        console.error(`Error: ${data.message || 'Failed to add custom products'}`);
      }
    } catch (error) {
      console.error('Error adding custom products:', error);
    } finally {
      setAddingCustomProducts(false);
    }
  };

  const handleAddSelectedMedicines = async () => {
    if (selectedMedicines.length === 0) {
      console.log('No medicines selected');
      return;
    }

    // Validate that all selected medicines have selling prices set
    const medicinesWithoutPrice = selectedMedicines.filter(medicine => {
      const pricing = medicinePrices[medicine.id];
      return !pricing || pricing.price <= 0;
    });

    if (medicinesWithoutPrice.length > 0) {
      setPricingError('Please set selling prices for all selected medicines before adding to inventory.');
      return;
    }

    // Clear any previous errors
    setPricingError('');

    setAddingMedicines(true);

    try {
      // Get pharmacy info from localStorage
      const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
      if (!storedPharmacyInfo) {
        console.error('No pharmacy info found in localStorage');
        alert('Pharmacy information not found. Please log in again.');
        return;
      }

      const pharmacyInfo = JSON.parse(storedPharmacyInfo);
      console.log('Adding selected medicines to inventory:', selectedMedicines);

      // Prepare request data with pricing information
      const medicinesWithPricing = selectedMedicines.map(medicine => ({
        ...medicine,
        pricing: medicinePrices[medicine.id] || {
          price: 0.00,
          original_price: 0.00,
          cost_price: 0.00
        }
      }));

      const requestData = {
        pharmacy_id: pharmacyInfo.id,
        medicines: medicinesWithPricing,
        default_stock: 1000   // Set to max stock level (availability controlled by toggle)
      };

      // Call the API
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/add-medicines-to-inventory/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Successfully added medicines:', data);
        
        // Show success modal with data
        setSuccessData({
          totalAdded: data.total_added,
          totalRequested: data.total_requested,
          addedProducts: data.added_medicines || [],
          skippedProducts: data.skipped_medicines || []
        });
        setSuccessModalType('quick');
        setShowSuccessModal(true);
        
        // Reset quick add states but keep modal open for success display
        setSelectedMedicines([]);
        setMedicinePrices({});
        setCatalogSearchQuery('');
        
      } else {
        const errorData = await response.json();
        console.error('Failed to add medicines:', errorData);
        console.error(`Failed to add medicines: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding medicines to inventory:', error);
    } finally {
      setAddingMedicines(false);
    }
  };

  const handleBackToMain = () => {
    setShowQuickAdd(false);
    setSelectedMedicines([]);
    setCatalogSearchQuery('');
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;

    return `${hours}:${minutesStr} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2c786c] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 sm:px-8 lg:px-16 py-6">
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 lg:mb-12 space-y-4 lg:space-y-0">
        <div className="flex items-center">
          <img 
            className="w-12 h-12 rounded-full mr-3 object-cover" 
            src={
              pharmacyInfo?.profile_picture 
                ? (pharmacyInfo.profile_picture.startsWith('http') || pharmacyInfo.profile_picture.includes('cloudinary.com')
                    ? pharmacyInfo.profile_picture
                    : `${(process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}${pharmacyInfo.profile_picture}`)
                : "/images/pharmacie.png"
            } 
            alt="Pharmacy Profile"
            onError={(e) => {
              console.error('Failed to load pharmacy profile picture:', pharmacyInfo?.profile_picture);
              e.target.src = "/images/pharmacie.png";
            }}
          />
          <h1 className="text-lg lg:text-xl font-raleway text-[#2c786c]">
            {pharmacyInfo?.name || 'Pharmacy Name'}
                </h1>
        </div>

        <div className="flex items-center space-x-2 lg:space-x-3">
          <div className="flex items-center justify-center p-3 lg:p-5 w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-gray-200 mr-1 lg:mr-2">
            <img className="w-3 h-3 lg:w-4 lg:h-4" src="/images/menu.svg" alt="Menu" />
            
          </div>
          <div className="flex items-center justify-center p-3 lg:p-5 w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-gray-200 mr-1 lg:mr-2">
            <img className="w-3 h-3 lg:w-4 lg:h-4" src="/images/bell.svg" alt="Notifications" />
          </div>
          <div className="flex items-center justify-center p-3 lg:p-5 w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-gray-200 mr-1 lg:mr-2">
            <img className="w-3 h-3 lg:w-4 lg:h-4" src="/images/settings.svg" alt="Settings" />
          </div>
          <div className="flex items-center justify-center p-3 lg:p-5 w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-orange-500 mr-1 lg:mr-2">
            <img className="w-3 h-3 lg:w-4 lg:h-4" src="/images/white-user.png" alt="User" />
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row w-full h-auto lg:h-16 px-4 lg:px-8 py-4 lg:py-3 bg-gray-200 rounded-full justify-between items-center mb-8 space-y-4 lg:space-y-0">
        <div className="flex items-center">
          <h3 className="text-base lg:text-lg">All</h3>
          <img className="w-6 h-6 lg:w-8 lg:h-8 ml-2" src="/images/caret-down.svg" alt="Dropdown" />
        </div>

        <form className="flex relative w-full lg:w-96 h-12">
          <img className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 opacity-50" src="/images/search.svg" alt="Search" />
          <input 
            type="text" 
            placeholder={activeView === 'menu' ? "Enter your product name" : "Enter order number or order ID to search"} 
            className="flex-1 pl-10 lg:pl-12 pr-4 bg-white rounded-full border-none text-sm lg:text-base font-medium"
            value={searchQuery}
            onChange={activeView === 'menu' ? handleSearchChange : (e) => setSearchQuery(e.target.value)}
          />
          {activeView === 'menu' && searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>

        {/* Search Results Counter for Menu View */}
        {activeView === 'menu' && searchQuery && (
          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {filteredInventoryData.totalItems} result{filteredInventoryData.totalItems !== 1 ? 's' : ''} found
          </div>
        )}

        <div className="flex items-center space-x-4 lg:space-x-12">
          <div className="flex items-center">
            <img className="w-4 h-4 lg:w-5 lg:h-5 mr-2 lg:mr-5" src="/images/refresh.svg" alt="Refresh" />
            <h3 className="text-sm lg:text-lg hidden sm:block">Refresh</h3>
          </div>
          <div className="flex items-center">
            <img className="w-4 h-4 lg:w-5 lg:h-5 mr-2 lg:mr-5" src="/images/report.svg" alt="Report" />
            <h3 className="text-sm lg:text-lg hidden sm:block">Report</h3>
          </div>
          <div className="flex items-center">
            <h3 className="text-sm lg:text-lg mr-2">Online</h3>
            <img 
              className="w-8 h-8 lg:w-10 lg:h-10 cursor-pointer" 
              src={isOnline ? "/images/online.png" : "/images/offline.png"} 
              alt="Online Status"
              onClick={handleOnlineToggle}
            />
          </div>
        </div>
      </div>

      <main className="flex flex-col lg:flex-row w-full h-auto lg:h-screen">
        {/* Sidebar */}
        <aside className="w-full lg:w-96 h-auto lg:h-full p-3 bg-black rounded-3xl mb-4 lg:mb-0 lg:mr-4">
          <div className="block">
            <div className="flex flex-row lg:flex-col space-x-3 lg:space-x-0 lg:space-y-3">
              <div 
                className={`flex items-center p-3 rounded-2xl flex-1 lg:flex-none cursor-pointer transition-colors ${
                  activeView === 'orders' 
                    ? 'bg-purple-600' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => handleViewSwitch('orders')}
              >
                <img className="w-8 h-8 lg:w-10 lg:h-10 mr-2 lg:mr-3 rounded-full" src="/images/orders.svg" alt="Orders" />
                <div className="text-white text-xs lg:text-sm">
                  <h3 className="font-medium">All Orders</h3>
                  <p className="text-gray-300">{stats.totalOrders} Orders</p>
                </div>
              </div>
              <div 
                className={`flex items-center p-3 rounded-2xl flex-1 lg:flex-none cursor-pointer transition-colors ${
                  activeView === 'menu' 
                    ? 'bg-purple-600' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => handleViewSwitch('menu')}
              >
                <img className="w-8 h-8 lg:w-10 lg:h-10 mr-2 lg:mr-3 rounded-full" src="/images/medicine.svg" alt="Menu" />
                <div className="text-white text-xs lg:text-sm">
                  <h3 className="font-medium">Menu</h3>
                  <p className="text-gray-300">{stats.totalProducts} Products</p>
                </div>
              </div>
              <div className="flex items-center p-3 flex-1 lg:flex-none">
                <img className="w-8 h-8 lg:w-10 lg:h-10 mr-2 lg:mr-3 rounded-full" src="/images/clock.svg" alt="History" />
                <div className="text-white text-xs lg:text-sm">
                  <h3 className="font-medium">Order History</h3>
                </div>
              </div>
            </div>

            <div className="bg-yellow-300 block p-3 rounded-2xl mt-8 lg:mt-32">
              <div className="w-full flex items-center justify-center mb-3 lg:mb-5">
                <img className="w-3/5 lg:w-4/5" src="/images/productArt.png" alt="Waiting" />
              </div>
              <button
                onClick={() => {
                  if (activeView !== 'orders') setActiveView('orders');
                  setShowAddProductModal(true);
                }}
                className="p-3 lg:p-5 flex justify-center items-center w-full bg-black text-white rounded-2xl border-none text-base lg:text-xl cursor-pointer"
              >
                <span className="mr-2 lg:mr-3">+</span> Add Product
              </button>
            </div>
          </div>
        </aside>

        {/* Main Container */}
        <div className="bg-gray-200 w-full rounded-2xl p-3 font-quicksand overflow-auto">
          {/* Menu/Inventory View */}
          {activeView === 'menu' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Pharmacy Menu</h2>
                  <p className="text-gray-600">Manage your pharmacy inventory and products</p>
                </div>
             <div className="flex items-center space-x-4 mt-4 lg:mt-0">
               <div className="text-center">
                 <div className="text-2xl font-bold text-[#2c786c]">
                   {searchQuery ? filteredInventoryData.totalItems : inventoryData.totalItems}
                 </div>
                 <div className="text-sm text-gray-600">
                   {searchQuery ? 'Search Results' : 'Total Products'}
                 </div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold text-green-600">
                   {searchQuery ? filteredInventoryData.availableItems : inventoryData.availableItems}
                 </div>
                 <div className="text-sm text-gray-600">Available</div>
               </div>
             </div>
              </div>


              {/* Loading State */}
              {inventoryLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2c786c] mb-4"></div>
                  <p className="text-gray-600">Loading inventory...</p>
                </div>
              )}

              {/* Error State */}
              {inventoryError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-700">{inventoryError}</span>
                  </div>
                </div>
              )}

              {/* Inventory Categories */}
              {!inventoryLoading && !inventoryError && (
                <div className="space-y-6">
                  {filteredInventoryData.categories.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        {searchQuery ? 'No Products Found' : 'No Products Found'}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {searchQuery 
                          ? `No products match "${searchQuery}". Try a different search term.`
                          : 'Your pharmacy inventory is empty. Add some products to get started.'
                        }
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => {
                            if (activeView !== 'orders') setActiveView('orders');
                            setShowAddProductModal(true);
                          }}
                          className="bg-[#2c786c] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1e5a52] transition-colors"
                        >
                          Add Products
                        </button>
                      )}
                      {searchQuery && (
                        <button
                          onClick={clearSearch}
                          className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredInventoryData.categories.map((category, categoryIndex) => (
                      <div key={categoryIndex} className="bg-white rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-800">{category.category_name}</h3>
                          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                            {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          {category.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800 mb-1">{item.name}</h4>
                                    <p className="text-sm text-gray-600 mb-2">
                                      {item.form} • {item.dosage}
                                      {item.prescription_required && (
                                        <span className="ml-2 text-red-500 font-medium">• Prescription Required</span>
                                      )}
                                    </p>
                                 <div className="flex items-center space-x-4 text-sm text-gray-500">
                                   <span>Price: ₱{item.price.toFixed(2)}</span>
                                   {item.is_on_sale && item.discount_percentage && (
                                     <span className="text-green-600 font-medium">
                                       {item.discount_percentage}% OFF
                                     </span>
                                   )}
                                 </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 ml-4">
                                 {/* Availability Toggle */}
                                 <button
                                   className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                     item.is_available
                                       ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                                       : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                                   }`}
                                   onClick={() => toggleItemAvailability(item.id)}
                                 >
                                   <div className="flex items-center space-x-1">
                                     <div className={`w-2 h-2 rounded-full ${
                                       item.is_available ? 'bg-green-500' : 'bg-red-500'
                                     }`}></div>
                                     <span>{item.is_available ? 'Available' : 'Unavailable'}</span>
                                   </div>
                                 </button>
                                    
                                 {/* Edit Button */}
                                 <button
                                   className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
                                   onClick={() => openEditModal(item.id)}
                                 >
                                   Edit
                                 </button>
                                  </div>
                                </div>
                             
                             {/* Expiry Warning */}
                             {item.expiry_date && new Date(item.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                               <div className="mt-2 text-xs text-yellow-600 font-medium">
                                 ⚠️ Expiring Soon
                               </div>
                             )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Orders View */}
          {activeView === 'orders' && (
            <>
              {/* Add Product Modal */}
          {showAddProductModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-4xl h-[600px] relative shadow-2xl overflow-hidden flex">
                {/* Close Button */}
                <span 
                  className="absolute top-4 right-6 text-3xl cursor-pointer text-gray-600 hover:text-gray-800 z-10 bg-white bg-opacity-80 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-100 transition-all duration-200"
                  onClick={() => {
                    setShowAddProductModal(false);
                    setShowQuickAdd(false);
                    setSelectedMedicines([]);
                    setCatalogSearchQuery('');
                  }}
                >
                  ×
                </span>
                
                {!showQuickAdd && !showCustomAdd ? (
                  <>
                    {/* Left Side - Image */}
                    <div className="w-1/2 relative">
                      <img 
                        src="/images/medicines2.png" 
                        alt="Medicines" 
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay for better text readability */}
                      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                      
                      {/* Text overlay on image */}
                      <div className="absolute inset-0 flex flex-col justify-start items-start text-white p-8 text-left pt-16">
                        <h2 className="text-4xl font-bold mb-4">Add New Product</h2>
                        <p className="text-lg opacity-90 leading-relaxed">
                          Expand your pharmacy inventory with our comprehensive selection of FDA-approved medicines and custom products
                        </p>
                      </div>
                    </div>

                    {/* Right Side - Buttons */}
                    <div className="w-1/2 p-8 flex flex-col justify-center">
                      <div className="space-y-6">
                        {/* Quick Add Button */}
                        <button 
                          className="w-full p-6 bg-gradient-to-r from-[#2c786c] to-[#3a9b8e] text-white rounded-xl hover:from-[#1e5a52] hover:to-[#2c786c] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                          onClick={() => {
                            // ensure modal is visible and list preloads immediately
                            if (!showAddProductModal) setShowAddProductModal(true);
                            handleQuickAdd();
                          }}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <h3 className="text-xl font-semibold mb-2">Quick Add</h3>
                              <p className="text-sm opacity-90 leading-relaxed">
                                Select from our comprehensive database of FDA-approved medicines and pharmaceutical products
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Custom Add Button */}
                        <button 
                          className="w-full p-6 bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-white rounded-xl hover:from-[#d97706] hover:to-[#ea580c] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                          onClick={() => {
                            if (!showAddProductModal) setShowAddProductModal(true);
                            fetchMedicineCategories();
                            setShowCustomAdd(true);
                          }}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <h3 className="text-xl font-semibold mb-2">Custom Add</h3>
                              <p className="text-sm opacity-90 leading-relaxed">
                                Create your own unique product with custom details, pricing, and specifications
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Help text */}
                      <div className="mt-8 text-center">
                        <p className="text-xs text-gray-500">
                          Need help? Contact our support team for assistance with product management
                        </p>
                      </div>
                    </div>
                  </>
                ) : showQuickAdd ? (
                  <>
                    {/* Left Side - FDA Medicine Catalog */}
                    <div className="w-1/2 p-6 flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">FDA Medicine Catalog</h1>
                        <button 
                          onClick={handleBackToMain}
                          className="text-gray-600 hover:text-gray-800 text-sm underline"
                        >
                          ← Back
                        </button>
                      </div>
                      
                      {/* Search Bar */}
                      <div className="relative mb-4">
                        <input
                          type="text"
                          placeholder="Search medicines by product name..."
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c786c] focus:border-transparent"
                          value={catalogSearchQuery}
                          onChange={(e) => handleCatalogSearch(e.target.value)}
                        />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>

                      {/* Medicine List */}
                      <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
                        {catalogLoading ? (
                          <div className="flex flex-col items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c786c] mb-2"></div>
                            <p className="text-sm text-gray-600">Loading FDA medicine catalog...</p>
                          </div>
                        ) : (
                          <div className="p-4 space-y-2">
                            {filteredMedicines.map((medicine) => (
                              <div key={medicine.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-800">{medicine.name || 'Unknown Medicine'}</h3>
                                  <p className="text-sm text-gray-600">{medicine.generic_name || 'No generic name'}</p>
                                  <p className="text-xs text-gray-500">
                                    {medicine.form} • {medicine.dosage} • {medicine.category?.name || 'Uncategorized'}
                                    {medicine.prescription_required && <span className="ml-2 text-red-500 font-medium">• Prescription Required</span>}
                                  </p>
                                  {medicine.therapeutic_class && (
                                    <p className="text-xs text-blue-600 mt-1">{medicine.therapeutic_class}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleSelectMedicine(medicine)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedMedicines.some(selected => selected.id === medicine.id)
                                      ? 'bg-[#2c786c] text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {selectedMedicines.some(selected => selected.id === medicine.id) ? 'Selected' : 'Select'}
                                </button>
                              </div>
                            ))}
                            {filteredMedicines.length === 0 && !catalogLoading && (
                              <div className="text-center text-gray-500 py-8">
                                No medicines found matching your search.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Error Message */}
                      {pricingError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-red-700">{pricingError}</span>
                          </div>
                        </div>
                      )}

                      {/* Add Button */}
                      <button
                        onClick={handleAddSelectedMedicines}
                        disabled={selectedMedicines.length === 0 || addingMedicines}
                        className={`mt-4 w-full py-3 rounded-lg font-semibold transition-colors ${
                          selectedMedicines.length === 0 || addingMedicines
                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                            : 'bg-[#2c786c] text-white hover:bg-[#1e5a52]'
                        }`}
                      >
                        {addingMedicines ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Adding to Inventory...
                          </div>
                        ) : (
                          `Add ${selectedMedicines.length} Medicine${selectedMedicines.length !== 1 ? 's' : ''} to Inventory`
                        )}
                      </button>
                    </div>

                    {/* Right Side - Selected Medicines Preview */}
                    <div className="w-1/2 p-6 bg-gray-50 flex flex-col">
                      <h2 className="text-xl font-bold text-gray-800 mb-4">Selected Medicines Preview</h2>
                      
                      <div className="flex-1 overflow-y-auto">
                        {selectedMedicines.length === 0 ? (
                          <div className="text-center text-gray-500 py-8">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <p>No medicines selected yet</p>
                            <p className="text-sm">Select medicines from the catalog to see them here</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedMedicines.map((medicine) => {
                              const pricing = medicinePrices[medicine.id] || { price: 0, original_price: 0, cost_price: 0 };
                              return (
                              <div key={medicine.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                  <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                      <h3 className="font-semibold text-gray-800">{medicine.name || 'Unknown Medicine'}</h3>
                                      <p className="text-sm text-gray-600">{medicine.generic_name || 'No generic name'}</p>
                                    <p className="text-xs text-gray-500">{medicine.form} • {medicine.dosage}</p>
                                      <p className="text-xs text-[#2c786c] font-medium">{medicine.category?.name || 'Uncategorized'}</p>
                                      {medicine.prescription_required && (
                                        <p className="text-xs text-red-500 font-medium mt-1">Prescription Required</p>
                                      )}
                                  </div>
                                  <button
                                    onClick={() => handleSelectMedicine(medicine)}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                                  
                                  {/* Pricing Section */}
                                  <div className="border-t pt-3">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Set Pricing (₱)</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Selling Price *</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={pricing.price}
                                          onChange={(e) => handlePriceChange(medicine.id, 'price', e.target.value)}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                                          placeholder="0.00"
                                          required
                                        />
                              </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Original Price</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={pricing.original_price}
                                          onChange={(e) => handlePriceChange(medicine.id, 'original_price', e.target.value)}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Cost Price</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={pricing.cost_price}
                                          onChange={(e) => handlePriceChange(medicine.id, 'cost_price', e.target.value)}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                                          placeholder="0.00"
                                        />
                                      </div>
                                    </div>
                                    {pricing.cost_price > 0 && pricing.price > 0 && (
                                      <div className="mt-2 text-xs text-gray-600">
                                        Profit Margin: {(((pricing.price - pricing.cost_price) / pricing.cost_price) * 100).toFixed(1)}%
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : showCustomAdd ? (
                  <>
                    {/* Left Side - Custom Product Form */}
                    <div className="w-1/2 p-6 bg-white flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">Create Custom Product</h1>
                        <button 
                          onClick={() => setShowCustomAdd(false)}
                          className="text-gray-600 hover:text-gray-800 text-sm underline"
                        >
                          ← Back
                        </button>
                      </div>

                      {/* Custom Product Form */}
                      <div className="flex-1 overflow-y-auto">
                        <form className="space-y-4">
                          {/* Product Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Product Name *
                            </label>
                            <input
                              type="text"
                              value={customProductForm.name}
                              onChange={(e) => handleCustomProductInputChange('name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                              placeholder="Enter product name"
                              required
                            />
                          </div>

                          {/* Form Type */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Form Type *
                            </label>
                            <select
                              value={customProductForm.form}
                              onChange={(e) => handleCustomProductInputChange('form', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                              required
                            >
                              <option value="">Select form type</option>
                              {medicineForms.map(form => (
                                <option key={form} value={form}>{form}</option>
                              ))}
                            </select>
                          </div>

                          {/* Category */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Category *
                            </label>
                            <select
                              value={customProductForm.category}
                              onChange={(e) => handleCustomProductInputChange('category', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                              required
                            >
                              <option value="">Select category</option>
                              {medicineCategories.map(category => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Custom Form Input (shown when "Custom" is selected) */}
                          {customProductForm.form === 'Custom' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Custom Form Type *
                              </label>
                              <input
                                type="text"
                                value={customProductForm.customForm}
                                onChange={(e) => handleCustomProductInputChange('customForm', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                                placeholder="Enter custom form type"
                                required
                              />
                          </div>
                        )}

                          {/* Dosage */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Dosage
                            </label>
                            <input
                              type="text"
                              value={customProductForm.dosage}
                              onChange={(e) => handleCustomProductInputChange('dosage', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                              placeholder="e.g., 500mg, 10ml, etc."
                            />
                      </div>

                          {/* Description */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={customProductForm.description}
                              onChange={(e) => handleCustomProductInputChange('description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                              rows="3"
                              placeholder="Enter product description"
                            />
                          </div>

                          {/* Prescription Required */}
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={customProductForm.prescription_required}
                                onChange={(e) => handleCustomProductInputChange('prescription_required', e.target.checked)}
                                className="mr-2 text-[#2c786c] focus:ring-[#2c786c]"
                              />
                              <span className="text-sm font-medium text-gray-700">Prescription Required</span>
                            </label>
                          </div>

                          {/* Pricing Section */}
                          <div className="border-t pt-4">
                            <h3 className="text-lg font-medium text-gray-800 mb-3">Pricing (₱)</h3>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Selling Price *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={customProductForm.price}
                                  onChange={(e) => handleCustomProductInputChange('price', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                                  placeholder="0.00"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Original Price
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={customProductForm.original_price}
                                  onChange={(e) => handleCustomProductInputChange('original_price', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Cost Price
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={customProductForm.cost_price}
                                  onChange={(e) => handleCustomProductInputChange('cost_price', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2c786c] focus:border-[#2c786c]"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            
                            {/* Profit Margin Display */}
                            {customProductForm.cost_price && customProductForm.price && parseFloat(customProductForm.cost_price) > 0 && parseFloat(customProductForm.price) > 0 && (
                              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                                <span className="text-sm text-green-700">
                                  Profit Margin: {(((parseFloat(customProductForm.price) - parseFloat(customProductForm.cost_price)) / parseFloat(customProductForm.cost_price)) * 100).toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </form>
                      </div>

                      {/* Form Actions */}
                      <div className="border-t pt-4 mt-6">
                        <button
                          onClick={handleAddAnotherProduct}
                          disabled={!customProductForm.name.trim() || !customProductForm.form || !customProductForm.category || !customProductForm.price}
                          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                            !customProductForm.name.trim() || !customProductForm.form || !customProductForm.category || !customProductForm.price
                              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                              : 'bg-[#f59e0b] text-white hover:bg-[#d97706]'
                          }`}
                        >
                          Add Another Product
                        </button>
                      </div>
                    </div>

                    {/* Right Side - Custom Products Preview */}
                    <div className="w-1/2 p-6 bg-gray-50 flex flex-col">
                      <h2 className="text-xl font-bold text-gray-800 mb-4">Custom Products Preview</h2>
                      
                      <div className="flex-1 overflow-y-auto">
                        {customProducts.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <p>No custom products created yet</p>
                            <p className="text-sm">Fill out the form to create your first custom product</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {customProducts.map((product) => (
                              <div key={product.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-gray-800">{product.name}</h3>
                                    <p className="text-sm text-gray-600">{product.form} • {product.dosage || 'No dosage specified'}</p>
                                    <p className="text-xs text-[#2c786c] font-medium">{medicineCategories.find(cat => cat.id === product.category)?.name || 'Uncategorized'}</p>
                                    {product.description && (
                                      <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                                    )}
                                    {product.prescription_required && (
                                      <p className="text-xs text-red-500 font-medium mt-1">Prescription Required</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveCustomProduct(product.id)}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                                
                                {/* Pricing Display */}
                                <div className="border-t pt-3">
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                      <span className="text-gray-600">Selling:</span>
                                      <p className="font-medium">₱{product.price.toFixed(2)}</p>
                                    </div>
                                    {product.original_price > 0 && (
                                      <div>
                                        <span className="text-gray-600">Original:</span>
                                        <p className="font-medium">₱{product.original_price.toFixed(2)}</p>
                                      </div>
                                    )}
                                    {product.cost_price > 0 && (
                                      <div>
                                        <span className="text-gray-600">Cost:</span>
                                        <p className="font-medium">₱{product.cost_price.toFixed(2)}</p>
                                      </div>
                                    )}
                                  </div>
                                  {product.cost_price > 0 && product.price > 0 && (
                                    <div className="mt-2 text-xs text-green-600">
                                      Profit: {(((product.price - product.cost_price) / product.cost_price) * 100).toFixed(1)}%
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Products Button */}
                      {customProducts.length > 0 && (
                        <div className="border-t pt-4 mt-4">
                          <button
                            onClick={handleAddCustomProducts}
                            disabled={addingCustomProducts}
                            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                              addingCustomProducts
                                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                                : 'bg-[#2c786c] text-white hover:bg-[#1e5a52]'
                            }`}
                          >
                            {addingCustomProducts ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Adding Custom Products...
                              </div>
                            ) : (
                              `Add ${customProducts.length} Custom Product${customProducts.length !== 1 ? 's' : ''} to Inventory`
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* Success Modal */}
          {showSuccessModal && successData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                {/* Success Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
              </div>
                </div>

                {/* Success Message */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Success!</h2>
                  <p className="text-gray-600 mb-4">
                    Successfully added <span className="font-semibold text-green-600">{successData.totalAdded}</span> {successModalType === 'custom' ? 'custom product' : 'FDA approved medicine'}{successData.totalAdded !== 1 ? 's' : ''} to your inventory.
                  </p>
                  
                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between mb-1">
                        <span>Products Added:</span>
                        <span className="font-medium text-green-600">{successData.totalAdded}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Total Requested:</span>
                        <span className="font-medium">{successData.totalRequested}</span>
                      </div>
                      {successData.skippedProducts.length > 0 && (
                        <div className="flex justify-between">
                          <span>Skipped:</span>
                          <span className="font-medium text-orange-600">{successData.skippedProducts.length}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Added Products List */}
                  {successData.addedProducts.length > 0 && (
                    <div className="text-left mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        {successModalType === 'custom' ? 'Added Products:' : 'Added Medicines:'}
                      </h3>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {successData.addedProducts.map((product, index) => (
                          <div key={index} className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded">
                            • {product.name} - ₱{(typeof product.price === 'number' ? product.price : parseFloat(product.price || 0)).toFixed(2)}
                            {successModalType === 'quick' && product.generic_name && (
                              <span className="text-gray-500 ml-1">({product.generic_name})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skipped Products (if any) */}
                  {successData.skippedProducts.length > 0 && (
                    <div className="text-left mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        {successModalType === 'custom' ? 'Skipped Products:' : 'Skipped Medicines:'}
                      </h3>
                      <div className="max-h-20 overflow-y-auto space-y-1">
                        {successData.skippedProducts.map((product, index) => (
                          <div key={index} className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                            • {product.name} - {product.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleAddMoreProducts}
                    className="flex-1 bg-[#f59e0b] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#d97706] transition-colors"
                  >
                    {successModalType === 'custom' ? 'Add More Products' : 'Add More Products'}
                  </button>
                  <button
                    onClick={handleCloseSuccessModal}
                    className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Order Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-4xl h-[600px] relative shadow-2xl overflow-hidden flex">
                <span 
                  className="absolute top-2 right-4 text-2xl cursor-pointer"
                  onClick={handleCloseModal}
                >
                  ×
                </span>
                <div className="w-full h-full flex">
                  {selectedOrder.isPrescriptionOrder ? (
                    <>
                      {/* Left: Image or Chat */}
                      <div className="w-1/2 relative bg-gray-50">
                        {!showChatPanel ? (
                          <div className="w-full h-full p-4 flex items-center justify-center">
                            {selectedOrder.prescriptionImageUrl ? (
                              <img 
                                src={selectedOrder.prescriptionImageUrl} 
                                alt="Prescription" 
                                className="max-h-full max-w-full object-contain rounded cursor-zoom-in"
                                onClick={() => {
                                  setPrescriptionImagePreviewUrl(selectedOrder.prescriptionImageUrl);
                                  setIsPrescriptionImagePreviewOpen(true);
                                }}
                                onError={(e) => {
                                  if (e?.target) {
                                    e.target.style.display = 'none';
                                    const fallback = e.target.nextSibling;
                                    if (fallback && fallback.style) {
                                      fallback.style.display = 'block';
                                    }
                                  }
                                }}
                              />
                            ) : (
                              <div className="text-gray-500 text-center">
                                No prescription image available
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col">
                            {/* Chat Header */}
                            <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-gray-800 truncate">Chat with Customer</h3>
                                <p className="text-xs text-gray-500 truncate">Order No. {selectedOrder.orderNumber}{chatRoom ? ` • Room ${chatRoom.room_id}` : ''}</p>
                                {chatTyping.customer && (
                                  <p className="text-[11px] text-[#2c786c] mt-0.5">Customer is typing…</p>
                                )}
                              </div>
                              <button
                                className="text-xs text-[#2c786c] hover:underline"
                                onClick={() => {
                                  setShowChatPanel(false);
                                  if (chatTypingPollRef.current) {
                                    clearInterval(chatTypingPollRef.current);
                                    chatTypingPollRef.current = null;
                                  }
                                }}
                              >
                                Back to Image
                              </button>
                            </div>

                            {/* Messages Container */}
                            <div ref={chatMessagesContainerRef} className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50">
                              {chatError && (
                                <div className="text-xs text-red-600 text-center">{chatError}</div>
                              )}
                              {!chatError && chatMessages.length === 0 && !chatMessagesLoading && (
                                <div className="text-xs text-gray-500 text-center">No messages yet.</div>
                              )}
                              {chatMessages.map((m) => (
                                <div key={m.id} className={`flex flex-col ${((m.sender_role_code === 'pharmacy') || (m.sender_role === 'pharmacy')) ? 'items-end text-right' : 'items-start'}`}>
                                  <div className="text-[11px] text-gray-500">{m.sender_name} • {new Date(m.timestamp).toLocaleString()}</div>
                                  <div className={`inline-block max-w-[85%] mt-1 px-3 py-2 rounded-lg text-sm ${m.is_system_message ? 'bg-gray-200 text-gray-700' : ((m.sender_role_code === 'customer' || m.sender_role === 'customer') ? 'bg-green-50 border border-green-200 text-green-900' : 'bg-white border text-gray-800')} ${m._optimistic ? 'opacity-50' : ''}`}>
                                    {m.content}
                                    {!m.is_system_message && (m.sender_role_code === 'pharmacy' || m.sender_role === 'pharmacy') && (
                                      <span className="ml-2 align-middle text-[10px] text-gray-400">
                                        {m.read_at ? '✓✓' : (m.delivered_at ? '✓' : '')}
                                      </span>
                                    )}
                                  </div>
                                  {m._optimistic && (
                                    <div className="text-[11px] text-gray-400 mt-1">Sending…</div>
                                  )}
                                </div>
                              ))}
                              {chatMessagesLoading && chatMessages.length === 0 && (
                                <div className="text-xs text-gray-500 text-center">Loading messages…</div>
                              )}
                            </div>

                            {/* Composer */}
                            <div className="p-3 border-t bg-white">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2c786c]"
                                  placeholder="Type a message..."
                                  value={chatInput}
                                  onChange={(e) => {
                                    setChatInput(e.target.value);
                                    if (chatRoom) sendTypingState.current(chatRoom.id, true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (!chatSending) {
                                        const btn = document.getElementById('chat-send-btn');
                                        if (btn) btn.click();
                                      }
                                    }
                                  }}
                                  disabled={chatSending}
                                />
                                <button
                                  id="chat-send-btn"
                                  className="px-3 py-2 rounded-lg bg-[#2c786c] text-white text-sm disabled:opacity-50"
                                  disabled={chatSending || !chatRoom || !chatInput.trim()}
                                  onClick={async () => {
                                    if (!chatRoom || !chatInput.trim()) return;
                                    try {
                                      setChatSending(true);
                                      const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
                                      const pharmacy = storedPharmacyInfo ? JSON.parse(storedPharmacyInfo) : null;
                                      const payload = {
                                        room_id: chatRoom.id,
                                        pharmacy_id: pharmacy?.id,
                                        content: chatInput.trim(),
                                      };
                                      // Optimistic append
                                      const optimistic = {
                                        id: `temp-${Date.now()}`,
                                        sender_name: 'You',
                                        sender_role: 'Pharmacy',
                                        message_type: 'text',
                                        content: payload.content,
                                        timestamp: new Date().toISOString(),
                                        is_system_message: false,
                                      };
                                      setChatMessages((prev) => [...prev, optimistic]);
                                      setChatInput('');
                                      requestAnimationFrame(() => {
                                        if (chatMessagesContainerRef.current) {
                                          chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
                                        }
                                      });
                                      // Send
                                      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
                                      const resp = await fetch(`${base}/api/order-chat-send/`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(payload)
                                      });
                                      const data = await resp.json();
                                      if (!resp.ok || !data.success) {
                                        console.error('Send message failed', data);
                                        setChatError(data.error || 'Failed to send message');
                                        // fallback: refetch to reconcile (silent)
                                        await fetchChatMessages(chatRoom.id, { silent: true });
                                        return;
                                      }
                                      // Reconcile list (simple refetch)
                                      await fetchChatMessages(chatRoom.id, { silent: true });
                                    } catch (e) {
                                      console.error('Send message error', e);
                                      setChatError('Unexpected error sending message');
                                    } finally {
                                      setChatSending(false);
                                    }
                                  }}
                                >
                                  {chatSending ? 'Sending…' : 'Send'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        {!showChatPanel && selectedOrder.prescriptionNotes && (
                          <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-3 text-sm">
                            <div className="text-gray-700">{selectedOrder.prescriptionNotes}</div>
                          </div>
                        )}
                      </div>

                      {/* Right: Search & Select */}
                      <div className="w-1/2 p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <h1 className="text-xl font-bold text-gray-800">Match Prescription Items</h1>
                          <span className="text-xs text-gray-500">Order No. <span className="font-semibold">{selectedOrder.orderNumber}</span></span>
                        </div>

                        {/* Review Search */}
                        <div className="mb-3">
                      <label className="block text-sm text-gray-700 mb-1">Search inventory to match prescription</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={reviewSearchQuery}
                          onChange={(e) => {
                            const value = e.target.value;
                            setReviewSearchQuery(value);
                            // Debounced client-side filter across inventoryData
                            if (reviewSearchDebounceRef.current) {
                              clearTimeout(reviewSearchDebounceRef.current);
                            }
                            reviewSearchDebounceRef.current = setTimeout(() => {
                              if (!value.trim()) {
                                setReviewSearchResults([]);
                                return;
                              }
                              setReviewSearching(true);
                              const term = value.toLowerCase();
                              const results = [];
                              inventoryData.categories.forEach((category) => {
                                (category.items || []).forEach((item) => {
                                  const hay = [
                                    item.name,
                                    item.form,
                                    item.dosage,
                                    item.description,
                                    item.manufacturer,
                                  ]
                                    .filter(Boolean)
                                    .map((x) => String(x).toLowerCase())
                                    .join(' ');
                                  if (hay.includes(term)) {
                                    results.push({ ...item, categoryName: category.name });
                                  }
                                });
                              });
                              setReviewSearchResults(results.slice(0, 50));
                              setReviewSearching(false);
                            }, 250);
                          }}
                          placeholder="e.g. Amoxicillin 500mg"
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c786c] focus:border-transparent"
                        />
                        <span className="absolute right-3 top-2.5 text-gray-400">
                          {reviewSearching ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"></path>
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 10A7 7 0 103 10a7 7 0 0014 0z" />
                            </svg>
                          )}
                        </span>
                      </div>
                      </div>

                      {/* Results list */}
                      {reviewSearchQuery.trim() && (
                        <div className="flex-1 overflow-auto border border-gray-200 rounded-lg divide-y">
                          {reviewSearchResults.length === 0 && !reviewSearching && (
                            <div className="p-3 text-sm text-gray-500">No results</div>
                          )}
                          {reviewSearchResults.map((item) => (
                            <div key={item.id} className="flex items-start justify-between p-3 hover:bg-gray-50">
                              <div className="mr-3">
                                <div className="font-medium text-sm text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-600">{item.form}{item.dosage ? ` • ${item.dosage}` : ''}</div>
                                <div className="text-[11px] text-gray-500">{item.categoryName || item.category?.name}</div>
                                {item.price != null && (
                                  <div className="text-xs text-gray-800">₱{Number(item.price).toFixed(2)}</div>
                                )}
                                {item.stock_quantity != null && (
                                  <div className="text-[11px] text-gray-500">Stock: {item.stock_quantity}</div>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  if (!reviewSelectedItems.find((x) => x.id === item.id)) {
                                    setReviewSelectedItems((prev) => [...prev, item]);
                                  }
                                }}
                                className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white hover:bg-green-700"
                                title="Add"
                              >
                                +
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Selected items (quick view) */}
                      <div className="mt-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">Selected</div>
                        {reviewSelectedItems.length === 0 ? (
                          <div className="text-xs text-gray-500">No items selected yet.</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {reviewSelectedItems.map((item) => (
                              <span key={item.id} className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs border border-green-200">
                                {item.name}
                                <button
                                  className="ml-2 text-green-700 hover:text-green-900"
                                  onClick={() => setReviewSelectedItems((prev) => prev.filter((x) => x.id !== item.id))}
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="mt-4 space-y-2">
                        {orders.pending.some(o => o.id === selectedOrder.id) && (
                          <>
                            <button 
                              onClick={() => handleAttachPrescriptionItems(selectedOrder)}
                              className="w-full bg-[#2c786c] text-white p-3 rounded-xl text-base cursor-pointer hover:bg-[#1e5a52]"
                            >
                              Add Selected Items to Order
                            </button>
                            <button
                              onClick={async () => {
                                  try {
                                  setChatError('');
                                  setChatLoading(true);
                                  const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
                                  const pharmacy = storedPharmacyInfo ? JSON.parse(storedPharmacyInfo) : null;
                                  const payload = { order_id: selectedOrder.id };
                                  if (pharmacy?.id) payload.pharmacy_id = pharmacy.id;
                                  const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
                                  const resp = await fetch(`${base}/api/order-chat-room/`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                  });
                                  const text = await resp.text();
                                  let data;
                                  try { data = JSON.parse(text); } catch (_) { data = { success: false, error: 'Invalid JSON', raw: text }; }
                                  if (!resp.ok || !data.success) {
                                    console.error('Create/Fetch chat room failed', data);
                                    setChatError(data.error || 'Failed to open chat.');
                                    return;
                                  }
                                  const roomId = data.room_id || data.room?.id;
                                  const roomKey = data.room_key || data.room?.room_id;
                                  setChatRoom({ id: roomId, room_id: roomKey });
                                  setShowChatPanel(true);
                                  // Immediately fetch messages and start polling
                                  await fetchChatMessages(roomId);
                                  // Try to include quoted total in message
                                  let quotedTotal = null;
                                  try {
                                    const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
                                    const statusResp = await fetch(`${base}/api/order-status/${selectedOrder.id}/`);
                                    const statusJson = await statusResp.json();
                                    if (statusResp.ok && statusJson.success) {
                                      const payload = statusJson.data || statusJson;
                                      quotedTotal = typeof payload.total_amount === 'number' ? payload.total_amount : (payload.data?.total_amount || null);
                                    }
                                  } catch (_) {}
                                  if (chatPollRef.current) clearInterval(chatPollRef.current);
                                  chatPollRef.current = setInterval(() => {
                                    fetchChatMessages(roomId, { silent: true });
                                  }, 12000);
                                  // Start typing status polling
                                  if (chatTypingPollRef.current) clearInterval(chatTypingPollRef.current);
                                  chatTypingPollRef.current = setInterval(() => {
                                    pollTypingStatus(roomId);
                                  }, 4000);
                                  // Persist/refresh totals first so the breakdown is accurate
                                  try {
                                    const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
                                    await fetch(`${base}/api/prepare-price-quote/`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ order_id: selectedOrder.id })
                                    });
                                  } catch (_) {}
                                  // Send pricing prompt message to customer (friendly invoice-style summary)
                                  try {
                                    // Fetch latest breakdown for invoice-like message
                                    let subtotal = null, delivery = null, serviceFee = null, total = quotedTotal, itemLines = [];
                                    try {
                                      // Force totals refresh, then read status
                                      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
                                      await fetch(`${base}/api/prepare-price-quote/`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ order_id: selectedOrder.id })
                                      });
                                      const statusResp2 = await fetch(`${base}/api/order-status/${selectedOrder.id}/`);
                                      const statusJson2 = await statusResp2.json();
                                      const p = statusJson2?.data || statusJson2;
                                      subtotal = typeof p?.subtotal === 'number' ? p.subtotal : null;
                                      delivery = typeof p?.delivery_fee === 'number' ? p.delivery_fee : null;
                                      serviceFee = typeof p?.tax_amount === 'number' ? p.tax_amount : null; // display as Service Fee
                                      if (typeof p?.total_amount === 'number') total = p.total_amount;
                                      if (Array.isArray(p?.items)) {
                                        itemLines = p.items.map((it) => {
                                          const nm = String((it && (it.name || it.product || it.display_name)) || 'Item');
                                          const rawUnit = it && (it.unit_price != null ? it.unit_price : it.price);
                                          const unit = typeof rawUnit === 'number' ? rawUnit : (rawUnit ? Number(rawUnit) : null);
                                          const priceStr = unit != null && !Number.isNaN(unit) ? `₱${Number(unit).toFixed(2)}` : '₱0.00';
                                          return `- ${nm} — ${priceStr}`;
                                        }).filter(Boolean);
                                      }
                                    } catch (_) {}
                                    const parts = [];
                                    if (subtotal != null) parts.push(`Subtotal: ₱${Number(subtotal).toFixed(2)}`);
                                    if (serviceFee != null) parts.push(`Service Fee: ₱${Number(serviceFee).toFixed(2)}`);
                                    if (delivery != null) parts.push(`Delivery Fee: ₱${Number(delivery).toFixed(2)}`);
                                    const header = total != null
                                      ? `Your price quote is ready: ₱${Number(total).toFixed(2)}`
                                      : `Your price quote is ready.`;
                                    const breakdown = parts.length ? `\n${parts.join('\n')}` : '';
                                    const itemsLine = itemLines.length ? `\nItems:\n${itemLines.join('\n')}` : '';
                                    const footer = total != null ? `\nTotal: ₱${Number(total).toFixed(2)}` : '';
                                    const msgContent = `${header}${breakdown}${itemsLine}${footer}`;

                                    // Optimistic pricing message (semi-transparent with Sending...)
                                    const tempId = `temp-${Date.now()}`;
                                    const optimisticMsg = {
                                      id: tempId,
                                      sender_name: 'You',
                                      sender_role: 'pharmacy',
                                      message_type: 'text',
                                      content: msgContent,
                                      timestamp: new Date().toISOString(),
                                      is_system_message: false,
                                      _optimistic: true
                                    };
                                    setChatMessages((prev) => [...prev, optimisticMsg]);
                                    requestAnimationFrame(() => {
                                      if (chatMessagesContainerRef.current) {
                                        chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
                                      }
                                    });

                                    const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
                                    const sendResp = await fetch(`${base}/api/order-chat-send/`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ room_id: roomId, pharmacy_id: pharmacy?.id, content: msgContent })
                                    });
                                    const sendJson = await sendResp.json();
                                    if (!sendResp.ok || !sendJson.success) {
                                      // Mark failure subtly or refetch
                                      await fetchChatMessages(roomId, { silent: true });
                                    } else {
                                      // Reconcile list (refetch replaces optimistic with real message)
                                      await fetchChatMessages(roomId, { silent: true });
                                    }
                                  } catch (_) {}
                                  // Also nudge the customer's app to show pricing approval sheet by updating totals/state (client already polls)
                                } catch (e) {
                                  console.error('Open chat error', e);
                                  setChatError('Unexpected error opening chat.');
                                } finally {
                                  setChatLoading(false);
                                }
                              }}
                              className="w-full bg-blue-600 text-white p-3 rounded-xl text-base cursor-pointer hover:bg-blue-700 disabled:opacity-50"
                              disabled={chatLoading}
                            >
                              {chatLoading ? 'Sending…' : 'Send Pricing to Customer'}
                            </button>
                            <button 
                              onClick={() => handlePrepareOrder(selectedOrder.id)}
                              className="w-full bg-green-500 text-white p-3 rounded-xl text-base cursor-pointer hover:bg-green-600"
                            >
                              Prepare Order
                            </button>
                          </>
                        )}
                        {orders.preparing.some(o => o.id === selectedOrder.id) && (
                          <button 
                            onClick={() => handleReadyOrder(selectedOrder.id)}
                            className="w-full bg-orange-500 text-white p-3 rounded-xl text-base cursor-pointer hover:bg-orange-600"
                          >
                            Ready
                          </button>
                        )}
                      </div>
                      </div>
                    </>
                  ) : (
                    // ✅ NEW: Cart Order Modal (non-prescription orders)
                    <>
                      {/* Left Side: Chat Panel + Senior ID */}
                      <div className="w-1/2 relative bg-gray-50 flex flex-col">
                        {/* Chat Panel */}
                        <div className="flex-1 flex flex-col">
                          {/* Chat Header */}
                          <div className="px-4 py-3 border-b bg-white">
                            <h3 className="text-sm font-semibold text-gray-800">Chat with Customer</h3>
                            <p className="text-xs text-gray-500">Order No. {selectedOrder.orderNumber}{chatRoom ? ` • Room ${chatRoom.room_id}` : ''}</p>
                            {chatTyping.customer && (
                              <p className="text-[11px] text-[#2c786c] mt-0.5">Customer is typing…</p>
                            )}
                          </div>

                          {/* Messages Container */}
                          <div ref={chatMessagesContainerRef} className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50">
                            {chatError && (
                              <div className="text-xs text-red-600 text-center">{chatError}</div>
                            )}
                            {!chatError && chatMessages.length === 0 && !chatMessagesLoading && (
                              <div className="text-xs text-gray-500 text-center">
                                {chatRoom ? 'No messages yet.' : 'Click "Open Chat" to start messaging'}
                              </div>
                            )}
                            {chatMessages.map((m) => (
                              <div key={m.id} className={`flex flex-col ${((m.sender_role_code === 'pharmacy') || (m.sender_role === 'pharmacy')) ? 'items-end text-right' : 'items-start'}`}>
                                <div className="text-[11px] text-gray-500">{m.sender_name} • {new Date(m.timestamp).toLocaleString()}</div>
                                <div className={`inline-block max-w-[85%] mt-1 px-3 py-2 rounded-lg text-sm ${m.is_system_message ? 'bg-gray-200 text-gray-700' : ((m.sender_role_code === 'customer' || m.sender_role === 'customer') ? 'bg-green-50 border border-green-200 text-green-900' : 'bg-white border text-gray-800')} ${m._optimistic ? 'opacity-50' : ''}`}>
                                  {m.content}
                                  {!m.is_system_message && (m.sender_role_code === 'pharmacy' || m.sender_role === 'pharmacy') && (
                                    <span className="ml-2 align-middle text-[10px] text-gray-400">
                                      {m.read_at ? '✓✓' : (m.delivered_at ? '✓' : '')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {chatMessagesLoading && chatMessages.length === 0 && (
                              <div className="text-xs text-gray-500 text-center">Loading messages…</div>
                            )}
                          </div>

                          {/* Chat Input */}
                          <div className="p-3 border-t bg-white">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2c786c]"
                                placeholder="Type a message..."
                                value={chatInput}
                                onChange={(e) => {
                                  setChatInput(e.target.value);
                                  if (chatRoom) sendTypingState.current(chatRoom.id, true);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const btn = document.getElementById('cart-chat-send-btn');
                                    if (btn) btn.click();
                                  }
                                }}
                                disabled={chatSending || !chatRoom}
                              />
                              <button
                                id="cart-chat-send-btn"
                                className="px-3 py-2 rounded-lg bg-[#2c786c] text-white text-sm disabled:opacity-50"
                                disabled={chatSending || !chatRoom || !chatInput.trim()}
                                onClick={async () => {
                                  if (!chatRoom || !chatInput.trim()) {
                                    // Open chat if not opened yet
                                    if (!chatRoom) {
                                      try {
                                        setChatLoading(true);
                                        const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
                                        const pharmacy = storedPharmacyInfo ? JSON.parse(storedPharmacyInfo) : null;
                                        const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
                                        const resp = await fetch(`${base}/api/order-chat-room/`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ order_id: selectedOrder.id, pharmacy_id: pharmacy?.id })
                                        });
                                        const data = await resp.json();
                                        if (data.success) {
                                          const roomId = data.room_id || data.room?.id;
                                          setChatRoom({ id: roomId, room_id: data.room_key || data.room?.room_id });
                                          await fetchChatMessages(roomId);
                                          if (chatPollRef.current) clearInterval(chatPollRef.current);
                                          chatPollRef.current = setInterval(() => fetchChatMessages(roomId, { silent: true }), 12000);
                                        }
                                      } catch (e) {
                                        console.error('Error opening chat:', e);
                                      } finally {
                                        setChatLoading(false);
                                      }
                                    }
                                    return;
                                  }
                                  try {
                                    setChatSending(true);
                                    const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
                                    const pharmacy = storedPharmacyInfo ? JSON.parse(storedPharmacyInfo) : null;
                                    const optimistic = {
                                      id: `temp-${Date.now()}`,
                                      sender_name: 'You',
                                      sender_role: 'Pharmacy',
                                      content: chatInput.trim(),
                                      timestamp: new Date().toISOString(),
                                      is_system_message: false,
                                      _optimistic: true
                                    };
                                    setChatMessages(prev => [...prev, optimistic]);
                                    setChatInput('');
                                    requestAnimationFrame(() => {
                                      if (chatMessagesContainerRef.current) {
                                        chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
                                      }
                                    });
                                    const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
                                    const resp = await fetch(`${base}/api/order-chat-send/`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ room_id: chatRoom.id, pharmacy_id: pharmacy?.id, content: chatInput.trim() })
                                    });
                                    const data = await resp.json();
                                    if (!resp.ok || !data.success) {
                                      setChatError(data.error || 'Failed to send message');
                                    }
                                    await fetchChatMessages(chatRoom.id, { silent: true });
                                  } catch (e) {
                                    console.error('Send error', e);
                                    setChatError('Unexpected error');
                                  } finally {
                                    setChatSending(false);
                                  }
                                }}
                              >
                                {chatSending ? 'Sending…' : (chatRoom ? 'Send' : 'Open Chat')}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Senior Citizen ID Section */}
                        {selectedOrder.seniorDiscountRequested && selectedOrder.seniorCitizenIdImage && (
                          <div className="border-t bg-white p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-semibold text-gray-800">Senior Citizen ID</h3>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                selectedOrder.seniorDiscountStatus === 'approved' ? 'bg-green-100 text-green-700' :
                                selectedOrder.seniorDiscountStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {selectedOrder.seniorDiscountStatus === 'approved' ? 'Approved' :
                                 selectedOrder.seniorDiscountStatus === 'rejected' ? 'Rejected' :
                                 'Pending Review'}
                              </span>
                            </div>
                            <div className="relative">
                              <img 
                                src={selectedOrder.seniorCitizenIdImage} 
                                alt="Senior Citizen ID" 
                                className="w-full h-32 object-contain bg-gray-100 rounded cursor-pointer hover:opacity-90"
                                onClick={() => {
                                  setPrescriptionImagePreviewUrl(selectedOrder.seniorCitizenIdImage);
                                  setIsPrescriptionImagePreviewOpen(true);
                                }}
                                onError={(e) => {
                                  e.target.src = '/images/id-placeholder.png';
                                }}
                              />
                              <p className="text-xs text-gray-500 mt-1 text-center">Click to enlarge</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Side: Order Details & Actions */}
                      <div className="w-1/2 p-6 flex flex-col overflow-y-auto">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Details</h2>
                        
                        {/* Order Items */}
                        <div className="mb-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Items</h3>
                          <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                            {selectedOrder.items && selectedOrder.items.length > 0 ? (
                              selectedOrder.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-start text-sm">
                                  <span className="flex-1">
                                    {item.quantity}x {item.name}
                                    {item.prescription_required && (
                                      <span className="ml-2 text-xs text-red-500">Rx Required</span>
                                    )}
                                  </span>
                                  <span className="font-medium">₱{item.total_price.toFixed(2)}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-500">No items in order</div>
                            )}
                          </div>
                        </div>

                        {/* Order Summary */}
                        <div className="mb-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Order Summary</h3>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between text-base font-bold">
                              <span>Subtotal:</span>
                              <span className="text-[#2c786c]">₱{(selectedOrder.subtotal || 0).toFixed(2)}</span>
                            </div>
                            {selectedOrder.discount_amount > 0 && (
                              <div className="flex justify-between text-sm text-green-600 mt-1">
                                <span>Senior Discount Applied:</span>
                                <span className="font-semibold">-₱{(selectedOrder.discount_amount || 0).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Senior Discount Actions */}
                        {selectedOrder.seniorDiscountRequested && selectedOrder.seniorDiscountStatus === 'pending' && (
                          <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Senior Citizen Discount Review</h3>
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-3">
                              <p className="text-sm text-gray-700 mb-1">
                                Customer has requested senior citizen discount
                              </p>
                              <p className="text-xs text-gray-600">
                                Discount will be automatically approved when you accept the order
                              </p>
                              <p className="text-xs text-gray-600">
                                Potential discount: ₱{((selectedOrder.subtotal || 0) * 0.20).toFixed(2)} (20% off) + ₱19.00 service fee waived
                              </p>
                            </div>
                            <button
                              onClick={() => handleRejectSeniorDiscount(selectedOrder.id)}
                              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                              Reject Discount (if ID is invalid)
                            </button>
                          </div>
                        )}

                        {/* Senior Discount Status (if already reviewed) */}
                        {selectedOrder.seniorDiscountRequested && selectedOrder.seniorDiscountStatus !== 'pending' && (
                          <div className="mb-4">
                            <div className={`p-3 rounded-lg ${
                              selectedOrder.seniorDiscountStatus === 'approved' 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-red-50 border border-red-200'
                            }`}>
                              <p className="text-sm font-medium">
                                {selectedOrder.seniorDiscountStatus === 'approved' 
                                  ? 'Senior discount approved' 
                                  : 'Senior discount rejected'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Cancelled Order Display */}
                        {selectedOrder.order_status === 'cancelled' && (
                          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                            <h3 className="text-red-700 font-semibold mb-2">Order Cancelled</h3>
                            <p className="text-sm text-red-600">
                              This order has been cancelled by the customer.
                            </p>
                            <button 
                              onClick={handleCloseModal}
                              className="mt-3 w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                            >
                              Close
                            </button>
                          </div>
                        )}

                        {/* Order Actions */}
                        {selectedOrder.order_status !== 'cancelled' && (
                          <div className="mt-auto space-y-2">
                            {selectedOrder.order_status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleAcceptCartOrder(selectedOrder.id)}
                                  className="w-full bg-[#2c786c] text-white px-4 py-3 rounded-lg text-base font-semibold hover:bg-[#1e5a52] transition-colors"
                                >
                                  Accept & Start Preparing Order
                                </button>
                                
                                <button
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to reject this order?')) {
                                      // TODO: Implement reject order endpoint
                                      alert('Reject order functionality coming soon');
                                    }
                                  }}
                                  className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                                >
                                  Reject Order
                                </button>
                              </>
                            )}
                            
                            {selectedOrder.order_status === 'accepted' && (
                              <button
                                onClick={() => handleReadyOrder(selectedOrder.id)}
                                className="w-full bg-orange-500 text-white px-4 py-3 rounded-lg text-base font-semibold hover:bg-orange-600 transition-colors"
                              >
                                Mark as Ready for Pickup
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Rejection Reason Modal */}
                {showRejectModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRejectModal(false)}>
                    <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                      <h3 className="text-lg font-semibold mb-4">Reason for Rejecting Senior Discount</h3>
                      
                      <div className="space-y-2 mb-4">
                        <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input 
                            type="radio" 
                            name="rejectReason"
                            value="unclear_image"
                            checked={selectedRejectReason === 'unclear_image'}
                            onChange={(e) => setSelectedRejectReason(e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <span className="text-sm">ID image is unclear or unreadable</span>
                        </label>
                        
                        <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input 
                            type="radio" 
                            name="rejectReason"
                            value="expired_id"
                            checked={selectedRejectReason === 'expired_id'}
                            onChange={(e) => setSelectedRejectReason(e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <span className="text-sm">ID appears to be expired</span>
                        </label>
                        
                        <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input 
                            type="radio" 
                            name="rejectReason"
                            value="mismatch_info"
                            checked={selectedRejectReason === 'mismatch_info'}
                            onChange={(e) => setSelectedRejectReason(e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <span className="text-sm">ID does not match customer information</span>
                        </label>
                        
                        <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input 
                            type="radio" 
                            name="rejectReason"
                            value="age_verification"
                            checked={selectedRejectReason === 'age_verification'}
                            onChange={(e) => setSelectedRejectReason(e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <span className="text-sm">Customer does not appear to be 60 years or older</span>
                        </label>
                        
                        <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input 
                            type="radio" 
                            name="rejectReason"
                            value="other"
                            checked={selectedRejectReason === 'other'}
                            onChange={(e) => setSelectedRejectReason(e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <span className="text-sm">Other reason (please specify)</span>
                        </label>
                      </div>
                      
                      {selectedRejectReason === 'other' && (
                        <textarea
                          className="w-full border border-gray-300 p-3 rounded-lg mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Please specify the reason..."
                          value={customRejectReason}
                          onChange={(e) => setCustomRejectReason(e.target.value)}
                          rows="3"
                        />
                      )}
                      
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setShowRejectModal(false)}
                          className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                          disabled={rejectingDiscount}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSubmitRejection}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                          disabled={rejectingDiscount || !selectedRejectReason}
                        >
                          {rejectingDiscount ? 'Submitting...' : 'Submit Rejection'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prescription Image Fullscreen Preview */}
                {isPrescriptionImagePreviewOpen && prescriptionImagePreviewUrl && (
                  <div className="fixed inset-0 z-50">
                    <div
                      className="absolute inset-0 bg-black bg-opacity-80"
                      onClick={() => setIsPrescriptionImagePreviewOpen(false)}
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="relative max-w-5xl w-full">
                        <button
                          className="absolute -top-10 right-0 text-white text-2xl"
                          onClick={() => setIsPrescriptionImagePreviewOpen(false)}
                          aria-label="Close preview"
                        >
                          ×
                        </button>
                        <img
                          src={prescriptionImagePreviewUrl}
                          alt="Prescription Preview"
                          className="w-full h-[80vh] object-contain rounded shadow-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

          {/* Tab Headers */}
          <div className="hidden lg:flex justify-between bg-white rounded-2xl p-3 px-20 text-sm text-black mb-3">
            <div className="text-center"><h2>Order No.</h2></div>
            <div className="text-center"><h2>Rider</h2></div>
            <div className="text-center"><h2>Ordered By</h2></div>
            <div className="text-center"><h2>Duration</h2></div>
            <div className="text-center"><h2>Amount</h2></div>
            <div className="text-center"><h2>Action</h2></div>
          </div>

          {/* Pending Orders */}
          <div className="mb-6">
            <h3 className="ml-2 lg:ml-5 text-gray-600 text-base lg:text-lg mb-3">New Orders({orders.pending.length})</h3>
            <div className="space-y-3">
              {ordersLoading ? (
                <>
                  <div className="animate-pulse bg-white rounded-2xl p-4 lg:p-3 lg:px-20">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-40 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-56"></div>
                  </div>
                  <div className="animate-pulse bg-white rounded-2xl p-4 lg:p-3 lg:px-20">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-40 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-56"></div>
                  </div>
                </>
              ) : (
                orders.pending.map(order => (
                  <div key={order.id} className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white rounded-2xl p-4 lg:p-3 lg:px-20 space-y-3 lg:space-y-0">
                    <div className="text-center">
                      <h3 className="text-base lg:text-lg font-medium">Order #{order.id}</h3>
                    </div>
                    <div className="flex items-center">
                      <img className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3" src="/images/human.png" alt="Rider" />
                    <div>
                        <h3 className="text-sm lg:text-lg font-medium">{order.riderName}</h3>
                        <p className="text-gray-600 text-xs lg:text-sm">{order.riderPhone}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm lg:text-lg font-medium">{order.customerName}</h3>
                      <p className="text-gray-600 text-xs lg:text-sm truncate">{order.customerAddress}</p>
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm lg:text-lg font-medium">00:30:00</h3>
                      <p className="text-gray-600 text-xs lg:text-sm">{formatTime(order.createdAt)}</p>
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm lg:text-lg font-medium">
                        {order.isPrescriptionOrder ? 'Prescription Order' : `₱${(order.totalAmount||0).toFixed(2)}`}
                      </h3>
                      <p className="text-gray-600 text-xs lg:text-sm">
                        {order.isPrescriptionOrder ? 'Needs review for pricing' : (order.payment_method || 'COD')}
                      </p>
                    </div>
                    <div className="text-center">
                      <button 
                        onClick={() => handleViewOrder(order)}
                        className="bg-green-500 text-white px-6 lg:px-10 py-2 lg:py-3 rounded-2xl text-sm lg:text-lg cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preparing Orders */}
          <div className="mb-6">
            <h3 className="ml-2 lg:ml-5 text-gray-600 text-base lg:text-lg mb-3">Preparing({orders.preparing.length})</h3>
            <div className="space-y-3">
              {orders.preparing.map(order => (
                <div key={order.id} className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white rounded-2xl p-4 lg:p-3 lg:px-20 space-y-3 lg:space-y-0">
                  <div className="text-center">
                    <h3 className="text-base lg:text-lg font-medium">Order #{order.id}</h3>
                    <button 
                      onClick={() => handleViewOrder(order)}
                      className="text-gray-600 text-sm bg-white border-none"
                    >
                      View Order
                    </button>
                  </div>
                  <div className="flex items-center">
                    <img className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3" src="/images/human.png" alt="Rider" />
                    <div>
                      <h3 className="text-sm lg:text-lg font-medium">{order.riderName}</h3>
                      <p className="text-gray-600 text-xs lg:text-sm">{order.riderPhone}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm lg:text-lg font-medium">{order.customerName}</h3>
                    <p className="text-gray-600 text-xs lg:text-sm truncate">{order.customerAddress}</p>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm lg:text-lg font-medium">00:30:00</h3>
                    <p className="text-gray-600 text-xs lg:text-sm">{formatTime(order.createdAt)}</p>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm lg:text-lg font-medium">
                      {order.isPrescriptionOrder ? 'Prescription Order' : `₱${(order.totalAmount||0).toFixed(2)}`}
                    </h3>
                    <p className="text-gray-600 text-xs lg:text-sm">
                      {order.isPrescriptionOrder ? 'Needs review for pricing' : 'Paid'}
                    </p>
                  </div>
                  <div className="text-center">
                    <button 
                      onClick={() => handleReadyOrder(order.id)}
                      className="bg-orange-500 text-white px-6 lg:px-10 py-2 lg:py-3 rounded-2xl text-sm lg:text-lg cursor-pointer"
                    >
                      Ready
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ready Orders */}
          <div className="mb-6">
            <h3 className="ml-2 lg:ml-5 text-gray-600 text-base lg:text-lg mb-3">Ready Orders({orders.ready.length})</h3>
            <div className="space-y-3">
              {orders.ready.map(order => (
                <div key={order.id} className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white rounded-2xl p-4 lg:p-3 lg:px-20 space-y-3 lg:space-y-0">
                  <div className="text-center">
                    <h3 className="text-base lg:text-lg font-medium">Order #{order.id}</h3>
                  </div>
                  <div className="flex items-center">
                    <img className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3" src="/images/human.png" alt="Rider" />
                    <div>
                      <h3 className="text-sm lg:text-lg font-medium">{order.riderName}</h3>
                      <p className="text-gray-600 text-xs lg:text-sm">{order.riderPhone}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm lg:text-lg font-medium">{order.customerName}</h3>
                    <p className="text-gray-600 text-xs lg:text-sm truncate">{order.customerAddress}</p>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm lg:text-lg font-medium">00:30:00</h3>
                    <p className="text-gray-600 text-xs lg:text-sm">{formatTime(order.createdAt)}</p>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm lg:text-lg font-medium">
                      {order.isPrescriptionOrder ? 'Prescription Order' : `₱${(order.totalAmount||0).toFixed(2)}`}
                    </h3>
                    <p className="text-gray-600 text-xs lg:text-sm">
                      {order.isPrescriptionOrder ? 'Needs review for pricing' : 'Paid'}
                    </p>
                  </div>
                  <div className="text-center">
                    <button 
                      onClick={() => handleArrivedOrder(order.id)}
                      className="bg-purple-600 text-white px-6 lg:px-10 py-2 lg:py-3 rounded-2xl text-sm lg:text-lg cursor-pointer"
                    >
                      Arrived
                    </button>
                  </div>
                </div>
              ))}
              </div>
          </div>
            </>
          )}
        </div>
      </main>

      {/* Edit Item Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Edit Product</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {editLoading && !editingItem ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c786c]"></div>
                  <span className="ml-3 text-gray-600">Loading product data...</span>
                </div>
              ) : editError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-700">{editError}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => handleEditFormChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c786c] focus:border-transparent"
                        placeholder="Enter product name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Form</label>
                      <select
                        value={editForm.form}
                        onChange={(e) => handleEditFormChange('form', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c786c] focus:border-transparent"
                      >
                        <option value="">Select form</option>
                        {medicineForms.map(form => (
                          <option key={form} value={form}>{form}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
                      <input
                        type="text"
                        value={editForm.dosage}
                        onChange={(e) => handleEditFormChange('dosage', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c786c] focus:border-transparent"
                        placeholder="e.g., 500mg, 10ml"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => handleEditFormChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c786c] focus:border-transparent"
                      placeholder="Enter product description"
                    />
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) => handleEditFormChange('price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c786c] focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Original Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.original_price}
                        onChange={(e) => handleEditFormChange('original_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c786c] focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cost Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.cost_price}
                        onChange={(e) => handleEditFormChange('cost_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c786c] focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                      <input
                        type="date"
                        value={editForm.expiry_date}
                        onChange={(e) => handleEditFormChange('expiry_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c786c] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Discount %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.discount_percentage}
                        onChange={(e) => handleEditFormChange('discount_percentage', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2c786c] focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="prescription_required"
                        checked={editForm.prescription_required}
                        onChange={(e) => handleEditFormChange('prescription_required', e.target.checked)}
                        className="h-4 w-4 text-[#2c786c] focus:ring-[#2c786c] border-gray-300 rounded"
                      />
                      <label htmlFor="prescription_required" className="ml-2 text-sm text-gray-700">
                        Prescription Required
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_available"
                        checked={editForm.is_available}
                        onChange={(e) => handleEditFormChange('is_available', e.target.checked)}
                        className="h-4 w-4 text-[#2c786c] focus:ring-[#2c786c] border-gray-300 rounded"
                      />
                      <label htmlFor="is_available" className="ml-2 text-sm text-gray-700">
                        Available for Sale
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_featured"
                        checked={editForm.is_featured}
                        onChange={(e) => handleEditFormChange('is_featured', e.target.checked)}
                        className="h-4 w-4 text-[#2c786c] focus:ring-[#2c786c] border-gray-300 rounded"
                      />
                      <label htmlFor="is_featured" className="ml-2 text-sm text-gray-700">
                        Featured Product
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_on_sale"
                        checked={editForm.is_on_sale}
                        onChange={(e) => handleEditFormChange('is_on_sale', e.target.checked)}
                        className="h-4 w-4 text-[#2c786c] focus:ring-[#2c786c] border-gray-300 rounded"
                      />
                      <label htmlFor="is_on_sale" className="ml-2 text-sm text-gray-700">
                        On Sale
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                onClick={saveEditedItem}
                disabled={editLoading || !editForm.name.trim()}
                className="px-6 py-2 bg-[#2c786c] text-white rounded-lg hover:bg-[#1e5a52] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {editLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyDashboard;
