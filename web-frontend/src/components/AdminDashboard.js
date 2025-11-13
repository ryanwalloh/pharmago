import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const RAILWAY_THEME = {
  appBackground: 'linear-gradient(135deg, #070C1F 0%, #0C132F 45%, #141C3D 70%, #1A2452 100%)',
  surfacePrimary: 'rgba(15, 22, 44, 0.92)',
  surfaceSecondary: 'rgba(20, 28, 54, 0.8)',
  cardHighlight: 'rgba(29, 39, 74, 0.85)',
  borderSoft: '1px solid rgba(66, 156, 255, 0.18)',
  textPrimary: '#F4F6FF',
  textSecondary: '#93A3C6',
  accentTeal: '#32E0C4',
  accentPink: '#FF4D8D',
  accentPurple: '#6C63FF',
  accentOrange: '#FFB347',
  shadowSoft: '0 24px 48px rgba(5, 10, 24, 0.45)',
  shadowStrong: '0 32px 70px rgba(2, 6, 18, 0.6)',
};

const PRIMARY_PANEL_STYLE = {
  background: RAILWAY_THEME.surfacePrimary,
  border: RAILWAY_THEME.borderSoft,
  boxShadow: RAILWAY_THEME.shadowStrong,
  backdropFilter: 'blur(18px)',
};

const SECONDARY_PANEL_STYLE = {
  background: RAILWAY_THEME.surfaceSecondary,
  border: '1px solid rgba(76, 111, 255, 0.16)',
  boxShadow: RAILWAY_THEME.shadowSoft,
  backdropFilter: 'blur(16px)',
};

const MODAL_SCRIM_STYLE = {
  background: 'rgba(3, 8, 20, 0.78)',
  backdropFilter: 'blur(18px)',
};

const MODAL_PANEL_STYLE = {
  background: 'linear-gradient(160deg, rgba(15,22,44,0.96), rgba(7,12,26,0.96))',
  border: '1px solid rgba(76,111,255,0.28)',
  boxShadow: '0 48px 96px rgba(2,6,18,0.78)',
  color: RAILWAY_THEME.textPrimary,
};

const MODAL_SECTION_STYLE = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '20px',
};

const MODAL_PRIMARY_BUTTON_STYLE = {
  background: 'linear-gradient(135deg, rgba(50,224,196,0.6), rgba(108,99,255,0.6))',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#F4F6FF',
};

const MODAL_SECONDARY_BUTTON_STYLE = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(244,246,255,0.75)',
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [pharmacyStats, setPharmacyStats] = useState({
    totalPharmacies: 0,
    pendingApprovals: 0,
    activePharmacies: 0,
    suspendedPharmacies: 0,
    pendingPharmaciesData: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTile, setActiveTile] = useState('total'); // 'total', 'pending', 'active', 'suspended'
  const [pendingPharmacies, setPendingPharmacies] = useState([]);
  const [loadingPendingPharmacies, setLoadingPendingPharmacies] = useState(false);
  const [pharmacyList, setPharmacyList] = useState([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [detailedPharmacyData, setDetailedPharmacyData] = useState(null);
  const [modalError, setModalError] = useState(null);
  
  // Success modal state
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Riders: state (mirror of pharmacies)
  const [riderStats, setRiderStats] = useState({
    totalRiders: 0,
    pendingApprovals: 0,
    activeRiders: 0,
    suspendedRiders: 0,
    pendingRidersData: []
  });
  const [pendingRiders, setPendingRiders] = useState([]);
  const [activeRiders, setActiveRiders] = useState([]);
  const [suspendedRiders, setSuspendedRiders] = useState([]);
  const [allRiders, setAllRiders] = useState([]);
  const [loadingPendingRiders, setLoadingPendingRiders] = useState(false);
  const [riderActiveTile, setRiderActiveTile] = useState('pending');
  const [riderSearchTerm, setRiderSearchTerm] = useState('');

  // Rider modals
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderModalLoading, setRiderModalLoading] = useState(false);
  const [detailedRiderData, setDetailedRiderData] = useState(null);
  const [riderModalError, setRiderModalError] = useState(null);
  const [isRiderSuccessOpen, setIsRiderSuccessOpen] = useState(false);
  const [riderSuccessData, setRiderSuccessData] = useState(null);

  const handleLogout = () => {
    console.log('Logging out - removing token from localStorage');
    localStorage.removeItem('pharmago_admin_token');
    
    // Verify token was removed
    const tokenAfterLogout = localStorage.getItem('pharmago_admin_token');
    console.log('Token after logout:', tokenAfterLogout);
    
    navigate('/pharmago-admin');
  };

  // Fetch pharmacy statistics from API
  const fetchPharmacyStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching pharmacy statistics (no auth required)...');
      
      // Try the new direct endpoint (bypasses all authentication)
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await axios.get(`${base}/api/pharmacy-stats/`);
      console.log('API Response:', response.data);
      
      setPharmacyStats(response.data);
      
      // Also store the pending pharmacies data for immediate use
      if (response.data.pendingPharmaciesData) {
        setPendingPharmacies(response.data.pendingPharmaciesData);
        console.log('Pending pharmacies data stored:', response.data.pendingPharmaciesData);
      }
    } catch (err) {
      console.error('Error fetching pharmacy statistics:', err);
      
      let errorMessage = 'Failed to fetch pharmacy statistics';
      if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Fallback to mock data if API fails
      setPharmacyStats({
        totalPharmacies: 156,
        pendingApprovals: 12,
        activePharmacies: 134,
        suspendedPharmacies: 10,
        pendingPharmaciesData: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Riders: fetch stats (direct endpoint, mirror pattern)
  const fetchRiderStats = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching rider statistics (no auth required)...');
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await axios.get(`${base}/api/rider-stats/`);
      console.log('Rider stats API response:', response.data);
      setRiderStats(response.data);
      if (response.data.pendingRidersData) {
        setPendingRiders(response.data.pendingRidersData);
      }
    } catch (err) {
      console.error('Error fetching rider statistics:', err?.response?.status, err?.message, err?.response?.data);
      // Fallback to empty counts if API not ready
      setRiderStats({ totalRiders: 0, pendingApprovals: 0, activeRiders: 0, suspendedRiders: 0, pendingRidersData: [] });
      setPendingRiders([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending pharmacies from API
  const fetchPendingPharmacies = async () => {
    try {
      setLoadingPendingPharmacies(true);
      setError(null);
      
      console.log('Fetching pending pharmacies...');
      
      // Use the pharmacy stats endpoint which now includes pending pharmacies data
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await axios.get(`${base}/api/pharmacy-stats/`);
      console.log('Pending Pharmacies API Response:', response.data);
      
      if (response.data.pendingPharmaciesData) {
        setPendingPharmacies(response.data.pendingPharmaciesData);
        console.log('Real pending pharmacies data loaded:', response.data.pendingPharmaciesData);
      } else {
        console.log('No pending pharmacies data found in response');
        setPendingPharmacies([]);
      }
    } catch (err) {
      console.error('Error fetching pending pharmacies:', err);
      
      // Fallback to mock data if API fails
      console.log('Using mock data for pending pharmacies');
      setPendingPharmacies([
        {
          id: 1,
          pharmacy_name: 'MediCare Express Pharmacy',
          owner_first_name: 'Maria',
          owner_last_name: 'Santos',
          business_phone: '+63 912 345 6789',
          business_email: 'maria.santos@medicare.ph',
          barangay: 'Barangay Poblacion',
          city: 'Iligan City'
        },
        {
          id: 2,
          pharmacy_name: 'HealthFirst Drugstore',
          owner_first_name: 'Juan',
          owner_last_name: 'Dela Cruz',
          business_phone: '+63 917 234 5678',
          business_email: 'juan.delacruz@healthfirst.ph',
          barangay: 'Barangay Tambo',
          city: 'Iligan City'
        }
      ]);
    } finally {
      setLoadingPendingPharmacies(false);
    }
  };

  // Fetch active pharmacies for Manage Pharmacies list (direct endpoint, no auth)
  const fetchActivePharmacies = async () => {
    try {
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const resp = await axios.get(`${base}/api/active-pharmacies/`);
      const arr = Array.isArray(resp.data) ? resp.data : [];
      const mapped = arr.map(p => ({
        id: p.id,
        name: p.pharmacy_name || '',
        address: [p.street_address, p.barangay, p.city, p.province].filter(Boolean).join(', '),
        business_phone: p.business_phone || '',
        business_email: p.business_email || '',
      }));
      setPharmacyList(mapped);
    } catch (err) {
      console.error('Error fetching active pharmacies:', err?.response?.status, err?.message, err?.response?.data);
      setPharmacyList([]);
    } finally {
    }
  };

  // Riders: fetch pending list (from stats response)
  const fetchPendingRiders = async () => {
    try {
      setLoadingPendingRiders(true);
      setError(null);
      console.log('Fetching pending riders...');
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await axios.get(`${base}/api/rider-stats/`);
      console.log('Pending riders API response:', response.data);
      if (response.data.pendingRidersData) {
        setPendingRiders(response.data.pendingRidersData);
      } else {
        setPendingRiders([]);
      }
    } catch (err) {
      console.error('Error fetching pending riders:', err?.response?.status, err?.message, err?.response?.data);
      setPendingRiders([]);
    } finally {
      setLoadingPendingRiders(false);
    }
  };

  // Riders: fetch active list
  const fetchActiveRiders = async () => {
    try {
      setLoadingPendingRiders(true);
      setError(null);
      console.log('Fetching active riders...');
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await axios.get(`${base}/api/rider-stats/`);
      console.log('Active riders from stats API:', response.data?.activeRidersData);
      setActiveRiders(Array.isArray(response.data?.activeRidersData) ? response.data.activeRidersData : []);
    } catch (err) {
      console.error('Error fetching active riders:', err?.response?.status, err?.message, err?.response?.data);
      setActiveRiders([]);
    } finally {
      setLoadingPendingRiders(false);
    }
  };

  // Riders: fetch suspended list
  const fetchSuspendedRiders = async () => {
    try {
      setLoadingPendingRiders(true);
      setError(null);
      console.log('Fetching suspended riders...');
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await axios.get(`${base}/api/rider-stats/`);
      console.log('Suspended riders from stats API:', response.data?.suspendedRidersData);
      setSuspendedRiders(Array.isArray(response.data?.suspendedRidersData) ? response.data.suspendedRidersData : []);
    } catch (err) {
      console.error('Error fetching suspended riders:', err?.response?.status, err?.message, err?.response?.data);
      setSuspendedRiders([]);
    } finally {
      setLoadingPendingRiders(false);
    }
  };

  // Riders: fetch all list
  const fetchAllRiders = async () => {
    try {
      setLoadingPendingRiders(true);
      setError(null);
      console.log('Fetching all riders...');
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await axios.get(`${base}/api/rider-stats/`);
      console.log('All riders from stats API:', response.data?.allRidersData);
      setAllRiders(Array.isArray(response.data?.allRidersData) ? response.data.allRidersData : []);
    } catch (err) {
      console.error('Error fetching all riders:', err?.response?.status, err?.message, err?.response?.data);
      setAllRiders([]);
    } finally {
      setLoadingPendingRiders(false);
    }
  };

  // Handle tile click
  const handleTileClick = (tileType) => {
    setActiveTile(tileType);
    if (tileType === 'pending') {
      fetchPendingPharmacies();
    }
  };

  const handleRiderTileClick = (tileType) => {
    setRiderActiveTile(tileType);
    if (tileType === 'pending') {
      fetchPendingRiders();
    } else if (tileType === 'active') {
      fetchActiveRiders();
    } else if (tileType === 'suspended') {
      fetchSuspendedRiders();
    } else if (tileType === 'total') {
      fetchAllRiders();
    }
  };

  // Modal handlers
  const handleViewPharmacy = async (pharmacy) => {
    console.log('Opening modal for pharmacy:', pharmacy);
    setSelectedPharmacy(pharmacy);
    setIsModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setDetailedPharmacyData(null);
    
    try {
      console.log('Fetching detailed pharmacy data for ID:', pharmacy.id);
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await axios.get(`${base}/api/pharmacy-details/${pharmacy.id}/`);
      console.log('Detailed pharmacy data received:', response.data);
      
      setDetailedPharmacyData(response.data);
      setModalLoading(false);
    } catch (err) {
      console.error('Error fetching detailed pharmacy data:', err);
      setModalError('Failed to load pharmacy details. Please try again.');
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPharmacy(null);
    setModalLoading(false);
    setDetailedPharmacyData(null);
    setModalError(null);
  };

  // Riders: modal handlers
  const handleViewRider = async (rider) => {
    setSelectedRider(rider);
    setIsRiderModalOpen(true);
    setRiderModalLoading(true);
    setRiderModalError(null);
    setDetailedRiderData(null);
    try {
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await axios.get(`${base}/api/rider-details/${rider.id}/`);
      setDetailedRiderData(response.data);
      setRiderModalLoading(false);
    } catch (err) {
      setRiderModalError('Failed to load rider details. Please try again.');
      setRiderModalLoading(false);
    }
  };

  const handleCloseRiderModal = () => {
    setIsRiderModalOpen(false);
    setSelectedRider(null);
    setRiderModalLoading(false);
    setDetailedRiderData(null);
    setRiderModalError(null);
  };

  const handleApproveRider = async () => {
    if (!selectedRider) return;
    try {
      setRiderModalLoading(true);
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await axios.post(`${base}/api/approve-rider/${selectedRider.id}/`);
      if (response.data.success) {
        setRiderSuccessData({
          riderName: `${selectedRider.first_name} ${selectedRider.last_name}`,
          email: response.data.email,
          phone: response.data.phone_number,
          emailStatus: response.data.email_status || 'not_sent',
        });
        setIsRiderSuccessOpen(true);
        handleCloseRiderModal();
        fetchRiderStats();
        fetchPendingRiders();
      } else {
        throw new Error(response.data.message || 'Approval failed');
      }
    } catch (error) {
      setRiderModalError('Failed to approve rider. Please try again.');
    } finally {
      setRiderModalLoading(false);
    }
  };

  const handleCloseRiderSuccess = () => {
    setIsRiderSuccessOpen(false);
    setRiderSuccessData(null);
  };

  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false);
    setSuccessData(null);
  };

  const handleApprovePharmacy = async () => {
    if (!selectedPharmacy) return;
    
    try {
      setModalLoading(true);
      console.log('Approving pharmacy:', selectedPharmacy);
      
      const base = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await axios.post(`${base}/api/approve-pharmacy/${selectedPharmacy.id}/`);
      console.log('Approval response:', response.data);
      
      if (response.data.success) {
        // Store success data and show success modal
        setSuccessData({
          pharmacyName: selectedPharmacy.pharmacy_name,
          businessEmail: response.data.business_email,
          tokenExpiresAt: response.data.token_expires_at,
          emailStatus: response.data.email_status
        });
        setIsSuccessModalOpen(true);
        
        // Close modal and refresh data
        handleCloseModal();
        fetchPharmacyStats(); // Refresh the pharmacy stats
        fetchPendingPharmacies(); // Refresh pending pharmacies list
      } else {
        throw new Error(response.data.message || 'Approval failed');
      }
    } catch (error) {
      console.error('Error approving pharmacy:', error);
      
      let errorMessage = 'Failed to approve pharmacy. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error in a more user-friendly way
      setModalError(`❌ Error: ${errorMessage}`);
    } finally {
      setModalLoading(false);
    }
  };

  // Check authentication and fetch data when component mounts
  useEffect(() => {
    const checkAuthAndFetchData = () => {
      const token = localStorage.getItem('pharmago_admin_token');
      if (!token) {
        navigate('/pharmago-admin');
        return;
      }
      fetchPharmacyStats();
      fetchActivePharmacies();
      fetchRiderStats();
    };
    checkAuthAndFetchData();
  }, [navigate]);

  // When navigating to Manage Riders, refresh rider stats (and pending list if needed)
  useEffect(() => {
    if (activeNav === 'Manage Riders') {
      fetchRiderStats();
      if (riderActiveTile === 'pending') {
        fetchPendingRiders();
      }
    }
  }, [activeNav, riderActiveTile]);

  // When navigating to Manage Pharmacies, refresh stats and active list
  useEffect(() => {
    if (activeNav === 'Manage Pharmacies') {
      fetchPharmacyStats();
      fetchActivePharmacies();
      if (activeTile === 'pending') {
        fetchPendingPharmacies();
      }
    }
  }, [activeNav, activeTile]);

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'Manage Pharmacies', label: 'Pharmacies', icon: 'M3 7h18M5 7v10a2 2 0 002 2h10a2 2 0 002-2V7M9 11h6v6H9z' },
    { id: 'Manage Riders', label: 'Riders', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197' },
    { id: 'Customers', label: 'Customers', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'Live Orders', label: 'Live Orders', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'Mail', label: 'Mail', icon: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'Reports', label: 'Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'Settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  const getInitials = (value = '') => {
    const cleaned = value.trim();
    if (!cleaned) {
      return 'PG';
    }
    return cleaned
      .split(/\s+/)
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatUnit = (count, singular, plural) => `${count.toLocaleString()} ${count === 1 ? singular : plural}`;

  const dashboardMetrics = useMemo(() => {
    const totalPharmacies = Number(pharmacyStats?.totalPharmacies) || 0;
    const activePharmacies = Number(pharmacyStats?.activePharmacies) || 0;
    const pendingPharmaciesCount = Number(pharmacyStats?.pendingApprovals) || 0;
    const suspendedPharmacies = Number(pharmacyStats?.suspendedPharmacies) || 0;

    const totalRiders = Number(riderStats?.totalRiders) || 0;
    const activeRiders = Number(riderStats?.activeRiders) || 0;
    const pendingRiders = Number(riderStats?.pendingApprovals) || 0;
    const suspendedRiders = Number(riderStats?.suspendedRiders) || 0;

    const networkSize = totalPharmacies + totalRiders;
    const networkActive = activePharmacies + activeRiders;
    const pendingCombined = pendingPharmaciesCount + pendingRiders;
    const suspendedCombined = suspendedPharmacies + suspendedRiders;

    const metrics = [
      {
        key: 'network',
        label: 'Network Size',
        display: networkSize.toLocaleString(),
        descriptor: `${formatUnit(totalPharmacies, 'pharmacy', 'pharmacies')} • ${formatUnit(totalRiders, 'rider', 'riders')}`,
        accent: 'linear-gradient(135deg, rgba(50,224,196,0.25), rgba(108,99,255,0.22))',
        iconPath: 'M3 7h18M5 7v10a2 2 0 002 2h10a2 2 0 002-2V7M9 11h6v6H9z',
      },
      {
        key: 'coverage',
        label: 'Active Coverage',
        display: networkActive.toLocaleString(),
        descriptor: `${formatUnit(activePharmacies, 'active pharmacy', 'active pharmacies')} • ${formatUnit(activeRiders, 'active rider', 'active riders')}`,
        accent: 'linear-gradient(135deg, rgba(108,99,255,0.24), rgba(50,224,196,0.22))',
        iconPath: 'M5 13l4 4L19 7',
      },
      {
        key: 'pending',
        label: 'Pending Actions',
        display: pendingCombined.toLocaleString(),
        descriptor: `${formatUnit(pendingPharmaciesCount, 'pharmacy pending', 'pharmacies pending')} • ${formatUnit(pendingRiders, 'rider pending', 'riders pending')}`,
        accent: 'linear-gradient(135deg, rgba(255,179,71,0.24), rgba(108,99,255,0.24))',
        iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        key: 'suspended',
        label: 'Suspended Accounts',
        display: suspendedCombined.toLocaleString(),
        descriptor: `${formatUnit(suspendedPharmacies, 'pharmacy suspended', 'pharmacies suspended')} • ${formatUnit(suspendedRiders, 'rider suspended', 'riders suspended')}`,
        accent: 'linear-gradient(135deg, rgba(255,77,141,0.22), rgba(108,99,255,0.26))',
        iconPath: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728',
      },
    ];

    return {
      metrics,
      summary: {
        networkSize,
        networkActive,
        pendingCombined,
        suspendedCombined,
      },
    };
  }, [pharmacyStats, riderStats]);

  const revenueTrend = useMemo(() => {
    const rawTrend = Array.isArray(pharmacyStats?.weeklyRevenueTrend)
      ? pharmacyStats.weeklyRevenueTrend
      : Array.isArray(pharmacyStats?.weeklyRevenue)
      ? pharmacyStats.weeklyRevenue
      : [];

    const normalize = (entries) => {
      const trimmed = entries.slice(-7);
      const mapped = trimmed.map((entry, index) => ({
        label: entry?.label || entry?.day || entry?.name || `D${index + 1}`,
        amount: Number(entry?.amount ?? entry?.total ?? entry?.revenue ?? entry?.value ?? 0),
      }));
      const max = Math.max(...mapped.map(item => item.amount), 1);
      return mapped.map((item) => ({
        ...item,
        height: Math.min(95, Math.round((item.amount / max) * 90) + 8),
      }));
    };

    if (rawTrend.length) {
      return normalize(rawTrend);
    }

    return normalize([
      { label: 'Mon', amount: 42000 },
      { label: 'Tue', amount: 48000 },
      { label: 'Wed', amount: 31000 },
      { label: 'Thu', amount: 52000 },
      { label: 'Fri', amount: 56000 },
      { label: 'Sat', amount: 39000 },
      { label: 'Sun', amount: 51000 },
    ]);
  }, [pharmacyStats]);

  const incomeTrend = useMemo(() => {
    const rawTrend = Array.isArray(pharmacyStats?.monthlyIncomeTrend)
      ? pharmacyStats.monthlyIncomeTrend
      : [];

    const normalize = (entries) => {
      const trimmed = entries.slice(-8);
      const mapped = trimmed.map((entry, index) => ({
        label: entry?.label || entry?.month || `M${index + 1}`,
        profit: Number(entry?.profit ?? entry?.revenue ?? 0),
        expense: Number(entry?.expense ?? entry?.cost ?? 0),
      }));
      const max = Math.max(...mapped.flatMap(item => [item.profit, item.expense]), 1);
      return mapped.map((item) => ({
        ...item,
        profitHeight: Math.max(6, Math.round((item.profit / max) * 90) + 6),
        expenseHeight: Math.max(6, Math.round((item.expense / max) * 90) + 6),
      }));
    };

    if (rawTrend.length) {
      return normalize(rawTrend);
    }

    return normalize([
      { label: 'M1', profit: 48000, expense: 12000 },
      { label: 'M2', profit: 52000, expense: 18000 },
      { label: 'M3', profit: 41000, expense: 15000 },
      { label: 'M4', profit: 56000, expense: 20000 },
      { label: 'M5', profit: 60000, expense: 22000 },
      { label: 'M6', profit: 47000, expense: 17000 },
      { label: 'M7', profit: 58000, expense: 21000 },
      { label: 'M8', profit: 61000, expense: 23000 },
    ]);
  }, [pharmacyStats]);

  const topPharmaciesData = useMemo(() => {
    const statsLeaders = Array.isArray(pharmacyStats?.topPharmacies)
      ? pharmacyStats.topPharmacies
      : Array.isArray(pharmacyStats?.topPerformers)
      ? pharmacyStats.topPerformers
      : [];

    let source = statsLeaders;

    if (!source.length && Array.isArray(pharmacyStats?.pendingPharmaciesData)) {
      source = pharmacyStats.pendingPharmaciesData;
    }

    if (!source.length) {
      source = Array.isArray(pharmacyList) ? pharmacyList : [];
    }

    const mapped = source
      .filter(Boolean)
      .slice(0, 5)
      .map((pharmacy, index) => {
        const name = pharmacy.pharmacy_name || pharmacy.name || `Pharmacy ${index + 1}`;
        const email = pharmacy.business_email || pharmacy.email || 'Not provided';
        const sales = Number(
          pharmacy.total_sales ??
          pharmacy.totalRevenue ??
          pharmacy.total_orders ??
          pharmacy.sales ??
          0
        );

        return {
          key: pharmacy.id || `${name}-${index}`,
          name,
          email,
          sales,
          avatar: getInitials(name),
        };
      });

    if (!mapped.length) {
      return [
        { key: 'fallback-1', name: 'MediCare Pharmacy', email: 'contact@medicare.ph', sales: 1247, avatar: 'MC' },
        { key: 'fallback-2', name: 'HealthPlus Drugstore', email: 'info@healthplus.ph', sales: 1156, avatar: 'HP' },
        { key: 'fallback-3', name: 'QuickMed Solutions', email: 'hello@quickmed.ph', sales: 1089, avatar: 'QM' },
        { key: 'fallback-4', name: 'Family Care Pharmacy', email: 'support@familycare.ph', sales: 987, avatar: 'FC' },
        { key: 'fallback-5', name: 'Express Med Store', email: 'orders@expressmed.ph', sales: 856, avatar: 'EM' },
      ];
    }

    const hasSales = mapped.some(item => item.sales > 0);
    if (!hasSales) {
      mapped.forEach((item, idx) => {
        item.sales = (mapped.length - idx) * 120;
      });
    }

    return mapped;
  }, [pharmacyStats, pharmacyList]);

  const renderManageRiders = () => (
    <div className="space-y-8">
      <div
        className="relative rounded-3xl p-6 border overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, rgba(19,27,53,0.92), rgba(13,19,40,0.9))',
          borderColor: 'rgba(108,99,255,0.22)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 20% -5%, rgba(108,99,255,0.24), transparent 55%), radial-gradient(circle at 90% 0%, rgba(50,224,196,0.2), transparent 45%)',
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em]" style={{ color: 'rgba(244,246,255,0.55)' }}>Dispatch Network</p>
            <h1 className="text-3xl font-semibold text-white">Rider Management</h1>
            <p className="text-sm mt-2" style={{ color: 'rgba(244,246,255,0.6)' }}>
              Monitor fleet readiness and action rider approvals in real time.
            </p>
          </div>
          <div className="flex items-center space-x-3">
          <button
            onClick={fetchRiderStats}
            disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(50,224,196,0.35), rgba(108,99,255,0.35))',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F4F6FF',
                opacity: loading ? 0.6 : 1,
              }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                  <span>Refreshing…</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                  <span>Sync Fleet</span>
              </>
            )}
          </button>
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(244,246,255,0.75)',
              }}
            >
              Dispatch Logs
          </button>
          </div>
        </div>
        {error && (
          <div
            className="relative mt-4 px-4 py-3 rounded-2xl border flex items-center space-x-3"
            style={{
              background: 'rgba(255,77,141,0.12)',
              borderColor: 'rgba(255,77,141,0.35)',
              color: '#FF9AC2',
            }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            key: 'total',
            label: 'Total Riders',
            value: riderStats.totalRiders,
            description: 'Registered riders',
            gradient: 'linear-gradient(135deg, rgba(50,224,196,0.22), rgba(108,99,255,0.24))',
            iconPath: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197',
          },
          {
            key: 'pending',
            label: 'Pending Approvals',
            value: riderStats.pendingApprovals,
            description: 'Awaiting review',
            gradient: 'linear-gradient(135deg, rgba(255,77,141,0.24), rgba(108,99,255,0.22))',
            iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
          },
          {
            key: 'active',
            label: 'Active Riders',
            value: riderStats.activeRiders,
            description: 'Currently operating',
            gradient: 'linear-gradient(135deg, rgba(108,99,255,0.24), rgba(50,224,196,0.22))',
            iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
          },
          {
            key: 'suspended',
            label: 'Suspended',
            value: riderStats.suspendedRiders,
            description: 'Temporarily disabled',
            gradient: 'linear-gradient(135deg, rgba(255,179,71,0.24), rgba(255,77,141,0.26))',
            iconPath: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728',
          },
        ].map((tile) => {
          const isActive = riderActiveTile === tile.key;
          return (
            <button
              key={tile.key}
              onClick={() => handleRiderTileClick(tile.key)}
              className="relative overflow-hidden rounded-3xl p-6 transition-all duration-300 text-left"
              style={{
                background: tile.gradient,
                border: isActive ? '1px solid rgba(50,224,196,0.5)' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: isActive ? '0 18px 38px rgba(6,12,32,0.5)' : '0 10px 20px rgba(6,12,32,0.35)',
                transform: isActive ? 'translateY(-4px)' : 'none',
                color: '#F4F6FF',
              }}
            >
              <div
                className="absolute top-0 right-0 w-36 h-36 translate-x-12 -translate-y-20 blur-3xl opacity-70"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              />
              <div className="flex items-center justify-between mb-5 relative">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em]" style={{ color: 'rgba(244,246,255,0.7)' }}>
                    {tile.label}
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <h2 className="text-3xl font-semibold text-white">
                      {loading ? (
                        <span className="inline-block animate-pulse bg-white/30 rounded w-16 h-6" />
                      ) : (
                        tile.value
                      )}
                    </h2>
                    {isActive && (
                      <span className="text-[0.65rem] uppercase tracking-[0.4em] text-[#32E0C4]">Active</span>
                    )}
            </div>
          </div>
                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: 'rgba(0,0,0,0.18)',
                  }}
                >
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tile.iconPath} />
        </svg>
        </div>
            </div>
              <p className="text-xs font-medium" style={{ color: 'rgba(244,246,255,0.75)' }}>
                {tile.description}
              </p>
              <div className="mt-5 h-10 relative overflow-hidden rounded-full">
                <div
                  className="absolute inset-0"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(50,224,196,0.5), rgba(108,99,255,0.45))'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0))',
                    transform: 'skewX(-20deg)',
                    opacity: 0.35,
                  }}
                />
          </div>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div
        className="rounded-3xl p-6 border relative overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, rgba(19,27,53,0.92), rgba(13,19,40,0.92))',
          borderColor: 'rgba(76,111,255,0.22)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 20% 0%, rgba(108,99,255,0.18), transparent 55%), radial-gradient(circle at 80% -10%, rgba(50,224,196,0.18), transparent 45%)',
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">
            {riderActiveTile === 'pending' ? 'Pending Riders' : riderActiveTile === 'active' ? 'Active Riders' : riderActiveTile === 'suspended' ? 'Suspended Riders' : 'All Riders'}
          </h1>
            <p className="text-xs uppercase tracking-[0.4em]" style={{ color: 'rgba(244,246,255,0.55)' }}>
              Fleet overview
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchRiderStats}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, rgba(50,224,196,0.3), rgba(108,99,255,0.3))',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F4F6FF',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <div
            className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
            style={{ color: 'rgba(244,246,255,0.6)' }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            </div>
          <input
            type="text"
            placeholder="Search riders by name or phone..."
            value={riderSearchTerm}
            onChange={(e) => setRiderSearchTerm(e.target.value)}
            className="w-full pl-11 pr-12 py-3 rounded-2xl text-sm focus:outline-none transition-all duration-200"
            style={{
              background: 'rgba(13,20,38,0.85)',
              border: '1px solid rgba(108,99,255,0.22)',
              color: '#F4F6FF',
            }}
          />
            {riderSearchTerm && (
            <button
              onClick={() => setRiderSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#32E0C4] hover:text-[#FF4D8D] transition-colors duration-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              </button>
            )}
        </div>

        <div className="relative max-h-96 overflow-y-auto space-y-3 pr-1">
        {riderActiveTile === 'pending' ? (
          loadingPendingRiders ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-14 h-14 rounded-full border-4 border-transparent border-t-[rgba(50,224,196,0.6)] animate-spin" />
                <p className="text-sm" style={{ color: 'rgba(244,246,255,0.65)' }}>Loading pending riders...</p>
            </div>
          ) : pendingRiders.length > 0 ? (
              <>
                <div
                  className="grid grid-cols-12 gap-2 lg:gap-4 px-4 py-3 rounded-2xl text-[0.7rem] uppercase tracking-[0.3em]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(108,99,255,0.25)',
                    color: 'rgba(244,246,255,0.6)',
                  }}
                >
                <div className="col-span-2">Name</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-3">Vehicle</div>
                  <div className="col-span-2 flex items-center justify-center">Action</div>
              </div>
              {pendingRiders
                .filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(riderSearchTerm.toLowerCase()) || (r.phone_number || '').includes(riderSearchTerm))
                .map(rider => (
                    <div
                      key={rider.id}
                      className="grid grid-cols-12 gap-2 lg:gap-4 px-4 py-3 rounded-2xl border transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: 'rgba(255,255,255,0.05)',
                        color: 'rgba(244,246,255,0.85)',
                      }}
                    >
                    <div className="col-span-2">
                        <h3 className="font-semibold text-white text-sm truncate">{rider.first_name} {rider.last_name}</h3>
                    </div>
                      <div className="col-span-2">
                        <p className="text-sm truncate">{rider.phone_number || '—'}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm truncate">{rider.email || '—'}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm truncate">
                          {rider.vehicle_type || '—'} {rider.plate_number ? `• ${rider.plate_number}` : ''}
                        </p>
                      </div>
                    <div className="col-span-2 flex items-center justify-center">
                        <button
                          onClick={() => handleViewRider(rider)}
                          className="px-3 py-1 rounded-xl text-xs font-semibold transition-colors duration-200"
                          style={{
                            background: 'linear-gradient(135deg, rgba(50,224,196,0.35), rgba(108,99,255,0.35))',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#F4F6FF',
                          }}
                        >
                          View
                        </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke={RAILWAY_THEME.accentTeal}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-semibold" style={{ color: 'rgba(244,246,255,0.8)' }}>No pending riders</h3>
                <p className="text-xs text-center" style={{ color: 'rgba(244,246,255,0.6)' }}>All rider applications have been reviewed</p>
            </div>
          )
        ) : riderActiveTile === 'active' ? (
          loadingPendingRiders ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-14 h-14 rounded-full border-4 border-transparent border-t-[rgba(50,224,196,0.6)] animate-spin" />
                <p className="text-sm" style={{ color: 'rgba(244,246,255,0.65)' }}>Loading active riders...</p>
            </div>
          ) : activeRiders.length > 0 ? (
              <>
                <div
                  className="grid grid-cols-12 gap-2 lg:gap-4 px-4 py-3 rounded-2xl text-[0.7rem] uppercase tracking-[0.3em]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(108,99,255,0.25)',
                    color: 'rgba(244,246,255,0.6)',
                  }}
                >
                <div className="col-span-2">Name</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-3">Vehicle</div>
                  <div className="col-span-2 flex items-center justify-center">Action</div>
              </div>
              {activeRiders
                .filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(riderSearchTerm.toLowerCase()) || (r.phone_number || '').includes(riderSearchTerm))
                .map(rider => (
                    <div
                      key={rider.id}
                      className="grid grid-cols-12 gap-2 lg:gap-4 px-4 py-3 rounded-2xl border transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: 'rgba(255,255,255,0.05)',
                        color: 'rgba(244,246,255,0.85)',
                      }}
                    >
                    <div className="col-span-2">
                        <h3 className="font-semibold text-white text-sm truncate">{rider.first_name} {rider.last_name}</h3>
                    </div>
                      <div className="col-span-2">
                        <p className="text-sm truncate">{rider.phone_number || '—'}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm truncate">{rider.email || '—'}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm truncate">
                          {rider.vehicle_type || '—'} {rider.plate_number ? `• ${rider.plate_number}` : ''}
                        </p>
                      </div>
                    <div className="col-span-2 flex items-center justify-center">
                        <button
                          onClick={() => handleViewRider(rider)}
                          className="px-3 py-1 rounded-xl text-xs font-semibold transition-colors duration-200"
                          style={{
                            background: 'linear-gradient(135deg, rgba(50,224,196,0.35), rgba(108,99,255,0.35))',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#F4F6FF',
                          }}
                        >
                          View
                        </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke={RAILWAY_THEME.accentTeal}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                </svg>
                <h3 className="text-sm font-semibold" style={{ color: 'rgba(244,246,255,0.8)' }}>No active riders</h3>
                <p className="text-xs text-center" style={{ color: 'rgba(244,246,255,0.6)' }}>Riders will appear here once they are on duty</p>
            </div>
          )
        ) : riderActiveTile === 'suspended' ? (
          loadingPendingRiders ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-14 h-14 rounded-full border-4 border-transparent border-t-[rgba(50,224,196,0.6)] animate-spin" />
                <p className="text-sm" style={{ color: 'rgba(244,246,255,0.65)' }}>Loading suspended riders...</p>
            </div>
          ) : suspendedRiders.length > 0 ? (
              <>
                <div
                  className="grid grid-cols-12 gap-2 lg:gap-4 px-4 py-3 rounded-2xl text-[0.7rem] uppercase tracking-[0.3em]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(108,99,255,0.25)',
                    color: 'rgba(244,246,255,0.6)',
                  }}
                >
                <div className="col-span-2">Name</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-3">Vehicle</div>
                  <div className="col-span-2 flex items-center justify-center">Action</div>
              </div>
              {suspendedRiders
                .filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(riderSearchTerm.toLowerCase()) || (r.phone_number || '').includes(riderSearchTerm))
                .map(rider => (
                    <div
                      key={rider.id}
                      className="grid grid-cols-12 gap-2 lg:gap-4 px-4 py-3 rounded-2xl border transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: 'rgba(255,255,255,0.05)',
                        color: 'rgba(244,246,255,0.85)',
                      }}
                    >
                    <div className="col-span-2">
                        <h3 className="font-semibold text-white text-sm truncate">{rider.first_name} {rider.last_name}</h3>
                    </div>
                      <div className="col-span-2">
                        <p className="text-sm truncate">{rider.phone_number || '—'}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm truncate">{rider.email || '—'}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm truncate">
                          {rider.vehicle_type || '—'} {rider.plate_number ? `• ${rider.plate_number}` : ''}
                        </p>
                      </div>
                    <div className="col-span-2 flex items-center justify-center">
                        <button
                          onClick={() => handleViewRider(rider)}
                          className="px-3 py-1 rounded-xl text-xs font-semibold transition-colors duration-200"
                          style={{
                            background: 'linear-gradient(135deg, rgba(50,224,196,0.35), rgba(108,99,255,0.35))',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#F4F6FF',
                          }}
                        >
                          View
                        </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke={RAILWAY_THEME.accentPink}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                </svg>
                <h3 className="text-sm font-semibold" style={{ color: 'rgba(244,246,255,0.8)' }}>No suspended riders</h3>
                <p className="text-xs text-center" style={{ color: 'rgba(244,246,255,0.6)' }}>All riders are in good standing</p>
            </div>
          )
        ) : (
          loadingPendingRiders ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-14 h-14 rounded-full border-4 border-transparent border-t-[rgba(50,224,196,0.6)] animate-spin" />
                <p className="text-sm" style={{ color: 'rgba(244,246,255,0.65)' }}>Loading riders...</p>
            </div>
          ) : allRiders.length > 0 ? (
              <>
                <div
                  className="grid grid-cols-12 gap-2 lg:gap-4 px-4 py-3 rounded-2xl text-[0.7rem] uppercase tracking-[0.3em]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(108,99,255,0.25)',
                    color: 'rgba(244,246,255,0.6)',
                  }}
                >
                <div className="col-span-2">Name</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-3">Vehicle</div>
                  <div className="col-span-2 flex items-center justify-center">Action</div>
              </div>
              {allRiders
                .filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(riderSearchTerm.toLowerCase()) || (r.phone_number || '').includes(riderSearchTerm))
                .map(rider => (
                    <div
                      key={rider.id}
                      className="grid grid-cols-12 gap-2 lg:gap-4 px-4 py-3 rounded-2xl border transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: 'rgba(255,255,255,0.05)',
                        color: 'rgba(244,246,255,0.85)',
                      }}
                    >
                    <div className="col-span-2">
                        <h3 className="font-semibold text-white text-sm truncate">{rider.first_name} {rider.last_name}</h3>
                    </div>
                      <div className="col-span-2">
                        <p className="text-sm truncate">{rider.phone_number || '—'}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm truncate">{rider.email || '—'}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm truncate">
                          {rider.vehicle_type || '—'} {rider.plate_number ? `• ${rider.plate_number}` : ''}
                        </p>
                      </div>
                    <div className="col-span-2 flex items-center justify-center">
                        <button
                          onClick={() => handleViewRider(rider)}
                          className="px-3 py-1 rounded-xl text-xs font-semibold transition-colors duration-200"
                          style={{
                            background: 'linear-gradient(135deg, rgba(50,224,196,0.35), rgba(108,99,255,0.35))',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#F4F6FF',
                          }}
                        >
                          View
                        </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke={RAILWAY_THEME.accentTeal}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                </svg>
                <h3 className="text-sm font-semibold" style={{ color: 'rgba(244,246,255,0.8)' }}>No riders found</h3>
                <p className="text-xs text-center" style={{ color: 'rgba(244,246,255,0.6)' }}>
                  Use the filters above to narrow down your search
                </p>
            </div>
          )
        )}
        </div>
      </div>
    </div>
  );

  const renderRiderDetailsModal = () => {
    if (!isRiderModalOpen || !selectedRider) return null;

    const mutedText = 'rgba(244,246,255,0.65)';
    const subtleText = 'rgba(244,246,255,0.55)';
    const status = (selectedRider.status || 'pending').toLowerCase();
    const statusColor =
      status === 'approved'
        ? RAILWAY_THEME.accentTeal
        : status === 'suspended'
        ? RAILWAY_THEME.accentPink
        : RAILWAY_THEME.accentOrange;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={MODAL_SCRIM_STYLE}>
        <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[28px]" style={MODAL_PANEL_STYLE}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 10% 0%, rgba(108,99,255,0.32), transparent 55%), radial-gradient(circle at 90% -10%, rgba(50,224,196,0.28), transparent 45%)',
            }}
          />
          <div className="relative flex items-start justify-between px-8 py-6 border-b border-white/10">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#32E0C4] via-[#6C63FF] to-[#FF4D8D] flex items-center justify-center text-white font-semibold shadow-inner shadow-[#32E0C433]">
                {`${selectedRider.first_name?.[0] || ''}${selectedRider.last_name?.[0] || ''}`.toUpperCase() || 'RD'}
              </div>
            <div>
                <p className="text-xs uppercase tracking-[0.4em]" style={{ color: subtleText }}>Rider Profile</p>
                <h2 className="text-2xl font-semibold text-white">{selectedRider.first_name} {selectedRider.last_name}</h2>
                <p className="text-xs mt-1 uppercase tracking-[0.3em]" style={{ color: statusColor }}>
                  {status}
                </p>
            </div>
            </div>
            <button
              onClick={handleCloseRiderModal}
              className="p-2 rounded-lg transition-colors duration-200"
              style={MODAL_SECONDARY_BUTTON_STYLE}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="relative px-8 py-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
            {riderModalLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-14 h-14 rounded-full border-4 border-transparent border-t-[rgba(50,224,196,0.6)] animate-spin" />
                <p className="text-sm" style={{ color: mutedText }}>Loading rider details…</p>
              </div>
            ) : riderModalError ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4" style={MODAL_SECTION_STYLE}>
                <svg className="h-12 w-12 text-[#FF4D8D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-white text-center">{riderModalError}</p>
                <button
                  onClick={() => handleViewRider(selectedRider)}
                  className="px-5 py-2 rounded-xl text-sm font-semibold transition-colors duration-200"
                  style={MODAL_PRIMARY_BUTTON_STYLE}
                >
                  Retry loading
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6" style={MODAL_SECTION_STYLE}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em]" style={{ color: subtleText }}>Overview</p>
                      <h3 className="text-lg font-semibold text-white">Contact Information</h3>
                </div>
                    <div className="flex flex-col md:items-end text-xs" style={{ color: subtleText }}>
                      <span>{selectedRider.email || 'No email'}</span>
                      <span>{selectedRider.phone_number || 'No phone'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Full Name</p>
                      <p className="text-white font-semibold">{selectedRider.first_name} {selectedRider.last_name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Application Date</p>
                      <p className="text-white font-semibold">{selectedRider.created_at ? new Date(selectedRider.created_at).toLocaleString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Primary Phone</p>
                      <p className="text-white font-semibold">{selectedRider.phone_number || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Email Address</p>
                      <p className="text-white font-semibold">{selectedRider.email || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6" style={MODAL_SECTION_STYLE}>
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em]" style={{ color: subtleText }}>Profile</p>
                    <h3 className="text-lg font-semibold text-white">Personal & Vehicle Details</h3>
                  </div>
                  {detailedRiderData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Date of Birth</p>
                        <p className="text-white font-semibold">{detailedRiderData.date_of_birth || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Gender</p>
                        <p className="text-white font-semibold capitalize">{detailedRiderData.gender || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Vehicle Type</p>
                        <p className="text-white font-semibold">{detailedRiderData.vehicle_type || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Brand & Color</p>
                        <p className="text-white font-semibold">
                          {detailedRiderData.vehicle_brand || '—'} {detailedRiderData.vehicle_color ? `• ${detailedRiderData.vehicle_color}` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Plate Number</p>
                        <p className="text-white font-semibold">{detailedRiderData.plate_number || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Emergency Contact</p>
                        <p className="text-white font-semibold">{detailedRiderData.emergency_contact || '—'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                      <div className="w-10 h-10 rounded-full border-4 border-transparent border-t-[rgba(50,224,196,0.6)] animate-spin" />
                      <p className="text-xs" style={{ color: mutedText }}>Loading personal details…</p>
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4" style={MODAL_SECTION_STYLE}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em]" style={{ color: subtleText }}>Compliance</p>
                      <h3 className="text-lg font-semibold text-white">Uploaded Documents</h3>
                    </div>
                  </div>
                  {detailedRiderData && detailedRiderData.documents ? (
                    detailedRiderData.documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detailedRiderData.documents.map((doc) => {
                          const statusLabel = (doc.status || 'pending').toLowerCase();
                          const docStatusColor =
                            statusLabel === 'approved'
                              ? RAILWAY_THEME.accentTeal
                              : statusLabel === 'rejected'
                              ? RAILWAY_THEME.accentPink
                              : RAILWAY_THEME.accentOrange;
                        const isCloudinaryUrl = doc.file_url && (
                          doc.file_url.includes('cloudinary.com') || 
                          doc.file_url.startsWith('http://') || 
                          doc.file_url.startsWith('https://')
                        );
                        const imageUrl = isCloudinaryUrl 
                          ? doc.file_url 
                          : `${(process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')}/api/document/${doc.id}/`;
                        
                        return (
                            <div key={doc.id} className="p-4 space-y-3" style={MODAL_SECTION_STYLE}>
                              <div className="w-full h-48 rounded-xl overflow-hidden bg-[#0f162c] flex items-center justify-center">
                                {doc.file_url ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={doc.document_type || 'Document'}
                                    className="w-full h-full object-cover cursor-pointer transition-opacity duration-200 hover:opacity-80"
                                    onClick={() => window.open(imageUrl, '_blank')}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-xs" style={{ color: mutedText }}>No preview available</span>
                              )}
                            </div>
                              <div className="text-center space-y-1">
                                <p className="text-sm font-semibold text-white">{doc.document_type || 'Document'}</p>
                                <p className="text-xs" style={{ color: mutedText }}>
                                  Status:{' '}
                                  <span className="font-semibold" style={{ color: docStatusColor }}>
                                    {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                                  </span>
                                </p>
                                {doc.expiry_date && (
                                  <p className="text-xs" style={{ color: subtleText }}>
                                    Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                                  </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center py-10 space-y-3">
                        <svg className="h-10 w-10 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs" style={{ color: mutedText }}>No documents submitted</p>
                </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                      <div className="w-10 h-10 rounded-full border-4 border-transparent border-t-[rgba(50,224,196,0.6)] animate-spin" />
                      <p className="text-xs" style={{ color: mutedText }}>Loading documents…</p>
              </div>
            )}
          </div>
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-between px-8 py-6 border-t border-white/10">
            <div className="text-xs" style={{ color: subtleText }}>Rider ID: {selectedRider.id}</div>
            <div className="flex space-x-3">
              <button
                onClick={handleCloseRiderModal}
                className="px-6 py-2 rounded-xl text-sm font-semibold transition-colors duration-200"
                style={MODAL_SECONDARY_BUTTON_STYLE}
              >
                Close
              </button>
              <button
                onClick={handleApproveRider}
                disabled={riderModalLoading}
                className="px-6 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={MODAL_PRIMARY_BUTTON_STYLE}
              >
                {riderModalLoading ? 'Approving…' : 'Approve Rider'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRiderSuccessModal = () => {
    if (!isRiderSuccessOpen || !riderSuccessData) return null;

    const mutedText = 'rgba(244,246,255,0.68)';
    const subtleText = 'rgba(244,246,255,0.52)';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={MODAL_SCRIM_STYLE}>
        <div
          className="relative w-full max-w-md rounded-[24px] overflow-hidden"
          style={{
            ...MODAL_PANEL_STYLE,
            background: 'linear-gradient(160deg, rgba(15,24,48,0.95), rgba(9,15,30,0.95))',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 18% 0%, rgba(108,99,255,0.3), transparent 55%), radial-gradient(circle at 82% -10%, rgba(50,224,196,0.28), transparent 45%)',
            }}
          />
          <div className="relative flex items-start justify-between px-6 py-5 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#32E0C4] via-[#6C63FF] to-[#FF4D8D] flex items-center justify-center text-white shadow-inner shadow-[#32E0C433]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em]" style={{ color: subtleText }}>Approval Complete</p>
                <h2 className="text-lg font-semibold text-white">Rider Approved</h2>
              </div>
            </div>
            <button
              onClick={handleCloseRiderSuccess}
              className="p-2 rounded-lg transition-colors duration-200"
              style={MODAL_SECONDARY_BUTTON_STYLE}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="relative px-6 py-5 space-y-5">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-white">{riderSuccessData.riderName}</h3>
              <p className="text-sm" style={{ color: mutedText }}>
                Rider account activated and welcome communication sent.
              </p>
            </div>

            <div className="p-4 space-y-3" style={MODAL_SECTION_STYLE}>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#32E0C4] to-[#6C63FF] flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Welcome email sent</p>
                  <p className="text-xs" style={{ color: subtleText }}>{riderSuccessData.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF4D8D] to-[#B064FF] flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Dispatch access granted</p>
                  <p className="text-xs" style={{ color: subtleText }}>Rider can now accept live delivery offers</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#32E0C4] to-[#FFB347] flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Email status</p>
                  <p className="text-xs capitalize" style={{ color: subtleText }}>{riderSuccessData.emailStatus || 'sent'}</p>
                </div>
              </div>
            </div>

            <div
              className="p-4 rounded-2xl"
              style={{
                background: riderSuccessData.emailStatus === 'sent' ? 'rgba(72,187,120,0.14)' : 'rgba(255,77,141,0.12)',
                border: riderSuccessData.emailStatus === 'sent' ? '1px solid rgba(72,187,120,0.32)' : '1px solid rgba(255,77,141,0.32)',
              }}
            >
              {riderSuccessData.emailStatus === 'sent' ? (
                <div className="flex space-x-3">
                  <svg className="h-5 w-5 text-[#48BB78] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs" style={{ color: mutedText }}>
                    Credentials delivered successfully. Rider is informed and ready for dispatch duties.
                  </div>
                </div>
              ) : (
                <div className="flex space-x-3">
                  <svg className="h-5 w-5 text-[#FF4D8D] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs" style={{ color: mutedText }}>
                    Email delivery failed. Please reach out to the rider manually so they can log in and start accepting deliveries.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative flex items-center justify-end px-6 py-4 border-t border-white/10">
            <button
              onClick={handleCloseRiderSuccess}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200"
              style={MODAL_PRIMARY_BUTTON_STYLE}
            >
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Filter pharmacies based on search term
  const filteredPharmacies = pharmacyList.filter(pharmacy =>
    (pharmacy.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pharmacy.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pharmacy.business_phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pharmacy.business_email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderDashboard = () => {
    const metricTiles = dashboardMetrics.metrics;
    const summary = dashboardMetrics.summary;

    return (
      <div className="space-y-10">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.45em]" style={{ color: RAILWAY_THEME.textSecondary }}>
              Executive Summary
            </p>
            <h1 className="text-4xl font-semibold" style={{ color: RAILWAY_THEME.textPrimary }}>
              Sales Overview
            </h1>
            </div>
          <div className="flex items-center space-x-3">
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(50,224,196,0.2)', color: RAILWAY_THEME.accentTeal }}
            >
              Auto-sync Enabled
          </div>
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(108,99,255,0.12)', color: RAILWAY_THEME.textSecondary }}
            >
              {`Pending Actions: ${summary.pendingCombined.toLocaleString()}`}
        </div>
            <button
              className="px-4 py-2 rounded-xl border text-sm font-semibold"
              style={{
                color: RAILWAY_THEME.textSecondary,
                borderColor: 'rgba(108,99,255,0.3)',
                background: 'rgba(108,99,255,0.08)',
              }}
            >
              Export Report
            </button>
            </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {metricTiles.map((tile) => (
            <div
              key={tile.key}
              className="relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(5,10,24,0.45)]"
              style={{
                background: tile.accent,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="absolute top-0 right-0 w-40 h-40 translate-x-12 -translate-y-20 blur-3xl opacity-70"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              />
              <div className="flex items-center justify-between mb-6 relative">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em]" style={{ color: 'rgba(244,246,255,0.7)' }}>
                    {tile.label}
                  </p>
                  <h2 className="text-3xl font-semibold text-white mt-1">{tile.display}</h2>
            </div>
                <div
                  className="p-3 rounded-xl shadow-inner"
                  style={{ background: 'rgba(0,0,0,0.15)' }}
                >
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tile.iconPath} />
              </svg>
            </div>
          </div>
              <p className="text-xs font-medium" style={{ color: 'rgba(244,246,255,0.75)' }}>
                {tile.descriptor}
              </p>
              <div className="mt-6 h-16 relative overflow-hidden rounded-xl">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0))',
                    opacity: 0.35,
                    transform: 'skewY(-6deg)',
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)',
                    clipPath: 'polygon(0 100%, 0 60%, 25% 40%, 45% 55%, 70% 30%, 85% 45%, 100% 15%, 100% 100%)',
                  }}
                />
        </div>
      </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div
            className="rounded-3xl p-6 border relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(19,27,53,0.92), rgba(13,19,40,0.9))',
              borderColor: 'rgba(108,99,255,0.25)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 15% 15%, rgba(108,99,255,0.25), transparent 55%), radial-gradient(circle at 90% 0%, rgba(50,224,196,0.22), transparent 50%)',
              }}
            />
            <div className="relative flex justify-between items-start mb-8">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Revenue Analytics</h2>
                <p className="text-xs uppercase tracking-[0.4em]" style={{ color: 'rgba(244,246,255,0.55)' }}>
                  Week in Review
                </p>
              </div>
              <select
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: 'rgba(15,22,44,0.9)',
                  border: '1px solid rgba(108,99,255,0.32)',
                  color: 'rgba(244,246,255,0.8)',
                }}
              >
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>
            <div className="relative h-64 flex items-end justify-between space-x-3">
              {revenueTrend.map((item) => (
                <div key={item.label} className="flex flex-col items-center space-y-2">
                  <div
                    className="w-8 rounded-t-xl relative overflow-hidden"
                    title={`₱${item.amount.toLocaleString()}`}
                    style={{
                      height: `${item.height}%`,
                      background: 'linear-gradient(180deg, rgba(50,224,196,0.85), rgba(108,99,255,0.65))',
                      boxShadow: '0 12px 24px rgba(6,12,32,0.4)',
                    }}
                  >
                    <div
                      className="absolute inset-x-0 top-2 h-2 rounded-full opacity-60"
                      style={{
                        background: 'rgba(255,255,255,0.35)',
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium tracking-wide" style={{ color: 'rgba(244,246,255,0.65)' }}>
                    {item.label}
                  </span>
              </div>
            ))}
              <div className="absolute inset-x-0 bottom-14 border-t border-dashed" style={{ borderColor: 'rgba(147,163,198,0.18)' }} />
              <div className="absolute inset-x-0 bottom-28 border-t border-dashed" style={{ borderColor: 'rgba(147,163,198,0.18)' }} />
          </div>
          </div>

          <div
            className="rounded-3xl p-6 border relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(19,27,53,0.92), rgba(13,19,40,0.9))',
              borderColor: 'rgba(50,224,196,0.25)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 20% 20%, rgba(50,224,196,0.2), transparent 50%), radial-gradient(circle at 85% 10%, rgba(255,77,141,0.2), transparent 50%)',
              }}
            />
            <div className="relative flex justify-between items-start mb-8">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Total Income</h2>
                <p className="text-xs uppercase tracking-[0.4em]" style={{ color: 'rgba(244,246,255,0.55)' }}>
                  Profit vs Outflow
                </p>
              </div>
              <div className="flex space-x-3">
                <div className="flex items-center space-x-1 text-xs" style={{ color: RAILWAY_THEME.accentTeal }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: RAILWAY_THEME.accentTeal }} />
                  <span>Profit</span>
              </div>
                <div className="flex items-center space-x-1 text-xs" style={{ color: RAILWAY_THEME.accentPink }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: RAILWAY_THEME.accentPink }} />
                  <span>Expense</span>
            </div>
          </div>
              </div>
            <div className="relative h-48 flex items-end justify-between space-x-2">
              {incomeTrend.map((item) => (
                <div key={item.label} className="flex flex-col items-center space-y-2">
                  <div className="flex space-x-1">
                    <div
                      className="w-6 rounded-t-lg"
                      title={`Profit ₱${item.profit.toLocaleString()}`}
                      style={{
                        height: `${item.profitHeight}%`,
                        background: 'linear-gradient(180deg, rgba(50,224,196,0.9), rgba(50,224,196,0.45))',
                      }}
                    />
                    <div
                      className="w-6 rounded-b-lg self-end"
                      title={`Expense ₱${item.expense.toLocaleString()}`}
                      style={{
                        height: `${item.expenseHeight}%`,
                        background: 'linear-gradient(180deg, rgba(255,77,141,0.85), rgba(255,77,141,0.45))',
                      }}
                    />
              </div>
                  <span className="text-xs font-medium tracking-wide" style={{ color: 'rgba(244,246,255,0.65)' }}>
                    {item.label}
                  </span>
            </div>
              ))}
              <div className="absolute inset-x-0 bottom-16 border-t border-dashed" style={{ borderColor: 'rgba(147,163,198,0.18)' }} />
          </div>
          </div>
        </section>

        <section
          className="rounded-3xl p-6 border relative overflow-hidden"
          style={{
            background: 'linear-gradient(165deg, rgba(19,27,53,0.92), rgba(13,19,40,0.92))',
            borderColor: 'rgba(108,99,255,0.25)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 25% 0%, rgba(108,99,255,0.2), transparent 55%)',
            }}
          />
          <div className="relative flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Top Pharmacy</h2>
              <p className="text-xs uppercase tracking-[0.4em]" style={{ color: 'rgba(244,246,255,0.55)' }}>
                Performance leaderboard
              </p>
            </div>
            <select
              className="px-3 py-2 rounded-xl text-xs font-medium"
              style={{
                background: 'rgba(15,22,44,0.9)',
                border: '1px solid rgba(108,99,255,0.32)',
                color: 'rgba(244,246,255,0.8)',
              }}
            >
            <option>This Week</option>
            <option>This Month</option>
            <option>This Year</option>
          </select>
        </div>
          <div className="relative max-h-80 overflow-y-auto space-y-3 pr-1">
            {topPharmaciesData.map((pharmacy, index) => (
              <div
                key={pharmacy.key}
                className="flex items-center p-4 rounded-2xl transition-all duration-200 relative overflow-hidden"
                style={{
                  background: index < 3 ? 'linear-gradient(135deg, rgba(50,224,196,0.2), rgba(108,99,255,0.18))' : 'rgba(255,255,255,0.02)',
                  border: index < 3 ? '1px solid rgba(50,224,196,0.35)' : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: index < 3 ? 'linear-gradient(135deg, rgba(255,255,255,0.12), transparent 55%)' : 'none',
                  }}
                />
                <div className="relative w-12 h-12 bg-gradient-to-br from-[#32E0C4] via-[#6C63FF] to-[#FF4D8D] rounded-xl flex items-center justify-center text-white font-bold text-sm mr-4">
                {pharmacy.avatar}
              </div>
                <div className="relative flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{pharmacy.name}</h3>
                  <p className="text-sm" style={{ color: 'rgba(244,246,255,0.55)' }}>{pharmacy.email}</p>
              </div>
                <div className="relative text-right">
                  <p className="font-bold text-white">₱{pharmacy.sales.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: 'rgba(244,246,255,0.55)' }}>Total Sales</p>
              </div>
            </div>
          ))}
        </div>
        </section>
    </div>
  );
  };

  const renderManagePharmacies = () => (
    <div className="space-y-8">
      <div
        className="relative rounded-3xl p-6 border overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, rgba(19,27,53,0.92), rgba(13,19,40,0.9))',
          borderColor: 'rgba(108,99,255,0.22)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 15% 0%, rgba(108,99,255,0.24), transparent 55%), radial-gradient(circle at 85% -10%, rgba(50,224,196,0.2), transparent 45%)',
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em]" style={{ color: 'rgba(244,246,255,0.55)' }}>Control Center</p>
            <h1 className="text-3xl font-semibold text-white">Pharmacy Management</h1>
            <p className="text-sm mt-2" style={{ color: 'rgba(244,246,255,0.6)' }}>
              Review onboarding requests and keep partner pharmacies in sync.
            </p>
          </div>
          <div className="flex items-center space-x-3">
          <button
            onClick={fetchPharmacyStats}
            disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(50,224,196,0.35), rgba(108,99,255,0.35))',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F4F6FF',
                opacity: loading ? 0.6 : 1,
              }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                  <span>Refreshing…</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                  <span>Sync Stats</span>
              </>
            )}
          </button>
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(244,246,255,0.75)',
              }}
            >
              View Logs
          </button>
        </div>
          </div>
        {error && (
          <div
            className="relative mt-4 px-4 py-3 rounded-2xl border flex items-center space-x-3"
            style={{
              background: 'rgba(255,77,141,0.12)',
              borderColor: 'rgba(255,77,141,0.35)',
              color: '#FF9AC2',
            }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            <span>{error}</span>
            </div>
        )}
        </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            key: 'total',
            label: 'Total Pharmacies',
            value: pharmacyStats.totalPharmacies,
            description: 'Registered pharmacies',
            gradient: 'linear-gradient(135deg, rgba(50,224,196,0.22), rgba(108,99,255,0.24))',
            iconPath: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
          },
          {
            key: 'pending',
            label: 'Pending Approvals',
            value: pharmacyStats.pendingApprovals,
            description: 'Awaiting review',
            gradient: 'linear-gradient(135deg, rgba(255,77,141,0.22), rgba(108,99,255,0.24))',
            iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
          },
          {
            key: 'active',
            label: 'Active Pharmacies',
            value: pharmacyStats.activePharmacies,
            description: 'Currently operating',
            gradient: 'linear-gradient(135deg, rgba(108,99,255,0.24), rgba(50,224,196,0.22))',
            iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
          },
          {
            key: 'suspended',
            label: 'Suspended',
            value: pharmacyStats.suspendedPharmacies,
            description: 'Temporarily disabled',
            gradient: 'linear-gradient(135deg, rgba(255,179,71,0.24), rgba(255,77,141,0.26))',
            iconPath: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728',
          },
        ].map((tile) => {
          const isActive = activeTile === tile.key;
          return (
            <button
              key={tile.key}
              onClick={() => handleTileClick(tile.key)}
              className="relative overflow-hidden rounded-3xl p-6 transition-all duration-300 text-left"
              style={{
                background: tile.gradient,
                border: isActive ? '1px solid rgba(50,224,196,0.5)' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: isActive ? '0 18px 38px rgba(6,12,32,0.5)' : '0 10px 20px rgba(6,12,32,0.35)',
                transform: isActive ? 'translateY(-4px)' : 'none',
                color: '#F4F6FF',
              }}
            >
              <div
                className="absolute top-0 right-0 w-36 h-36 translate-x-12 -translate-y-20 blur-3xl opacity-70"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              />
              <div className="flex items-center justify-between mb-5 relative">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em]" style={{ color: 'rgba(244,246,255,0.7)' }}>
                    {tile.label}
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <h2 className="text-3xl font-semibold text-white">
            {loading ? (
                        <span className="inline-block animate-pulse bg-white/30 rounded w-16 h-6" />
                      ) : (
                        tile.value
                      )}
                    </h2>
                    {isActive && (
                      <span className="text-[0.65rem] uppercase tracking-[0.4em] text-[#32E0C4]">Active</span>
                    )}
        </div>
                </div>
                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: 'rgba(0,0,0,0.18)',
                  }}
                >
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tile.iconPath} />
              </svg>
            </div>
          </div>
              <p className="text-xs font-medium" style={{ color: 'rgba(244,246,255,0.75)' }}>
                {tile.description}
              </p>
              <div className="mt-5 h-10 relative overflow-hidden rounded-full">
                <div
                  className="absolute inset-0"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(50,224,196,0.5), rgba(108,99,255,0.45))'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0))',
                    transform: 'skewX(-20deg)',
                    opacity: 0.4,
                  }}
                />
            </div>
            </button>
          );
        })}
      </div>

      {/* Pharmacy List */}
      <div
        className="rounded-3xl p-6 border relative overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, rgba(19,27,53,0.92), rgba(13,19,40,0.92))',
          borderColor: 'rgba(76,111,255,0.22)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 20% 0%, rgba(108,99,255,0.18), transparent 55%), radial-gradient(circle at 80% -10%, rgba(50,224,196,0.18), transparent 45%)',
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">
            {activeTile === 'total' && 'Total Pharmacies'}
            {activeTile === 'pending' && 'Pending Approvals'}
            {activeTile === 'active' && 'Active Pharmacies'}
            {activeTile === 'suspended' && 'Suspended Pharmacies'}
          </h1>
            <p className="text-xs uppercase tracking-[0.4em]" style={{ color: 'rgba(244,246,255,0.55)' }}>
              Overview & management
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, rgba(50,224,196,0.3), rgba(108,99,255,0.3))',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F4F6FF',
              }}
            >
              Add Pharmacy
            </button>
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold border"
              style={{
                borderColor: 'rgba(108,99,255,0.35)',
                color: 'rgba(244,246,255,0.8)',
                background: 'rgba(108,99,255,0.12)',
              }}
            >
              Export
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div
            className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
            style={{ color: 'rgba(244,246,255,0.6)' }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search pharmacies by name, address, owner, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-12 py-3 rounded-2xl text-sm focus:outline-none transition-all duration-200"
            style={{
              background: 'rgba(13,20,38,0.85)',
              border: '1px solid rgba(108,99,255,0.22)',
              color: '#F4F6FF',
            }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#32E0C4] hover:text-[#FF4D8D] transition-colors duration-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          {searchTerm && (
            <div className="mt-2 text-xs uppercase tracking-[0.4em]" style={{ color: 'rgba(244,246,255,0.45)' }}>
              {filteredPharmacies.length} of {pharmacyList.length} matches
            </div>
          )}
        </div>
        
        <div className="relative max-h-96 overflow-y-auto space-y-3 pr-1">
          {activeTile === 'pending' ? (
            // Show pending pharmacies
            loadingPendingPharmacies ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-14 h-14 rounded-full border-4 border-transparent border-t-[rgba(50,224,196,0.6)] animate-spin" />
                <p className="text-sm" style={{ color: 'rgba(244,246,255,0.65)' }}>Loading pending pharmacies...</p>
              </div>
            ) : pendingPharmacies.length > 0 ? (
              <div className="space-y-3">
                <div
                  className="grid grid-cols-12 gap-2 lg:gap-4 px-4 py-3 rounded-2xl text-[0.7rem] uppercase tracking-[0.3em]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(108,99,255,0.25)',
                    color: 'rgba(244,246,255,0.6)',
                  }}
                >
                  <div className="col-span-1 flex items-center justify-center">Profile</div>
                  <div className="col-span-3">Pharmacy Name</div>
                  <div className="col-span-2">Address</div>
                  <div className="col-span-2">Owner</div>
                  <div className="col-span-2">Phone</div>
                  <div className="col-span-1">Email</div>
                  <div className="col-span-1 flex items-center justify-center">Action</div>
                </div>
                
                {pendingPharmacies.map((pharmacy) => (
                  <div 
                    key={pharmacy.id}
                    className="grid grid-cols-12 gap-2 lg:gap-4 px-4 py-3 rounded-2xl border transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderColor: 'rgba(255,255,255,0.05)',
                      color: 'rgba(244,246,255,0.85)',
                    }}
                  >
                    <div className="col-span-1 flex items-center justify-center">
                      <div className="w-9 h-9 bg-gradient-to-br from-[#32E0C4] via-[#6C63FF] to-[#FF4D8D] rounded-xl flex items-center justify-center text-white font-semibold text-xs shadow-inner shadow-[#32E0C466]">
                        {pharmacy.pharmacy_name.split(' ').map(word => word[0]).join('').substring(0, 2)}
                      </div>
                    </div>
                    <div className="col-span-3">
                      <h3 className="font-semibold text-white text-sm truncate">{pharmacy.pharmacy_name}</h3>
                      <p className="text-xs" style={{ color: 'rgba(244,246,255,0.55)' }}>{pharmacy.business_email}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm truncate">{pharmacy.barangay}, {pharmacy.city}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm truncate">{pharmacy.owner_first_name} {pharmacy.owner_last_name}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm truncate">{pharmacy.business_phone}</p>
                    </div>
                    <div className="col-span-1">
                      <span className="text-xs truncate" style={{ color: 'rgba(244,246,255,0.65)' }}>
                        {pharmacy.business_email}
                      </span>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <button 
                        onClick={() => handleViewPharmacy(pharmacy)}
                        className="px-3 py-1 rounded-xl text-xs font-semibold transition-colors duration-200"
                        style={{
                          background: 'linear-gradient(135deg, rgba(50,224,196,0.35), rgba(108,99,255,0.35))',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#F4F6FF',
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke={RAILWAY_THEME.accentTeal}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-semibold" style={{ color: 'rgba(244,246,255,0.8)' }}>No pending pharmacies</h3>
                <p className="text-xs text-center" style={{ color: 'rgba(244,246,255,0.6)' }}>All pharmacies have been reviewed</p>
              </div>
            )
          ) : (
            // Show regular pharmacy list (total, active, suspended)
            filteredPharmacies.length > 0 ? (
              filteredPharmacies.map((pharmacy) => (
              <div 
                key={pharmacy.id}
                className="flex items-center p-4 rounded-2xl border transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: 'rgba(255,255,255,0.05)',
                  color: '#F4F6FF',
                }}
              >
                {/* Pharmacy Profile Picture */}
                <div className="w-12 h-12 bg-gradient-to-br from-[#32E0C4] via-[#6C63FF] to-[#FF4D8D] rounded-xl flex items-center justify-center text-white font-bold text-sm mr-4 shadow-inner shadow-[#32E0C433]">
                  {(pharmacy.name || '').split(' ').map(word => word[0]).join('').substring(0, 2)}
                </div>
                
                {/* Pharmacy Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg">{pharmacy.name || 'Unnamed Pharmacy'}</h3>
                      <p className="text-sm" style={{ color: 'rgba(244,246,255,0.6)' }}>{pharmacy.address || 'No address'}</p>
                      <div className="flex items-center space-x-4 text-sm" style={{ color: 'rgba(244,246,255,0.55)' }}>
                        <span>Phone: {pharmacy.business_phone || 'N/A'}</span>
                        <span>Email: {pharmacy.business_email || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2 ml-4">
                      <button
                        className="px-3 py-1 text-xs font-semibold rounded-lg transition-colors duration-200"
                        style={{
                          background: 'linear-gradient(135deg, rgba(50,224,196,0.35), rgba(108,99,255,0.35))',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#F4F6FF',
                        }}
                      >
                        View
                      </button>
                      <button
                        className="px-3 py-1 text-xs font-semibold rounded-lg transition-colors duration-200 border"
                        style={{
                          borderColor: 'rgba(255,255,255,0.08)',
                          color: 'rgba(244,246,255,0.75)',
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke={RAILWAY_THEME.accentTeal}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-sm font-semibold" style={{ color: 'rgba(244,246,255,0.8)' }}>No pharmacies found</h3>
                <p className="text-xs text-center" style={{ color: 'rgba(244,246,255,0.6)' }}>
                  {searchTerm ? `No pharmacies match "${searchTerm}"` : 'No pharmacies available'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-3 px-4 py-2 text-xs font-semibold rounded-xl transition-colors duration-200"
                    style={{
                      background: 'linear-gradient(135deg, rgba(50,224,196,0.35), rgba(108,99,255,0.35))',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#F4F6FF',
                    }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );

  // Modal Component
  const renderPharmacyDetailsModal = () => {
    if (!isModalOpen || !selectedPharmacy) return null;

    const mutedText = 'rgba(244,246,255,0.65)';
    const subtleText = 'rgba(244,246,255,0.55)';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={MODAL_SCRIM_STYLE}>
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[28px]" style={MODAL_PANEL_STYLE}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 15% 0%, rgba(108,99,255,0.32), transparent 55%), radial-gradient(circle at 85% -10%, rgba(50,224,196,0.28), transparent 45%)',
            }}
          />
          <div className="relative flex items-start justify-between px-8 py-6 border-b border-white/10">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#32E0C4] via-[#6C63FF] to-[#FF4D8D] rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-inner shadow-[#32E0C433]">
                {selectedPharmacy.pharmacy_name.split(' ').map(word => word[0]).join('').substring(0, 2)}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em]" style={{ color: subtleText }}>Pharmacy Profile</p>
                <h2 className="text-2xl font-semibold text-white">{selectedPharmacy.pharmacy_name}</h2>
                <p className="text-sm mt-1" style={{ color: mutedText }}>
                  {selectedPharmacy.barangay}, {selectedPharmacy.city}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 rounded-full text-xs font-semibold tracking-[0.35em]" style={{ background: 'rgba(255,77,141,0.2)', color: RAILWAY_THEME.accentPink }}>
                Pending
            </div>
            <button
              onClick={handleCloseModal}
                className="p-2 rounded-xl transition-colors duration-200"
                style={MODAL_SECONDARY_BUTTON_STYLE}
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            </div>
          </div>

          <div className="relative px-8 py-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
            {modalLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-14 h-14 rounded-full border-4 border-transparent border-t-[rgba(50,224,196,0.6)] animate-spin" />
                <p className="text-sm" style={{ color: mutedText }}>Loading pharmacy details…</p>
                </div>
            ) : modalError ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4" style={MODAL_SECTION_STYLE}>
                <svg className="h-12 w-12 text-[#FF4D8D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-white text-center">{modalError}</p>
                <button
                  onClick={() => handleViewPharmacy(selectedPharmacy)}
                  className="px-5 py-2 rounded-xl text-sm font-semibold transition-colors duration-200"
                  style={MODAL_PRIMARY_BUTTON_STYLE}
                >
                  Retry loading
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6" style={MODAL_SECTION_STYLE}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em]" style={{ color: subtleText }}>Overview</p>
                      <h3 className="text-lg font-semibold text-white">Basic Information</h3>
                    </div>
                    <div className="flex space-x-3 text-xs" style={{ color: subtleText }}>
                      <span>{selectedPharmacy.business_email}</span>
                      <span>•</span>
                      <span>{selectedPharmacy.business_phone}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Pharmacy Name</p>
                      <p className="text-white font-semibold">{selectedPharmacy.pharmacy_name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Owner</p>
                      <p className="text-white font-semibold">{selectedPharmacy.owner_first_name} {selectedPharmacy.owner_last_name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Business Phone</p>
                      <p className="text-white font-semibold">{selectedPharmacy.business_phone}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Business Email</p>
                      <p className="text-white font-semibold">{selectedPharmacy.business_email}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Address</p>
                      <p className="text-white font-semibold">{selectedPharmacy.barangay}, {selectedPharmacy.city}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6" style={MODAL_SECTION_STYLE}>
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em]" style={{ color: subtleText }}>Compliance</p>
                    <h3 className="text-lg font-semibold text-white">Licensing & Permits</h3>
                      </div>
                  {detailedPharmacyData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Business Permit Number</p>
                        <p className="text-white font-semibold">{detailedPharmacyData.business_permit_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Business Permit Expiry</p>
                        <p className="text-white font-semibold">
                          {detailedPharmacyData.business_permit_expiry
                            ? new Date(detailedPharmacyData.business_permit_expiry).toLocaleDateString()
                            : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Pharmacy License Number</p>
                        <p className="text-white font-semibold">{detailedPharmacyData.pharmacy_license_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Pharmacy License Expiry</p>
                        <p className="text-white font-semibold">
                          {detailedPharmacyData.pharmacy_license_expiry
                            ? new Date(detailedPharmacyData.pharmacy_license_expiry).toLocaleDateString()
                            : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Owner Date of Birth</p>
                        <p className="text-white font-semibold">
                          {detailedPharmacyData.owner_date_of_birth
                            ? new Date(detailedPharmacyData.owner_date_of_birth).toLocaleDateString()
                            : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Owner Gender</p>
                        <p className="text-white font-semibold capitalize">{detailedPharmacyData.owner_gender || 'Not provided'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: subtleText }}>Services Offered</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {detailedPharmacyData.services_offered && detailedPharmacyData.services_offered.length > 0 ? (
                            detailedPharmacyData.services_offered.map((service, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 text-xs font-semibold rounded-full"
                                style={{ background: 'rgba(50,224,196,0.25)', color: '#F4F6FF' }}
                              >
                                {service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            ))
                          ) : (
                            <p className="text-white font-semibold">No services specified</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                      <div className="w-10 h-10 rounded-full border-4 border-transparent border-t-[rgba(50,224,196,0.6)] animate-spin" />
                      <p className="text-xs" style={{ color: mutedText }}>Loading additional information…</p>
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4" style={MODAL_SECTION_STYLE}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em]" style={{ color: subtleText }}>Compliance</p>
                      <h3 className="text-lg font-semibold text-white">Uploaded Documents</h3>
                    </div>
                  </div>
                  {(() => {
                    if (!detailedPharmacyData) {
                      return (
                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                          <div className="w-10 h-10 rounded-full border-4 border-transparent border-t-[rgba(50,224,196,0.6)] animate-spin" />
                          <p className="text-xs" style={{ color: mutedText }}>Loading documents…</p>
                        </div>
                      );
                    }

                    const docs = Array.isArray(detailedPharmacyData.documents) ? detailedPharmacyData.documents : [];

                    if (docs.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                          <svg className="h-12 w-12 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs" style={{ color: mutedText }}>No documents uploaded</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {docs.map((document) => {
                          const extension = (document.file_url || '').split('.').pop()?.toLowerCase().split('?')[0];
                          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
                          const isPdf = extension === 'pdf';
                          const isCloudinaryUrl =
                            document.file_url &&
                            (document.file_url.includes('cloudinary.com') ||
                              document.file_url.startsWith('http://') ||
                              document.file_url.startsWith('https://'));
                        const imageUrl = isCloudinaryUrl 
                          ? document.file_url 
                          : `${(process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')}/api/document/${document.id}/`;

                          const statusColor =
                            document.status === 'approved'
                              ? RAILWAY_THEME.accentTeal
                              : document.status === 'rejected'
                              ? RAILWAY_THEME.accentPink
                              : RAILWAY_THEME.accentOrange;

                        return (
                            <div key={document.id} className="p-4 space-y-3" style={MODAL_SECTION_STYLE}>
                              <div className="w-full h-48 rounded-xl overflow-hidden bg-[#0f162c] flex items-center justify-center relative">
                              {document.file_url ? (
                                <>
                                  {isImage ? (
                                    <img
                                      src={imageUrl}
                                      alt={document.document_type}
                                        className="w-full h-full object-cover cursor-pointer transition-opacity duration-200 hover:opacity-80"
                                      onClick={() => window.open(imageUrl, '_blank')}
                                      onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div
                                        className="w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors duration-200"
                                        style={{ background: 'rgba(108,99,255,0.1)' }}
                                        onClick={() => window.open(imageUrl, '_blank')}
                                      >
                                        <svg className="h-12 w-12 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                          />
                                        </svg>
                                        <span className="text-xs font-semibold" style={{ color: mutedText }}>
                                          {isPdf ? 'PDF Document' : 'Open Document'}
                                        </span>
                                  </div>
                                    )}
                                </>
                              ) : (
                                  <span className="text-xs font-medium" style={{ color: mutedText }}>
                                    No preview available
                                  </span>
                              )}
                            </div>
                              <div className="text-center space-y-1">
                                <p className="text-sm font-semibold text-white">{document.document_type}</p>
                                <p className="text-xs" style={{ color: mutedText }}>
                                  Status:{' '}
                                  <span className="font-semibold" style={{ color: statusColor }}>
                                    {(document.status || 'pending').charAt(0).toUpperCase() + (document.status || 'pending').slice(1)}
                                </span>
                              </p>
                              {document.document_number && (
                                  <p className="text-xs" style={{ color: subtleText }}>ID: {document.document_number}</p>
                              )}
                              {document.expiry_date && (
                                  <p className="text-xs" style={{ color: subtleText }}>
                                  Expires: {new Date(document.expiry_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-between px-8 py-6 border-t border-white/10">
            <div className="flex space-x-3">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 rounded-xl text-sm font-semibold transition-colors duration-200"
                style={MODAL_SECONDARY_BUTTON_STYLE}
              >
                Close
              </button>
              <button
                onClick={handleApprovePharmacy}
                disabled={modalLoading}
                className="px-6 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={MODAL_PRIMARY_BUTTON_STYLE}
              >
                {modalLoading ? 'Approving…' : 'Approve Pharmacy'}
              </button>
            </div>
            <div className="text-xs" style={{ color: subtleText }}>
              Pharmacy ID: {selectedPharmacy.id}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Success Modal Component
  const renderSuccessModal = () => {
    if (!isSuccessModalOpen || !successData) return null;

    const mutedText = 'rgba(244,246,255,0.68)';
    const subtleText = 'rgba(244,246,255,0.52)';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={MODAL_SCRIM_STYLE}>
        <div
          className="relative w-full max-w-md rounded-[24px] overflow-hidden"
          style={{
            ...MODAL_PANEL_STYLE,
            background: 'linear-gradient(160deg, rgba(17,27,53,0.95), rgba(10,18,36,0.95))',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 20% 0%, rgba(50,224,196,0.35), transparent 55%), radial-gradient(circle at 80% -10%, rgba(108,99,255,0.28), transparent 45%)',
            }}
          />
          <div className="relative flex items-start justify-between px-6 py-5 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#32E0C4] via-[#6C63FF] to-[#B064FF] flex items-center justify-center text-white shadow-inner shadow-[#32E0C433]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em]" style={{ color: subtleText }}>Approval Complete</p>
                <h2 className="text-lg font-semibold text-white">Pharmacy Approved</h2>
              </div>
            </div>
            <button
              onClick={handleCloseSuccessModal}
              className="p-2 rounded-lg transition-colors duration-200"
              style={MODAL_SECONDARY_BUTTON_STYLE}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="relative px-6 py-5 space-y-5">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-white">{successData.pharmacyName}</h3>
              <p className="text-sm" style={{ color: mutedText }}>
                The pharmacy is now live and the welcome email has been dispatched.
                </p>
              </div>

            <div className="p-4 space-y-3" style={MODAL_SECTION_STYLE}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: subtleText }}>Approved By</span>
                <span className="font-semibold text-white">{successData.approvedBy || 'Super Admin'}</span>
                  </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: subtleText }}>Approval Date</span>
                <span className="font-semibold text-white">{successData.approvalDate || new Date().toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: subtleText }}>Email Recipient</span>
                <span className="font-semibold text-white">{successData.ownerEmail}</span>
                  </div>
                </div>

            <div className="p-4 space-y-3" style={MODAL_SECTION_STYLE}>
                <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#32E0C4] to-[#6C63FF] flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                  <p className="text-sm font-semibold text-white">Welcome email queued</p>
                  <p className="text-xs" style={{ color: subtleText }}>
                    Confirmation email sent to {successData.ownerEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF4D8D] to-[#B064FF] flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v2h6v-2m-7-5h8m-9-5h10M12 3v18" />
                    </svg>
                  </div>
                  <div>
                  <p className="text-sm font-semibold text-white">Pharmacy status updated</p>
                  <p className="text-xs" style={{ color: subtleText }}>
                    Dashboard metrics will reflect this approval immediately
                      </p>
                    </div>
                  </div>
            </div>
          </div>

          <div className="relative flex items-center justify-end px-6 py-4 border-t border-white/10 space-x-3">
            <button
              onClick={handleCloseSuccessModal}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200"
              style={MODAL_SECONDARY_BUTTON_STYLE}
            >
              Close
            </button>
            <button
              onClick={() => {
                handleCloseSuccessModal();
                setActiveTile('active');
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200"
              style={MODAL_PRIMARY_BUTTON_STYLE}
            >
              View Active Pharmacies
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen p-6 relative overflow-hidden"
      style={{
        background: RAILWAY_THEME.appBackground,
        color: RAILWAY_THEME.textPrimary,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 20% 20%, rgba(255,77,141,0.18) 0%, transparent 45%), radial-gradient(circle at 80% 0%, rgba(50,224,196,0.16) 0%, transparent 40%)',
        }}
      />
      {/* Top Header */}
      <div className="w-full mb-6">
        <div
          className="relative rounded-3xl px-8 py-7 w-full overflow-hidden"
          style={PRIMARY_PANEL_STYLE}
        >
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background: 'linear-gradient(135deg, rgba(50,224,196,0.12), rgba(108,99,255,0.12))',
            }}
          />
          <div
            className="absolute top-0 left-0 w-32 h-32 -translate-x-16 -translate-y-12 blur-3xl opacity-70"
            style={{ background: 'rgba(108,99,255,0.35)' }}
          />
          <div
            className="absolute top-0 right-0 w-36 h-36 translate-x-12 -translate-y-24 blur-3xl opacity-70"
            style={{ background: 'rgba(50,224,196,0.35)' }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/assets/superpharmago.png"
                alt="PharmaGo Logo" 
                className="h-12 w-auto drop-shadow-lg"
              />
              <div>
                <span className="text-sm uppercase tracking-[0.35em]" style={{ color: RAILWAY_THEME.accentPurple }}>Control Center</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-semibold tracking-wide" style={{ color: RAILWAY_THEME.textPrimary }}>Super Admin Console</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,77,141,0.18)', color: RAILWAY_THEME.accentPink }}>LIVE</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#32E0C4] via-[#6C63FF] to-[#FF4D8D] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#32E0C433]">
                SA
              </div>
              <div className="text-right leading-tight">
                <span className="block text-xs font-semibold uppercase tracking-wide" style={{ color: RAILWAY_THEME.textSecondary }}>Welcome back</span>
                <span className="block text-sm font-semibold" style={{ color: RAILWAY_THEME.textPrimary }}>Super Admin</span>
              </div>
              <button
                onClick={handleLogout}
                className="transition-colors duration-200 px-3 py-2 rounded-xl border"
                style={{
                  color: RAILWAY_THEME.textSecondary,
                  borderColor: 'rgba(50, 224, 196, 0.2)',
                  background: 'rgba(255, 255, 255, 0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = RAILWAY_THEME.accentTeal;
                  e.currentTarget.style.borderColor = 'rgba(50, 224, 196, 0.4)';
                  e.currentTarget.style.background = 'rgba(50, 224, 196, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = RAILWAY_THEME.textSecondary;
                  e.currentTarget.style.borderColor = 'rgba(50, 224, 196, 0.2)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-6 w-full mx-auto">
        {/* Sidebar */}
        <aside
          className="w-80 rounded-3xl p-6 flex flex-col relative overflow-hidden"
          style={{
            ...SECONDARY_PANEL_STYLE,
            background: 'linear-gradient(165deg, rgba(20,28,54,0.92), rgba(16,22,44,0.92))',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 85% -10%, rgba(255,77,141,0.22), transparent 55%), radial-gradient(circle at 0% 20%, rgba(50,224,196,0.18), transparent 45%)',
            }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em]" style={{ color: RAILWAY_THEME.textSecondary }}>Navigator</p>
                <h2 className="text-lg font-semibold tracking-wide" style={{ color: RAILWAY_THEME.textPrimary }}>Main Menu</h2>
              </div>
              <div className="px-2 py-1 text-[0.65rem] font-semibold rounded-full" style={{ background: 'rgba(108,99,255,0.2)', color: RAILWAY_THEME.accentPurple }}>
                SHIFT+K
              </div>
            </div>

          <nav className="flex-1 space-y-2">
              {navItems.map((item) => {
                const isActive = activeNav === item.id;
                return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                    className="group w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 relative overflow-hidden"
                    style={{
                      background: isActive ? 'linear-gradient(135deg, rgba(50,224,196,0.18), rgba(108,99,255,0.22))' : 'rgba(255, 255, 255, 0.02)',
                      border: isActive ? '1px solid rgba(50,224,196,0.38)' : '1px solid rgba(255, 255, 255, 0.02)',
                      boxShadow: isActive ? '0 18px 30px rgba(10, 15, 35, 0.42)' : 'none',
                      color: isActive ? RAILWAY_THEME.textPrimary : RAILWAY_THEME.textSecondary,
                    }}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-1 rounded-full transition-all duration-200"
                      style={{
                        background: isActive ? `linear-gradient(180deg, ${RAILWAY_THEME.accentTeal}, ${RAILWAY_THEME.accentPurple})` : 'transparent',
                      }}
                    />
                    <div
                      className="p-2 rounded-xl transition-colors duration-200"
                      style={{
                        background: isActive ? 'rgba(50,224,196,0.18)' : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <svg
                        className="h-5 w-5 transition-colors duration-200"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        style={{ color: isActive ? RAILWAY_THEME.accentTeal : RAILWAY_THEME.textSecondary }}
                      >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                    </div>
                    <div className="flex-1">
                      <span className="font-medium tracking-wide block">{item.label}</span>
                      <span
                        className="text-[0.65rem] uppercase tracking-[0.4em] transition-opacity duration-200"
                        style={{ color: isActive ? RAILWAY_THEME.accentPurple : 'rgba(147,163,198,0.5)' }}
                      >
                        {isActive ? 'Active' : 'Navigate'}
                      </span>
                    </div>
                    <svg
                      className="h-4 w-4 transition-all duration-200"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      style={{
                        color: isActive ? RAILWAY_THEME.accentTeal : 'rgba(147,163,198,0.4)',
                        transform: isActive ? 'translateX(4px)' : 'translateX(0)',
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
              </button>
                );
              })}
          </nav>
        </div>
        </aside>

        {/* Hero Section */}
        <div
          className="flex-1 rounded-[32px] p-10 overflow-y-auto relative"
          style={{
            ...PRIMARY_PANEL_STYLE,
            background: 'linear-gradient(160deg, rgba(17,24,49,0.92), rgba(24,31,61,0.92))',
            border: '1px solid rgba(76,111,255,0.22)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none rounded-[32px] overflow-hidden"
            style={{
              background: 'radial-gradient(circle at 15% 10%, rgba(108,99,255,0.22), transparent 55%), radial-gradient(circle at 85% 20%, rgba(50,224,196,0.16), transparent 45%)',
            }}
          />
          <div className="relative">
          {activeNav === 'Dashboard' && renderDashboard()}
          {activeNav === 'Manage Pharmacies' && renderManagePharmacies()}
          {activeNav === 'Manage Riders' && renderManageRiders()}
          {activeNav !== 'Dashboard' && activeNav !== 'Manage Pharmacies' && activeNav !== 'Manage Riders' && (
            <div className="flex items-center justify-center h-full">
              <div
                className="relative max-w-lg w-full rounded-3xl border px-10 py-12 text-center overflow-hidden"
                style={{
                  background: 'linear-gradient(165deg, rgba(19,27,53,0.92), rgba(13,19,40,0.92))',
                  borderColor: 'rgba(108,99,255,0.22)',
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle at 25% -10%, rgba(50,224,196,0.2), transparent 55%), radial-gradient(circle at 80% 0%, rgba(255,77,141,0.2), transparent 50%)',
                  }}
                />
                <div className="relative flex flex-col items-center space-y-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-[#32E0C4] via-[#6C63FF] to-[#FF4D8D] text-white shadow-lg shadow-[#32E0C422]">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 17v2h6v-2m-7-5h8m-9-5h10m-5-4v20" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-1">{activeNav} coming soon</h2>
                    <p className="text-sm" style={{ color: 'rgba(244,246,255,0.6)' }}>
                      We&apos;re wiring up this console module next. Ping the product team if you need an early preview.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveNav('Dashboard')}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200"
                    style={{
                      background: 'linear-gradient(135deg, rgba(50,224,196,0.3), rgba(108,99,255,0.3))',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#F4F6FF',
                    }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
      
      {/* Pharmacy Details Modal */}
      <div className="relative">
      {/* Pharmacy Details Modal */}
      {renderPharmacyDetailsModal()}
      {/* Rider Details Modal */}
      {renderRiderDetailsModal()}
      
      {/* Success Modal */}
      {renderSuccessModal()}
      {/* Rider Success Modal */}
      {renderRiderSuccessModal()}
      </div>
    </div>
  );
};

export default AdminDashboard;
