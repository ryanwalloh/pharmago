import { View, Image, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function LandingPage() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/login');
    }, 2000);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/riderlogo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
  },
  logo: {
    width: '80%',
    maxWidth: 300,
    height: 150,
  },
});
