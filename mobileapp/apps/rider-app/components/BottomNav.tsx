import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

type BottomNavKey = 'home' | 'navigation' | 'chat' | 'profile';

interface BottomNavProps {
  active: BottomNavKey;
}

const navConfig = {
  home: {
    label: 'Home',
    icon: require('../assets/home.png'),
  },
  navigation: {
    label: 'Navigation',
    icon: require('../assets/navigation.png'),
  },
  chat: {
    label: 'Chat',
    icon: require('../assets/chat.png'),
  },
  profile: {
    label: 'Profile',
    icon: require('../assets/profile.png'),
  },
} satisfies Record<BottomNavKey, { label: string; icon: ReturnType<typeof require> }>;

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();

  const handlePress = (key: BottomNavKey) => {
    if (key === active) {
      return;
    }

    switch (key) {
      case 'home':
        router.push('/home/' as any);
        break;
      case 'navigation':
        router.push('/navigation/' as any);
        break;
      case 'chat':
        Alert.alert('Coming Soon', 'Chat will be available in a future update.');
        break;
      case 'profile':
        router.push('/profile/' as any);
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.bottomNav}>
      {(Object.keys(navConfig) as BottomNavKey[]).map((key) => {
        const { icon, label } = navConfig[key];
        const isActive = key === active;
        return (
          <TouchableOpacity
            key={key}
            style={styles.navItem}
            onPress={() => handlePress(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Image source={icon} style={styles.navIcon} resizeMode="contain" />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  navIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#00BF63',
    fontWeight: '600',
  },
});


