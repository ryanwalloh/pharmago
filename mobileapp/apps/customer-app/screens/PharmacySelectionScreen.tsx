import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SvgXml } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { fontFamily } from '../utils/fonts';
import { apiService } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Pharmacy {
  id: string;
  pharmacy_name: string;
  address: string;
  phone: string;
  email: string;
  operating_hours: string;
  rating: number;
  is_active: boolean;
  city?: string;
  storefront_image_url?: string;
}

const PharmacySelectionScreen: React.FC = () => {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [filteredPharmacies, setFilteredPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pastel gradient colors
  const gradientColors: [string, string][] = [
    ['#F8BDFF', '#CAD472'], // Purple to Green
    ['#6E72FF', '#B5E1E8'], // Blue to Light Blue
    ['#F7EDE5', '#F8BDFF'], // Cream to Purple
    ['#CAD472', '#B5E1E8'], // Green to Light Blue
    ['#6E72FF', '#F7EDE5'], // Blue to Cream
    ['#B5E1E8', '#CAD472'], // Light Blue to Green
  ];

  const getGradientForPharmacy = (pharmacyId: string): [string, string] => {
    const index = parseInt(pharmacyId) % gradientColors.length;
    return gradientColors[index];
  };

  const filterPharmacies = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredPharmacies(pharmacies);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = pharmacies.filter(pharmacy => 
      pharmacy.pharmacy_name.toLowerCase().includes(query) ||
      pharmacy.address.toLowerCase().includes(query) ||
      pharmacy.city?.toLowerCase().includes(query) ||
      pharmacy.phone.includes(query)
    );
    
    setFilteredPharmacies(filtered);
    console.log(`🔍 Filtered ${filtered.length} pharmacies for query: "${searchQuery}"`);
  }, [pharmacies, searchQuery]);

  useEffect(() => {
    fetchPharmacies();
    loadSelectedPharmacy();
  }, []);

  useEffect(() => {
    filterPharmacies();
  }, [filterPharmacies]);

  const loadSelectedPharmacy = async () => {
    try {
      const storedPharmacy = await AsyncStorage.getItem('selectedPharmacy');
      if (storedPharmacy) {
        const pharmacy = JSON.parse(storedPharmacy);
        setSelectedPharmacy(pharmacy);
        console.log('📱 Loaded previously selected pharmacy:', pharmacy.pharmacy_name);
      }
    } catch (error) {
      console.error('💥 Error loading selected pharmacy:', error);
    }
  };

  const fetchPharmacies = async () => {
    try {
      setLoading(true);
      console.log('🏥 Fetching pharmacies...');
      const response = await apiService.getPharmacies();
      
      if (response.success && response.data && (response.data as any[]).length > 0) {
        console.log('✅ Pharmacies fetched successfully:', response.data);
        // Normalize data from direct endpoint shape to UI shape
        const normalized: Pharmacy[] = (response.data as any[]).map((p: any) => ({
          id: String(p.id),
          pharmacy_name: p.pharmacy_name || p.business_name || p.name || 'Unknown Pharmacy',
          address: [p.barangay, p.city].filter(Boolean).join(', ') || 'Address not available',
          phone: p.business_phone || p.phone || 'N/A',
          email: p.business_email || (p.user && p.user.email) || 'N/A',
          operating_hours: typeof p.operating_hours === 'string' ? p.operating_hours : 'Hours not specified',
          rating: typeof p.rating === 'number' ? p.rating : 0,
          is_active: p.is_active !== undefined ? p.is_active : true,
          city: p.city || p.addresses?.[0]?.city || 'Unknown City',
          storefront_image_url: p.storefront_image_url || null,
        }));
        setPharmacies(normalized);
      } else {
        console.log('⚠️ No active pharmacies, trying pending fallback...');
        const pending = await apiService.getPendingPharmacies();
        if (pending.success && pending.data && (pending.data as any[]).length > 0) {
          const normalizedPending: Pharmacy[] = (pending.data as any[]).map((p: any) => ({
            id: String(p.id),
            pharmacy_name: p.pharmacy_name || p.business_name || p.name || 'Unknown Pharmacy',
            address: [p.barangay, p.city].filter(Boolean).join(', ') || 'Address not available',
            phone: p.business_phone || p.phone || 'N/A',
            email: p.business_email || (p.user && p.user.email) || 'N/A',
            operating_hours: typeof p.operating_hours === 'string' ? p.operating_hours : 'Hours not specified',
            rating: typeof p.rating === 'number' ? p.rating : 0,
            is_active: true,
            city: p.city || p.addresses?.[0]?.city || 'Unknown City',
            storefront_image_url: p.storefront_image_url || null,
          }));
          setPharmacies(normalizedPending);
        } else {
          console.log('⚠️ No pending pharmacies either; leaving list empty');
          setPharmacies([]);
        }
      }
    } catch (error) {
      console.error('💥 Error fetching pharmacies:', error);
      // Keep list empty on network error; UI shows loading/empty state
      setPharmacies([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePharmacySelect = async (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    
    // Store selected pharmacy in AsyncStorage for persistence across screens
    try {
      await AsyncStorage.setItem('selectedPharmacy', JSON.stringify(pharmacy));
      console.log('💾 Selected pharmacy stored:', pharmacy.pharmacy_name);
    } catch (error) {
      console.error('💥 Error storing selected pharmacy:', error);
    }
  };

  const handleProceed = () => {
    if (!selectedPharmacy) {
      Alert.alert('No Pharmacy Selected', 'Please select a pharmacy before proceeding.');
      return;
    }
    
    console.log('🚀 Proceeding to payment method selection with pharmacy:', selectedPharmacy.pharmacy_name);
    router.push('/payment-method');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header Section with Image and Text */}
          <View style={styles.headerSection}>
            <Image 
              source={require('../assets/choosePharmacy.png')} 
              style={styles.headerImage}
              resizeMode="contain"
            />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Choose Your Pharmacy</Text>
              <Text style={styles.headerSubtitle}>
                Select a trusted pharmacy near you to process your prescription. 
                Our partner pharmacies are ready to help you get the medicines you need!
              </Text>
            </View>
          </View>
          
          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchInputContainer}>
              <SvgXml 
                xml={`<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#666666" d="M23.854,23.146l-6.449-6.449c1.607-1.775,2.596-4.12,2.596-6.697C20,4.486,15.514,0,10,0S0,4.486,0,10s4.486,10,10,10c2.577,0,4.922-.988,6.697-2.596l6.449,6.449c.098,.098,.226,.146,.354,.146s.256-.049,.354-.146c.195-.195,.195-.512,0-.707ZM1,10C1,5.038,5.038,1,10,1s9,4.038,9,9-4.037,9-9,9S1,14.962,1,10Z"/>
                </svg>`}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search pharmacies by name, address, or phone..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Pharmacy Cards Section */}
          <View style={styles.pharmaciesSection}>
            <Text style={styles.sectionTitle}>
              Available Pharmacies {searchQuery ? `(${filteredPharmacies.length} found)` : `(${pharmacies.length})`}
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9DD49D" />
                <Text style={styles.loadingText}>Loading pharmacies...</Text>
              </View>
            ) : filteredPharmacies.length === 0 && searchQuery ? (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No pharmacies found for &quot;{searchQuery}&quot;</Text>
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pharmaciesList}>
                {filteredPharmacies.map((pharmacy) => (
                  <TouchableOpacity
                    key={pharmacy.id}
                    style={[
                      styles.pharmacyCard,
                      selectedPharmacy?.id === pharmacy.id && styles.selectedPharmacyCard
                    ]}
                    onPress={() => handlePharmacySelect(pharmacy)}
                  >
                    <LinearGradient
                      colors={getGradientForPharmacy(pharmacy.id)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.pharmacyCardGradient}
                    >
                      <View style={styles.pharmacyCardContent}>
                        {/* Content Layer */}
                        <View style={styles.pharmacyCardMain}>
                          <View style={styles.pharmacyCardLeft}>
                            <View style={styles.pharmacyCardHeader}>
                              <Text style={styles.pharmacyName}>{pharmacy.pharmacy_name}</Text>
                            </View>
                            
                            <Text style={styles.pharmacyAddress}>{pharmacy.address}</Text>
                            <Text style={styles.pharmacyPhone}>📞 {pharmacy.phone}</Text>
                            <Text style={styles.pharmacyHours}>🕒 {pharmacy.operating_hours || 'Hours not specified'}</Text>
                            
                            {selectedPharmacy?.id === pharmacy.id && (
                              <View style={styles.selectedIndicator}>
                                <Text style={styles.selectedText}>✓ Selected</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Right Side Image Layer */}
                        <View style={styles.storefrontImageBackground}>
                          {pharmacy.storefront_image_url ? (
                            <Image 
                              source={{ uri: pharmacy.storefront_image_url }} 
                              style={styles.storefrontBackgroundImage}
                              resizeMode="contain"
                              onError={() => {
                                console.log('Failed to load storefront image for pharmacy:', pharmacy.pharmacy_name);
                              }}
                            />
                          ) : (
                            <Image 
                              source={require('../assets/drugstore.png')} 
                              style={styles.storefrontBackgroundImage}
                              resizeMode="contain"
                            />
                          )}
                        </View>

                        {/* Rating Overlay */}
                        <View style={styles.ratingOverlay}>
                          <Text style={styles.ratingText}>⭐ {pharmacy.rating || 'N/A'}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* Proceed Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.proceedButton,
            !selectedPharmacy && styles.proceedButtonDisabled
          ]}
          onPress={handleProceed}
          disabled={!selectedPharmacy}
        >
          <Text style={styles.proceedButtonText}>
            {selectedPharmacy ? 'Proceed to Payment' : 'Select a Pharmacy'}
          </Text>
        </TouchableOpacity>
      </View>
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
  content: {
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
    paddingVertical: 20,
    paddingBottom: 120, // Space for bottom button
  },
  // Header Section Styles
  headerSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerImage: {
    width: Math.min(SCREEN_WIDTH * 0.5, 200), // Responsive, max 200
    height: Math.min(SCREEN_WIDTH * 0.5, 200),
    marginBottom: 16,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fontFamily.heavy,
    color: '#2A2A2A',
    marginBottom: 8,
    lineHeight: 28,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    fontFamily: fontFamily.light,
    lineHeight: 22,
    textAlign: 'center',
  },
  // Search Section Styles
  searchSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: SCREEN_WIDTH * 0.04, // 4% responsive padding
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fontFamily.light,
    color: '#2A2A2A',
    padding: 0,
  },
  // Pharmacies Section Styles
  pharmaciesSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fontFamily.heavy,
    color: '#2A2A2A',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    fontFamily: fontFamily.light,
    marginTop: 12,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666666',
    fontFamily: fontFamily.light,
    textAlign: 'center',
    marginBottom: 16,
  },
  clearSearchButton: {
    backgroundColor: '#9DD49D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: fontFamily.heavy,
  },
  pharmaciesList: {
    gap: 12,
  },
  pharmacyCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    overflow: 'hidden',
  },
  selectedPharmacyCard: {
    borderColor: '#9DD49D',
  },
  pharmacyCardGradient: {
    borderRadius: 10,
    padding: SCREEN_WIDTH * 0.04, // 4% responsive padding
  },
  pharmacyCardContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 8,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: SCREEN_WIDTH * 0.03, // 3% responsive padding
    paddingRight: 0,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  pharmacyCardMain: {
    flex: 1,
    zIndex: 2,
    paddingRight: 8,
  },
  pharmacyCardLeft: {
    flex: 1,
  },
  storefrontImageBackground: {
    position: 'absolute',
    top: 5,
    right: -5,
    width: '50%',
    height: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  storefrontBackgroundImage: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain',
    borderRadius: 16,
  },
  ratingOverlay: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 3,
  },
  pharmacyCardHeader: {
    marginBottom: 8,
  },
  pharmacyName: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#2A2A2A',
  },
  ratingText: {
    fontSize: 12,
    fontFamily: fontFamily.light,
    color: '#666666',
  },
  pharmacyAddress: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#666666',
    marginBottom: 4,
  },
  pharmacyPhone: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#666666',
    marginBottom: 4,
  },
  pharmacyHours: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#666666',
    marginBottom: 8,
  },
  selectedIndicator: {
    backgroundColor: '#9DD49D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  selectedText: {
    fontSize: 12,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
  },
  // Bottom Section Styles
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  proceedButton: {
    backgroundColor: '#9DD49D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  proceedButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  proceedButtonText: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
  },
});

export default PharmacySelectionScreen;
