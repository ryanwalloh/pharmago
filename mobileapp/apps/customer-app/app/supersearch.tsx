import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Animated,
  ActivityIndicator,
  Text,
  ScrollView,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region, Marker } from 'react-native-maps';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Location from 'expo-location';
import { apiService } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';

// Removed Dimensions.get() at module level to prevent import-time crashes

// Back Arrow Icon
const BackArrowIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M20,11H7.83l5.59-5.59L12,4l-8,8l8,8l1.41-1.41L7.83,13H20V11z"
      fill={color}
    />
  </Svg>
);

// Search Icon
const SearchIcon = ({ size = 20, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M23.854,23.146l-6.449-6.449c1.607-1.775,2.596-4.12,2.596-6.697C20,4.486,15.514,0,10,0S0,4.486,0,10s4.486,10,10,10c2.577,0,4.922-.988,6.697-2.596l6.449,6.449c.098,.098,.226,.146,.354,.146s.256-.049,.354-.146c.195-.195,.195-.512,0-.707ZM1,10C1,5.038,5.038,1,10,1s9,4.038,9,9-4.037,9-9,9S1,14.962,1,10Z"
      fill={color}
    />
  </Svg>
);

// Close/X Icon
const CloseIcon = ({ size = 14, color = '#666666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
      fill={color}
    />
  </Svg>
);

// Medicine Chip Component
const MedicineChip = ({ 
  medicine, 
  onRemove 
}: { 
  medicine: SelectedMedicine; 
  onRemove: () => void;
}) => {
  const truncateName = (name: string, maxLength: number = 12) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  return (
    <View style={chipStyles.container}>
      <Text style={chipStyles.text} numberOfLines={1}>
        {truncateName(medicine.fullName)}
      </Text>
      <TouchableOpacity 
        style={chipStyles.closeButton}
        onPress={onRemove}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <CloseIcon size={12} color="#666666" />
      </TouchableOpacity>
    </View>
  );
};

const chipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    marginRight: 8,
    maxWidth: 140,
    borderWidth: 1,
    borderColor: '#00bf63',
  },
  text: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
    marginRight: 6,
    flex: 1,
  },
  closeButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

interface Pharmacy {
  id: number;
  pharmacy_name: string;
  street_address: string;
  barangay: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  storefront_image_url?: string | null;
}

interface SearchResult {
  id: number;
  name: string;
  type: 'medicine' | 'pharmacy';
  dosage?: string;
  form?: string;
  category?: string;
  pharmacy_count?: number;
  price_range?: { min: number; max: number };
  pharmacy_name?: string;
  address?: string;
  barangay?: string;
  city?: string;
  province?: string;
  latitude?: number | null;
  longitude?: number | null;
  storefront_image_url?: string | null;
}

interface SelectedMedicine {
  id: string; // Unique identifier: name+dosage+form
  name: string;
  dosage: string;
  form: string;
  fullName: string; // Full display name
  inventory_id?: number; // Optional: for tracking specific inventory items
}

export default function SuperSearch() {
  const params = useLocalSearchParams();
  const categoryParam = params.category as string | undefined;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchBounceAnim = useRef(new Animated.Value(0)).current;
  const markersBounceAnim = useRef(new Animated.Value(0)).current;
  const backButtonBounceAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 14.5995,  // Manila coordinates as default
    longitude: 120.9842,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [locationLoading, setLocationLoading] = useState(true);
  const [pharmaciesLoading, setPharmaciesLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMedicines, setSelectedMedicines] = useState<SelectedMedicine[]>([]);
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [pharmacyList, setPharmacyList] = useState<any[]>([]);
  const [pharmacyListLoading, setPharmacyListLoading] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any | null>(null);
  const [showPharmacyShopModal, setShowPharmacyShopModal] = useState(false);
  const [pharmacyDistances, setPharmacyDistances] = useState<{[key: number]: any}>({});
  const [sortBy, setSortBy] = useState<'open' | 'near' | 'price'>('open');
  
  const searchDebounceTimer = useRef<number | null>(null);
  const categorySearchTriggered = useRef(false);
  
  // Overall loading state - true when either location or pharmacies are loading
  const isLoading = locationLoading || pharmaciesLoading;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Get user's current location
    getCurrentLocation();
    
    // Fetch pharmacies
    fetchPharmacies();
    
    // Handle category parameter - pre-populate search
    if (categoryParam && !categorySearchTriggered.current) {
      console.log('🏷️ Pre-populating search with category:', categoryParam);
      setSearchQuery(categoryParam);
      categorySearchTriggered.current = true;
      // Trigger search after a short delay to ensure component is ready
      setTimeout(() => {
        performSearch(categoryParam);
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam]);

  // Trigger bounce animations when loading is complete
  useEffect(() => {
    if (!isLoading) {
      // Animate back button first
      Animated.spring(backButtonBounceAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }).start();

      // Animate search field with bounce
      Animated.spring(searchBounceAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        delay: 100,
        useNativeDriver: true,
      }).start();

      // Animate markers with a slight delay for staggered effect
      Animated.spring(markersBounceAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        delay: 200,
        useNativeDriver: true,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Dynamically update pharmacy list when medicines are added/removed
  useEffect(() => {
    // Only update if modal is open and we have medicines selected
    if (showPharmacyModal && selectedMedicines.length > 0) {
      console.log('🔄 Medicine selection changed, updating pharmacy list...');
      updatePharmacyList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMedicines]);

  const getCurrentLocation = async () => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('📍 Location permission denied, using default location');
        setLocationLoading(false);
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      setMapRegion(newRegion);
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      // Animate map to user's location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }

      console.log('📍 User location:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('💥 Error getting location:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchPharmacies = async () => {
    try {
      setPharmaciesLoading(true);
      console.log('🏥 Fetching pharmacies for map...');
      const response = await apiService.getPharmacies();
      
      if (response.success && response.data) {
        // Filter pharmacies that have valid coordinates
        const pharmaciesWithLocation = response.data.filter(
          (pharmacy: Pharmacy) => 
            pharmacy.latitude !== null && 
            pharmacy.longitude !== null
        );
        
        setPharmacies(pharmaciesWithLocation);
        console.log(`✅ Loaded ${pharmaciesWithLocation.length} pharmacies with locations`);
      } else {
        console.error('❌ Failed to fetch pharmacies:', response.error);
      }
    } catch (error) {
      console.error('💥 Error fetching pharmacies:', error);
    } finally {
      setPharmaciesLoading(false);
    }
  };

  // Search function with debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
    
    // If search is cleared, clear results
    if (text.trim().length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }
    
    // Set debounce timer (500ms after user stops typing)
    searchDebounceTimer.current = setTimeout(() => {
      performSearch(text);
    }, 500);
  };

  const performSearch = async (query: string) => {
    try {
      setSearchLoading(true);
      console.log('🔍 Performing search:', query);
      
      // Search both medicines and pharmacies
      const [medicineResponse, pharmacyResponse] = await Promise.all([
        apiService.searchMedicines(query, 10), // Increased limit to account for filtering
        apiService.searchPharmacies(query, 5),
      ]);
      
      const combinedResults: SearchResult[] = [];
      
      // Add medicine results - unwrap nested data structure and filter out selected medicines
      if (medicineResponse.success && medicineResponse.data) {
        const medicineData = (medicineResponse.data as any).data || medicineResponse.data;
        if (Array.isArray(medicineData)) {
          // Filter out already selected medicines
          const filteredMedicines = medicineData.filter(med => !isMedicineSelected(med));
          combinedResults.push(...filteredMedicines.slice(0, 5)); // Limit to 5 after filtering
        }
      }
      
      // Add pharmacy results - unwrap nested data structure
      if (pharmacyResponse.success && pharmacyResponse.data) {
        const pharmacyData = (pharmacyResponse.data as any).data || pharmacyResponse.data;
        if (Array.isArray(pharmacyData)) {
          combinedResults.push(...pharmacyData);
        }
      }
      
      setSearchResults(combinedResults);
      setShowSuggestions(combinedResults.length > 0);
      console.log(`✅ Found ${combinedResults.length} results (filtered out selected medicines)`);
    } catch (error) {
      console.error('💥 Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Utility functions for managing selected medicines
  const generateMedicineId = (name: string, dosage: string, form: string) => {
    return `${name}-${dosage}-${form}`.toLowerCase().replace(/\s+/g, '-');
  };

  const isMedicineSelected = (medicine: SearchResult) => {
    const id = generateMedicineId(
      medicine.name,
      medicine.dosage || '',
      medicine.form || ''
    );
    return selectedMedicines.some(m => m.id === id);
  };

  const addMedicine = (medicine: SearchResult) => {
    const nameParts = medicine.name.split(' ');
    const baseName = nameParts[0];
    
    const newMedicine: SelectedMedicine = {
      id: generateMedicineId(medicine.name, medicine.dosage || '', medicine.form || ''),
      name: baseName,
      dosage: medicine.dosage || '',
      form: medicine.form || '',
      fullName: medicine.name,
      inventory_id: medicine.id,
    };

    setSelectedMedicines(prev => [...prev, newMedicine]);
    console.log('💊 Medicine added:', newMedicine);
  };

  const removeMedicine = (medicineId: string) => {
    setSelectedMedicines(prev => prev.filter(m => m.id !== medicineId));
    console.log('🗑️ Medicine removed:', medicineId);
  };

  const clearAllMedicines = () => {
    setSelectedMedicines([]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSuggestions(false);
    console.log('🧹 All medicines cleared');
  };

  const handleMedicineSelect = (medicine: SearchResult) => {
    // Check if already selected
    if (isMedicineSelected(medicine)) {
      console.log('⚠️ Medicine already selected');
      return;
    }

    // Add to selected medicines array
    addMedicine(medicine);
    
    // Clear search query to allow searching for next medicine
    setSearchQuery('');
    setSearchResults([]);
    setShowSuggestions(false);
  };

  const handlePharmacySelect = async (pharmacy: SearchResult) => {
    console.log('🏥 Pharmacy selected:', pharmacy.pharmacy_name);
    setShowSuggestions(false);
    setSelectedPharmacy(pharmacy);
    setShowPharmacyShopModal(true);
    
    // Calculate distance for single pharmacy
    if (pharmacy.latitude && pharmacy.longitude && userLocation) {
      try {
        const response = await apiService.calculateDistanceAndFee(
          pharmacy.latitude,
          pharmacy.longitude,
          userLocation.latitude,
          userLocation.longitude
        );
        
        if (response.success && response.data) {
          const data = (response.data as any).data || response.data;
          setPharmacyDistances({
            [pharmacy.id]: {
              distance_km: data.distance_km,
              delivery_fee: data.delivery_fee,
              breakdown: data.breakdown
            }
          });
        }
      } catch (error) {
        console.error('Error calculating pharmacy distance:', error);
      }
    }
  };


  const calculatePharmacyDistances = async (pharmacies: any[]) => {
    if (!userLocation) {
      console.log('⚠️ User location not available for distance calculation');
      return;
    }

    const distances: {[key: number]: any} = {};
    
    // Calculate distance for each pharmacy
    for (const pharmacy of pharmacies) {
      if (pharmacy.latitude && pharmacy.longitude) {
        try {
          const response = await apiService.calculateDistanceAndFee(
            pharmacy.latitude,
            pharmacy.longitude,
            userLocation.latitude,
            userLocation.longitude
          );
          
          if (response.success && response.data) {
            const data = (response.data as any).data || response.data;
            distances[pharmacy.pharmacy_id || pharmacy.id] = {
              distance_km: data.distance_km,
              delivery_fee: data.delivery_fee,
              breakdown: data.breakdown
            };
          }
        } catch (error) {
          console.error(`Error calculating distance for pharmacy ${pharmacy.pharmacy_id}:`, error);
        }
      }
    }
    
    setPharmacyDistances(distances);
  };

  // Sort pharmacies based on selected criteria
  const getSortedPharmacies = () => {
    const sorted = [...pharmacyList];
    
    if (sortBy === 'near') {
      // Sort by distance (nearest first)
      sorted.sort((a, b) => {
        const distA = pharmacyDistances[a.pharmacy_id]?.distance_km || Infinity;
        const distB = pharmacyDistances[b.pharmacy_id]?.distance_km || Infinity;
        return distA - distB;
      });
    } else if (sortBy === 'price') {
      // Sort by price (lowest first)
      sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    }
    // 'open' keeps original order (default)
    
    return sorted;
  };

  // Update pharmacy list based on selected medicines
  const updatePharmacyList = async () => {
    if (selectedMedicines.length === 0) {
      setPharmacyList([]);
      return;
    }
    
    try {
      setPharmacyListLoading(true);
      
      console.log(`🏥 Fetching pharmacies for ${selectedMedicines.length} medicine(s)...`);
      
      // Fetch pharmacies for each medicine
      const pharmacyPromises = selectedMedicines.map(medicine => 
        apiService.getPharmaciesByMedicine(
          medicine.name,
          medicine.dosage,
          medicine.form.toLowerCase()
        )
      );
      
      const responses = await Promise.all(pharmacyPromises);
      
      // Extract pharmacy arrays from responses
      const pharmacyArrays = responses.map((response, index) => {
        if (response.success && response.data) {
          const pharmacyData = (response.data as any).data || response.data;
          const pharmacyArray = Array.isArray(pharmacyData) ? pharmacyData : [];
          console.log(`✅ Medicine ${index + 1} (${selectedMedicines[index].name}): ${pharmacyArray.length} pharmacies`);
          return pharmacyArray;
        }
        console.warn(`⚠️ No pharmacies found for medicine ${index + 1}`);
        return [];
      });
      
      // Find pharmacies that have ALL selected medicines (intersection)
      let commonPharmacies: any[] = [];
      
      if (pharmacyArrays.length === 1) {
        // Only one medicine selected
        commonPharmacies = pharmacyArrays[0];
        console.log(`✅ Single medicine: ${commonPharmacies.length} pharmacies found`);
      } else if (pharmacyArrays.length > 1) {
        // Multiple medicines - find intersection
        // Use pharmacy_id (not id) for comparison
        commonPharmacies = pharmacyArrays[0].filter(pharmacy1 => 
          pharmacyArrays.every(pharmacyArray => 
            pharmacyArray.some(pharmacy2 => 
              pharmacy2.pharmacy_id === pharmacy1.pharmacy_id
            )
          )
        );
        
        console.log('🔍 Intersection Details:');
        console.log(`  - Medicine 1 pharmacies: ${pharmacyArrays[0].map(p => p.pharmacy_name).join(', ')}`);
        console.log(`  - Medicine 2 pharmacies: ${pharmacyArrays[1]?.map(p => p.pharmacy_name).join(', ')}`);
        if (pharmacyArrays[2]) {
          console.log(`  - Medicine 3 pharmacies: ${pharmacyArrays[2].map(p => p.pharmacy_name).join(', ')}`);
        }
        console.log(`  - Common pharmacies (ALL medicines): ${commonPharmacies.map(p => p.pharmacy_name).join(', ')}`);
      }
      
      console.log(`✅ Found ${commonPharmacies.length} pharmacies with ALL ${selectedMedicines.length} medicines`);
      setPharmacyList(commonPharmacies);
      
      // Calculate distances for all pharmacies
      if (commonPharmacies.length > 0) {
        calculatePharmacyDistances(commonPharmacies);
      }
      
    } catch (error) {
      console.error('💥 Error fetching pharmacies:', error);
      setPharmacyList([]);
    } finally {
      setPharmacyListLoading(false);
    }
  };

  const handleAddMedication = async () => {
    if (selectedMedicines.length === 0) return;
    
    // Open modal and fetch pharmacy list
    setShowPharmacyModal(true);
    await updatePharmacyList();
  };

  // Custom map style (minimal, hiding labels and POIs)
  const mapStyle = [
    {
      "elementType": "labels",
      "stylers": [
        { "visibility": "off" }
      ]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry",
      "stylers": [
        { "visibility": "off" }
      ]
    },
    {
      "featureType": "administrative.land_parcel",
      "stylers": [
        { "visibility": "off" }
      ]
    },
    {
      "featureType": "administrative.neighborhood",
      "stylers": [
        { "visibility": "off" }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "labels",
      "stylers": [
        { "visibility": "off" }
      ]
    },
    {
      "featureType": "road",
      "elementType": "labels.icon",
      "stylers": [
        { "visibility": "off" }
      ]
    },
    {
      "featureType": "transit",
      "stylers": [
        { "visibility": "off" }
      ]
    },
  
    /* --- ROADS --- */
    {
      "featureType": "road",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#ffffff" } // white roads
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry.stroke",
      "stylers": [
        { "color": "#e0e0e0" } // subtle gray border
      ]
    },
  
    /* --- BUSINESS ESTABLISHMENTS (esp. PHARMACIES) --- */
    {
      "featureType": "poi.business",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#d8f3dc" } // soft green for businesses
      ]
    },
    {
      "featureType": "poi.business",
      "elementType": "geometry.stroke",
      "stylers": [
        { "color": "#b7e4c7" } // slightly darker edge
      ]
    },
  
    /* --- GENERAL BUILDINGS --- */
    {
      "featureType": "landscape.man_made",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#e6e6e6" } // light gray structures
      ]
    },
  
    /* --- LAND AREAS --- */
    {
      "featureType": "landscape.natural",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#e9f5e9" } // soft green land
      ]
    },
  
    /* --- WATER --- */
    {
      "featureType": "water",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#d6eaf8" } // gentle blue
      ]
    },
  
    /* --- BACKGROUND --- */
    {
      "featureType": "landscape",
      "elementType": "geometry.fill",
      "stylers": [
        { "color": "#f8f8f8" } // neutral light background
      ]
    }
  ];
  
  
  
  

  // Show loading skeleton while data is being fetched
  if (isLoading) {
    return (
      <LinearGradient
        colors={['#FFFFFF', '#FFD4EF4A', '#D4FFE24A']}
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* Skeleton Content */}
        <SafeAreaView style={styles.skeletonContainer}>
          {/* Back Button Skeleton */}
          <View style={styles.skeletonBackButton} />
          
          {/* Search Field Skeleton */}
          <View style={styles.skeletonSearchContainer}>
            <View style={styles.skeletonSearchField} />
          </View>
          
          {/* Loading Indicator */}
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#2CED9A" />
            <Animated.Text style={[styles.loadingText, { opacity: fadeAnim }]}>
             Super search is starting...
            </Animated.Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Full-screen Google Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={mapStyle}
        initialRegion={mapRegion}
        region={mapRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* User Location Marker - Blue Circle */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="You are here"
            description="Your current location"
            onPress={() => {
              console.log('User location marker pressed');
            }}
          >
            <Animated.View
              style={{
                opacity: markersBounceAnim,
              }}
            >
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner} />
              </View>
            </Animated.View>
          </Marker>
        )}

        {/* Pharmacy Markers - Green Circles with Bounce Animation */}
        {pharmacies.map((pharmacy) => 
          pharmacy.latitude && pharmacy.longitude && (
            <Marker
              key={pharmacy.id}
              coordinate={{
                latitude: pharmacy.latitude,
                longitude: pharmacy.longitude,
              }}
              title={pharmacy.pharmacy_name}
              description={`${pharmacy.street_address}, ${pharmacy.barangay}`}
              onPress={() => {
                console.log('Pharmacy selected:', pharmacy.pharmacy_name);
                // You can add navigation or modal opening here
              }}
            >
              <Animated.View
                style={{
                  opacity: markersBounceAnim,
                }}
              >
                <View style={styles.customMarker}>
                  <View style={styles.customMarkerInner} />
                </View>
              </Animated.View>
            </Marker>
          )
        )}
      </MapView>

      {/* Overlay Controls with Fade Animation */}
      <Animated.View style={[styles.overlayContainer, { opacity: fadeAnim }]}>
        {/* Back Button - Top Left with Bounce */}
        <SafeAreaView edges={['top']} style={styles.topSafeArea}>
          <Animated.View
            style={{
              transform: [
                {
                  scale: backButtonBounceAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1.2, 1],
                  }),
                },
              ],
              opacity: backButtonBounceAnim,
            }}
          >
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <BackArrowIcon size={24} color="#000000" />
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>

        {/* Search Field - Center with Bounce Animation */}
        <Animated.View 
          style={[
            styles.searchContainer,
            {
              transform: [
                {
                  scale: searchBounceAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1.1, 1],
                  }),
                },
                {
                  translateY: searchBounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, -25],
                  }),
                },
              ],
              opacity: searchBounceAnim,
            },
          ]}
        >
          {!showPharmacyModal && (
          <View style={styles.searchFieldContainer}>
            <View style={styles.searchField}>
              {/* Medicine Chips - Horizontal ScrollView */}
              {selectedMedicines.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipsScrollView}
                  contentContainerStyle={styles.chipsContainer}
                >
                  {selectedMedicines.map((medicine) => (
                    <MedicineChip
                      key={medicine.id}
                      medicine={medicine}
                      onRemove={() => removeMedicine(medicine.id)}
                    />
                  ))}
                </ScrollView>
              )}
              
              {/* Search Input Row */}
              <View style={styles.searchInputRow}>
                <SearchIcon size={20} color="#999999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={
                    selectedMedicines.length > 0 
                      ? "Add more medicines..." 
                      : "Search for medicines, pharmacies..."
                  }
                  placeholderTextColor="#999999"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                />
                {searchLoading && (
                  <ActivityIndicator size="small" color="#00bf63" style={styles.searchSpinner} />
                )}
                {selectedMedicines.length > 0 && (
                  <TouchableOpacity onPress={clearAllMedicines} style={styles.clearButton}>
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchResults.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <ScrollView 
                  style={styles.suggestionsList}
                  keyboardShouldPersistTaps="handled"
                >
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={`${result.type}-${result.id}`}
                      style={styles.suggestionItem}
                      onPress={() => {
                        if (result.type === 'medicine') {
                          handleMedicineSelect(result);
                        } else {
                          handlePharmacySelect(result);
                        }
                      }}
                    >
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionName}>{result.name || result.pharmacy_name}</Text>
                        {result.type === 'medicine' && (
                          <Text style={styles.suggestionSubtext}>
                            {result.category} • {result.pharmacy_count} {result.pharmacy_count === 1 ? 'pharmacy' : 'pharmacies'}
                          </Text>
                        )}
                        {result.type === 'pharmacy' && (
                          <Text style={styles.suggestionSubtext}>
                            {result.barangay}, {result.city}
                          </Text>
                        )}
                      </View>
                      <View style={[
                        styles.suggestionLabel,
                        result.type === 'medicine' ? styles.medicineLabel : styles.pharmacyLabel
                      ]}>
                        <Text style={styles.suggestionLabelText}>
                          {result.type === 'medicine' ? 'Medicine' : 'Pharmacy'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ADD MEDICATION Button */}
            {selectedMedicines.length > 0 && !showSuggestions && (
              <View style={styles.addMedicationContainer}>
                <TouchableOpacity
                  style={styles.addMedicationButton}
                  onPress={handleAddMedication}
                >
                  <Text style={styles.addMedicationText}>
                    {selectedMedicines.length === 1 
                      ? 'ADD 1 MEDICATION' 
                      : `ADD ${selectedMedicines.length} MEDICATIONS`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          )}
        </Animated.View>
      </Animated.View>

      {/* Pharmacy List Modal (Bottom) */}
      <Modal
        visible={showPharmacyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPharmacyModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPharmacyModal(false)}
          />
          
          {/* Top Filter Modal - Medicine Chips & Sort Options */}
          <View style={styles.topFilterModal}>
            <SafeAreaView style={styles.topFilterSafeArea}>
              <View style={styles.topFilterContent}>
                {/* Search Field with Chips */}
                <View style={styles.topSearchFieldContainer}>
                  <View style={styles.topSearchField}>
                    {/* Medicine Chips - Horizontal ScrollView */}
                    {selectedMedicines.length > 0 && (
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.topChipsScrollView}
                        contentContainerStyle={styles.topChipsContainer}
                      >
                        {selectedMedicines.map((medicine) => (
                          <MedicineChip
                            key={medicine.id}
                            medicine={medicine}
                            onRemove={() => removeMedicine(medicine.id)}
                          />
                        ))}
                      </ScrollView>
                    )}
                    
                    {/* Search Input Row */}
                    <View style={styles.topSearchInputRow}>
                      <SearchIcon size={18} color="#999999" />
                      <TextInput
                        style={styles.topSearchInput}
                        placeholder={
                          selectedMedicines.length > 0 
                            ? "Add more medicines..." 
                            : "Search for medicines..."
                        }
                        placeholderTextColor="#999999"
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                        onFocus={() => {
                          if (searchResults.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                      />
                      {searchLoading && (
                        <ActivityIndicator size="small" color="#00bf63" style={styles.topSearchSpinner} />
                      )}
                    </View>
                  </View>

                  {/* Search Suggestions Dropdown */}
                  {showSuggestions && searchResults.length > 0 && (
                    <View style={styles.topSuggestionsContainer}>
                      <ScrollView 
                        style={styles.topSuggestionsList}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                      >
                        {searchResults.map((result, index) => (
                          <TouchableOpacity
                            key={`${result.type}-${result.id}`}
                            style={styles.topSuggestionItem}
                            onPress={() => {
                              if (result.type === 'medicine') {
                                handleMedicineSelect(result);
                              } else {
                                handlePharmacySelect(result);
                              }
                            }}
                          >
                            <View style={styles.topSuggestionContent}>
                              <Text style={styles.topSuggestionName}>{result.name || result.pharmacy_name}</Text>
                              {result.type === 'medicine' && (
                                <Text style={styles.topSuggestionSubtext}>
                                  {result.category} • {result.pharmacy_count} {result.pharmacy_count === 1 ? 'pharmacy' : 'pharmacies'}
                                </Text>
                              )}
                            </View>
                            <View style={[
                              styles.topSuggestionLabel,
                              result.type === 'medicine' ? styles.topMedicineLabel : styles.topPharmacyLabel
                            ]}>
                              <Text style={styles.topSuggestionLabelText}>
                                {result.type === 'medicine' ? 'Medicine' : 'Pharmacy'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Sort Buttons */}
                <View style={styles.sortButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.sortButton, sortBy === 'open' && styles.sortButtonActive]}
                    onPress={() => setSortBy('open')}
                  >
                    <Image 
                      source={require('../assets/open.png')} 
                      style={[
                        styles.sortButtonIcon,
                        { tintColor: sortBy === 'open' ? '#FFFFFF' : '#C5C5C5' }
                      ]}
                      resizeMode="contain"
                    />
                    <Text style={[styles.sortButtonText, sortBy === 'open' && styles.sortButtonTextActive]}>
                      Open
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sortButton, sortBy === 'near' && styles.sortButtonActive]}
                    onPress={() => setSortBy('near')}
                  >
                    <Image 
                      source={require('../assets/near.png')} 
                      style={[
                        styles.sortButtonIcon,
                        { tintColor: sortBy === 'near' ? '#FFFFFF' : '#666666' }
                      ]}
                      resizeMode="contain"
                    />
                    <Text style={[styles.sortButtonText, sortBy === 'near' && styles.sortButtonTextActive]}>
                      Near
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sortButton, sortBy === 'price' && styles.sortButtonActive]}
                    onPress={() => setSortBy('price')}
                  >
                    <Image 
                      source={require('../assets/price.png')} 
                      style={[
                        styles.sortButtonIcon,
                        { tintColor: sortBy === 'price' ? '#FFFFFF' : '#666666' }
                      ]}
                      resizeMode="contain"
                    />
                    <Text style={[styles.sortButtonText, sortBy === 'price' && styles.sortButtonTextActive]}>
                      Price
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </View>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>
                  Available at {pharmacyList.length} {pharmacyList.length === 1 ? 'Pharmacy' : 'Pharmacies'}
                </Text>
              </View>

              {/* Pharmacy List */}
              <ScrollView style={styles.pharmacyListScroll}>
                {pharmacyListLoading ? (
                  <View style={styles.pharmacyLoadingContainer}>
                    <ActivityIndicator size="large" color="#00bf63" />
                    <Text style={styles.pharmacyLoadingText}>Loading pharmacies...</Text>
                  </View>
                ) : pharmacyList.length === 0 ? (
                  <View style={styles.noPharmaciesContainer}>
                    <Text style={styles.noPharmaciesText}>
                      No pharmacies found with this medicine in stock
                    </Text>
                  </View>
                ) : (
                  getSortedPharmacies().map((pharmacy) => {
                    const distanceData = pharmacyDistances[pharmacy.pharmacy_id];
                    
                    return (
                      <View key={pharmacy.pharmacy_id} style={styles.pharmacyCard}>
                        <View style={styles.pharmacyCardContent}>
                          {/* Pharmacy Image */}
                          <View style={styles.pharmacyImageContainer}>
                            <Image
                              source={
                                pharmacy.storefront_image_url 
                                  ? { uri: pharmacy.storefront_image_url }
                                  : require('../assets/pharmacy.png')
                              }
                              style={styles.pharmacyImage}
                              resizeMode="cover"
                              onError={() => {
                                console.log('Failed to load storefront image for:', pharmacy.pharmacy_name);
                              }}
                            />
                          </View>

                          {/* Pharmacy Details */}
                          <View style={styles.pharmacyDetails}>
                            <Text style={styles.pharmacyName}>{pharmacy.pharmacy_name}</Text>
                            <Text style={styles.pharmacyAddress} numberOfLines={2}>
                              {pharmacy.barangay}, {pharmacy.city}, {pharmacy.province}
                            </Text>
                            {distanceData ? (
                              <>
                                <Text style={styles.pharmacyDistance}>
                                  {distanceData.distance_km?.toFixed(2)} km away
                                </Text>
                                <Text style={styles.pharmacyDeliveryFee}>
                                  Delivery: ₱{distanceData.delivery_fee?.toFixed(2)}
                                </Text>
                              </>
                            ) : (
                              <Text style={styles.pharmacyDistanceLoading}>Calculating distance...</Text>
                            )}
                            <Text style={styles.pharmacyPrice}>Medicine: ₱{pharmacy.price.toFixed(2)}</Text>
                          </View>
                        </View>

                        {/* Order Now Button */}
                        <TouchableOpacity
                          style={styles.orderNowButton}
                          onPress={() => {
                            console.log('Order from pharmacy:', pharmacy.pharmacy_name);
                            
                            // Navigate to order page with ALL selected medicines and pharmacy data
                            const orderData = {
                              pharmacy: {
                                pharmacy_id: pharmacy.pharmacy_id,
                                pharmacy_name: pharmacy.pharmacy_name,
                                barangay: pharmacy.barangay,
                                city: pharmacy.city,
                                province: pharmacy.province,
                                latitude: pharmacy.latitude,
                                longitude: pharmacy.longitude,
                                storefront_image_url: pharmacy.storefront_image_url,
                              },
                              selectedMedicines: selectedMedicines.map(med => ({
                                inventory_id: med.inventory_id || pharmacy.inventory_id,
                                name: med.name,
                                dosage: med.dosage,
                                form: med.form,
                                price: pharmacy.price, // Note: This uses first medicine's price
                                prescription_required: pharmacy.prescription_required,
                              })),
                              deliveryInfo: distanceData || null,
                            };
                            
                            router.push({
                              pathname: '/order' as any,
                              params: {
                                pharmacy: JSON.stringify(orderData.pharmacy),
                                selectedMedicines: JSON.stringify(orderData.selectedMedicines),
                                deliveryInfo: JSON.stringify(orderData.deliveryInfo),
                              }
                            });
                          }}
                        >
                          <Text style={styles.orderNowButtonText}>Order Now</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pharmacy Shop Modal (for selected pharmacy from search) */}
      <Modal
        visible={showPharmacyShopModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPharmacyShopModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPharmacyShopModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Pharmacy Details</Text>
              </View>

              {/* Pharmacy Details */}
              {selectedPharmacy && (
                <View style={styles.pharmacyShopContent}>
                  <View style={styles.pharmacyCard}>
                    <View style={styles.pharmacyCardContent}>
                      {/* Pharmacy Image */}
                      <View style={styles.pharmacyImageContainer}>
                        <Image
                          source={
                            selectedPharmacy.storefront_image_url 
                              ? { uri: selectedPharmacy.storefront_image_url }
                              : require('../assets/pharmacy.png')
                          }
                          style={styles.pharmacyImage}
                          resizeMode="cover"
                          onError={() => {
                            console.log('Failed to load storefront image for:', selectedPharmacy.pharmacy_name);
                          }}
                        />
                      </View>

                      {/* Pharmacy Details */}
                      <View style={styles.pharmacyDetails}>
                        <Text style={styles.pharmacyName}>{selectedPharmacy.pharmacy_name}</Text>
                        <Text style={styles.pharmacyAddress} numberOfLines={2}>
                          {selectedPharmacy.barangay}, {selectedPharmacy.city}, {selectedPharmacy.province}
                        </Text>
                        {pharmacyDistances[selectedPharmacy.id] ? (
                          <>
                            <Text style={styles.pharmacyDistance}>
                              {pharmacyDistances[selectedPharmacy.id].distance_km?.toFixed(2)} km away
                            </Text>
                            <Text style={styles.pharmacyDeliveryFee}>
                              Delivery: ₱{pharmacyDistances[selectedPharmacy.id].delivery_fee?.toFixed(2)}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.pharmacyDistanceLoading}>Calculating distance...</Text>
                        )}
                      </View>
                    </View>

                    {/* Shop Button */}
                    <TouchableOpacity
                      style={styles.shopButton}
                      onPress={() => {
                        console.log('Shop at pharmacy:', selectedPharmacy.pharmacy_name);
                        setShowPharmacyShopModal(false);
                        
                        // Navigate to order page for browsing pharmacy inventory
                        const pharmacyData = {
                          pharmacy_id: selectedPharmacy.id,
                          pharmacy_name: selectedPharmacy.pharmacy_name,
                          barangay: selectedPharmacy.barangay,
                          city: selectedPharmacy.city,
                          province: selectedPharmacy.province,
                          latitude: selectedPharmacy.latitude,
                          longitude: selectedPharmacy.longitude,
                          storefront_image_url: selectedPharmacy.storefront_image_url,
                        };
                        
                        router.push({
                          pathname: '/order' as any,
                          params: {
                            pharmacy: JSON.stringify(pharmacyData),
                            deliveryInfo: JSON.stringify(pharmacyDistances[selectedPharmacy.id] || null),
                          }
                        });
                      }}
                    >
                      <Text style={styles.shopButtonText}>Shop</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  topSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  backButton: {
    marginTop: 10,
    marginLeft: 20, // Fixed margin (was 5%)
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    position: 'absolute',
    top: '30%',
    left: 20, // Fixed margin (was 5%)
    right: 20,
    zIndex: 5,
  },
  searchFieldContainer: {
    width: '100%',
  },
  searchField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 16, // Fixed padding (was 4%)
    paddingVertical: 8,
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 5,
  },
  chipsScrollView: {
    maxHeight: 40,
    marginBottom: 8,
  },
  chipsContainer: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    marginLeft: 10,
    paddingVertical: 0,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    marginLeft: 8,
  },
  clearAllText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  // Suggestions Dropdown
  suggestionsContainer: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16, // Fixed padding (was 4%)
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  suggestionSubtext: {
    fontSize: 12,
    color: '#999999',
  },
  suggestionLabel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  medicineLabel: {
    backgroundColor: '#E3F2FD',
  },
  pharmacyLabel: {
    backgroundColor: '#E8F5E9',
  },
  suggestionLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00bf63',
  },
  // ADD MEDICATION Button
  addMedicationContainer: {
    marginTop: 10,
  },
  addMedicationButton: {
    backgroundColor: '#00bf63',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  addMedicationText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Skeleton Loading Styles
  skeletonContainer: {
    flex: 1,
    padding: 20, // Fixed padding (was 5%)
  },
  skeletonBackButton: {
    marginTop: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D4FFE24A',
  },
  skeletonSearchContainer: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    transform: [{ translateY: -25 }],
  },
  skeletonSearchField: {
    height: 45,
    backgroundColor: '#D4FFE24A',
    borderRadius: 25,
  },
  loadingCenter: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#00bf63',
    fontWeight: '300',
  },
  // Custom Marker Styles (Green Circles for Pharmacies)
  customMarker: {
    width: 26,
    height: 26,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 191, 99, 0.3)',
    
    borderColor: '#00bf63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: '#00bf63',
  },
  // User Location Marker Styles (Blue Circles)
  userMarker: {
    width: 26,
    height: 26,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
  
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  // Top Filter Modal Styles
  topFilterModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  topFilterSafeArea: {
    backgroundColor: '#FFFFFF',
  },
  topFilterContent: {
    paddingHorizontal: 20, // Fixed padding (was 5%)
    paddingBottom: 15,
  },
  topSearchFieldContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  topSearchField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 16, // Fixed padding (was 4%)
    paddingVertical: 8,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  topChipsScrollView: {
    maxHeight: 40,
    marginBottom: 8,
  },
  topChipsContainer: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  topSearchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  topSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
    marginLeft: 10,
    paddingVertical: 0,
  },
  topSearchSpinner: {
    marginLeft: 8,
  },
  topSuggestionsContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  topSuggestionsList: {
    paddingVertical: 8,
  },
  topSuggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16, // Fixed padding (was 4%)
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  topSuggestionContent: {
    flex: 1,
    marginRight: 10,
  },
  topSuggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  topSuggestionSubtext: {
    fontSize: 12,
    color: '#666666',
  },
  topSuggestionLabel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topMedicineLabel: {
    backgroundColor: '#E8F5E9',
  },
  topPharmacyLabel: {
    backgroundColor: '#E3F2FD',
  },
  topSuggestionLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00bf63',
  },
  sortButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sortButtonIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  sortButtonActive: {
    backgroundColor: '#00bf63',
    borderColor: '#00bf63',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#777777',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  modalContainer: {
    justifyContent: 'flex-end',
    maxHeight: '70%',
    zIndex: 2,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 40,
    minHeight: 300,
  },
  modalHeader: {
    padding: 20, // Fixed padding (was 5%)
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  pharmacyListScroll: {
    paddingHorizontal: 20, // Fixed padding (was 5%)
  },
  pharmacyLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  pharmacyLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666666',
  },
  noPharmaciesContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noPharmaciesText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  // Pharmacy Card Styles
  pharmacyCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 15,
    padding: 16, // Fixed padding (was 4%)
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pharmacyCardContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  pharmacyImageContainer: {
    width: Math.min(SCREEN_WIDTH * 0.15, 60), // Responsive, max 60
    height: Math.min(SCREEN_WIDTH * 0.15, 60),
    borderRadius: Math.min(SCREEN_WIDTH * 0.075, 30),
    overflow: 'hidden',
    marginRight: 12,
  },
  pharmacyImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  pharmacyDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  pharmacyAddress: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  pharmacyDistance: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 2,
    fontWeight: '500',
  },
  pharmacyDeliveryFee: {
    fontSize: 12,
    color: '#FF9500',
    marginBottom: 4,
    fontWeight: '500',
  },
  pharmacyDistanceLoading: {
    fontSize: 11,
    color: '#999999',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  pharmacyPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00bf63',
  },
  orderNowButton: {
    backgroundColor: '#00bf63',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16, // Fixed padding (was 4%)
    alignItems: 'center',
  },
  orderNowButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Pharmacy Shop Modal Styles
  pharmacyShopContent: {
    padding: 20, // Fixed padding (was 5%)
  },
  shopButton: {
    backgroundColor: '#00bf63',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16, // Fixed padding (was 4%)
    alignItems: 'center',
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

