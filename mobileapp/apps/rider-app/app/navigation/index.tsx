import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';

import BottomNav from '../../components/BottomNav';
import {
  riderLocationSocket,
  RiderLocationConnectionStatus,
  RiderLocationUpdate,
} from '../../services/riderLocationSocket';
import {
  createLocationTracker,
  TrackerUpdatePayload,
} from '../../services/locationTracker';
import { sendRiderLocationUpdate } from '../../services/riderLocationUpdateService';

const fallbackRegion: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function RiderNavigation() {
  const [riderId, setRiderId] = useState<number | null>(null);
  const [location, setLocation] = useState<RiderLocationUpdate | null>(null);
  const [status, setStatus] =
    useState<RiderLocationConnectionStatus>('idle');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(fallbackRegion);
  const [isFollowing, setIsFollowing] = useState(true);

  const googleMapsApiKey =
    Constants.expoConfig?.extra?.googleMapsApiKey ??
    // @ts-expect-error: legacy manifest support
    Constants.manifest?.extra?.googleMapsApiKey;

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionData = await AsyncStorage.getItem('rider_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session?.rider?.id) {
            setRiderId(Number(session.rider.id));
          }
        }
      } catch (error) {
        console.error('❌ Failed to load rider session:', error);
        setErrorMessage('Unable to load rider profile.');
      }
    };

    loadSession();
  }, []);

  const updateMapRegion = useCallback((latitude: number, longitude: number, options?: { force?: boolean }) => {
    setMapRegion((prev) => {
      const shouldUpdate = options?.force || isFollowing;
      if (!shouldUpdate) {
        return prev;
      }

      const next: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      if (
        Math.abs(next.latitude - prev.latitude) < 0.000001 &&
        Math.abs(next.longitude - prev.longitude) < 0.000001
      ) {
        return prev;
      }

      return next;
    });
  }, [isFollowing]);

  const handleLocationUpdate = useCallback(
    (update: RiderLocationUpdate) => {
      setLocation(update);
      if (update.updated_at) {
        setLastUpdated(update.updated_at);
      } else {
        setLastUpdated(new Date().toISOString());
      }

      updateMapRegion(update.latitude, update.longitude);
    },
    [updateMapRegion]
  );

  const applyOptimisticLocation = useCallback(
    (coordinate: { latitude: number; longitude: number }, meta?: Partial<RiderLocationUpdate>) => {
      setLocation((prev) => ({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        heading: meta?.heading ?? prev?.heading,
        speed: meta?.speed ?? prev?.speed,
        accuracy: meta?.accuracy ?? prev?.accuracy,
        updated_at: meta?.updated_at ?? prev?.updated_at ?? new Date().toISOString(),
      }));
      setLastUpdated(meta?.updated_at ?? new Date().toISOString());
      updateMapRegion(coordinate.latitude, coordinate.longitude);
    },
    [updateMapRegion]
  );

  const handleStatusChange = useCallback(
    (nextStatus: RiderLocationConnectionStatus) => {
      setStatus(nextStatus);
      if (nextStatus === 'connected') {
        setErrorMessage(null);
      }
    },
    []
  );

  const handleError = useCallback((error: Error) => {
    setErrorMessage(error.message);
  }, []);

  const handleTrackerError = useCallback((error: Error) => {
    console.error('❌ Location tracker error:', error);
    setErrorMessage(error.message);
  }, []);

  const handleTrackerUpdate = useCallback(
    async (payload: TrackerUpdatePayload) => {
      if (!riderId) {
        return;
      }

      const isoTimestamp = new Date(payload.location.timestamp).toISOString();
      applyOptimisticLocation(
        {
          latitude: payload.coordinate.latitude,
          longitude: payload.coordinate.longitude,
        },
        {
          heading: payload.location.coords.heading ?? undefined,
          speed: payload.location.coords.speed ?? undefined,
          accuracy: payload.location.coords.accuracy ?? undefined,
          updated_at: isoTimestamp,
        }
      );
      setErrorMessage(null);

      const result = await sendRiderLocationUpdate({
        riderId,
        coordinate: payload.coordinate,
        locationTimestamp: payload.location.timestamp,
        heading: payload.location.coords.heading ?? undefined,
        speed: payload.location.coords.speed ?? undefined,
        accuracy: payload.location.coords.accuracy ?? undefined,
        reason: payload.reason,
        distanceFromLast: payload.distanceFromLast,
      });

      if (!result.success) {
        setErrorMessage(result.error ?? 'Unable to update location.');
      }
    },
    [applyOptimisticLocation, riderId]
  );

  useFocusEffect(
    useCallback(() => {
      if (!riderId) {
        return;
      }

      const disconnect = riderLocationSocket.connect(riderId, {
        onUpdate: handleLocationUpdate,
        onStatusChange: handleStatusChange,
        onError: handleError,
      });

      return () => {
        disconnect?.();
      };
    }, [handleLocationUpdate, handleStatusChange, handleError, riderId])
  );

  useFocusEffect(
    useCallback(() => {
      if (!riderId) {
        return;
      }

      const tracker = createLocationTracker({
        onUpdate: handleTrackerUpdate,
        onError: handleTrackerError,
        requestPermissions: true,
      });

      tracker
        .start()
        .catch((error) => {
          console.error('❌ Failed to start location tracker:', error);
          setErrorMessage(error instanceof Error ? error.message : 'Failed to start location tracker');
        });

      return () => {
        tracker.stop();
      };
    }, [handleTrackerError, handleTrackerUpdate, riderId])
  );

  const statusLabel = (() => {
    switch (status) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection issue';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Idle';
    }
  })();

  const toggleFollow = useCallback(() => {
    setIsFollowing((prev) => {
      const next = !prev;
      if (next && location) {
        updateMapRegion(location.latitude, location.longitude, { force: true });
      }
      return next;
    });
  }, [location, updateMapRegion]);

  const followLabel = isFollowing ? 'Following' : 'Follow';

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={(region, details?: { isGesture?: boolean }) => {
          setMapRegion(region);
          if (details?.isGesture) {
            setIsFollowing(false);
          }
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        {...(Platform.OS === 'web' && googleMapsApiKey
          ? { googleMapsApiKey }
          : {})}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Image
              source={require('../../assets/RiderCustomMarker.png')}
              style={styles.marker}
              resizeMode="contain"
            />
          </Marker>
        )}
      </MapView>

      <View style={styles.statusContainer}>
        <View style={styles.statusHeader}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followButtonActive]}
            onPress={toggleFollow}
            accessibilityRole="button"
            accessibilityState={{ selected: isFollowing }}
          >
            <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
              {followLabel}
            </Text>
          </TouchableOpacity>
        </View>
        {lastUpdated && (
          <Text style={styles.timestamp}>
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </Text>
        )}
        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}
        {!location && !errorMessage && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.loadingText}>Waiting for location...</Text>
          </View>
        )}
        {!riderId && (
          <Text style={styles.errorText}>
            Rider profile not found. Please return to Home.
          </Text>
        )}
      </View>

      <BottomNav active="navigation" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    width: 40,
    height: 40,
  },
  statusContainer: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#00BF63',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  followButtonActive: {
    backgroundColor: '#00BF63',
    borderColor: '#00BF63',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: '#0B2D1C',
  },
  timestamp: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 4,
  },
  errorText: {
    color: '#FFCDD2',
    fontSize: 12,
    marginTop: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});


