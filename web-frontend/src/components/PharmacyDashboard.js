import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PharmacyDashboard = () => {
  const navigate = useNavigate();
  const [pharmacyInfo, setPharmacyInfo] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for orders
  const [orders, setOrders] = useState({
    pending: [
      {
        id: 1,
        orderNumber: 'ORD20240115001',
        customerName: 'John Doe',
        customerAddress: 'Barangay 1, Quezon City',
        riderName: 'Mike Johnson',
        riderPhone: '+63 912 345 6789',
        totalAmount: 1250.00,
        createdAt: '2024-01-15T10:30:00Z',
        items: [
          { product: 'Paracetamol 500mg', quantity: 2 },
          { product: 'Vitamin C 1000mg', quantity: 1 },
          { product: 'Cough Syrup', quantity: 1 }
        ]
      },
      {
        id: 2,
        orderNumber: 'ORD20240115002',
        customerName: 'Jane Smith',
        customerAddress: 'Barangay 2, Makati City',
        riderName: 'Not Assigned',
        riderPhone: 'N/A',
        totalAmount: 890.50,
        createdAt: '2024-01-15T11:15:00Z',
        items: [
          { product: 'Amoxicillin 250mg', quantity: 1 },
          { product: 'Ibuprofen 400mg', quantity: 2 }
        ]
      }
    ],
    preparing: [
      {
        id: 3,
        orderNumber: 'ORD20240115003',
        customerName: 'Robert Wilson',
        customerAddress: 'Barangay 3, Manila',
        riderName: 'Sarah Davis',
        riderPhone: '+63 917 123 4567',
        totalAmount: 2100.75,
        createdAt: '2024-01-15T09:45:00Z',
        items: [
          { product: 'Insulin Pen', quantity: 1 },
          { product: 'Blood Glucose Test Strips', quantity: 2 },
          { product: 'Diabetic Socks', quantity: 1 }
        ]
      }
    ],
    ready: [
      {
        id: 4,
        orderNumber: 'ORD20240115004',
        customerName: 'Maria Garcia',
        customerAddress: 'Barangay 4, Taguig',
        riderName: 'David Brown',
        riderPhone: '+63 918 987 6543',
        totalAmount: 750.25,
        createdAt: '2024-01-15T08:20:00Z',
        items: [
          { product: 'Antihistamine Tablets', quantity: 1 },
          { product: 'Nasal Spray', quantity: 1 }
        ]
      }
    ]
  });

  // Mock pharmacy statistics
  const [stats, setStats] = useState({
    totalOrders: 156,
    totalProducts: 89,
    pendingOrders: orders.pending.length,
    preparingOrders: orders.preparing.length,
    readyOrders: orders.ready.length
  });

  useEffect(() => {
    // Load pharmacy and user info from localStorage
    const storedPharmacyInfo = localStorage.getItem('pharmacy_info');
    const storedUserInfo = localStorage.getItem('pharmacy_user');

    if (storedPharmacyInfo) {
      setPharmacyInfo(JSON.parse(storedPharmacyInfo));
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

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
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
            className="w-12 h-12 rounded-full mr-3" 
            src={pharmacyInfo?.profile_picture || "/images/pharmacie.png"} 
            alt="Pharmacy Profile"
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
            placeholder="Enter order number or order ID to search" 
            className="flex-1 pl-10 lg:pl-12 pr-4 bg-white rounded-full border-none text-sm lg:text-base font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

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
              <div className="flex items-center p-3 bg-purple-600 rounded-2xl flex-1 lg:flex-none">
                <img className="w-8 h-8 lg:w-10 lg:h-10 mr-2 lg:mr-3 rounded-full" src="/images/orders.svg" alt="Orders" />
                <div className="text-white text-xs lg:text-sm">
                  <h3 className="font-medium">All Orders</h3>
                  <p className="text-gray-300">{stats.totalOrders} Orders</p>
                </div>
              </div>
              <div className="flex items-center p-3 flex-1 lg:flex-none">
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
                onClick={() => setShowAddProductModal(true)}
                className="p-3 lg:p-5 flex justify-center items-center w-full bg-black text-white rounded-2xl border-none text-base lg:text-xl cursor-pointer"
              >
                <span className="mr-2 lg:mr-3">+</span> Add Product
              </button>
            </div>
          </div>
        </aside>

        {/* Main Container */}
        <div className="bg-gray-200 w-full rounded-2xl p-3 font-quicksand overflow-auto">
          {/* Add Product Modal */}
          {showAddProductModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-4xl h-[600px] relative shadow-2xl overflow-hidden flex">
                {/* Close Button */}
                <span 
                  className="absolute top-4 right-6 text-3xl cursor-pointer text-gray-600 hover:text-gray-800 z-10 bg-white bg-opacity-80 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-100 transition-all duration-200"
                  onClick={() => setShowAddProductModal(false)}
                >
                  ×
                </span>
                
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
                        // TODO: Implement Quick Add functionality
                        console.log('Quick Add clicked');
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
                        // TODO: Implement Custom Add functionality
                        console.log('Custom Add clicked');
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
              </div>
            </div>
          )}

          {/* Order Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-5 rounded-lg w-96 relative">
                <span 
                  className="absolute top-2 right-4 text-2xl cursor-pointer"
                  onClick={handleCloseModal}
                >
                  ×
                </span>
                <div className="mb-4">
                  <p className="mb-4">Orders for Order No. <span className="font-bold">{selectedOrder.orderNumber}</span></p>
                  {selectedOrder.items.map((item, index) => (
                    <p key={index} className="mb-1">{item.product} x {item.quantity}</p>
                  ))}
                </div>
                <div className="flex justify-center">
                  {orders.pending.includes(selectedOrder) && (
                    <button 
                      onClick={() => handlePrepareOrder(selectedOrder.id)}
                      className="w-full bg-green-500 text-white p-3 rounded-2xl text-lg cursor-pointer"
                    >
                      Prepare Order
                    </button>
                  )}
                  {orders.preparing.includes(selectedOrder) && (
                    <button 
                      onClick={() => handleReadyOrder(selectedOrder.id)}
                      className="w-full bg-orange-500 text-white p-3 rounded-2xl text-lg cursor-pointer"
                    >
                      Ready
                    </button>
                  )}
                  </div>
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
              {orders.pending.map(order => (
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
                    <h3 className="text-sm lg:text-lg font-medium">₱{order.totalAmount.toFixed(2)}</h3>
                    <p className="text-gray-600 text-xs lg:text-sm">Paid</p>
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
              ))}
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
                    <h3 className="text-sm lg:text-lg font-medium">₱{order.totalAmount.toFixed(2)}</h3>
                    <p className="text-gray-600 text-xs lg:text-sm">Paid</p>
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
                    <h3 className="text-sm lg:text-lg font-medium">₱{order.totalAmount.toFixed(2)}</h3>
                    <p className="text-gray-600 text-xs lg:text-sm">Paid</p>
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
        </div>
      </main>
    </div>
  );
};

export default PharmacyDashboard;
