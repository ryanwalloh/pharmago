import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { fontFamily } from '../utils/fonts';
import { apiService } from '../services/api';

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

// Heart Icon
const HeartIcon = ({ size = 24, color = '#FF6B6B', filled = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    {filled ? (
      <Path
        d="M12,21.35l-1.45-1.32C5.4,15.36,2,12.28,2,8.5C2,5.42,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.09C13.09,3.81,14.76,3,16.5,3C19.58,3,22,5.42,22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z"
        fill={color}
      />
    ) : (
      <Path
        d="M16.5,3C14.76,3,13.09,3.81,12,5.09C10.91,3.81,9.24,3,7.5,3C4.42,3,2,5.42,2,8.5c0,3.78,3.4,6.86,8.55,11.54L12,21.35l1.45-1.32C18.6,15.36,22,12.28,22,8.5C22,5.42,19.58,3,16.5,3zM12.1,18.55l-0.1,0.1l-0.1-0.1C7.14,14.24,4,11.39,4,8.5C4,6.5,5.5,5,7.5,5c1.54,0,3.04,0.99,3.57,2.36h1.87C13.46,5.99,14.96,5,16.5,5c2,0,3.5,1.5,3.5,3.5C20,11.39,16.86,14.24,12.1,18.55z"
        fill={color}
      />
    )}
  </Svg>
);

// Trash Icon
const TrashIcon = ({ size = 20, color = '#FF6B6B' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M19,4h-3.5l-1-1h-5l-1,1H5v2h14M6,19c0,1.1,0.9,2,2,2h8c1.1,0,2-0.9,2-2V7H6V19z"
      fill={color}
    />
  </Svg>
);

interface CartItem {
  inventory_id: number;
  name: string;
  dosage: string;
  form: string;
  price: number;
  quantity: number;
  prescription_required: boolean;
}

export default function OrderPage() {
  const params = useLocalSearchParams();
  
  // Parse params - they come as strings from navigation
  const pharmacy = params.pharmacy ? JSON.parse(params.pharmacy as string) : null;
  
  // Support both single medicine (backwards compatibility) and multiple medicines
  const selectedMedicine = params.selectedMedicine ? JSON.parse(params.selectedMedicine as string) : null;
  const selectedMedicines = params.selectedMedicines ? JSON.parse(params.selectedMedicines as string) : null;
  
  const deliveryInfo = params.deliveryInfo ? JSON.parse(params.deliveryInfo as string) : null;
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Senior Citizen Discount States
  const [applySeniorDiscount, setApplySeniorDiscount] = useState(false);
  const [seniorIdImage, setSeniorIdImage] = useState<string | null>(null);
  const [uploadingSeniorId, setUploadingSeniorId] = useState(false);
  
  const searchDebounceTimer = useRef<number | null>(null);

  useEffect(() => {
    // If medicines were pre-selected, add them to cart
    if (pharmacy) {
      const initialCartItems: CartItem[] = [];
      
      // Handle multiple medicines (new feature)
      if (selectedMedicines && Array.isArray(selectedMedicines)) {
        selectedMedicines.forEach(medicine => {
          initialCartItems.push({
            inventory_id: medicine.inventory_id,
            name: medicine.name,
            dosage: medicine.dosage,
            form: medicine.form,
            price: medicine.price,
            quantity: 1,
            prescription_required: medicine.prescription_required || false,
          });
        });
      } 
      // Handle single medicine (backwards compatibility)
      else if (selectedMedicine) {
        initialCartItems.push({
          inventory_id: selectedMedicine.inventory_id,
          name: selectedMedicine.name,
          dosage: selectedMedicine.dosage,
          form: selectedMedicine.form,
          price: selectedMedicine.price,
          quantity: 1,
          prescription_required: selectedMedicine.prescription_required || false,
        });
      }
      
      if (initialCartItems.length > 0) {
        setCartItems(initialCartItems);
      }
    }

    // Cleanup function to clear AsyncStorage when component unmounts
    return () => {
      AsyncStorage.removeItem('temp_cart_items').catch((error: any) => {
        console.error('Failed to clear cart items on unmount:', error);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateQuantity = async (index: number, change: number) => {
    setCartItems(prev => {
      const newCart = [...prev];
      const newQuantity = newCart[index].quantity + change;
      
      if (newQuantity < 1) {
        // Remove item if quantity becomes 0
        newCart.splice(index, 1);
      } else {
        newCart[index] = { ...newCart[index], quantity: newQuantity };
      }
      
      // Save to AsyncStorage
      AsyncStorage.setItem('temp_cart_items', JSON.stringify(newCart)).catch((error: any) => {
        console.error('Failed to save cart items:', error);
      });
      
      return newCart;
    });
  };

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
    if (!pharmacy || !pharmacy.pharmacy_id) {
      console.log('⚠️ No pharmacy selected');
      return;
    }

    try {
      setSearchLoading(true);
      console.log('🔍 Searching pharmacy inventory:', query);
      
      const response = await apiService.searchPharmacyInventory(pharmacy.pharmacy_id, query);
      
      if (response.success && response.data) {
        // Unwrap nested data structure (response.data.data or response.data)
        const responseData = (response.data as any).data || response.data;
        const results = Array.isArray(responseData) ? responseData : [];
        
        setSearchResults(results);
        setShowSuggestions(results.length > 0);
        console.log(`✅ Found ${results.length} products`);
      }
    } catch (error) {
      console.error('💥 Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const addToCart = async (item: any) => {
    // Check if item already in cart
    const existingIndex = cartItems.findIndex(cartItem => cartItem.inventory_id === item.inventory_id);
    
    if (existingIndex >= 0) {
      // Increase quantity if already in cart
      await updateQuantity(existingIndex, 1);
    } else {
      // Add new item to cart
      const newItem: CartItem = {
        inventory_id: item.inventory_id,
        name: item.name,
        dosage: item.dosage,
        form: item.form,
        price: item.price,
        quantity: 1,
        prescription_required: item.prescription_required || false,
      };
      
      const updatedItems = [...cartItems, newItem];
      setCartItems(updatedItems);
      
      // Save to AsyncStorage
      try {
        await AsyncStorage.setItem('temp_cart_items', JSON.stringify(updatedItems));
      } catch (error: any) {
        console.error('Failed to save cart items:', error);
      }
    }
    
    // Clear search
    setSearchQuery('');
    setSearchResults([]);
    setShowSuggestions(false);
    console.log('✅ Added to cart:', item.name);
  };

  // Senior Citizen ID Upload Functions
  const handleUploadSeniorId = async () => {
    // Show options: Camera or Gallery
    Alert.alert(
      'Upload Senior Citizen ID',
      'Choose how you want to upload your ID',
      [
        {
          text: 'Take Photo',
          onPress: () => handleCameraUpload(),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => handleGalleryUpload(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleCameraUpload = async () => {
    try {
      setUploadingSeniorId(true);
      
      // Request camera permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to take a photo!');
        setUploadingSeniorId(false);
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(imageUri, 'senior-citizen-ids');
        
        if (cloudinaryUrl) {
          setSeniorIdImage(cloudinaryUrl);
          console.log('✅ Senior ID uploaded (camera):', cloudinaryUrl);
        } else {
          Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Failed to upload Senior ID (camera):', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingSeniorId(false);
    }
  };

  const handleGalleryUpload = async () => {
    try {
      setUploadingSeniorId(true);
      
      // Request gallery permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        setUploadingSeniorId(false);
        return;
      }

      // Pick image from gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(imageUri, 'senior-citizen-ids');
        
        if (cloudinaryUrl) {
          setSeniorIdImage(cloudinaryUrl);
          console.log('✅ Senior ID uploaded (gallery):', cloudinaryUrl);
        } else {
          Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Failed to upload Senior ID (gallery):', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingSeniorId(false);
    }
  };

  const uploadToCloudinary = async (imageUri: string, folder: string): Promise<string | null> => {
    // TEMPORARY: Mock upload for testing (comment out for production)
    // return imageUri; // Use local URI for testing
    
    try {
      console.log('📤 Starting Cloudinary upload...');
      console.log('  Image URI:', imageUri);
      console.log('  Folder:', folder);

      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'senior_id.jpg',
      } as any);
      formData.append('upload_preset', 'pharmago-file-uploads'); // Your Cloudinary preset
      formData.append('folder', folder);

      console.log('  Cloud name: dwqrkobq1');
      console.log('  Upload preset: pharmago-file-uploads');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dwqrkobq1/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      
      console.log('📥 Cloudinary response status:', response.status);
      console.log('📥 Cloudinary response data:', JSON.stringify(data, null, 2));

      // Check if upload was successful
      if (!response.ok) {
        console.error('❌ Cloudinary upload failed:', data.error?.message || 'Unknown error');
        Alert.alert(
          'Upload Error',
          data.error?.message || 'Failed to upload image to cloud storage. Please try again.'
        );
        return null;
      }

      if (data.secure_url) {
        console.log('✅ Upload successful! URL:', data.secure_url);
        return data.secure_url;
      } else {
        console.error('❌ No secure_url in response');
        return null;
      }
    } catch (error: any) {
      console.error('❌ Cloudinary upload error:', error);
      console.error('  Error message:', error.message);
      console.error('  Error stack:', error.stack);
      return null;
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateSeniorDiscount = () => {
    if (applySeniorDiscount && seniorIdImage) {
      const subtotal = calculateSubtotal();
      return subtotal * 0.20; // 20% discount
    }
    return 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const deliveryFee = deliveryInfo?.delivery_fee || 0;
    const seniorDiscount = calculateSeniorDiscount();
    return subtotal + deliveryFee - seniorDiscount;
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add at least one item to your order');
      return;
    }
    
    // Validate senior discount requirements
    if (applySeniorDiscount && !seniorIdImage) {
      Alert.alert(
        'Senior Discount',
        'Please upload your Senior Citizen ID to apply the discount',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      const orderData = {
        pharmacy_id: pharmacy.pharmacy_id,
        pharmacy: JSON.stringify(pharmacy),
        cartItems: JSON.stringify(cartItems),
        subtotal: calculateSubtotal(),
        deliveryFee: deliveryInfo?.delivery_fee || 0,
        deliveryInfo: deliveryInfo ? JSON.stringify(deliveryInfo) : null,
        total: calculateTotal(),
        
        // Senior discount data
        apply_senior_discount: applySeniorDiscount,
        senior_id_image_url: seniorIdImage,
        senior_discount_status: applySeniorDiscount && seniorIdImage ? 'pending' : 'not_requested',
        potential_discount: calculateSeniorDiscount(),
      };
      
      console.log('📦 Storing order data and navigating to checkout...');
      
      // Store order data in AsyncStorage
      await AsyncStorage.setItem('pending_order', JSON.stringify(orderData));
      
      // Navigate to checkout page
      router.push('/checkout' as any);
      
    } catch (error: any) {
      console.error('Failed to proceed to checkout:', error);
      Alert.alert('Error', 'Failed to proceed to checkout. Please try again.');
    }
  };

  if (!pharmacy) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No pharmacy selected</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Combined Header & Pharmacy Details Container */}
          <View style={styles.pharmacyDetailsContainer}>
            {/* Top Row: Back Button Only */}
            <View style={styles.headerRow}>
              <TouchableOpacity 
                style={styles.headerBackButton}
                onPress={() => router.back()}
              >
                <BackArrowIcon size={24} color="#00bf63" />
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>Cart</Text>
            </View>

            {/* Pharmacy Details */}
            <View style={styles.pharmacyDetailsContent}>
              <View style={styles.pharmacyImageWrapper}>
                <Image
                  source={
                    pharmacy.storefront_image_url 
                      ? { uri: pharmacy.storefront_image_url }
                      : require('../assets/pharmacy.png')
                  }
                  style={styles.pharmacyProfileImage}
                  resizeMode="cover"
                  onError={() => {
                    console.log('Failed to load pharmacy image');
                  }}
                />
              </View>
              
              <View style={styles.pharmacyInfo}>
                <Text style={styles.pharmacyName}>{pharmacy.pharmacy_name}</Text>
                <Text style={styles.pharmacyAddress}>
                  {pharmacy.barangay}, {pharmacy.city}
                </Text>
                {deliveryInfo && (
                  <Text style={styles.pharmacyDeliveryInfo}>
                    {deliveryInfo.distance_km?.toFixed(2)} km away • Delivery: ₱{deliveryInfo.delivery_fee?.toFixed(2)}
                  </Text>
                )}
              </View>

              {/* Heart Icon on the Right */}
              <TouchableOpacity 
                style={styles.pharmacyHeartButton}
                onPress={() => setIsFavorite(!isFavorite)}
              >
                <HeartIcon size={24} color="#FF6B6B" filled={isFavorite} />
              </TouchableOpacity>
            </View>
          </View>

        <ScrollView 
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Field */}
          <View style={styles.searchContainer}>
            <View style={styles.searchField}>
              <SearchIcon size={20} color="#999999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search to add more products"
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
            </View>

            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchResults.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <ScrollView 
                  style={styles.suggestionsList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                >
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={`${result.inventory_id}-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => addToCart(result)}
                    >
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionName}>{result.name}</Text>
                        <Text style={styles.suggestionSubtext}>
                          {result.dosage} • {result.form}
                        </Text>
                      </View>
                      <View style={styles.suggestionPriceContainer}>
                        <Text style={styles.suggestionPrice}>₱{result.price.toFixed(2)}</Text>
                        <View style={styles.addButton}>
                          <Text style={styles.addButtonText}>+</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Selected Products Container */}
          <View style={styles.productsContainer}>
            <Text style={styles.sectionTitle}>
              {cartItems.length > 0 ? 'Selected Items' : 'No Items Selected'}
            </Text>
            
            {cartItems.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartText}>
                  {selectedMedicine 
                    ? 'Loading selected medicine...'
                    : 'Search and add products to your cart'}
                </Text>
              </View>
            ) : (
              cartItems.map((item, index) => (
                <View key={`${item.inventory_id}-${index}`} style={styles.cartItem}>
                  <View style={styles.cartItemDetails}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemDosage}>{item.dosage}</Text>
                    <Text style={styles.cartItemPrice}>₱{item.price.toFixed(2)}</Text>
                  </View>
                  
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(index, -1)}
                    >
                      {item.quantity === 1 ? (
                        <TrashIcon size={18} color="#FF6B6B" />
                      ) : (
                        <Text style={styles.quantityButtonText}>−</Text>
                      )}
                    </TouchableOpacity>
                    
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(index, 1)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Senior Citizen Discount Section */}
          <View style={styles.seniorDiscountSection}>
            <View style={styles.seniorDiscountHeader}>
              <View>
                <Text style={styles.seniorDiscountTitle}>Senior Citizen Discount</Text>
                <Text style={styles.seniorDiscountSubtitle}>Get 20% off on medicines</Text>
              </View>
              <Switch
                value={applySeniorDiscount}
                onValueChange={setApplySeniorDiscount}
                trackColor={{ false: '#E0E0E0', true: '#00bf63' }}
                thumbColor={applySeniorDiscount ? '#FFFFFF' : '#F4F4F4'}
              />
            </View>
            
            {applySeniorDiscount && (
              <View style={styles.seniorIdUploadSection}>
                {!seniorIdImage ? (
                  <TouchableOpacity 
                    style={styles.uploadSeniorIdButton}
                    onPress={handleUploadSeniorId}
                    disabled={uploadingSeniorId}
                  >
                    {uploadingSeniorId ? (
                      <ActivityIndicator color="#00bf63" />
                    ) : (
                      <>
                        <Text style={styles.uploadIcon}>📄</Text>
                        <Text style={styles.uploadButtonText}>Upload Senior Citizen ID</Text>
                        <Text style={styles.uploadSubtext}>Required for discount verification</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.seniorIdPreview}>
                    <Image source={{ uri: seniorIdImage }} style={styles.seniorIdThumbnail} />
                    <View style={styles.seniorIdInfo}>
                      <Text style={styles.seniorIdUploadedText}>✓ Senior ID Uploaded</Text>
                      <TouchableOpacity onPress={() => setSeniorIdImage(null)}>
                        <Text style={styles.changeIdText}>Change Photo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                <View style={styles.seniorDiscountNote}>
                  <Text style={styles.noteText}>
                    ⓘ Discount subject to pharmacy verification
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Order Summary */}
          {cartItems.length > 0 && (
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>₱{calculateSubtotal().toFixed(2)}</Text>
              </View>
              
              {applySeniorDiscount && seniorIdImage && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, styles.discountLabel]}>Senior Discount (20%)*:</Text>
                  <Text style={[styles.summaryValue, styles.discountValue]}>
                    -₱{calculateSeniorDiscount().toFixed(2)}
                  </Text>
                </View>
              )}
              
              {deliveryInfo && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Fee:</Text>
                  <Text style={styles.summaryValue}>₱{deliveryInfo.delivery_fee?.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Total:</Text>
                <Text style={styles.summaryTotalValue}>
                  ₱{calculateTotal().toFixed(2)}
                  {applySeniorDiscount && seniorIdImage && '*'}
                </Text>
              </View>
              
              {applySeniorDiscount && seniorIdImage && (
                <Text style={styles.pendingNote}>
                  * Pending pharmacy approval
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Place Order Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.placeOrderButton,
              cartItems.length === 0 && styles.placeOrderButtonDisabled
            ]}
            onPress={handlePlaceOrder}
            disabled={cartItems.length === 0}
          >
            <Text style={styles.placeOrderButtonText}>
              {cartItems.length === 0 ? 'Add Items to Order' : 'Review payment and address'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  // Combined Pharmacy Details Container (Header + Details)
  pharmacyDetailsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  
  },
  // Top Row: Back Button Only
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 15,
    fontFamily: fontFamily.heavy,
  },
  // Pharmacy Details Content
  pharmacyDetailsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pharmacyImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  pharmacyProfileImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  pharmacyInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  pharmacyName: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#333333',
    marginBottom: 4,
  },
  pharmacyAddress: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  pharmacyDeliveryInfo: {
    fontSize: 12,
    color: '#00bf63',
    fontWeight: '500',
  },
  pharmacyHeartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  // Content Styles
  scrollContent: {
    flex: 1,
  },
  // Search Field
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8F8F8',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 45,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    marginLeft: 10,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    marginTop: 8,
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
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  suggestionsList: {
    paddingVertical: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  suggestionContent: {
    flex: 1,
    marginRight: 10,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  suggestionSubtext: {
    fontSize: 13,
    color: '#666666',
  },
  suggestionPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00bf63',
    marginRight: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00bf63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Products Container
  productsContainer: {
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#333333',
    marginBottom: 15,
  },
  emptyCart: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#333333',
    marginBottom: 4,
  },
  cartItemDosage: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00bf63',
  },
  // Quantity Controls
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 0,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    color: '#00bf63',
    
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginHorizontal: 5,
    minWidth: 30,
    textAlign: 'center',
  },
  // Order Summary
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  discountLabel: {
    color: '#00bf63',
  },
  discountValue: {
    color: '#00bf63',
    fontWeight: '600',
  },
  pendingNote: {
    fontSize: 11,
    color: '#996600',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#333333',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#00bf63',
  },
  // Bottom Container
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  placeOrderButton: {
    backgroundColor: '#00bf63',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  placeOrderButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
  },
  // Error Container
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#00bf63',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
  },
  // Senior Citizen Discount Styles
  seniorDiscountSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  seniorDiscountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    
  },
  seniorDiscountTitle: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#333333',
  },
  seniorDiscountSubtitle: {
    fontSize: 12,
    color: '#00bf63',
    marginTop: 4,
  },
  seniorIdUploadSection: {
    marginTop: 10,
  },
  uploadSeniorIdButton: {
    backgroundColor: '#F0F9F4',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00bf63',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#00bf63',
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#666666',
  },
  seniorIdPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F4',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#00bf63',
  },
  seniorIdThumbnail: {
    width: 80,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  seniorIdInfo: {
    flex: 1,
    marginLeft: 15,
  },
  seniorIdUploadedText: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#00bf63',
    marginBottom: 4,
  },
  changeIdText: {
    fontSize: 12,
    color: '#666666',
  },
  seniorDiscountNote: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
  },
  noteText: {
    fontSize: 12,
    color: '#996600',
    textAlign: 'center',
  },
});

