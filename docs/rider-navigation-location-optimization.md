# Rider Navigation Location Optimization Plan

## Goal
Reduce unnecessary location updates from the rider app while keeping the `app/navigation/index.tsx` view near real-time. We will send updates to `/api/rider/update-location/` only when the rider has moved a meaningful distance or when a heartbeat interval elapses.

## Guiding Constraints
- **Target surface:** `mobileapp/apps/rider-app/app/navigation/index.tsx` only for the initial rollout.
- **UI responsiveness:** All geolocation and network calls must remain asynchronous; no work on the UI thread. Use debounced/queued async calls to avoid blocking.
- **Baseline cadence:** Maintain a heartbeat (e.g. 30 seconds) even if the rider is stationary, so the backend keeps riders marked online.
- **Movement detection:** Use the Haversine formula (or another great-circle distance calculation) to compare the last sent coordinate with the current GPS reading.

## Implementation Steps

1. **Shared Utilities**
   - Add a small helper to compute great-circle distance (Haversine) between two `{ latitude, longitude }` points.
   - Expose configurable constants for `MIN_DISTANCE_METERS`, `POLL_INTERVAL_MS`, and `HEARTBEAT_INTERVAL_MS`.

2. **Location Tracker Service**
   - Create a `locationTracker` module under `app/navigation` (or a nearby `services` folder) that:
     - Subscribes to Expo Location updates (`watchPositionAsync` or interval polling).
     - Stores the last sent coordinate and timestamp in module state.
     - Emits events/callbacks when either (a) distance moved >= threshold, or (b) heartbeat interval exceeded.
     - Keeps all work async; throttle/queue updates to avoid overlapping requests.

3. **API Update Flow**
   - Build a dedicated async function (e.g. `pushRiderLocationUpdate`) responsible for POSTing to `/api/rider/update-location/`.
   - Integrate retry/backoff logic and logging so suppressed vs. transmitted updates can be measured later.
   - Ensure the function can be reused by other screens when we expand the rollout.

4. **Navigation Screen Integration**
   - Update `app/navigation/index.tsx` to:
     - Initialise the tracker when the rider goes online / mounts the screen.
     - Listen for movement or heartbeat signals and call `pushRiderLocationUpdate`.
     - Handle lifecycle: pause tracker on unmount, resume when returning.
     - Surface connection state if desired (e.g. show when GPS is paused).

5. **Testing & Verification**
   - Unit-test the distance helper with representative coordinates.
   - Add lightweight tests/mocks for the tracker logic (e.g. movement threshold, heartbeat).
   - Manual QA on a device or simulator: confirm the backend receives fewer updates but WebSocket navigation view remains responsive.

6. **Telemetry & Future Rollout**
   - Add optional logging or analytics counters (e.g. number of updates suppressed, sent, retries) to guide tuning.
   - Once validated on navigation, repeat the integration for other screens that rely on rider location.

## Rollout Notes
- Keep the existing 30-second polling fallback until the new tracker proves stable.
- Feature-flag the new behaviour if we want to toggle riders between old/new logic quickly.
- Monitor backend logs for reduced update volume and ensure there are no gaps in location data for active deliveries.


