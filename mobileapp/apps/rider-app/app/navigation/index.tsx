import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
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
  const [initialRegion, setInitialRegion] = useState<Region>(fallbackRegion);

  const mapRef = useRef<MapView>(null);
  const hasInitialCameraUpdate = useRef(false);

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

  const handleLocationUpdate = useCallback(
    (update: RiderLocationUpdate) => {
      setLocation(update);
      if (update.updated_at) {
        setLastUpdated(update.updated_at);
      } else {
        setLastUpdated(new Date().toISOString());
      }

      if (!hasInitialCameraUpdate.current) {
        hasInitialCameraUpdate.current = true;
        setInitialRegion({
          latitude: update.latitude,
          longitude: update.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }

      if (mapRef.current) {
        mapRef.current.animateCamera(
          {
            center: {
              latitude: update.latitude,
              longitude: update.longitude,
            },
            heading: Number.isFinite(update.heading ?? NaN)
              ? Number(update.heading)
              : undefined,
            pitch: 0,
            zoom: 16,
          },
          {
            duration: 750,
          }
        );
      }
    },
    []
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
    },
    []
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
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
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{statusLabel}</Text>
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
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
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


