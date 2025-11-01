import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily } from '../../utils/fonts';
import PrescriptionUploadModal from '../../components/PrescriptionUploadModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showPrescriptionModal, setShowPrescriptionModal] = React.useState(false);

  const handleLogout = async () => {
    try {
      // Clear API auth token if used
      apiService.setAuthToken(null);
      await logout();
      router.replace('/');
    } catch {}
  };

  const handlePrescriptionUpload = () => {
    console.log('📋 Opening prescription upload modal...');
    setShowPrescriptionModal(true);
  };

  const handlePrescriptionSuccess = (prescriptionId: string) => {
    console.log('✅ Prescription uploaded successfully:', prescriptionId);
    setShowPrescriptionModal(false);
  };

  const handlePrescriptionModalClose = () => {
    console.log('❌ Closing prescription upload modal...');
    setShowPrescriptionModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Profile Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image 
                source={require('../../assets/profile.png')}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.profileName}>
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'}
            </Text>
            <Text style={styles.profileUsername}>@{user?.username || 'username'}</Text>
          </View>

          {/* Personal Information Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={20} color="#00bf63" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>
                  {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Not set'}
                </Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={20} color="#00bf63" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{user?.email || 'Not set'}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="call-outline" size={20} color="#00bf63" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{user?.phone || 'Not set'}</Text>
              </View>
            </View>

            {user?.customer_id && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="card-outline" size={20} color="#00bf63" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Customer ID</Text>
                    <Text style={styles.infoValue}>#{user.customer_id}</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Account Settings Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="location-outline" size={20} color="#666666" />
                <Text style={styles.settingText}>Saved Addresses</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999999" />
            </TouchableOpacity>

            <View style={styles.infoDivider} />

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => router.push('/order-history' as any)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="receipt-outline" size={20} color="#666666" />
                <Text style={styles.settingText}>Order History</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999999" />
            </TouchableOpacity>

            <View style={styles.infoDivider} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="lock-closed-outline" size={20} color="#666666" />
                <Text style={styles.settingText}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999999" />
            </TouchableOpacity>
          </View>

          {/* App Information Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>App Information</Text>
            
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#666666" />
                <Text style={styles.settingText}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999999" />
            </TouchableOpacity>

            <View style={styles.infoDivider} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="document-text-outline" size={20} color="#666666" />
                <Text style={styles.settingText}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999999" />
            </TouchableOpacity>

            <View style={styles.infoDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="information-circle-outline" size={20} color="#666666" />
                <Text style={styles.settingText}>App Version</Text>
              </View>
              <Text style={styles.versionText}>1.0.0</Text>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* Bottom padding for nav bar */}
          <View style={{ height: 30 }} />
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.replace('/home' as any)}>
          <HomeIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bottomNavItem}
          onPress={() => router.push('/order-history' as any)}
        >
          <CompareIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bottomNavItem}
          onPress={handlePrescriptionUpload}
        >
          <AddPrescriptionIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.bottomNavItem, styles.activeNavItem]}>
          <ProfileIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Prescription Upload Modal */}
      <PrescriptionUploadModal
        visible={showPrescriptionModal}
        onClose={handlePrescriptionModalClose}
        onSuccess={handlePrescriptionSuccess}
      />
    </SafeAreaView>
  );
}

// SVG Icon Components (mirroring MainPage)
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2B2B2B',
    fontFamily: fontFamily.heavy,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% responsive padding
    paddingVertical: 20,
    paddingBottom: 140, // Extra space for bottom nav
  },
  
  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  avatarContainer: {
    width: Math.min(SCREEN_WIDTH * 0.25, 100), // Responsive, max 100
    height: Math.min(SCREEN_WIDTH * 0.25, 100),
    borderRadius: Math.min(SCREEN_WIDTH * 0.125, 50),
    backgroundColor: '#B9F8B7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    padding: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.09, 36), // Responsive, max 36
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: fontFamily.heavy,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2B2B2B',
    marginBottom: 4,
    fontFamily: fontFamily.heavy,
  },
  profileUsername: {
    fontSize: 14,
    color: '#999999',
    fontFamily: fontFamily.light,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B2B2B',
    marginBottom: 16,
    fontFamily: fontFamily.heavy,
  },

  // Info Rows (with icons)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
    fontFamily: fontFamily.light,
  },
  infoValue: {
    fontSize: 16,
    color: '#2B2B2B',
    fontWeight: '600',
    fontFamily: fontFamily.heavy,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16,
  },

  // Settings Rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 15,
    color: '#2B2B2B',
    fontFamily: fontFamily.light,
  },
  versionText: {
    fontSize: 14,
    color: '#999999',
    fontFamily: fontFamily.light,
  },

  // Logout Button (GREEN!)
  logoutButton: {
    backgroundColor: '#00bf63',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: fontFamily.heavy,
  },
  // Bottom Navigation Bar (mirrors MainPage)
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
    borderColor: 'rgba(0, 0, 0, 0.3)'
  },
  bottomNavItem: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    paddingVertical: 25,
    paddingHorizontal: 25,
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  activeNavItem: {
    backgroundColor: '#00bf63'
  }
});


