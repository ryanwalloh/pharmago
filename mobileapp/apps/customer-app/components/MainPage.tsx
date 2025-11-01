import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { fontFamily } from '../utils/fonts';
import PrescriptionUploadModal from './PrescriptionUploadModal';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

// SVG Icon Components
const SearchIcon = ({ size = 20, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M23.854,23.146l-6.449-6.449c1.607-1.775,2.596-4.12,2.596-6.697C20,4.486,15.514,0,10,0S0,4.486,0,10s4.486,10,10,10c2.577,0,4.922-.988,6.697-2.596l6.449,6.449c.098,.098,.226,.146,.354,.146s.256-.049,.354-.146c.195-.195,.195-.512,0-.707ZM1,10C1,5.038,5.038,1,10,1s9,4.038,9,9-4.037,9-9,9S1,14.962,1,10Z"
      fill={color}
    />
  </Svg>
);


const HomeIcon = ({ size = 24, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.702,8.948L15.01,1.154c-1.717-1.542-4.303-1.543-6.042,.021L1.297,8.948c-.836,.849-1.297,1.971-1.297,3.161v8.391c0,1.93,1.57,3.5,3.5,3.5H20.5c1.93,0,3.5-1.57,3.5-3.5V12.109c0-1.19-.461-2.313-1.298-3.161Zm-6.702,14.052H8v-6c0-2.206,1.794-4,4-4s4,1.794,4,4v6Zm7-2.5c0,1.379-1.121,2.5-2.5,2.5h-3.5v-6c0-2.757-2.243-5-5-5s-5,2.243-5,5v6H3.5c-1.378,0-2.5-1.121-2.5-2.5V12.109c0-.926,.358-1.799,1.009-2.458L9.659,1.898c.67-.604,1.511-.903,2.349-.903,.831,0,1.658,.295,2.312,.883l7.671,7.773c.65,.659,1.009,1.532,1.009,2.458v8.391Z"
      fill={color}
    />
  </Svg>
);

const CompareIcon = ({ size = 24, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M24,4.5c0-1.93-1.57-3.5-3.5-3.5s-3.5,1.57-3.5,3.5c0,1.76,1.306,3.221,3,3.464v9.536c0,.827-.673,1.5-1.5,1.5h-6.157l3.056-3.056-.707-.707-3.256,3.256c-.281,.281-.436,.655-.436,1.053s.155,.771,.436,1.052l3.256,3.256,.707-.707-3.146-3.146h6.247c1.378,0,2.5-1.122,2.5-2.5V7.964c1.694-.243,3-1.704,3-3.464Zm-3.5,2.5c-1.378,0-2.5-1.122-2.5-2.5s1.122-2.5,2.5-2.5,2.5,1.122,2.5,2.5-1.122,2.5-2.5,2.5Zm-7.936-3.553L9.308,.192l-.707,.707,3.102,3.101H5.5c-1.378,0-2.5,1.122-2.5,2.5v9.536c-1.694,.243-3,1.704-3,3.464,0,1.93,1.57,3.5,3.5,3.5s3.5-1.57,3.5-3.5c0-1.76-1.306-3.221-3-3.464V6.5c0-.827,.673-1.5,1.5-1.5h6.203l-3.102,3.101,.707,.707,3.256-3.255c.581-.581,.581-1.525,0-2.105ZM6,19.5c0,1.378-1.122,2.5-2.5,2.5s-2.5-1.122-2.5-2.5,1.122-2.5,2.5-2.5,2.5,1.122,2.5,2.5Z"
      fill={color}
    />
  </Svg>
);

const AddPrescriptionIcon = ({ size = 24, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="m13,15v-4h-4v-1h4v-4h1v4h4v1h-4v4h-1ZM24,2.5v12.707l-5.793,5.793H3V2.5c0-1.379,1.121-2.5,2.5-2.5h16c1.379,0,2.5,1.121,2.5,2.5ZM4,20h13v-6h6V2.5c0-.827-.673-1.5-1.5-1.5H5.5c-.827,0-1.5.673-1.5,1.5v17.5Zm18.793-5h-4.793v4.793l4.793-4.793ZM1,4.514c-.604.456-1,1.172-1,1.986v17.5h18v-1H1V4.514Z"
      fill={color}
    />
  </Svg>
);

const ProfileIcon = ({ size = 24, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12,12c2.21,0,4-1.79,4-4s-1.79-4-4-4-4,1.79-4,4,1.79,4,4,4Zm0,2c-2.67,0-8,1.34-8,4v2h16v-2c0-2.66-5.33-4-8-4Z"
      fill={color}
    />
  </Svg>
);

const FilterIcon = ({ size = 24, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M1.5,6.227H3.925c.199,2.411,1.861,2.704,3.132,2.704s2.932-.293,3.132-2.704h12.312c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5H10.188c-.199-2.411-1.861-2.704-3.132-2.704s-2.932,.293-3.132,2.704H1.5c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5ZM7.056,3.523c1.362,0,2.151,.36,2.151,2.204s-.789,2.204-2.151,2.204-2.151-.36-2.151-2.204,.789-2.204,2.151-2.204Z"
      fill={color}
    />
    <Path
      d="M22.5,11.5h-2.425c-.199-2.411-1.861-2.704-3.132-2.704s-2.932,.293-3.132,2.704H1.5c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5H13.812c.199,2.411,1.861,2.704,3.132,2.704s2.932-.293,3.132-2.704h2.425c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5Zm-5.556,2.704c-1.362,0-2.151-.36-2.151-2.204s.789-2.204,2.151-2.204,2.151,.36,2.151,2.204-.789,2.204-2.151,2.204Z"
      fill={color}
    />
    <Path
      d="M22.5,17.773H10.188c-.199-2.411-1.861-2.704-3.132-2.704s-2.932,.293-3.132,2.704H1.5c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5H3.925c.199,2.41,1.862,2.703,3.132,2.703s2.932-.293,3.132-2.703h12.312c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5Zm-15.444,2.703c-1.362,0-2.151-.36-2.151-2.203s.789-2.204,2.151-2.204,2.151,.36,2.151,2.204-.789,2.203-2.151,2.203Z"
      fill={color}
    />
  </Svg>
);

export default function MainPage() {
  const { isLoggedIn, user } = useAuth();
  
  const getGreetingMessage = () => {
    const currentHour = new Date().getHours();
    
    if (currentHour >= 2 && currentHour < 12) {
      return 'Magandang Umaga,';
    } else if (currentHour >= 12 && currentHour < 18) {
      return 'Magandang Hapon,';
    } else {
      return 'Magandang Gabi,';
    }
  };
  
  const [currentBanner, setCurrentBanner] = useState(0);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  // Log user details for debugging backend connection
  React.useEffect(() => {
    if (isLoggedIn && user) {
      console.log('🔍 CURRENT USER DETAILS:');
      console.log('📱 User ID/Username:', user.username);
      console.log('📧 Email:', user.email);
      console.log('👤 First Name:', user.firstName);
      console.log('👤 Last Name:', user.lastName);
      console.log('📞 Phone:', user.phone);
      console.log('✅ Onboarding Completed:', user.hasCompletedOnboarding);
      console.log('🕐 Timestamp:', new Date().toISOString());
      console.log('🔗 Full User Object:', JSON.stringify(user, null, 2));
      
      // Test backend connection
      testBackendConnection();
    } else {
      console.log('❌ No user logged in or user data missing');
    }
  }, [isLoggedIn, user]);

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      console.log('🌐 Testing backend connection...');
      const response = await apiService.testConnection();
      console.log('✅ Backend connection test result:', {
        success: response.success,
        message: response.message,
        data: response.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.log('❌ Backend connection test failed:', error);
    }
  };

  // Handle prescription upload
  const handlePrescriptionUpload = () => {
    console.log('📋 Opening prescription upload modal...');
    setShowPrescriptionModal(true);
  };

  const handlePrescriptionSuccess = (prescriptionId: string) => {
    console.log('✅ Prescription uploaded successfully:', prescriptionId);
    // Here you can add logic to create an order with the prescription
    // For now, we'll just log the success
  };

  const handlePrescriptionModalClose = () => {
    console.log('❌ Closing prescription upload modal...');
    setShowPrescriptionModal(false);
  };

  // Mock data for categories
  const categories = [
    'Pain Relief', 'Cold & Flu', 'Vitamins', 'Skin Care', 
    'Digestive', 'Heart Health', 'Diabetes', 'Allergy'
  ];

  // Mock data for best selling medicines
  const bestSellingMedicines = [
    { id: 1, name: 'Paracetamol 500mg', price: '₱10.99', image: require('../assets/paracetamol.png') },
    { id: 2, name: 'Ibuprofen 200mg', price: '₱75.49', image: require('../assets/ibuprofen.png') },
    { id: 3, name: 'Vitamin C 1000mg', price: '$12.99', image: 'green' },
    { id: 4, name: 'Aspirin 75mg', price: '$4.99', image: 'green' },
  ];

  // Mock banner data
  const banners = [
    { 
      id: 1, 
      type: 'featured',
      discount: 'PharmaGo',
      title: 'Local Pharmacy',
      subtitle: 'Delivered with care',
      ctaText: 'Shop now',
      image: require('../assets/carousel1.png'),
      gradientColors: ['#9DD49D', '#B8E6B8', '#C8F0C8', '#F8BBD9']
    },
    { id: 2, color: '#00bf63' },
    { id: 3, color: '#00bf63' },
    { id: 4, color: '#00bf63' },
  ];

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.content}>
          <Text style={styles.title}>Not Logged In</Text>
          <Text style={styles.subtitle}>Please log in to continue.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderBanner = ({ item, index }: { item: any; index: number }) => {
    if (item.type === 'featured') {
      return (
        <LinearGradient
          colors={item.gradientColors}
          locations={[0, 0.33, 0.66, 1]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerLeft}>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{item.discount}</Text>
              </View>
              <Text style={styles.bannerTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
              <TouchableOpacity 
                style={styles.bannerCtaButton}
                onPress={() => router.push('/supersearch' as any)}
              >
                <Text style={styles.bannerCtaText}>{item.ctaText}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bannerRight}>
              <Image
                source={item.image}
                style={styles.bannerImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </LinearGradient>
      );
    }
    
    return (
      <View style={[styles.banner, { backgroundColor: item.color }]} />
    );
  };

  const renderCategory = ({ item }: { item: string }) => (
    <TouchableOpacity style={styles.categoryItem}>
      <Text style={styles.categoryText}>{item}</Text>
    </TouchableOpacity>
  );


  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFD4EF4A', '#D4FFE24A']}
      locations={[0, 0.5, 0.6]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logowhite.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>{getGreetingMessage()}</Text>
              <Text style={styles.userNameText}>
                {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1).toLowerCase() : 'User'}
              </Text>
            </View>
          </View>
          
          <View style={styles.rightButtonsContainer}>
            <TouchableOpacity style={styles.cartButton}>
              <Image
                source={require('../assets/cartwhite.png')}
                style={styles.cartIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.notificationButton}>
              <Image
                source={require('../assets/bellwhite.png')}
                style={styles.notificationIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Search Field */}
        <View style={styles.searchContainer}>
          <TouchableOpacity 
            style={styles.searchField}
            onPress={() => router.push('/supersearch' as any)}
            activeOpacity={0.7}
          >
            <SearchIcon size={20} color="#999999" />
            <View style={styles.searchInputContainer}>
              <View style={styles.customPlaceholder}>
                <Text style={styles.placeholderText}>Search for </Text>
                <Text style={styles.placeholderHighlight}>medicines</Text>
                <Text style={styles.placeholderText}> and more..</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <FilterIcon size={20} color="#999999" />
          </TouchableOpacity>
        </View>

        {/* Carousel Banners */}
        <View style={styles.carouselContainer}>
          <FlatList
            data={banners}
            renderItem={renderBanner}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const bannerWidth = 320 + 15; // width + marginRight
              const index = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
              setCurrentBanner(index);
            }}
            style={styles.bannerList}
            contentContainerStyle={styles.bannerListContent}
            snapToInterval={335} // width + marginRight for smooth snapping
            snapToAlignment="start"
            decelerationRate="fast"
          />
          
          {/* Carousel Navigator Dots */}
          <View style={styles.dotsContainer}>
            {banners.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentBanner && styles.activeDot
                ]}
              />
            ))}
          </View>
        </View>

        {/* Prescription Upload Section */}
        <View style={styles.prescriptionSection}>
          <Image
            source={require('../assets/prescription.png')}
            style={styles.prescriptionIcon}
            resizeMode="contain"
          />
          <View style={styles.prescriptionContent}>
            <Text style={styles.prescriptionTitle}>Order Via Prescription</Text>
            <Text style={styles.prescriptionDescription}>
              Order your medication and upload{'\n'}your prescription easily.
            </Text>
          </View>
          <TouchableOpacity style={styles.uploadButton} onPress={handlePrescriptionUpload}>
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={categories}
            renderItem={renderCategory}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Best Selling Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.medicinesGrid}>
            {bestSellingMedicines.map((medicine) => (
              <TouchableOpacity key={medicine.id} style={styles.medicineCard}>
                <TouchableOpacity style={styles.heartIcon}>
                  <Text style={styles.heartIconText}>♡</Text>
                </TouchableOpacity>
                {typeof medicine.image === 'string' ? (
                  <View style={[styles.medicineImage, { backgroundColor: medicine.image }]} />
                ) : (
                  <Image source={medicine.image} style={styles.medicineImage} resizeMode="cover" />
                )}
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{medicine.name}</Text>
                  <Text style={styles.medicinePrice}>{medicine.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom spacing for navigation bar */}
        <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.bottomNavItem, styles.activeNavItem]}>
          <HomeIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottomNavItem}
          onPress={() => router.push('/order-history' as any)}
        >
          <CompareIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.bottomNavItem}>
          <AddPrescriptionIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.push('/profile' as any)}>
          <ProfileIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      </SafeAreaView>

      {/* Prescription Upload Modal */}
      <PrescriptionUploadModal
        visible={showPrescriptionModal}
        onClose={handlePrescriptionModalClose}
        onSuccess={handlePrescriptionSuccess}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingBottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 24,
  },
  username: {
    fontSize: 18,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  userInfo: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 24,
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 20,
  },
  // Top Navigation Bar
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 0,
    backgroundColor: 'transparent',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    
  },
  greetingContainer: {
    marginLeft: 0,
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 12,
    color: '#666',
    fontFamily: fontFamily.light,
    marginBottom: 0,
  },
  userNameText: {
    fontSize: 18,
    color: '#00BF63',
    fontFamily: fontFamily.heavy,
    fontWeight: 'bold',
  },
  logo: {
    width: 50,
    height: 50,
    backgroundColor: '#00bf63',
    borderRadius: 25,
    marginRight: 10,
   
  },
  rightButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartIcon: {
    width: 20,
    height: 20,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    width: 20,
    height: 20,
  },
  
  // Scroll Container
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for bottom navigation
  },
  
  // Search Field
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 20,
  },
  searchInputContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  customPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  placeholderText: {
    fontSize: 12,
    color: '#999999',
   
  },
  placeholderHighlight: {
    fontSize: 12,
    color: '#00bf63',
    fontWeight: '600',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 15,
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  
  // Carousel Banners
  carouselContainer: {
    marginBottom: 20,
  },
  bannerList: {
    paddingHorizontal: 0, // Remove padding from container
  },
  bannerListContent: {
    paddingHorizontal: 20, // Add padding to content
  },
  banner: {
    width: 320, // Fixed width for consistent sizing
    height: 180,
    borderRadius: 25,
    marginRight: 15, // Keep margin for spacing
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#00bf63',
    width: 20,
    borderRadius: 10,
  },
  
  // Featured Banner Content
  bannerContent: {
    flexDirection: 'row',
    flex: 1,
    padding: 5,
    alignItems: 'center',
  },
  bannerLeft: {
    flex: 1.2,
    justifyContent: 'center',
    marginLeft: 10,
    paddingRight: 10,
  },
  bannerRight: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    left: 10,
  },
  discountBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  discountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
  },
  bannerTitle: {
    fontSize: 20,
    fontFamily: fontFamily.heavy,
    color: '#212B2A',
    marginBottom: 0,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 12,
  },
  bannerCtaButton: {
    backgroundColor: '#212B2A',
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerCtaText: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#FFFFFF',
  },
  bannerImage: {
    width: 140,
    height: 140,
    marginRight: 30,
    
  },
  
  // Prescription Upload Section
  prescriptionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    padding: 5,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  prescriptionIcon: {
    width: 60,
    height: 60,
    marginRight: 5,
  },
  prescriptionContent: {
    flex: 1,
  },
  prescriptionTitle: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#333333',
    marginBottom: 3,
  },
  prescriptionDescription: {
    fontSize: 11,
    color: '#999999',
    lineHeight: 13,
  },
  uploadButton: {
    backgroundColor: '#00bf63',
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 5,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fontFamily.heavy,
  },
  
  // Section Container
  sectionContainer: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fontFamily.heavy,
    color: '#333333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#00bf63',
    fontWeight: '500',
  },
  
  // Categories
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0F0E0',
  },
  categoryText: {
    fontSize: 14,
    color: '#444444',
    fontFamily: fontFamily.light,
  },
  
  // Best Selling Medicines
  medicinesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  medicineCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    position: 'relative',
  },
  heartIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  heartIconText: {
    fontSize: 18,
    color: '#FF6B6B',
  },
  medicineImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },
  medicineInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicineName: {
    fontSize: 14,
    fontFamily: fontFamily.heavy,
    color: '#333333',
    flex: 1,
    marginRight: 10,
  },
  medicinePrice: {
    fontSize: 16,
    fontFamily: fontFamily.heavy,
    color: '#00bf63',
  },
  
  // Bottom Navigation Bar
  bottomNav: {
    position: 'absolute',
    bottom: 40,
    left: 75,
    right: 75,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 40,
    paddingVertical: 5,
    paddingHorizontal: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  bottomNavItem: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    paddingVertical: 25,
    paddingHorizontal: 25,
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeNavItem: {
    backgroundColor: '#00bf63',
  },
  bottomNavIcon: {
    // SVG icons handle their own styling
  },
  
  // Bottom Spacing
  bottomSpacing: {
    height: 20,
  },
});
