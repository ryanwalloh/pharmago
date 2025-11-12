import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';

import {
  Coordinate,
  getLocationConfig,
  haversineDistanceMeters,
} from './locationUtils';

type TrackerReason = 'initial' | 'movement' | 'heartbeat';

export interface TrackerUpdatePayload {
  coordinate: Coordinate;
  location: Location.LocationObject;
  reason: TrackerReason;
  distanceFromLast?: number;
}

export interface TrackerOptions {
  onUpdate: (payload: TrackerUpdatePayload) => void | Promise<void>;
  onError?: (error: Error) => void;
  /**
   * Request foreground permissions before starting.
   * Set to false if the caller already ensured permissions exist.
   */
  requestPermissions?: boolean;
}

export interface TrackerController {
  start(): Promise<void>;
  stop(): void;
  isRunning(): boolean;
  getLastSentCoordinate(): Coordinate | null;
}

interface TrackerState {
  lastObservedLocation: Location.LocationObject | null;
  lastSentCoordinate: Coordinate | null;
  lastSentTimestamp: number | null;
}

const DEFAULT_STATE: TrackerState = {
  lastObservedLocation: null,
  lastSentCoordinate: null,
  lastSentTimestamp: null,
};

export function createLocationTracker(options: TrackerOptions): TrackerController {
  const config = getLocationConfig();
  let state: TrackerState = { ...DEFAULT_STATE };
  let watchSubscription: Location.LocationSubscription | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let appStateListener: ReturnType<typeof AppState.addEventListener> | null = null;
  let running = false;
  let dispatching = false;
  let pendingDispatch: TrackerUpdatePayload | null = null;

  const dispatchError = (error: unknown) => {
    if (error instanceof Error) {
      options.onError?.(error);
    } else {
      options.onError?.(new Error(String(error)));
    }
  };

  const enqueueDispatch = (payload: TrackerUpdatePayload) => {
    pendingDispatch = payload;
    if (!dispatching) {
      void processDispatchQueue();
    }
  };

  const processDispatchQueue = async () => {
    if (!pendingDispatch || dispatching) {
      return;
    }

    dispatching = true;
    const payload = pendingDispatch;
    pendingDispatch = null;

    state.lastSentCoordinate = payload.coordinate;
    state.lastSentTimestamp = Date.now();

    try {
      await Promise.resolve(options.onUpdate(payload));
    } catch (error) {
      dispatchError(error);
    } finally {
      dispatching = false;
      if (pendingDispatch) {
        void processDispatchQueue();
      }
    }
  };

  const handleLocationUpdate = (location: Location.LocationObject) => {
    state.lastObservedLocation = location;

    const coordinate: Coordinate = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    if (!state.lastSentCoordinate) {
      enqueueDispatch({ coordinate, location, reason: 'initial' });
      return;
    }

    const distanceFromLast = haversineDistanceMeters(state.lastSentCoordinate, coordinate);

    if (distanceFromLast >= config.minDistanceMeters) {
      enqueueDispatch({ coordinate, location, reason: 'movement', distanceFromLast });
    }
  };

  const handleHeartbeat = () => {
    if (
      !state.lastObservedLocation ||
      !state.lastSentTimestamp ||
      !state.lastSentCoordinate
    ) {
      return;
    }

    const timeSinceLastSent = Date.now() - state.lastSentTimestamp;
    if (timeSinceLastSent < config.heartbeatIntervalMs) {
      return;
    }

    const coordinate: Coordinate = {
      latitude: state.lastObservedLocation.coords.latitude,
      longitude: state.lastObservedLocation.coords.longitude,
    };

    const distanceFromLast = haversineDistanceMeters(state.lastSentCoordinate, coordinate);

    enqueueDispatch({
      coordinate,
      location: state.lastObservedLocation,
      reason: 'heartbeat',
      distanceFromLast,
    });
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatTimer = setInterval(handleHeartbeat, config.pollIntervalMs);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const startWatch = async () => {
    if (watchSubscription) {
      return;
    }

    try {
      watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: config.pollIntervalMs,
          distanceInterval: Math.max(1, Math.floor(config.minDistanceMeters / 2)),
          mayShowUserSettingsDialog: true,
        },
        handleLocationUpdate,
      );
    } catch (error) {
      dispatchError(error);
    }
  };

  const stopWatch = () => {
    if (watchSubscription) {
      watchSubscription.remove();
      watchSubscription = null;
    }
  };

  const handleAppStateChange = (nextState: AppStateStatus) => {
    if (!running) {
      return;
    }

    if (nextState === 'active') {
      void startWatch();
      startHeartbeat();
    } else if (nextState === 'background' || nextState === 'inactive') {
      stopWatch();
      stopHeartbeat();
    }
  };

  const start = async () => {
    if (running) {
      return;
    }

    running = true;

    if (options.requestPermissions) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        running = false;
        dispatchError(new Error('Location permission not granted'));
        return;
      }
    }

    await startWatch();
    startHeartbeat();

    appStateListener = AppState.addEventListener('change', handleAppStateChange);
  };

  const stop = () => {
    if (!running) {
      return;
    }

    running = false;
    stopWatch();
    stopHeartbeat();
    state = { ...DEFAULT_STATE };

    if (appStateListener) {
      appStateListener.remove();
      appStateListener = null;
    }
  };

  return {
    start,
    stop,
    isRunning: () => running,
    getLastSentCoordinate: () => state.lastSentCoordinate,
  };
}


