import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
  const [loadingPharmacyList, setLoadingPharmacyList] = useState(false);
  
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
      const response = await axios.get('http://127.0.0.1:8000/api/rider-stats/');
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
      setLoadingPharmacyList(true);
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
      setLoadingPharmacyList(false);
    }
  };

  // Riders: fetch pending list (from stats response)
  const fetchPendingRiders = async () => {
    try {
      setLoadingPendingRiders(true);
      setError(null);
      console.log('Fetching pending riders...');
      const response = await axios.get('http://127.0.0.1:8000/api/rider-stats/');
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
      const response = await axios.get('http://127.0.0.1:8000/api/rider-stats/');
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
      const response = await axios.get('http://127.0.0.1:8000/api/rider-stats/');
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
      const response = await axios.get('http://127.0.0.1:8000/api/rider-stats/');
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
    { id: 'Dashboard', label: 'Dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
    { id: 'Manage Pharmacies', label: 'Manage Pharmacies', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'Manage Riders', label: 'Manage Riders', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
    { id: 'Customers', label: 'Customers', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'Live Orders', label: 'Live Orders', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'Mail', label: 'Mail', icon: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'Reports', label: 'Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'Settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  const renderManageRiders = () => (
    <div className="space-y-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-[#2C7A5D] mb-2">Rider Management</h1>
          <button
            onClick={fetchRiderStats}
            disabled={loading}
            className="px-4 py-2 bg-[#4DAF7C] text-white rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>
        )}
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer ${riderActiveTile === 'total' ? 'ring-2 ring-[#4DAF7C] ring-opacity-50' : ''}`} style={{borderRadius: '25% 10%', backgroundColor: '#F1FEC6'}} onClick={() => handleRiderTileClick('total')}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Total Riders</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl">
              <svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" /></svg>
            </div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">{riderStats.totalRiders}</h1>
          <p className="text-sm text-[#999999]">Registered riders</p>
        </div>

        <div className={`p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer ${riderActiveTile === 'pending' ? 'ring-2 ring-[#4DAF7C] ring-opacity-50' : ''}`} style={{borderRadius: '25% 10%', backgroundColor: '#C2DEDB'}} onClick={() => handleRiderTileClick('pending')}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Pending Approvals</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl">
              <svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">{riderStats.pendingApprovals}</h1>
          <p className="text-sm text-[#999999]">Awaiting review</p>
        </div>

        <div className={`p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer ${riderActiveTile === 'active' ? 'ring-2 ring-[#4DAF7C] ring-opacity-50' : ''}`} style={{borderRadius: '25% 10%', backgroundColor: '#FADADD'}} onClick={() => handleRiderTileClick('active')}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Active Riders</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl">
              <svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">{riderStats.activeRiders}</h1>
          <p className="text-sm text-[#999999]">Currently operating</p>
        </div>

        <div className={`p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer ${riderActiveTile === 'suspended' ? 'ring-2 ring-[#4DAF7C] ring-opacity-50' : ''}`} style={{borderRadius: '25% 10%', backgroundColor: '#C3BEF7'}} onClick={() => handleRiderTileClick('suspended')}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Suspended</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl"><svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">{riderStats.suspendedRiders}</h1>
          <p className="text-sm text-[#999999]">Temporarily disabled</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E8D4] p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[#2C7A5D]">
            {riderActiveTile === 'pending' ? 'Pending Riders' : riderActiveTile === 'active' ? 'Active Riders' : riderActiveTile === 'suspended' ? 'Suspended Riders' : 'All Riders'}
          </h1>
          <div className="flex space-x-2">
            <button onClick={fetchRiderStats} disabled={loading} className="px-4 py-2 bg-[#4DAF7C] text-white rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200">Refresh</button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input type="text" placeholder="Search riders by name or phone..." value={riderSearchTerm} onChange={(e) => setRiderSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-[#D5E8D4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 focus:border-[#6BBF9A] transition-all duration-200 text-sm" />
            {riderSearchTerm && (
              <button onClick={() => setRiderSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#999999] hover:text-[#666666] transition-colors duration-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Pending Riders Table */}
        {riderActiveTile === 'pending' ? (
          loadingPendingRiders ? (
            <div className="text-center py-8">
              <div className="animate-spin mx-auto h-8 w-8 border-4 border-[#4DAF7C] border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-[#666666]">Loading pending riders...</p>
            </div>
          ) : pendingRiders.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 bg-[#D5E8D4] rounded-xl border border-[#6BBF9A] font-semibold text-[#2C7A5D] text-xs lg:text-sm">
                <div className="col-span-2">Name</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-3">Vehicle</div>
                <div className="col-span-2 flex items-center justify-center"><span className="text-xs">Action</span></div>
              </div>
              {pendingRiders
                .filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(riderSearchTerm.toLowerCase()) || (r.phone_number || '').includes(riderSearchTerm))
                .map(rider => (
                  <div key={rider.id} className="grid grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 rounded-xl hover:bg-[#D5E8D4] transition-colors duration-200 border border-transparent hover:border-[#6BBF9A] items-center">
                    <div className="col-span-2">
                      <h3 className="font-semibold text-[#2C7A5D] text-xs lg:text-sm truncate">{rider.first_name} {rider.last_name}</h3>
                    </div>
                    <div className="col-span-2"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.phone_number || '—'}</p></div>
                    <div className="col-span-3"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.email || '—'}</p></div>
                    <div className="col-span-3"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.vehicle_type || '—'} {rider.plate_number ? `• ${rider.plate_number}` : ''}</p></div>
                    <div className="col-span-2 flex items-center justify-center">
                      <button onClick={() => handleViewRider(rider)} className="px-2 lg:px-3 py-1 bg-[#4DAF7C] text-white text-xs rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200">View</button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h3 className="mt-2 text-sm font-medium text-[#666666]">No pending riders</h3>
              <p className="mt-1 text-sm text-[#999999]">All rider applications have been reviewed</p>
            </div>
          )
        ) : riderActiveTile === 'active' ? (
          loadingPendingRiders ? (
            <div className="text-center py-8">
              <div className="animate-spin mx-auto h-8 w-8 border-4 border-[#4DAF7C] border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-[#666666]">Loading active riders...</p>
            </div>
          ) : activeRiders.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 bg-[#D5E8D4] rounded-xl border border-[#6BBF9A] font-semibold text-[#2C7A5D] text-xs lg:text-sm">
                <div className="col-span-2">Name</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-3">Vehicle</div>
                <div className="col-span-2 flex items-center justify-center"><span className="text-xs">Action</span></div>
              </div>
              {activeRiders
                .filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(riderSearchTerm.toLowerCase()) || (r.phone_number || '').includes(riderSearchTerm))
                .map(rider => (
                  <div key={rider.id} className="grid grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 rounded-xl hover:bg-[#D5E8D4] transition-colors duration-200 border border-transparent hover:border-[#6BBF9A] items-center">
                    <div className="col-span-2">
                      <h3 className="font-semibold text-[#2C7A5D] text-xs lg:text-sm truncate">{rider.first_name} {rider.last_name}</h3>
                    </div>
                    <div className="col-span-2"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.phone_number || '—'}</p></div>
                    <div className="col-span-3"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.email || '—'}</p></div>
                    <div className="col-span-3"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.vehicle_type || '—'} {rider.plate_number ? `• ${rider.plate_number}` : ''}</p></div>
                    <div className="col-span-2 flex items-center justify-center">
                      <button onClick={() => handleViewRider(rider)} className="px-2 lg:px-3 py-1 bg-[#4DAF7C] text-white text-xs rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200">View</button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2" /></svg>
              <h3 className="mt-2 text-sm font-medium text-[#666666]">No active riders</h3>
            </div>
          )
        ) : riderActiveTile === 'suspended' ? (
          loadingPendingRiders ? (
            <div className="text-center py-8">
              <div className="animate-spin mx-auto h-8 w-8 border-4 border-[#4DAF7C] border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-[#666666]">Loading suspended riders...</p>
            </div>
          ) : suspendedRiders.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 bg-[#D5E8D4] rounded-xl border border-[#6BBF9A] font-semibold text-[#2C7A5D] text-xs lg:text-sm">
                <div className="col-span-2">Name</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-3">Vehicle</div>
                <div className="col-span-2 flex items-center justify-center"><span className="text-xs">Action</span></div>
              </div>
              {suspendedRiders
                .filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(riderSearchTerm.toLowerCase()) || (r.phone_number || '').includes(riderSearchTerm))
                .map(rider => (
                  <div key={rider.id} className="grid grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 rounded-xl hover:bg-[#D5E8D4] transition-colors duration-200 border border-transparent hover:border-[#6BBF9A] items-center">
                    <div className="col-span-2">
                      <h3 className="font-semibold text-[#2C7A5D] text-xs lg:text-sm truncate">{rider.first_name} {rider.last_name}</h3>
                    </div>
                    <div className="col-span-2"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.phone_number || '—'}</p></div>
                    <div className="col-span-3"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.email || '—'}</p></div>
                    <div className="col-span-3"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.vehicle_type || '—'} {rider.plate_number ? `• ${rider.plate_number}` : ''}</p></div>
                    <div className="col-span-2 flex items-center justify-center">
                      <button onClick={() => handleViewRider(rider)} className="px-2 lg:px-3 py-1 bg-[#4DAF7C] text-white text-xs rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200">View</button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2" /></svg>
              <h3 className="mt-2 text-sm font-medium text-[#666666]">No suspended riders</h3>
            </div>
          )
        ) : (
          loadingPendingRiders ? (
            <div className="text-center py-8">
              <div className="animate-spin mx-auto h-8 w-8 border-4 border-[#4DAF7C] border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-[#666666]">Loading riders...</p>
            </div>
          ) : allRiders.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 bg-[#D5E8D4] rounded-xl border border-[#6BBF9A] font-semibold text-[#2C7A5D] text-xs lg:text-sm">
                <div className="col-span-2">Name</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-3">Vehicle</div>
                <div className="col-span-2 flex items-center justify-center"><span className="text-xs">Action</span></div>
              </div>
              {allRiders
                .filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(riderSearchTerm.toLowerCase()) || (r.phone_number || '').includes(riderSearchTerm))
                .map(rider => (
                  <div key={rider.id} className="grid grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 rounded-xl hover:bg-[#D5E8D4] transition-colors duration-200 border border-transparent hover:border-[#6BBF9A] items-center">
                    <div className="col-span-2">
                      <h3 className="font-semibold text-[#2C7A5D] text-xs lg:text-sm truncate">{rider.first_name} {rider.last_name}</h3>
                    </div>
                    <div className="col-span-2"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.phone_number || '—'}</p></div>
                    <div className="col-span-3"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.email || '—'}</p></div>
                    <div className="col-span-3"><p className="text-xs lg:text-sm text-[#666666] truncate">{rider.vehicle_type || '—'} {rider.plate_number ? `• ${rider.plate_number}` : ''}</p></div>
                    <div className="col-span-2 flex items-center justify-center">
                      <button onClick={() => handleViewRider(rider)} className="px-2 lg:px-3 py-1 bg-[#4DAF7C] text-white text-xs rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200">View</button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2" /></svg>
              <h3 className="mt-2 text-sm font-medium text-[#666666]">No riders found</h3>
            </div>
          )
        )}
      </div>
    </div>
  );

  const renderRiderDetailsModal = () => {
    if (!isRiderModalOpen || !selectedRider) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-[#D5E8D4]">
            <div>
              <h2 className="text-2xl font-bold text-[#2C7A5D]">{selectedRider.first_name} {selectedRider.last_name}</h2>
              <p className="text-sm text-[#666666]">Pending Rider Application</p>
            </div>
            <button onClick={handleCloseRiderModal} className="p-2 hover:bg-[#D5E8D4] rounded-lg transition-colors duration-200">
              <svg className="h-6 w-6 text-[#666666]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {riderModalLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin mx-auto h-12 w-12 border-4 border-[#4DAF7C] border-t-transparent rounded-full"></div>
              </div>
            ) : riderModalError ? (
              <div className="text-center py-8 text-red-600">{riderModalError}</div>
            ) : detailedRiderData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-sm text-[#666666] mb-1">Date of Birth</label><p className="text-[#2C7A5D] font-semibold">{detailedRiderData.date_of_birth || '—'}</p></div>
                  <div><label className="block text-sm text-[#666666] mb-1">Gender</label><p className="text-[#2C7A5D] font-semibold capitalize">{detailedRiderData.gender || '—'}</p></div>
                  <div><label className="block text-sm text-[#666666] mb-1">Vehicle</label><p className="text-[#2C7A5D] font-semibold">{detailedRiderData.vehicle_type || '—'} {detailedRiderData.vehicle_brand ? `• ${detailedRiderData.vehicle_brand}` : ''}</p></div>
                  <div><label className="block text-sm text-[#666666] mb-1">Plate / Color</label><p className="text-[#2C7A5D] font-semibold">{detailedRiderData.plate_number || '—'} {detailedRiderData.vehicle_color ? `• ${detailedRiderData.vehicle_color}` : ''}</p></div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2C7A5D] mb-2">Driver's License</h3>
                  {detailedRiderData.documents && detailedRiderData.documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detailedRiderData.documents.map((doc) => {
                        // Check if URL is from Cloudinary (direct URL) or needs backend proxy
                        const isCloudinaryUrl = doc.file_url && (
                          doc.file_url.includes('cloudinary.com') || 
                          doc.file_url.startsWith('http://') || 
                          doc.file_url.startsWith('https://')
                        );
                        
                        // Use Cloudinary URL directly if available, otherwise use backend proxy
                        const imageUrl = isCloudinaryUrl 
                          ? doc.file_url 
                          : `${(process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')}/api/document/${doc.id}/`;
                        
                        return (
                          <div key={doc.id} className="bg-white rounded-lg p-4 border border-[#D5E8D4]">
                            <div className="w-full h-48 bg-gray-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center relative">
                              {doc.file_url || doc.id ? (
                                <>
                                  <img 
                                    src={imageUrl} 
                                    alt="Driver License" 
                                    className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity duration-200" 
                                    onClick={() => window.open(imageUrl, '_blank')}
                                    onError={(e) => {
                                      console.error('Failed to load image:', imageUrl);
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  {/* Fallback for failed image loads */}
                                  <div 
                                    className="w-full h-full flex flex-col items-center justify-center bg-[#D5E8D4] absolute inset-0"
                                    style={{ display: 'none' }}
                                  >
                                    <svg className="h-8 w-8 text-[#999999] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-[#999999] text-sm">Unable to load preview</span>
                                    {isCloudinaryUrl && (
                                      <button
                                        onClick={() => window.open(imageUrl, '_blank')}
                                        className="mt-2 px-3 py-1 bg-[#4DAF7C] text-white text-xs rounded hover:bg-[#6BBF9A]"
                                      >
                                        Try opening directly
                                      </button>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <span className="text-[#999999] text-sm">No preview</span>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-[#666666] mb-1">
                                Status: <span className={`font-medium capitalize ${
                                  doc.status === 'approved' ? 'text-green-600' :
                                  doc.status === 'rejected' ? 'text-red-600' :
                                  'text-yellow-600'
                                }`}>{doc.status || 'pending'}</span>
                              </p>
                              {isCloudinaryUrl && (
                                <p className="text-xs text-blue-600">☁️ Cloudinary</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-[#666666]">No documents uploaded</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin mx-auto h-8 w-8 border-4 border-[#4DAF7C] border-t-transparent rounded-full"></div>
                <p className="mt-2 text-sm text-[#666666]">Loading rider details...</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between p-6 border-t border-[#D5E8D4] bg-[#F8F9FA]">
            <div className="text-sm text-[#666666]">Rider ID: {selectedRider?.id}</div>
            <div className="flex space-x-3">
              <button onClick={handleCloseRiderModal} className="px-6 py-2 border border-[#D5E8D4] text-[#666666] rounded-lg hover:bg-[#D5E8D4] transition-colors duration-200">Close</button>
              <button onClick={handleApproveRider} disabled={riderModalLoading} className="px-6 py-2 bg-[#4DAF7C] text-white rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">{riderModalLoading ? 'Approving...' : 'Approve Rider'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRiderSuccessModal = () => {
    if (!isRiderSuccessOpen || !riderSuccessData) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-[#D5E8D4]">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#2C7A5D]">Rider Approved!</h2>
                <p className="text-sm text-[#666666]">Welcome email sent</p>
              </div>
            </div>
            <button onClick={handleCloseRiderSuccess} className="p-2 hover:bg-[#D5E8D4] rounded-lg transition-colors duration-200">
              <svg className="h-6 w-6 text-[#666666]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-[#2C7A5D] mb-2">✅ {riderSuccessData.riderName} Approved!</h3>
                <p className="text-sm text-[#666666] mb-4">The rider account is now active and ready to start deliveries.</p>
              </div>

              <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C7A5D]">Welcome Email Sent</p>
                    <p className="text-xs text-[#666666]">{riderSuccessData.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C7A5D]">Login Credentials</p>
                    <p className="text-xs text-[#666666]">Rider will use their registration password</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C7A5D]">Email Status</p>
                    <p className="text-xs text-[#666666] capitalize">{riderSuccessData.emailStatus || 'sent'}</p>
                  </div>
                </div>
              </div>

              {riderSuccessData.emailStatus === 'sent' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <svg className="h-5 w-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-800">Email Sent Successfully</p>
                      <p className="text-xs text-green-700">
                        The rider has received their login credentials and can now access the app.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <svg className="h-5 w-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-red-800">Email Sending Failed</p>
                      <p className="text-xs text-red-700">
                        Please contact the rider directly to inform them of their approval.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end p-6 border-t border-[#D5E8D4] bg-[#F8F9FA]">
            <button onClick={handleCloseRiderSuccess} className="px-6 py-2 bg-[#4DAF7C] text-white rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200">Got it!</button>
          </div>
        </div>
      </div>
    );
  };

  // Mock data for demonstration
  const mockData = {
    totalSales: 1247,
    salesToday: 89,
    totalOrders: 3421,
    totalRevenue: 45680,
    lastMonthSales: 1156,
    thisWeekSales: 623
  };

  const topPharmacies = [
    { name: 'MediCare Pharmacy', email: 'contact@medicare.ph', sales: 1247, avatar: 'MC' },
    { name: 'HealthPlus Drugstore', email: 'info@healthplus.ph', sales: 1156, avatar: 'HP' },
    { name: 'QuickMed Solutions', email: 'hello@quickmed.ph', sales: 1089, avatar: 'QM' },
    { name: 'Family Care Pharmacy', email: 'support@familycare.ph', sales: 987, avatar: 'FC' },
    { name: 'Express Med Store', email: 'orders@expressmed.ph', sales: 856, avatar: 'EM' }
  ];

  // Filter pharmacies based on search term
  const filteredPharmacies = pharmacyList.filter(pharmacy =>
    (pharmacy.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pharmacy.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pharmacy.business_phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pharmacy.business_email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#2C7A5D] mb-2">Sales Overview</h1>
              </div>

      {/* Top Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5" style={{borderRadius: '25% 10%', backgroundColor: '#F1FEC6'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Total Sales</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl">
              <svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">{mockData.totalSales.toLocaleString()}</h1>
          <p className="text-sm text-[#999999]">Last month: {mockData.lastMonthSales.toLocaleString()}</p>
        </div>

        <div className="p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5" style={{borderRadius: '25% 10%', backgroundColor: '#C2DEDB'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Sales Today</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl">
              <svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">{mockData.salesToday}</h1>
          <p className="text-sm text-[#999999]">This Week: {mockData.thisWeekSales}</p>
        </div>

        <div className="p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5" style={{borderRadius: '25% 10%', backgroundColor: '#FADADD'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Total Orders</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl">
              <svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">{mockData.totalOrders.toLocaleString()}</h1>
          <p className="text-sm text-[#999999]">Across all pharmacies</p>
        </div>

        <div className="p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5" style={{borderRadius: '25% 10%', backgroundColor: '#C3BEF7'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Total Revenue</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl">
              <svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">₱{mockData.totalRevenue.toLocaleString()}</h1>
          <p className="text-sm text-[#999999]">Service fees from deliveries</p>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Analytics */}
        <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E8D4] p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-[#2C7A5D]">Revenue Analytics</h1>
            <select className="px-3 py-2 border border-[#D5E8D4] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 focus:border-[#6BBF9A] transition-all duration-200">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-between space-x-2">
            {[65, 78, 45, 89, 92, 67, 85].map((height, index) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className="w-8 bg-gradient-to-t from-[#4DAF7C] to-[#6BBF9A] rounded-t-lg mb-2"
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-xs text-[#999999]">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</span>
              </div>
            ))}
          </div>
          </div>

        {/* Total Income */}
        <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E8D4] p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-[#2C7A5D]">Total Income</h1>
            <div className="flex space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-[#10B981] rounded"></div>
                <span className="text-xs text-[#666666]">Profit</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-[#EF4444] rounded"></div>
                <span className="text-xs text-[#666666]">Loss</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-[#666666] mb-4">View your income in a certain period of time</p>
          <div className="h-48 flex items-end justify-between space-x-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex flex-col items-center space-y-1">
                <div className="w-6 bg-[#10B981] rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
                <div className="w-6 bg-[#EF4444] rounded-b" style={{ height: `${Math.random() * 20 + 5}%` }}></div>
                <span className="text-xs text-[#999999]">{`M${i + 1}`}</span>
              </div>
            ))}
              </div>
            </div>
          </div>

      {/* Top Pharmacy List */}
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E8D4] p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[#2C7A5D]">Top Pharmacy</h1>
          <select className="px-3 py-2 border border-[#D5E8D4] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 focus:border-[#6BBF9A] transition-all duration-200">
            <option>This Week</option>
            <option>This Month</option>
            <option>This Year</option>
          </select>
        </div>
        <div className="max-h-80 overflow-y-auto space-y-3">
          {topPharmacies.map((pharmacy, index) => (
            <div 
              key={index} 
              className={`flex items-center p-4 rounded-xl transition-colors duration-200 ${
                index < 3 
                  ? 'bg-[#D5E8D4] border border-[#6BBF9A]' 
                  : 'hover:bg-[#D5E8D4]'
              }`}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#4DAF7C] to-[#6BBF9A] rounded-xl flex items-center justify-center text-white font-bold text-sm mr-4">
                {pharmacy.avatar}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#2C7A5D]">{pharmacy.name}</h3>
                <p className="text-sm text-[#666666]">{pharmacy.email}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#2C7A5D]">{pharmacy.sales.toLocaleString()}</p>
                <p className="text-sm text-[#999999]">Total Sales</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderManagePharmacies = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-[#2C7A5D] mb-2">Pharmacy Management</h1>
          <button
            onClick={fetchPharmacyStats}
            disabled={loading}
            className="px-4 py-2 bg-[#4DAF7C] text-white rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          className={`p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer ${activeTile === 'total' ? 'ring-2 ring-[#4DAF7C] ring-opacity-50' : ''}`}
          style={{borderRadius: '25% 10%', backgroundColor: '#F1FEC6'}}
          onClick={() => handleTileClick('total')}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Total Pharmacies</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl">
              <svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">
            {loading ? (
              <div className="animate-pulse bg-gray-300 h-10 w-16 rounded"></div>
            ) : (
              pharmacyStats.totalPharmacies
            )}
          </h1>
          <p className="text-sm text-[#999999]">Registered pharmacies</p>
        </div>

        <div 
          className={`p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer ${activeTile === 'pending' ? 'ring-2 ring-[#4DAF7C] ring-opacity-50' : ''}`}
          style={{borderRadius: '25% 10%', backgroundColor: '#C2DEDB'}}
          onClick={() => handleTileClick('pending')}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Pending Approvals</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl">
              <svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">
            {loading ? (
              <div className="animate-pulse bg-gray-300 h-10 w-16 rounded"></div>
            ) : (
              pharmacyStats.pendingApprovals
            )}
          </h1>
          <p className="text-sm text-[#999999]">Awaiting review</p>
        </div>

        <div 
          className={`p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer ${activeTile === 'active' ? 'ring-2 ring-[#4DAF7C] ring-opacity-50' : ''}`}
          style={{borderRadius: '25% 10%', backgroundColor: '#FADADD'}}
          onClick={() => handleTileClick('active')}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Active Pharmacies</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl">
              <svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">
            {loading ? (
              <div className="animate-pulse bg-gray-300 h-10 w-16 rounded"></div>
            ) : (
              pharmacyStats.activePharmacies
            )}
          </h1>
          <p className="text-sm text-[#999999]">Currently operating</p>
        </div>

        <div 
          className={`p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer ${activeTile === 'suspended' ? 'ring-2 ring-[#4DAF7C] ring-opacity-50' : ''}`}
          style={{borderRadius: '25% 10%', backgroundColor: '#C3BEF7'}}
          onClick={() => handleTileClick('suspended')}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#666666]">Suspended</p>
            <div className="p-3 bg-[#D5E8D4] rounded-xl">
              <svg className="h-4 w-4 text-[#4DAF7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl mb-6 font-bold text-gray-700 mb-1">
            {loading ? (
              <div className="animate-pulse bg-gray-300 h-10 w-16 rounded"></div>
            ) : (
              pharmacyStats.suspendedPharmacies
            )}
          </h1>
          <p className="text-sm text-[#999999]">Temporarily disabled</p>
        </div>
      </div>

      {/* Pharmacy List */}
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D5E8D4] p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[#2C7A5D]">
            {activeTile === 'total' && 'Total Pharmacies'}
            {activeTile === 'pending' && 'Pending Approvals'}
            {activeTile === 'active' && 'Active Pharmacies'}
            {activeTile === 'suspended' && 'Suspended Pharmacies'}
          </h1>
          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-[#4DAF7C] text-white rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200">
              Add Pharmacy
            </button>
            <button className="px-4 py-2 border border-[#D5E8D4] text-[#666666] rounded-lg hover:bg-[#D5E8D4] transition-colors duration-200">
              Export
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search pharmacies by name, address, owner, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[#D5E8D4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 focus:border-[#6BBF9A] transition-all duration-200 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#999999] hover:text-[#666666] transition-colors duration-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Search Results Count */}
          {searchTerm && (
            <div className="mt-2 text-sm text-[#666666]">
              {filteredPharmacies.length} of {pharmacyList.length} pharmacies found
            </div>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto space-y-3">
          {activeTile === 'pending' ? (
            // Show pending pharmacies
            loadingPendingPharmacies ? (
              <div className="text-center py-8">
                <div className="animate-spin mx-auto h-8 w-8 border-4 border-[#4DAF7C] border-t-transparent rounded-full"></div>
                <p className="mt-2 text-sm text-[#666666]">Loading pending pharmacies...</p>
              </div>
            ) : pendingPharmacies.length > 0 ? (
              <div className="space-y-3">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 bg-[#D5E8D4] rounded-xl border border-[#6BBF9A] font-semibold text-[#2C7A5D] text-xs lg:text-sm">
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-xs">Profile</span>
                  </div>
                  <div className="col-span-3">Pharmacy Name</div>
                  <div className="col-span-2">Address</div>
                  <div className="col-span-2">Owner</div>
                  <div className="col-span-2">Phone</div>
                  <div className="col-span-1">Email</div>
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-xs">Action</span>
                  </div>
                </div>
                
                {/* Table Rows */}
                {pendingPharmacies.map((pharmacy) => (
                  <div 
                    key={pharmacy.id}
                    className="grid grid-cols-12 gap-2 lg:gap-4 p-3 lg:p-4 rounded-xl hover:bg-[#D5E8D4] transition-colors duration-200 border border-transparent hover:border-[#6BBF9A] items-center"
                  >
                    {/* Pharmacy Profile Picture */}
                    <div className="col-span-1 flex items-center justify-center">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-[#4DAF7C] to-[#6BBF9A] rounded-xl flex items-center justify-center text-white font-bold text-xs">
                        {pharmacy.pharmacy_name.split(' ').map(word => word[0]).join('').substring(0, 2)}
                      </div>
                    </div>
                    
                    {/* Pharmacy Name */}
                    <div className="col-span-3">
                      <h3 className="font-semibold text-[#2C7A5D] text-xs lg:text-sm truncate">{pharmacy.pharmacy_name}</h3>
                    </div>
                    
                    {/* Address */}
                    <div className="col-span-2">
                      <p className="text-xs lg:text-sm text-[#666666] truncate">{pharmacy.barangay}, {pharmacy.city}</p>
                    </div>
                    
                    {/* Owner */}
                    <div className="col-span-2">
                      <p className="text-xs lg:text-sm text-[#666666] truncate">{pharmacy.owner_first_name} {pharmacy.owner_last_name}</p>
                    </div>
                    
                    {/* Phone */}
                    <div className="col-span-2">
                      <p className="text-xs lg:text-sm text-[#666666] truncate">{pharmacy.business_phone}</p>
                    </div>
                    
                    {/* Email */}
                    <div className="col-span-1">
                      <p className="text-xs lg:text-sm text-[#666666] truncate">{pharmacy.business_email}</p>
                    </div>
                    
                    {/* Action Button */}
                    <div className="col-span-1 flex items-center justify-center">
                      <button 
                        onClick={() => handleViewPharmacy(pharmacy)}
                        className="px-2 lg:px-3 py-1 bg-[#4DAF7C] text-white text-xs rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h3 className="mt-2 text-sm font-medium text-[#666666]">No pending pharmacies</h3>
                <p className="mt-1 text-sm text-[#999999]">All pharmacies have been reviewed</p>
              </div>
            )
          ) : (
            // Show regular pharmacy list (total, active, suspended)
            filteredPharmacies.length > 0 ? (
              filteredPharmacies.map((pharmacy) => (
              <div 
                key={pharmacy.id}
                className="flex items-center p-4 rounded-xl hover:bg-[#D5E8D4] transition-colors duration-200 border border-transparent hover:border-[#6BBF9A]"
              >
                {/* Pharmacy Profile Picture */}
                <div className="w-12 h-12 bg-gradient-to-br from-[#4DAF7C] to-[#6BBF9A] rounded-xl flex items-center justify-center text-white font-bold text-sm mr-4">
                  {(pharmacy.name || '').split(' ').map(word => word[0]).join('').substring(0, 2)}
                </div>
                
                {/* Pharmacy Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#2C7A5D] text-lg">{pharmacy.name || 'Unnamed Pharmacy'}</h3>
                      <p className="text-sm text-[#666666] mb-1">{pharmacy.address || 'No address'}</p>
                      <div className="flex items-center space-x-4 text-sm text-[#999999]">
                        <span>Phone: {pharmacy.business_phone || 'N/A'}</span>
                        <span>Email: {pharmacy.business_email || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2 ml-4">
                      <button className="px-3 py-1 bg-[#4DAF7C] text-white text-xs rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200">
                        View
                      </button>
                      <button className="px-3 py-1 border border-[#D5E8D4] text-[#666666] text-xs rounded-lg hover:bg-[#D5E8D4] transition-colors duration-200">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              ))
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-[#666666]">No pharmacies found</h3>
                <p className="mt-1 text-sm text-[#999999]">
                  {searchTerm ? `No pharmacies match "${searchTerm}"` : 'No pharmacies available'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-3 px-4 py-2 bg-[#4DAF7C] text-white text-sm rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200"
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

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#D5E8D4]">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#4DAF7C] to-[#6BBF9A] rounded-xl flex items-center justify-center text-white font-bold text-lg">
                {selectedPharmacy.pharmacy_name.split(' ').map(word => word[0]).join('').substring(0, 2)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#2C7A5D]">{selectedPharmacy.pharmacy_name}</h2>
                <p className="text-sm text-[#666666]">Pending Approval</p>
              </div>
            </div>
            <button
              onClick={handleCloseModal}
              className="p-2 hover:bg-[#D5E8D4] rounded-lg transition-colors duration-200"
            >
              <svg className="h-6 w-6 text-[#666666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {modalLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin mx-auto h-12 w-12 border-4 border-[#4DAF7C] border-t-transparent rounded-full"></div>
                  <p className="mt-4 text-sm text-[#666666]">Loading pharmacy details...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Basic Information Section */}
                <div className="bg-[#F8F9FA] rounded-xl p-6">
                  <h3 className="text-lg font-bold text-[#2C7A5D] mb-4 flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#666666] mb-1">Pharmacy Name</label>
                      <p className="text-[#2C7A5D] font-semibold">{selectedPharmacy.pharmacy_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#666666] mb-1">Owner Name</label>
                      <p className="text-[#2C7A5D] font-semibold">{selectedPharmacy.owner_first_name} {selectedPharmacy.owner_last_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#666666] mb-1">Business Phone</label>
                      <p className="text-[#2C7A5D] font-semibold">{selectedPharmacy.business_phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#666666] mb-1">Business Email</label>
                      <p className="text-[#2C7A5D] font-semibold">{selectedPharmacy.business_email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#666666] mb-1">Location</label>
                      <p className="text-[#2C7A5D] font-semibold">{selectedPharmacy.barangay}, {selectedPharmacy.city}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Information Section */}
                <div className="bg-[#F8F9FA] rounded-xl p-6">
                  <h3 className="text-lg font-bold text-[#2C7A5D] mb-4 flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Additional Information
                  </h3>
                  {modalError ? (
                    <div className="text-center py-4">
                      <div className="text-red-600 mb-2">
                        <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-red-600 font-medium">{modalError}</p>
                      <button
                        onClick={() => handleViewPharmacy(selectedPharmacy)}
                        className="mt-2 px-4 py-2 bg-[#4DAF7C] text-white rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200"
                      >
                        Retry
                      </button>
                    </div>
                  ) : detailedPharmacyData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[#666666] mb-1">Business Permit Number</label>
                        <p className="text-[#2C7A5D] font-semibold">{detailedPharmacyData.business_permit_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#666666] mb-1">Business Permit Expiry</label>
                        <p className="text-[#2C7A5D] font-semibold">
                          {detailedPharmacyData.business_permit_expiry ? 
                            new Date(detailedPharmacyData.business_permit_expiry).toLocaleDateString() : 
                            'Not provided'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#666666] mb-1">Pharmacy License Number</label>
                        <p className="text-[#2C7A5D] font-semibold">{detailedPharmacyData.pharmacy_license_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#666666] mb-1">Pharmacy License Expiry</label>
                        <p className="text-[#2C7A5D] font-semibold">
                          {detailedPharmacyData.pharmacy_license_expiry ? 
                            new Date(detailedPharmacyData.pharmacy_license_expiry).toLocaleDateString() : 
                            'Not provided'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#666666] mb-1">Owner Date of Birth</label>
                        <p className="text-[#2C7A5D] font-semibold">
                          {detailedPharmacyData.owner_date_of_birth ? 
                            new Date(detailedPharmacyData.owner_date_of_birth).toLocaleDateString() : 
                            'Not provided'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#666666] mb-1">Owner Gender</label>
                        <p className="text-[#2C7A5D] font-semibold capitalize">{detailedPharmacyData.owner_gender || 'Not provided'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[#666666] mb-1">Services Offered</label>
                        <div className="flex flex-wrap gap-2">
                          {detailedPharmacyData.services_offered && detailedPharmacyData.services_offered.length > 0 ? (
                            detailedPharmacyData.services_offered.map((service, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-[#4DAF7C] text-white text-sm rounded-full"
                              >
                                {service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            ))
                          ) : (
                            <p className="text-[#2C7A5D] font-semibold">No services specified</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="animate-spin mx-auto h-8 w-8 border-4 border-[#4DAF7C] border-t-transparent rounded-full"></div>
                      <p className="mt-2 text-sm text-[#666666]">Loading additional information...</p>
                    </div>
                  )}
                </div>

                {/* Document Gallery Section */}
                <div className="bg-[#F8F9FA] rounded-xl p-6">
                  <h3 className="text-lg font-bold text-[#2C7A5D] mb-4 flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Uploaded Documents
                  </h3>
                  {modalError ? (
                    <div className="text-center py-4">
                      <p className="text-red-600">Unable to load documents</p>
                    </div>
                  ) : detailedPharmacyData && detailedPharmacyData.documents ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detailedPharmacyData.documents.map((document) => {
                        // Determine file type from URL
                        const getFileType = (url) => {
                          if (!url) return 'unknown';
                          const extension = url.split('.').pop().toLowerCase().split('?')[0]; // Remove query params
                          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
                          if (extension === 'pdf') return 'pdf';
                          return 'unknown';
                        };

                        const fileType = getFileType(document.file_url);
                        const isImage = fileType === 'image';
                        const isPdf = fileType === 'pdf';
                        
                        // Check if URL is from Cloudinary (direct URL) or needs backend proxy
                        const isCloudinaryUrl = document.file_url && (
                          document.file_url.includes('cloudinary.com') || 
                          document.file_url.startsWith('http://') || 
                          document.file_url.startsWith('https://')
                        );
                        
                        // Use Cloudinary URL directly if available, otherwise use backend proxy
                        const imageUrl = isCloudinaryUrl 
                          ? document.file_url 
                          : `${(process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')}/api/document/${document.id}/`;

                        return (
                          <div key={document.id} className="bg-white rounded-lg p-4 border border-[#D5E8D4]">
                            <div className="w-full h-48 bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
                              {document.file_url ? (
                                <>
                                  {isImage ? (
                                    <img
                                      src={imageUrl}
                                      alt={document.document_type}
                                      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity duration-200"
                                      onClick={() => window.open(imageUrl, '_blank')}
                                      onError={(e) => {
                                        console.error('Failed to load image:', imageUrl);
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  ) : isPdf ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 cursor-pointer hover:bg-red-100 transition-colors duration-200"
                                         onClick={() => window.open(imageUrl, '_blank')}>
                                      <svg className="h-12 w-12 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      <span className="text-red-600 font-medium text-sm">PDF Document</span>
                                      <span className="text-red-500 text-xs mt-1">Click to open</span>
                                    </div>
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                                         onClick={() => window.open(imageUrl, '_blank')}>
                                      <svg className="h-12 w-12 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="text-gray-600 font-medium text-sm">Document</span>
                                      <span className="text-gray-500 text-xs mt-1">Click to open</span>
                                    </div>
                                  )}
                                  
                                  {/* Fallback for failed image loads */}
                                  <div 
                                    className="w-full h-full flex flex-col items-center justify-center bg-[#D5E8D4] absolute inset-0"
                                    style={{ display: 'none' }}
                                  >
                                    <svg className="h-8 w-8 text-[#999999] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-[#999999] text-sm">Unable to load preview</span>
                                    {isCloudinaryUrl && (
                                      <button
                                        onClick={() => window.open(imageUrl, '_blank')}
                                        className="mt-2 px-3 py-1 bg-[#4DAF7C] text-white text-xs rounded hover:bg-[#6BBF9A]"
                                      >
                                        Try opening directly
                                      </button>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#D5E8D4]">
                                  <svg className="h-8 w-8 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-[#2C7A5D] mb-1">{document.document_type}</p>
                              <p className="text-xs text-[#666666] mb-1">
                                Status: <span className={`font-medium ${
                                  document.status === 'approved' ? 'text-green-600' :
                                  document.status === 'rejected' ? 'text-red-600' :
                                  'text-yellow-600'
                                }`}>
                                  {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                                </span>
                              </p>
                              {isCloudinaryUrl && (
                                <p className="text-xs text-blue-600 mb-1">
                                  ☁️ Cloudinary
                                </p>
                              )}
                              {document.document_number && (
                                <p className="text-xs text-[#999999]">ID: {document.document_number}</p>
                              )}
                              {document.expiry_date && (
                                <p className="text-xs text-[#999999]">
                                  Expires: {new Date(document.expiry_date).toLocaleDateString()}
                                </p>
                              )}
                              {document.file_url && (
                                <div className="mt-2 space-y-1">
                                  <button
                                    onClick={() => window.open(imageUrl, '_blank')}
                                    className="w-full px-3 py-1 bg-[#4DAF7C] text-white text-xs rounded hover:bg-[#6BBF9A] transition-colors duration-200"
                                  >
                                    {isImage ? 'View Full Size' : isPdf ? 'Open PDF' : 'View Document'}
                                  </button>
                                  <p className="text-xs text-[#999999]">
                                    {isImage ? 'Click image or button to view' : 'Click to open in new tab'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-spin mx-auto h-8 w-8 border-4 border-[#4DAF7C] border-t-transparent rounded-full"></div>
                      <p className="mt-2 text-sm text-[#666666]">Loading documents...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between p-6 border-t border-[#D5E8D4] bg-[#F8F9FA]">
            <div className="flex space-x-3">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 border border-[#D5E8D4] text-[#666666] rounded-lg hover:bg-[#D5E8D4] transition-colors duration-200"
              >
                Close
              </button>
              <button
                onClick={handleApprovePharmacy}
                disabled={modalLoading}
                className="px-6 py-2 bg-[#4DAF7C] text-white rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {modalLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Approve Pharmacy</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-sm text-[#666666]">
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

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#D5E8D4]">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#2C7A5D]">Pharmacy Approved!</h2>
                <p className="text-sm text-[#666666]">Welcome email sent successfully</p>
              </div>
            </div>
            <button
              onClick={handleCloseSuccessModal}
              className="p-2 hover:bg-[#D5E8D4] rounded-lg transition-colors duration-200"
            >
              <svg className="h-6 w-6 text-[#666666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-[#2C7A5D] mb-2">
                  ✅ {successData.pharmacyName} Approved!
                </h3>
                <p className="text-sm text-[#666666] mb-4">
                  The pharmacy has been successfully approved and is now active.
                </p>
              </div>

              <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C7A5D]">Welcome Email Sent</p>
                    <p className="text-xs text-[#666666]">{successData.businessEmail}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C7A5D]">Login Token Generated</p>
                    <p className="text-xs text-[#666666]">
                      Expires: {new Date(successData.tokenExpiresAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C7A5D]">Email Status</p>
                    <p className="text-xs text-[#666666] capitalize">{successData.emailStatus}</p>
                  </div>
                </div>
              </div>

              {successData.emailStatus === 'sent' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <svg className="h-5 w-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-800">Email Sent Successfully</p>
                      <p className="text-xs text-green-700">
                        The welcome email has been sent to the pharmacy's business email address via Gmail SMTP.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <svg className="h-5 w-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-red-800">Email Sending Failed</p>
                      <p className="text-xs text-red-700">
                        The welcome email could not be sent. Please check the email configuration or try again later.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end p-6 border-t border-[#D5E8D4] bg-[#F8F9FA]">
            <button
              onClick={handleCloseSuccessModal}
              className="px-6 py-2 bg-[#4DAF7C] text-white rounded-lg hover:bg-[#6BBF9A] transition-colors duration-200"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#D5E8D4] p-6">
      {/* Top Header */}
      <div className="w-full mb-6">
        <div className="bg-white rounded-2xl border border-[#D5E8D4] p-6 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/assets/logosvgdark.svg" 
                alt="PharmaGo Logo" 
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-[#2C7A5D]">Admin Portal</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#4DAF7C] to-[#6BBF9A] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                SA
              </div>
              <span className="text-sm font-medium text-[#666666]">Super Admin</span>
              <button
                onClick={handleLogout}
                className="text-[#999999] hover:text-[#4DAF7C] transition-colors duration-200"
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
        <div className="w-80 bg-white rounded-2xl border border-[#D5E8D4] p-6 flex flex-col">
          {/* Main Menu Header */}
          <h1 className="text-lg font-bold text-[#2C7A5D] mb-6">Main Menu</h1>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                  activeNav === item.id
                    ? 'bg-[#D5E8D4] text-[#2C7A5D] border border-[#6BBF9A] shadow-md'
                    : 'text-[#666666] hover:bg-[#D5E8D4] hover:text-[#4DAF7C]'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Hero Section */}
        <div className="flex-1 bg-white rounded-2xl border border-[#D5E8D4] p-8 overflow-y-auto">
          {activeNav === 'Dashboard' && renderDashboard()}
          {activeNav === 'Manage Pharmacies' && renderManagePharmacies()}
          {activeNav === 'Manage Riders' && renderManageRiders()}
          {activeNav !== 'Dashboard' && activeNav !== 'Manage Pharmacies' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#2C7A5D] mb-2">{activeNav}</h2>
                <p className="text-[#666666]">This section will be implemented in future updates.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Pharmacy Details Modal */}
      {renderPharmacyDetailsModal()}
      {/* Rider Details Modal */}
      {renderRiderDetailsModal()}
      
      {/* Success Modal */}
      {renderSuccessModal()}
      {/* Rider Success Modal */}
      {renderRiderSuccessModal()}
    </div>
  );
};

export default AdminDashboard;
