import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      // Clear API auth token if used
      apiService.setAuthToken(null);
      await logout();
      router.replace('/');
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user?.username || '-'}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || '-'}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || '-'}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user?.phone || '-'}</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.replace('/home' as any)}>
          <HomeIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomNavItem}>
          <CompareIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomNavItem}>
          <AddPrescriptionIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.bottomNavItem, styles.activeNavItem]} onPress={() => router.push('/profile' as any)}>
          <ProfileIcon size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
  },
  value: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDEDED',
    marginVertical: 12,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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


