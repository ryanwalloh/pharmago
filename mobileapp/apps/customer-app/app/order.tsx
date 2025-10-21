import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { fontFamily } from '../utils/fonts';

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
  const selectedMedicine = params.selectedMedicine ? JSON.parse(params.selectedMedicine as string) : null;
  const deliveryInfo = params.deliveryInfo ? JSON.parse(params.deliveryInfo as string) : null;
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    // If a medicine was pre-selected, add it to cart
    if (selectedMedicine && pharmacy) {
      setCartItems([{
        inventory_id: selectedMedicine.inventory_id,
        name: selectedMedicine.name,
        dosage: selectedMedicine.dosage,
        form: selectedMedicine.form,
        price: selectedMedicine.price,
        quantity: 1,
        prescription_required: selectedMedicine.prescription_required || false,
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateQuantity = (index: number, change: number) => {
    setCartItems(prev => {
      const newCart = [...prev];
      const newQuantity = newCart[index].quantity + change;
      
      if (newQuantity < 1) {
        // Remove item if quantity becomes 0
        newCart.splice(index, 1);
      } else {
        newCart[index] = { ...newCart[index], quantity: newQuantity };
      }
      
      return newCart;
    });
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const deliveryFee = deliveryInfo?.delivery_fee || 0;
    return subtotal + deliveryFee;
  };

  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      alert('Please add at least one item to your order');
      return;
    }
    
    // TODO: Navigate to address selection or create order
    console.log('Placing order:', {
      pharmacy,
      cartItems,
      subtotal: calculateSubtotal(),
      deliveryFee: deliveryInfo?.delivery_fee || 0,
      total: calculateTotal()
    });
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
                <BackArrowIcon size={24} color="#000000" />
              </TouchableOpacity>
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
                    {deliveryInfo.distance_km?.toFixed(2)} km • Delivery: ₱{deliveryInfo.delivery_fee?.toFixed(2)}
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
                placeholder="Search pharmacy products..."
                placeholderTextColor="#999999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
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

          {/* Order Summary */}
          {cartItems.length > 0 && (
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>₱{calculateSubtotal().toFixed(2)}</Text>
              </View>
              {deliveryInfo && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Fee:</Text>
                  <Text style={styles.summaryValue}>₱{deliveryInfo.delivery_fee?.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Total:</Text>
                <Text style={styles.summaryTotalValue}>₱{calculateTotal().toFixed(2)}</Text>
              </View>
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
              {cartItems.length === 0 ? 'Add Items to Order' : 'Place Order'}
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
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
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
});

