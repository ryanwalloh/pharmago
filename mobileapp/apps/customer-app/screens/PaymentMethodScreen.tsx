import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { fontFamily } from '../utils/fonts';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  isAvailable: boolean;
}

const PaymentMethodScreen: React.FC = () => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);

  // Payment methods available
  const paymentMethods: PaymentMethod[] = useMemo(() => [
    {
      id: 'cod',
      name: 'Cash on Delivery',
      description: 'Pay when your order arrives',
      icon: '💰',
      isAvailable: true,
    },
    {
      id: 'gcash',
      name: 'GCash',
      description: 'Pay using your GCash wallet',
      icon: '📱',
      isAvailable: true,
    },
    {
      id: 'paymaya',
      name: 'PayMaya',
      description: 'Pay using your PayMaya account',
      icon: '💳',
      isAvailable: true,
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      icon: '🏦',
      isAvailable: false, // Coming soon
    },
  ], []);

  useEffect(() => {
    loadSelectedPharmacy();
    // Set COD as default
    setSelectedPaymentMethod(paymentMethods[0]);
  }, [paymentMethods]);

  const loadSelectedPharmacy = async () => {
    try {
      const storedPharmacy = await AsyncStorage.getItem('selectedPharmacy');
      if (storedPharmacy) {
        const pharmacy = JSON.parse(storedPharmacy);
        setSelectedPharmacy(pharmacy);
        console.log('📱 Loaded selected pharmacy for payment:', pharmacy.pharmacy_name);
      }
    } catch (error) {
      console.error('💥 Error loading selected pharmacy:', error);
    }
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    if (!method.isAvailable) {
      Alert.alert('Coming Soon', 'This payment method will be available soon!');
      return;
    }
    setSelectedPaymentMethod(method);
    console.log('💳 Selected payment method:', method.name);
  };

  const handleProceed = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('No Payment Method Selected', 'Please select a payment method before proceeding.');
      return;
    }

    if (!selectedPharmacy) {
      Alert.alert('No Pharmacy Selected', 'Please go back and select a pharmacy first.');
      return;
    }

    // Store selected payment method
    try {
      await AsyncStorage.setItem('selectedPaymentMethod', JSON.stringify(selectedPaymentMethod));
      console.log('💾 Selected payment method stored:', selectedPaymentMethod.name);
    } catch (error) {
      console.error('💥 Error storing selected payment method:', error);
    }

    console.log('🚀 Proceeding to address selection with payment method:', selectedPaymentMethod.name);
    router.push('/address-selection');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Image source={require('../assets/payment.png')} style={styles.headerImage} resizeMode="contain" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Choose Payment Method</Text>
              <Text style={styles.headerSubtitle}>
                Select how you&apos;d like to pay for your prescription order.
                We offer secure and convenient payment options for your peace of mind.
              </Text>
            </View>
          </View>

          {/* Prescription Pricing Note */}
          <View style={styles.pricingNoteSection}>
            <View style={styles.pricingNoteContainer}>
              <Text style={styles.pricingNoteIcon}>💊</Text>
              <View style={styles.pricingNoteTextContainer}>
                <Text style={styles.pricingNoteTitle}>Prescription Pricing</Text>
                <Text style={styles.pricingNoteText}>
                  Since this is a prescription order, the total price will be discussed with you 
                  after the pharmacy reviews your prescription. You&apos;ll receive a detailed 
                  quote through our chat system before confirming your order.
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Methods Section */}
          <View style={styles.paymentMethodsSection}>
            <Text style={styles.sectionTitle}>Available Payment Methods</Text>
            
            <View style={styles.paymentMethodsList}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodCard,
                    selectedPaymentMethod?.id === method.id && styles.selectedPaymentMethodCard,
                    !method.isAvailable && styles.disabledPaymentMethodCard
                  ]}
                  onPress={() => handlePaymentMethodSelect(method)}
                  disabled={!method.isAvailable}
                >
                  <View style={styles.paymentMethodContent}>
                    <View style={styles.paymentMethodLeft}>
                      <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                      <View style={styles.paymentMethodTextContainer}>
                        <Text style={[
                          styles.paymentMethodName,
                          !method.isAvailable && styles.disabledText
                        ]}>
                          {method.name}
                        </Text>
                        <Text style={[
                          styles.paymentMethodDescription,
                          !method.isAvailable && styles.disabledText
                        ]}>
                          {method.description}
                        </Text>
                      </View>
                    </View>
                    
                    {selectedPaymentMethod?.id === method.id && (
                      <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedText}>✓</Text>
                      </View>
                    )}
                    
                    {!method.isAvailable && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>Coming Soon</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Selected Pharmacy Info */}
          {selectedPharmacy && (
            <View style={styles.pharmacyInfoSection}>
              <Text style={styles.pharmacyInfoTitle}>Selected Pharmacy</Text>
              <View style={styles.pharmacyInfoCard}>
                <Text style={styles.pharmacyInfoName}>{selectedPharmacy.pharmacy_name}</Text>
                <Text style={styles.pharmacyInfoAddress}>{selectedPharmacy.address}</Text>
                <Text style={styles.pharmacyInfoPhone}>📞 {selectedPharmacy.phone}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Proceed Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.proceedButton,
            !selectedPaymentMethod && styles.proceedButtonDisabled
          ]}
          onPress={handleProceed}
          disabled={!selectedPaymentMethod}
        >
          <Text style={styles.proceedButtonText}>
            {selectedPaymentMethod ? 'Proceed to Address Selection' : 'Select a Payment Method'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for the fixed button
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  headerImage: {
    width: 100,
    height: 100,
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
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: fontFamily.light,
    color: '#666666',
    lineHeight: 22,
    textAlign: 'center',
  },
  // Pricing Note Section
  pricingNoteSection: {
    marginBottom: 24,
  },
  pricingNoteContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  pricingNoteIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  pricingNoteTextContainer: {
    flex: 1,
  },
  pricingNoteTitle: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#1976D2',
    marginBottom: 4,
  },
  pricingNoteText: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#1976D2',
    lineHeight: 20,
  },
  // Payment Methods Section
  paymentMethodsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fontFamily.heavy,
    color: '#2A2A2A',
    marginBottom: 16,
  },
  paymentMethodsList: {
    gap: 12,
  },
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    padding: 16,
  },
  selectedPaymentMethodCard: {
    borderColor: '#9DD49D',
    backgroundColor: '#F8FFF8',
  },
  disabledPaymentMethodCard: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentMethodTextContainer: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#2A2A2A',
    marginBottom: 2,
  },
  paymentMethodDescription: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#666666',
  },
  disabledText: {
    color: '#999999',
  },
  selectedIndicator: {
    backgroundColor: '#E6F4EA',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  selectedText: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#28A745',
  },
  comingSoonBadge: {
    backgroundColor: '#FFE0B2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 12,
  },
  comingSoonText: {
    fontSize: 12,
    fontFamily: fontFamily.heavy,
    color: '#F57C00',
  },
  // Pharmacy Info Section
  pharmacyInfoSection: {
    marginBottom: 24,
  },
  pharmacyInfoTitle: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#2A2A2A',
    marginBottom: 12,
  },
  pharmacyInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    padding: 16,
  },
  pharmacyInfoName: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#2A2A2A',
    marginBottom: 4,
  },
  pharmacyInfoAddress: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#666666',
    marginBottom: 4,
  },
  pharmacyInfoPhone: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#666666',
  },
  // Bottom Section
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
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
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedButtonDisabled: {
    backgroundColor: '#B0D9B0',
  },
  proceedButtonText: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
  },
});

export default PaymentMethodScreen;
