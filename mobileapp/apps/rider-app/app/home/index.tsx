import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RiderHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Load rider info saved on login; skip protected API calls for now
        try {
          const cachedUser = await AsyncStorage.getItem('rider_user');
          if (cachedUser) setUser(JSON.parse(cachedUser));
        } catch {}
      } catch (e) {
        setError('Failed to load rider details');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}> 
        <ActivityIndicator color="#00BF63" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rider Home</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.label}>User</Text>
        <Text style={styles.value}>{user ? JSON.stringify(user, null, 2) : '—'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
    marginBottom: 16,
  },
  error: {
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  label: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  value: {
    fontSize: 12,
    color: '#111827',
  },
});


