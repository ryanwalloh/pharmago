import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { prescriptionService, PrescriptionData } from '../services/prescriptionService';
import { fontFamily } from '../utils/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PrescriptionUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (prescriptionId: string) => void;
}

export default function PrescriptionUploadModal({ 
  visible, 
  onClose, 
  onSuccess 
}: PrescriptionUploadModalProps) {
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData>({});
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);

  const handleUpload = async () => {
    if (!selectedImageUri) {
      Alert.alert('No Image Selected', 'Please select a prescription image first.');
      return;
    }

    setIsUploading(true);
    
    try {
      console.log('📤 Storing prescription data temporarily...');
      
      // Generate unique session ID
      const sessionId = `prescription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store prescription data temporarily in AsyncStorage
      const tempPrescriptionData = {
        imageUri: selectedImageUri,
        doctorName: prescriptionData.doctorName || '',
        prescriptionDate: prescriptionData.prescriptionDate || '',
        notes: prescriptionData.notes || '',
        sessionId: sessionId,
        uploadTimestamp: Date.now(),
        isUploaded: false,
      };
      
      await AsyncStorage.setItem('tempPrescription', JSON.stringify(tempPrescriptionData));
      
      console.log('✅ Prescription data stored temporarily!');
      
      // Navigate directly to pharmacy selection without alert
      onSuccess(sessionId);
      handleClose();
      router.push('/pharmacy-selection');
    } catch (error) {
      console.error('❌ Storage error:', error);
      Alert.alert('Storage Error', 'An error occurred while saving your prescription. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      console.log('📷 Taking photo...');
      const imageUri = await prescriptionService.takePhotoWithCamera();
      
      if (imageUri) {
        setSelectedImageUri(imageUri);
        console.log('✅ Photo taken:', imageUri);
      } else {
        console.log('❌ Photo capture cancelled');
      }
    } catch (error) {
      console.error('💥 Error taking photo:', error);
      Alert.alert('Camera Error', 'Failed to open camera. Please check camera permissions and try again.');
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      console.log('🖼️ Choosing from gallery...');
      const imageUri = await prescriptionService.pickImageFromGallery();
      
      if (imageUri) {
        setSelectedImageUri(imageUri);
        console.log('✅ Image selected:', imageUri);
      } else {
        console.log('❌ Gallery selection cancelled');
      }
    } catch (error) {
      console.error('💥 Error selecting from gallery:', error);
      Alert.alert('Gallery Error', 'Failed to open gallery. Please check photo library permissions and try again.');
    }
  };

  const handleClose = () => {
    setPrescriptionData({});
    setSelectedImageUri(null);
    setIsUploading(false);
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Upload Prescription</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Image Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Please upload image of valid prescription from your doctor.</Text>
              
              {selectedImageUri ? (
                <View style={styles.imageContainer}>
                  <TouchableOpacity 
                    style={styles.imageTouchable}
                    onPress={() => setShowImagePreviewModal(true)}
                  >
                    <View style={styles.imageWrapper}>
                      <Image 
                        source={{ uri: selectedImageUri }} 
                        style={styles.selectedImage}
                        resizeMode="cover"
                      />
                      <View style={styles.imageOverlay}>
                        <Text style={styles.imageOverlayText}>Click to Preview</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.changeImageButton} 
                    onPress={() => setSelectedImageUri(null)}
                  >
                    <Text style={styles.changeImageButtonText}>Change Image</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imageSelectionContainer}>
                  <View style={styles.cameraCardContainer}>
                    <TouchableOpacity style={styles.cameraButton} onPress={handleTakePhoto}>
                      <View style={styles.cameraIconContainer}>
                        <View style={styles.cameraIconBackground}>
                          <Image 
                            source={require('../assets/camera.png')} 
                            style={styles.cameraIconImage}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                      <Text style={styles.cameraButtonLabel}>Camera</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.galleryCardContainer}>
                    <TouchableOpacity style={styles.galleryButton} onPress={handleSelectFromGallery}>
                      <View style={styles.galleryIconContainer}>
                        <View style={styles.galleryIconBackground}>
                          <Image 
                            source={require('../assets/gallery.png')} 
                            style={styles.galleryIconImage}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                      <Text style={styles.galleryButtonLabel}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {/* Note */}
              <View style={styles.noteContainer}>
                <Text style={styles.noteText}>
                  <Text style={styles.noteLabel}>Note:</Text>
                  <Text style={styles.noteContent}> Always upload a clear Prescription for getting better result.</Text>
                </Text>
              </View>
            </View>

            {/* Prescription Guide Button */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.guideButton} onPress={() => setShowGuideModal(true)}>
                <View style={styles.guideIconContainer}>
                  <Text style={styles.guideIcon}>i</Text>
                </View>
                <Text style={styles.guideButtonText}>Prescription Guide</Text>
              </TouchableOpacity>
            </View>

            {/* Why Upload Prescription - Expandable */}
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.expandableHeader} 
                onPress={() => setIsWhyExpanded(!isWhyExpanded)}
              >
                <Text style={styles.expandableTitle}>Why upload a prescription?</Text>
                <Text style={styles.caretIcon}>{isWhyExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              
              {isWhyExpanded && (
                <View style={styles.expandableContent}>
                  <Text style={styles.whyContent}>
                    Some medicines can only be given with a doctor&apos;s prescription. By uploading yours, our partner pharmacists can double-check your order and make sure you get the right medicines quickly and safely with no extra trips to the pharmacy needed.{'\n\n'}We keep your prescription <Text style={styles.highlightText}>private</Text> and <Text style={styles.highlightText}>secure</Text>, and it&apos;s only used to process your order.
                  </Text>
                </View>
              )}
            </View>

            {/* Prescription Details - Expandable */}
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.expandableHeader} 
                onPress={() => setIsDetailsExpanded(!isDetailsExpanded)}
              >
                <Text style={styles.expandableTitle}>Add Prescription Details (Optional)</Text>
                <Text style={styles.caretIcon}>{isDetailsExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              
              {isDetailsExpanded && (
                <View style={styles.expandableContent}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Doctor&apos;s Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter doctor's name"
                      value={prescriptionData.doctorName || ''}
                      onChangeText={(text) => setPrescriptionData(prev => ({ ...prev, doctorName: text }))}
                      placeholderTextColor="#999999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Prescription Date</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      value={prescriptionData.prescriptionDate || ''}
                      onChangeText={(text) => setPrescriptionData(prev => ({ ...prev, prescriptionDate: text }))}
                      placeholderTextColor="#999999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Expiry Date</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      value={prescriptionData.expiryDate || ''}
                      onChangeText={(text) => setPrescriptionData(prev => ({ ...prev, expiryDate: text }))}
                      placeholderTextColor="#999999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Notes</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Additional notes about the prescription"
                      value={prescriptionData.notes || ''}
                      onChangeText={(text) => setPrescriptionData(prev => ({ ...prev, notes: text }))}
                      placeholderTextColor="#999999"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[
                styles.uploadButton, 
                (!selectedImageUri || isUploading) && styles.uploadButtonDisabled
              ]}
              onPress={handleUpload}
              disabled={!selectedImageUri || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.uploadButtonText}>Upload Prescription</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Prescription Guide Modal */}
      <Modal
        visible={showGuideModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGuideModal(false)}
      >
        <View style={styles.guideModalOverlay}>
          <View style={styles.guideModalContainer}>
            <View style={styles.guideContentContainer}>
              <Text style={styles.guideModalTitle}>Prescription Guide</Text>
              
              <Image 
                source={require('../assets/prescriptionGuide.png')}
                style={styles.guideImage}
              
              />
              
              <Text style={styles.guideSubtitle}>Doctor&apos;s signature and stamp</Text>
              <Text style={styles.guideDescription}>
                The prescription with Signature and/or stamp{'\n'}of the doctor to be considered valid
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.guideCloseButton} 
              onPress={() => setShowGuideModal(false)}
            >
              <Text style={styles.guideCloseButtonText}>Okay, I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={showImagePreviewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImagePreviewModal(false)}
      >
        <View style={styles.imagePreviewOverlay}>
          <View style={styles.imagePreviewContainer}>
            <TouchableOpacity 
              style={styles.imagePreviewCloseButton} 
              onPress={() => setShowImagePreviewModal(false)}
            >
              <Text style={styles.imagePreviewCloseButtonText}>✕</Text>
            </TouchableOpacity>
            
            <Image 
              source={{ uri: selectedImageUri! }} 
              style={styles.imagePreviewImage}
              resizeMode="contain"
              onError={(error) => console.log('Preview image load error:', error)}
              onLoad={() => console.log('Preview image loaded successfully')}
            />
            
            <Text style={styles.imagePreviewText}>Tap anywhere to close</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontFamily: fontFamily.heavy,
    color: '#333333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666666',
  },
  content: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#333333',
    marginBottom: 15,
    marginTop: 25,
  },
  imageContainer: {
    alignItems: 'center',
  },
  imageTouchable: {
    width: '100%',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
  },
  selectedImage: {
    width: '100%',
    height: Math.min(SCREEN_HEIGHT * 0.25, 200), // Responsive height, max 200
    borderRadius: 10,
    marginBottom: 15,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 15, // Account for marginBottom of selectedImage
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    textAlign: 'center',
  },
  changeImageButton: {
    backgroundColor: '#9DD49D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  changeImageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamily.heavy,
  },
  imageSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  cameraCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    padding: 8,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: SCREEN_WIDTH * 0.04, // 4% responsive padding
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  cameraIconContainer: {
    width: Math.min(SCREEN_WIDTH * 0.25, 110), // Max 110, responsive down to 25% of screen
    height: Math.min(SCREEN_WIDTH * 0.25, 110),
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  cameraIconBackground: {
    width: Math.min(SCREEN_WIDTH * 0.15, 66), // Responsive
    height: Math.min(SCREEN_WIDTH * 0.15, 66),
    backgroundColor: '#9DD49D',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconImage: {
    width: Math.min(SCREEN_WIDTH * 0.08, 35), // Responsive
    height: Math.min(SCREEN_WIDTH * 0.08, 35),
  },
  cameraButtonLabel: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#333333',
    textAlign: 'center',
  },
  galleryCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    padding: 8,
  },
  galleryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: SCREEN_WIDTH * 0.04, // 4% responsive padding
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  galleryIconContainer: {
    width: Math.min(SCREEN_WIDTH * 0.25, 110), // Max 110, responsive down to 25% of screen
    height: Math.min(SCREEN_WIDTH * 0.25, 110),
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  galleryIconBackground: {
    width: Math.min(SCREEN_WIDTH * 0.15, 66), // Responsive
    height: Math.min(SCREEN_WIDTH * 0.15, 66),
    backgroundColor: '#F8BBD9',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryIconImage: {
    width: Math.min(SCREEN_WIDTH * 0.08, 35), // Responsive
    height: Math.min(SCREEN_WIDTH * 0.08, 35),
  },
  galleryButtonLabel: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#333333',
    textAlign: 'center',
  },
  noteContainer: {
    marginTop: 15,
    paddingHorizontal: 10,
  },
  noteText: {
    fontSize: 14,
    textAlign: 'left',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  noteLabel: {
    fontFamily: fontFamily.heavy,
    fontWeight: 'bold',
    color: '#666666',
  },
  noteContent: {
    color: '#999999',
  },
  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  guideIconContainer: {
    width: 22,
    height: 22,
    backgroundColor: '#777777',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  guideIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  guideButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#333333',
    flex: 1,
  },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  expandableTitle: {
    fontSize: 14,
    fontFamily: fontFamily.light,
    color: '#333333',
    flex: 1,
  },
  caretIcon: {
    fontSize: 14,
    color: '#999999',
  },
  expandableContent: {
    marginTop: 15,
  },
  whyContent: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    textAlign: 'left',
  },
  highlightText: {
    color: '#9DD49D',
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  uploadButton: {
    backgroundColor: '#9DD49D',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fontFamily.heavy,
  },
  guideModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  guideModalContainer: {
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
    paddingTop: 24,
    paddingBottom: 34,
    alignItems: 'center',
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.9, // 90% of screen height
    minHeight: Math.min(SCREEN_HEIGHT * 0.7, 500), // Responsive min height
    flexDirection: 'column',
  },
  guideContentContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  guideModalTitle: {
    fontSize: 20,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
    marginBottom: 20,
    top: -40,
    textAlign: 'center',
  },
  guideImage: {
    width: '80%',
    padding: 20,
    height: Math.min(SCREEN_HEIGHT * 0.4, 370), // Responsive height, max 370
    marginBottom: 40,
    borderRadius: 20,
  },
  guideSubtitle: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  guideDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  guideCloseButton: {
    backgroundColor: '#9DD49D',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 150,
  },
  guideCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    textAlign: 'center',
  },
  // Image Preview Modal Styles
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    width: '95%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imagePreviewCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imagePreviewCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imagePreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imagePreviewText: {
    position: 'absolute',
    bottom: 20,
    color: '#FFFFFF',
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
});