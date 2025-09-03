import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistration } from '../contexts/RegistrationContext';

const PharmacyRegistration2 = () => {
  const navigate = useNavigate();
  const { 
    userAccount, 
    businessInfo,
    locationInfo,
    updateUserAccount, 
    updateBusinessInfo,
    updateLocationInfo,
    logRegistrationData, 
    getAllRegistrationData 
  } = useRegistration();

  // Form state - pre-populate with data from previous steps
  const [formData, setFormData] = useState({
    pharmacyName: userAccount.pharmacy_name || '',
    barangay: locationInfo.barangay || '',
    coordinates: locationInfo.latitude && locationInfo.longitude ? 
      `${locationInfo.latitude}, ${locationInfo.longitude}` : '',
    address: locationInfo.street_address || ''
  });

  // Google Maps state
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const mapRef = useRef(null);

  // Update form data when context data changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      pharmacyName: userAccount.pharmacy_name || prev.pharmacyName,
      barangay: locationInfo.barangay || prev.barangay,
      coordinates: locationInfo.latitude && locationInfo.longitude ? 
        `${locationInfo.latitude}, ${locationInfo.longitude}` : prev.coordinates,
      address: locationInfo.street_address || prev.address
    }));
  }, [userAccount, locationInfo]);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = () => {
      // Default coordinates for Iligan City
      const defaultLat = 8.2282;
      const defaultLng = 124.2452;
      
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 15,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      const markerInstance = new window.google.maps.Marker({
        position: { lat: defaultLat, lng: defaultLng },
        map: mapInstance,
        draggable: true,
        title: 'Drag to set pharmacy location'
      });

      // Handle marker drag events
      markerInstance.addListener('dragend', () => {
        const position = markerInstance.getPosition();
        const lat = position.lat();
        const lng = position.lng();
        
        // Update coordinates
        setFormData(prev => ({
          ...prev,
          coordinates: `${lat}, ${lng}`
        }));

        // Reverse geocode to get address
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setFormData(prev => ({
              ...prev,
              address: results[0].formatted_address
            }));
          }
        });
      });

      // Handle map click events
      mapInstance.addListener('click', (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        // Move marker to clicked location
        markerInstance.setPosition({ lat, lng });
        
        // Update coordinates
        setFormData(prev => ({
          ...prev,
          coordinates: `${lat}, ${lng}`
        }));

        // Reverse geocode to get address
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setFormData(prev => ({
              ...prev,
              address: results[0].formatted_address
            }));
          }
        });
      });

      setMap(mapInstance);
      setMarker(markerInstance);
    };

    // Load Google Maps script if not already loaded
    if (!window.google) {
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      
      // Debug: Log the API key status
      console.log('=== GOOGLE MAPS API KEY DEBUG ===');
      console.log('API Key exists:', !!apiKey);
      console.log('API Key length:', apiKey ? apiKey.length : 0);
      console.log('API Key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
      console.log('================================');
      
      if (!apiKey) {
        console.error('Google Maps API key is missing! Please add REACT_APP_GOOGLE_MAPS_API_KEY to your .env file');
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      script.onerror = () => {
        console.error('Failed to load Google Maps script. Please check your API key.');
      };
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Parse coordinates
    const [lat, lng] = formData.coordinates.split(',').map(coord => parseFloat(coord.trim()));
    
    // Update context with form data
    updateUserAccount({
      pharmacy_name: formData.pharmacyName
    });

    updateLocationInfo({
      street_address: formData.address,
      barangay: formData.barangay,
      latitude: lat,
      longitude: lng
    });

    console.log('=== PHARMACY REGISTRATION STEP 2 SUBMITTED ===');
    console.log('Form Data:', formData);
    console.log('Coordinates:', { lat, lng });
    console.log('Updated Location Info:', {
      street_address: formData.address,
      barangay: formData.barangay,
      latitude: lat,
      longitude: lng
    });
    console.log('All Registration Data:', getAllRegistrationData());
    console.log('===============================================');
    
    logRegistrationData();
  };

  // Log the current registration data when component mounts
  useEffect(() => {
    console.log('=== PHARMACY REGISTRATION STEP 2 MOUNTED ===');
    console.log('Initial User Account Data:', userAccount);
    console.log('Initial Location Info Data:', locationInfo);
    console.log('Current Form Data:', formData);
    console.log('All Registration Data:', getAllRegistrationData());
    console.log('=============================================');
    logRegistrationData();
  }, [logRegistrationData, userAccount, locationInfo, formData]);

  return (
    <div className="h-screen overflow-hidden font-roboto">
      {/* Header - Simplified version with only logo */}
      <nav className="bg-white shadow-lg border-b border-[#D5E8D4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <img 
                    src="/assets/logosvgdark.svg" 
                    alt="PharmaGo Logo" 
                    className="h-10 w-auto"
                  />
                </div>
              </div>
            </div>
            {/* Empty div to maintain spacing - no buttons on right */}
            <div></div>
          </div>
        </div>
      </nav>

      {/* Main Container - Grid Layout */}
      <div className="grid grid-cols-2 h-[calc(100vh-88px)]">
        {/* Left Image Container */}
        <div className="relative overflow-hidden">
          <div className="w-full h-full">
            <img 
              src="/images/pharmalocation.png" 
              alt="Pharmacy Location" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right Form Container */}
        <div className="flex flex-col justify-start items-center h-full text-center relative overflow-y-auto pb-16">
          <div className="flex justify-center relative top-6 pt-6">
            <div className="flex flex-col absolute w-[22vw] justify-start items-start text-[#2c2c2c]">
              {/* Header */}
              <h1 className="text-3xl font-bold mb-6 leading-10 flex text-left justify-left text-[#2c2c2c]">
                Where is your pharmacy located?
              </h1>
              <p className="text-base mt-[-7px] text-[#8d8c8c] text-left leading-5 font-normal">
                PharmaGo riders will use this to find your business for pickup and delivery.
              </p>

              {/* Form */}
              <div className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]">
                <form className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]" onSubmit={handleSubmit}>
                  {/* Google Map */}
                  <div className="relative my-2.5 z-10">
                    <div 
                      ref={mapRef}
                      className="w-full h-50 mb-5 border-2 border-[#D5E8D4] rounded-lg"
                      style={{ height: '200px' }}
                    ></div>
                    <p className="text-xs text-[#8d8c8c] text-center mb-2">
                      Click on the map or drag the marker to set your pharmacy location
                    </p>
                  </div>

                  {/* Pharmacy Name */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="pharmacyName"
                      name="pharmacyName"
                      value={formData.pharmacyName}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                      placeholder="Your Pharmacy Name"
                      required
                      readOnly
                    />
                    <label
                      htmlFor="pharmacyName"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                    >
                      Your Pharmacy Name *
                    </label>
                  </div>

                  {/* Barangay */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="barangay"
                      name="barangay"
                      value={formData.barangay}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                      placeholder="Barangay"
                      required
                    />
                    <label
                      htmlFor="barangay"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                    >
                      Barangay *
                    </label>
                  </div>

                  {/* Coordinates/Address */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="coordinates"
                      name="coordinates"
                      value={formData.coordinates}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                      placeholder="Coordinates"
                      required
                      readOnly
                    />
                    <label
                      htmlFor="coordinates"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                    >
                      Coordinates *
                    </label>
                  </div>

                  {/* Address Display */}
                  <div className="relative my-2.5 z-10">
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200 resize-none"
                      placeholder="Full Address"
                      rows="3"
                      readOnly
                    />
                    <label
                      htmlFor="address"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                    >
                      Full Address
                    </label>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-row justify-between items-center fixed right-0 bottom-20 w-[50vw] h-1.5 bg-[#c2bdbd] z-30">
        <div className="w-[40%] h-1.5 bg-[#004445]"></div>
      </div>

      {/* Footer */}
      <div className="flex flex-row justify-between items-center w-[48vw] fixed right-2.5 bottom-0 p-5 z-10 gap-2.5">
        <button 
          type="button"
          onClick={() => navigate('/pharmacy-registration')}
          className="text-base bg-white text-[#2c786c] border-none py-1.5 px-5 font-bold rounded hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <p className="text-gray-500">4 step(s) to complete</p>
        <button 
          type="submit"
          onClick={handleSubmit}
          className="text-base bg-[#2c786c] text-white border-none py-1.5 px-5 font-bold rounded hover:bg-[#004445] transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PharmacyRegistration2;
