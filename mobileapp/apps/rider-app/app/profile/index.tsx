import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../../components/BottomNav';

interface RiderUser {
  id: number;
  email: string;
  phone_number: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

export default function RiderProfile() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    'Nexa-ExtraLight': require('../../assets/fonts/Nexa-ExtraLight.ttf'),
    'Nexa-Heavy': require('../../assets/fonts/Nexa-Heavy.ttf'),
  });
  const [user, setUser] = useState<RiderUser | null>(null);
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadInitialSession = useCallback(async () => {
    try {
      const sessionData = await AsyncStorage.getItem('rider_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        setUser(session.user);
        setRiderProfile(session.rider);
        return;
      }

      const [cachedUserRaw, cachedProfileRaw] = await Promise.all([
        AsyncStorage.getItem('rider_user'),
        AsyncStorage.getItem('rider_profile'),
      ]);

      const cachedUser = cachedUserRaw ? JSON.parse(cachedUserRaw) : null;
      const cachedProfile = cachedProfileRaw ? JSON.parse(cachedProfileRaw) : null;

      if (cachedUser || cachedProfile) {
        if (cachedUser) setUser(cachedUser);
        if (cachedProfile) setRiderProfile(cachedProfile);
      }
    } catch (error) {
      console.error('Failed to load rider data:', error);
    }
  }, []);


  useEffect(() => {
    loadInitialSession();
  }, [loadInitialSession]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all session data
              await AsyncStorage.removeItem('rider_session');
              await AsyncStorage.removeItem('rider_user');
              await AsyncStorage.removeItem('rider_profile');
              await AsyncStorage.removeItem('auth_token');
              console.log('✅ Session cleared');
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  // Prioritize riderProfile data over user data
  const riderName = riderProfile?.first_name && riderProfile?.last_name
    ? `${riderProfile.first_name} ${riderProfile.last_name}` 
    : user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user?.email?.split('@')[0] || 'Rider';

  const profileInitial = riderName.charAt(0).toUpperCase();
  const totalDeliveriesDisplay = riderProfile?.total_deliveries ?? 0;
  const successRateDisplay = '0%';
  const ratingBadgeText = '0 Rating';
  const ratingStatDisplay = '⭐ 0.0';
  const joinedDateLabel = riderProfile?.verified_at
    ? `Partner since ${new Date(riderProfile.verified_at).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })}`
    : null;

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle='light-content' backgroundColor='#00BF63' />
        <ActivityIndicator size="large" color="#00BF63" />
        <Text style={styles.loadingText}>Loading experience...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00BF63" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00BF63"
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profileInitial}</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.profileName}>{riderName}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'N/A'}</Text>
          <Text style={styles.profilePhone}>{user?.phone_number || 'N/A'}</Text>
          
          {/* Rating Badge */}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={16} color="#FFA500" />
            <Text style={styles.ratingText}>{ratingBadgeText}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalDeliveriesDisplay}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{successRateDisplay}</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{ratingStatDisplay}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {joinedDateLabel ? (
          <Text style={styles.joinedDateText}>{joinedDateLabel}</Text>
        ) : null}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="person-outline" size={22} color="#2196F3" />
              </View>
              <Text style={styles.menuText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="card-outline" size={22} color="#FF9800" />
              </View>
              <Text style={styles.menuText}>Payment Methods</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="bicycle-outline" size={22} color="#9C27B0" />
              </View>
              <Text style={styles.menuText}>Vehicle Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="document-text-outline" size={22} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Documents</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="notifications-outline" size={22} color="#FF9800" />
              </View>
              <Text style={styles.menuText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#2196F3" />
              </View>
              <Text style={styles.menuText}>Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="language-outline" size={22} color="#9C27B0" />
              </View>
              <Text style={styles.menuText}>Language</Text>
            </View>
            <View style={styles.languageBadge}>
              <Text style={styles.languageText}>English</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="help-circle-outline" size={22} color="#F44336" />
              </View>
              <Text style={styles.menuText}>Help Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="chatbubble-outline" size={22} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="information-circle-outline" size={22} color="#2196F3" />
              </View>
              <Text style={styles.menuText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#F44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Version 1.0.0</Text>
        
        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav active="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Nexa-ExtraLight',
  },
  header: {
    backgroundColor: '#00BF63',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nexa-Heavy',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00BF63',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nexa-Heavy',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00BF63',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
    fontFamily: 'Nexa-Heavy',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    fontFamily: 'Nexa-ExtraLight',
  },
  profilePhone: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    fontFamily: 'Nexa-ExtraLight',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 4,
    fontFamily: 'Nexa-Heavy',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  statusBannerText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
    marginLeft: 8,
    fontFamily: 'Nexa-Heavy',
  },
  errorText: {
    marginHorizontal: 16,
    marginTop: 12,
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '500',
    fontFamily: 'Nexa-Heavy',
  },
  statsGrid: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00BF63',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Nexa-Heavy',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Nexa-ExtraLight',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F0',
  },
  joinedDateText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    color: '#666666',
    fontFamily: 'Nexa-ExtraLight',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 12,
    paddingLeft: 4,
    fontFamily: 'Nexa-Heavy',
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
    fontFamily: 'Nexa-Heavy',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  verifiedText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
    fontFamily: 'Nexa-Heavy',
  },
  languageBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  languageText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
    fontFamily: 'Nexa-Heavy',
  },
  logoutButton: {
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
    fontFamily: 'Nexa-Heavy',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999999',
    marginTop: 16,
    fontFamily: 'Nexa-ExtraLight',
  },
});


