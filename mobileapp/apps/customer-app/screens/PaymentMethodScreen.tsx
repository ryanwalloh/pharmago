import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { fontFamily } from '../utils/fonts';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: any; // Support both require() and string
  isAvailable: boolean;
}

const PaymentMethodScreen: React.FC = () => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  
  // Senior Citizen Discount States
  const [applySeniorDiscount, setApplySeniorDiscount] = useState(false);
  const [seniorIdImage, setSeniorIdImage] = useState<string | null>(null);
  const [uploadingSeniorId, setUploadingSeniorId] = useState(false);

  // Payment methods - Only COD available for prescription orders
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'cod',
      name: 'Cash on Delivery',
      description: 'Only payment method available for prescription orders',
      icon: require('../assets/cod2.png'),
      isAvailable: true,
    },
    {
      id: 'gcash',
      name: 'GCash',
      description: 'Not available for prescription orders',
      icon: require('../assets/gcash.png'),
      isAvailable: false,
    },
    {
      id: 'paymaya',
      name: 'PayMaya',
      description: 'Not available for prescription orders',
      icon: require('../assets/maya2.png'),
      isAvailable: false,
    },
    {
      id: 'card',
      name: 'Card (Visa, Mastercard, etc.)',
      description: 'Not available for prescription orders',
      icon: require('../assets/card.png'),
      isAvailable: false,
    },
  ];

  useEffect(() => {
    loadSelectedPharmacy();
    // Set COD as default
    setSelectedPaymentMethod(paymentMethods[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      return;
    }
    setSelectedPaymentMethod(method);
    console.log('💳 Selected payment method:', method.name);
  };

  // Senior Citizen ID Upload Functions
  const handleUploadSeniorId = async () => {
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
      
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to take a photo!');
        setUploadingSeniorId(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
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
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        setUploadingSeniorId(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
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
    try {
      console.log('📤 Starting Cloudinary upload...');
      
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'senior_id.jpg',
      } as any);
      formData.append('upload_preset', 'pharmago-file-uploads');
      formData.append('folder', folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dwqrkobq1/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Cloudinary upload failed:', data.error?.message || 'Unknown error');
        return null;
      }

      if (data.secure_url) {
        console.log('✅ Upload successful! URL:', data.secure_url);
        return data.secure_url;
      }
      return null;
    } catch (error: any) {
      console.error('❌ Cloudinary upload error:', error);
      return null;
    }
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

    // Validate senior discount requirements
    if (applySeniorDiscount && !seniorIdImage) {
      Alert.alert(
        'Senior Discount',
        'Please upload your Senior Citizen ID to apply the discount',
        [{ text: 'OK' }]
      );
      return;
    }

    // Store selected payment method and senior discount data
    try {
      await AsyncStorage.setItem('selectedPaymentMethod', JSON.stringify(selectedPaymentMethod));
      
      // Store senior discount data
      await AsyncStorage.setItem('applySeniorDiscount', JSON.stringify(applySeniorDiscount));
      if (applySeniorDiscount && seniorIdImage) {
        await AsyncStorage.setItem('seniorIdImage', seniorIdImage);
      } else {
        await AsyncStorage.removeItem('seniorIdImage');
      }
      
      console.log('💾 Selected payment method stored:', selectedPaymentMethod.name);
      console.log('💾 Senior discount status:', applySeniorDiscount);
    } catch (error) {
      console.error('💥 Error storing payment data:', error);
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
                      <Image source={method.icon} style={styles.paymentMethodIcon} resizeMode="contain" />
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
                    
                    {selectedPaymentMethod?.id === method.id && method.isAvailable && (
                      <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedText}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
                trackColor={{ false: '#E0E0E0', true: '#9DD49D' }}
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
                      <ActivityIndicator color="#9DD49D" />
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
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
    paddingBottom: 120, // Extra space for the fixed button
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  headerImage: {
    width: Math.min(SCREEN_WIDTH * 0.25, 100), // Responsive, max 100
    height: Math.min(SCREEN_WIDTH * 0.25, 100),
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
    padding: SCREEN_WIDTH * 0.04, // 4% responsive padding
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
    padding: SCREEN_WIDTH * 0.03, // 3% responsive padding
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
    width: Math.min(SCREEN_WIDTH * 0.1, 40), // Responsive, max 40
    height: Math.min(SCREEN_WIDTH * 0.1, 40),
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
    padding: SCREEN_WIDTH * 0.04, // 4% responsive padding
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
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
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
  // Senior Citizen Discount Styles
  seniorDiscountSection: {
    marginBottom: 24,
  },
  seniorDiscountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seniorDiscountTitle: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#2A2A2A',
  },
  seniorDiscountSubtitle: {
    fontSize: 14,
    color: '#9DD49D',
    marginTop: 4,
  },
  seniorIdUploadSection: {
    marginTop: 10,
  },
  uploadSeniorIdButton: {
    backgroundColor: '#F8FFF8',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: SCREEN_WIDTH * 0.04, // 4% responsive padding
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9DD49D',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#9DD49D',
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#666666',
  },
  seniorIdPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FFF8',
    borderRadius: 12,
    padding: SCREEN_WIDTH * 0.04, // 4% responsive padding
    borderWidth: 1,
    borderColor: '#9DD49D',
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
    color: '#9DD49D',
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

export default PaymentMethodScreen;
