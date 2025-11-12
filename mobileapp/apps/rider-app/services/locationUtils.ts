export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface LocationConfig {
  minDistanceMeters: number;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

export const DEFAULT_MIN_DISTANCE_METERS = 15;
export const DEFAULT_POLL_INTERVAL_MS = 5000;
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;

const ENV_KEYS = {
  minDistance: 'EXPO_PUBLIC_RIDER_LOCATION_MIN_DISTANCE_METERS',
  pollInterval: 'EXPO_PUBLIC_RIDER_LOCATION_POLL_INTERVAL_MS',
  heartbeatInterval: 'EXPO_PUBLIC_RIDER_LOCATION_HEARTBEAT_INTERVAL_MS',
} as const;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function parseEnvNumber(envValue: string | undefined, fallback: number): number {
  if (!envValue) {
    return fallback;
  }

  const parsed = Number(envValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function haversineDistanceMeters(from: Coordinate, to: Coordinate): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export function getLocationConfig(): LocationConfig {
  return {
    minDistanceMeters: parseEnvNumber(
      process.env[ENV_KEYS.minDistance],
      DEFAULT_MIN_DISTANCE_METERS,
    ),
    pollIntervalMs: parseEnvNumber(
      process.env[ENV_KEYS.pollInterval],
      DEFAULT_POLL_INTERVAL_MS,
    ),
    heartbeatIntervalMs: parseEnvNumber(
      process.env[ENV_KEYS.heartbeatInterval],
      DEFAULT_HEARTBEAT_INTERVAL_MS,
    ),
  };
}


