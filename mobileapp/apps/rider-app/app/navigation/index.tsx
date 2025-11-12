import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import Constants from 'expo-constants';

import BottomNav from '../../components/BottomNav';
import { apiService } from '../../../customer-app/services/api';
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
import DispatchOfferCard from '../../components/DispatchOfferCard';
import {
  dispatchService,
  DispatchOffer,
} from '../../../customer-app/services/dispatchService';

const fallbackRegion: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const mapStyle = [
  {
    featureType: 'administrative.land_parcel',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'administrative.neighborhood',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'poi.business',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'labels',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'transit',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'water',
    elementType: 'labels.text',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
];

interface PharmacyLocation {
  id: number;
  pharmacy_name: string;
  barangay?: string | null;
  city?: string | null;
  latitude: number;
  longitude: number;
}

export default function RiderNavigation() {
  const router = useRouter();
  const [riderId, setRiderId] = useState<number | null>(null);
  const [location, setLocation] = useState<RiderLocationUpdate | null>(null);
  const [status, setStatus] =
    useState<RiderLocationConnectionStatus>('idle');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(fallbackRegion);
  const [isFollowing, setIsFollowing] = useState(true);
  const [pharmacies, setPharmacies] = useState<PharmacyLocation[]>([]);
  const [pharmaciesLoading, setPharmaciesLoading] = useState(false);
  const [pharmaciesError, setPharmaciesError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentDispatchOffer, setCurrentDispatchOffer] = useState<DispatchOffer | null>(null);
  const [showDispatchCard, setShowDispatchCard] = useState(false);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [rejectingOffer, setRejectingOffer] = useState(false);
  const [isRiderOnline, setIsRiderOnline] = useState(false);

  const googleMapsApiKey =
    Constants.expoConfig?.extra?.googleMapsApiKey ??
    // @ts-expect-error: legacy manifest support
    Constants.manifest?.extra?.googleMapsApiKey;

  const fetchPharmacies = useCallback(
    async (attempt = 1) => {
      if (attempt === 1) {
        setPharmaciesLoading(true);
        setPharmaciesError(null);
      } else {
        setPharmaciesError(`Retrying pharmacy locations (attempt ${attempt}/3)...`);
      }

      try {
        const response = await apiService.getPharmacies();
        if (response.success && response.data) {
          const raw = (response.data as any)?.data ?? response.data;
          if (Array.isArray(raw)) {
            const withCoords = raw.filter(
              (item: any) =>
                typeof item.latitude === 'number' &&
                typeof item.longitude === 'number'
            );
            setPharmacies(
              withCoords.map((item: any) => ({
                id: item.id,
                pharmacy_name: item.pharmacy_name ?? 'Pharmacy',
                barangay: item.barangay ?? null,
                city: item.city ?? null,
                latitude: item.latitude,
                longitude: item.longitude,
              }))
            );
            setPharmaciesError(null);
          }
        } else if (response.error) {
          throw new Error(response.error);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load pharmacies';
        if (attempt < 3) {
          retryTimeoutRef.current = setTimeout(() => {
            fetchPharmacies(attempt + 1);
          }, 5000);
        } else {
          setPharmaciesError(message);
        }
      } finally {
        setPharmaciesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionData = await AsyncStorage.getItem('rider_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session?.rider?.id) {
            setRiderId(Number(session.rider.id));
          }
          const activityStatus = session?.rider?.activity_status;
          if (activityStatus) {
            setIsRiderOnline(activityStatus === 'online');
          }
        }
      } catch (error) {
        console.error('❌ Failed to load rider session:', error);
        setErrorMessage('Unable to load rider profile.');
      }
    };

    loadSession();
    fetchPharmacies();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchPharmacies]);

  const handleDispatchOffer = useCallback((offer: DispatchOffer) => {
    setCurrentDispatchOffer(offer);
    setShowDispatchCard(true);
  }, []);

  const handleOfferCancelled = useCallback((offerId: string) => {
    setCurrentDispatchOffer((prev) => {
      if (prev?.offer_id === offerId) {
        setShowDispatchCard(false);
        return null;
      }
      return prev;
    });
  }, []);

  const handleAcceptOffer = useCallback(async () => {
    if (!currentDispatchOffer || !riderId) return;
    setAcceptingOffer(true);
    try {
      const result = await dispatchService.acceptOffer(
        currentDispatchOffer.offer_id,
        riderId
      );
      if (result.success) {
        setShowDispatchCard(false);
        const assignmentId = result.assignment_id;
        if (assignmentId) {
          router.push(`/delivery/${assignmentId}` as any);
        }
        setCurrentDispatchOffer(null);
      } else if (result.message) {
        setErrorMessage(result.message);
      }
    } catch (error) {
      console.error('❌ Error accepting offer:', error);
      setErrorMessage('Failed to accept offer.');
    } finally {
      setAcceptingOffer(false);
    }
  }, [currentDispatchOffer, riderId, router]);

  const handleRejectOffer = useCallback(async () => {
    if (!currentDispatchOffer || !riderId) return;
    setRejectingOffer(true);
    try {
      const result = await dispatchService.rejectOffer(
        currentDispatchOffer.offer_id,
        riderId,
        'not_interested'
      );
      if (result.success) {
        setShowDispatchCard(false);
        setCurrentDispatchOffer(null);
      } else if (result.message) {
        setErrorMessage(result.message);
      }
    } catch (error) {
      console.error('❌ Error rejecting offer:', error);
      setErrorMessage('Failed to reject offer.');
    } finally {
      setRejectingOffer(false);
    }
  }, [currentDispatchOffer, riderId]);

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

  useFocusEffect(
    useCallback(() => {
      if (!riderId || !isRiderOnline) {
        return;
      }
      dispatchService.connectToDispatchChannel(
        riderId,
        handleDispatchOffer,
        handleOfferCancelled
      );

      return () => {
        dispatchService.disconnect();
      };
    }, [riderId, isRiderOnline, handleDispatchOffer, handleOfferCancelled])
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
        customMapStyle={mapStyle}
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
        {pharmacies.map((pharmacy) => (
          <Marker
            key={pharmacy.id}
            coordinate={{
              latitude: pharmacy.latitude,
              longitude: pharmacy.longitude,
            }}
            title={pharmacy.pharmacy_name}
            description={
              pharmacy.barangay && pharmacy.city
                ? `${pharmacy.barangay}, ${pharmacy.city}`
                : undefined
            }
          >
            <Image
              source={require('../../assets/PharmacyCustomMarker.png')}
              style={styles.pharmacyMarker}
              resizeMode="contain"
            />
          </Marker>
        ))}
      </MapView>

      {showDispatchCard && currentDispatchOffer && (
        <View style={styles.dispatchCardWrapper} pointerEvents="box-none">
          <View pointerEvents="auto">
            <DispatchOfferCard
              offer={currentDispatchOffer}
              onAccept={handleAcceptOffer}
              onReject={handleRejectOffer}
              accepting={acceptingOffer}
              rejecting={rejectingOffer}
              variant="compact"
              onExpired={() => {
                setShowDispatchCard(false);
                setCurrentDispatchOffer(null);
              }}
            />
          </View>
        </View>
      )}

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
        <Text style={styles.subtleText}>
          {pharmaciesLoading
            ? 'Loading pharmacies nearby...'
            : pharmacies.length > 0
              ? `${pharmacies.length} partner pharmacies nearby`
              : pharmaciesError
                ? pharmaciesError
                : 'No partner pharmacies found'}
        </Text>
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
  pharmacyMarker: {
    width: 32,
    height: 32,
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
  subtleText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
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
  dispatchCardWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 96,
    paddingHorizontal: 12,
  },
});


