Custom Marker Review
We manage per-marker load/error flags so we can toggle tracksViewChanges, show static pins if an asset fails, and avoid infinite re-renders once the bitmap is cached. This mirrors the pattern we used to stabilise custom icons on react-native-maps for the rider map.30:44:mobileapp/rider-app/components/OrderTracking.js

const [riderMarkerLoaded, setRiderMarkerLoaded] = useState(false);
const [restaurantMarkerLoaded, setRestaurantMarkerLoaded] = useState(false);
const [customerMarkerLoaded, setCustomerMarkerLoaded] = useState(false);
const [riderMarkerError, setRiderMarkerError] = useState(false);
const [restaurantMarkerError, setRestaurantMarkerError] = useState(false);
const [customerMarkerError, setCustomerMarkerError] = useState(false);

Each marker sets anchor={{ x: 0.5, y: 1 }} so the bottom of the graphic rests exactly on the coordinate. Android receives the PNG via the icon prop, while iOS renders the <Image> inside the marker with resizeMode="contain". We keep tracksViewChanges true only until the underlying <Image> fires onLoad/onLoadEnd, then flip the flag to eliminate redraw glitches, and we register onError to fall back to the platform pin with a red tint.1403:1469:mobileapp/rider-app/components/OrderTracking.js

{/* Rider Location - Custom Asset Marker */}
{riderLocation && (
  <Marker
    coordinate={riderLocation}
    title="Your Location"
    anchor={{ x: 0.5, y: 1 }}
    pinColor={riderMarkerError ? '#F43332' : undefined}
    tracksViewChanges={Platform.OS === 'ios' ? !riderMarkerLoaded : false}
    {...(Platform.OS === 'android' && !riderMarkerError ? { icon: require('../assets/ridermarker.png') } : {})}
  >
    {Platform.OS === 'ios' && !riderMarkerError && (
      <Image
        source={require('../assets/ridermarker.png')}
        style={styles.markerImage}
        resizeMode="contain"
        onLoad={() => setTimeout(() => setRiderMarkerLoaded(true), 0)}
        onLoadEnd={() => setTimeout(() => setRiderMarkerLoaded(true), 0)}
        onError={() => setRiderMarkerError(true)}
      />
    )}
  </Marker>
)}
// ... identical pattern for restaurant & customer markers ...

Styling constrains the bitmap to 48×48 inside a 60×60 container (with shadow/elevation), ensuring we never exceed Google Maps’ internal bitmap size limits. This padding helps prevent clipping and gives Android a deterministic target size before downscaling the asset.2166:2188:mobileapp/rider-app/components/OrderTracking.js


markerWrapper: {
  alignItems: 'center',
  justifyContent: 'center',
},
markerContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  width: 60,
  height: 60,
},
markerImage: {
  width: 48,
  height: 48,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
},


The customer app reuses the same asset strategy but without the load/error guards. Android still consumes the bitmap through icon, while iOS renders the <Image> child, keeping the anchor and resizeMode consistency. This simpler variant confirms the cross-platform approach works beyond the rider flow.552:584:mobileapp/customer-app/components/OrderTracking.js

{riderLocation && (
  <Marker
    coordinate={riderLocation}
    title="Your Rider"
    anchor={{ x: 0.5, y: 1 }}
    {...(Platform.OS === 'android' ? { icon: require('../assets/ridermarker.png') } : {})}
  >
    {Platform.OS === 'ios' && (
      <Image
        source={require('../assets/ridermarker.png')}
        style={styles.markerImage}
        resizeMode="contain"
      />
    )}
  </Marker>
)}

Assets live under mobileapp/rider-app/assets and mobileapp/customer-app/assets, exported at ~64×64 with transparent padding so the rendered footprint (48×48) preserves the pointer tail and avoids the “pizza slice” clipping we hit before.

The actual Prompt:
Context: React Native (Expo) project using react-native-maps. We render Google Maps markers in `mobileapp/rider-app/components/OrderTracking.js`. Android markers use the `icon` prop with PNG assets (48×48 effective size inside a 60×60 container). iOS renders the same PNG through a child `<Image>` so we can control `tracksViewChanges`. Each marker has `anchor={{x:0.5,y:1}}`, `resizeMode="contain"`, and load/error handlers that turn `tracksViewChanges` off once the bitmap is cached.

Issue to fix: a new pharmacy marker PNG shows only half of the image (looks clipped like a pizza slice) on the map. We’ve seen this before when Google Maps auto-scales a bitmap that exceeds the expected dimensions or when aspect ratios aren’t preserved on Android.

What I need:
1. Replicate our rider implementation (per-marker loaded/error flags, `tracksViewChanges` flip, `anchor={{0.5,1}}`, `resizeMode="contain"`). Confirm the new pharmacy marker follows the same pattern.
2. Inspect the PNG with `Image.resolveAssetSource()` (or in design tools) to verify intrinsic width/height and transparent padding. Downscale or re-export so the final dimensions are ≤48×48 (or adjust `styles.markerImage` to match the asset’s aspect ratio).
3. On Android, test rendering the pharmacy marker both through the `icon` prop and via a child `<Image>` (like we do on iOS). Use the child `<Image>` if the native `icon` path keeps clipping—this avoids Google’s internal bitmap crop.
4. Ensure `tracksViewChanges` temporarily stays true until the bitmap loads, then disable it to prevent flashing.
5. Validate on a physical Android device and on iOS. Confirm the entire marker silhouette (including any pointer tail/shadow) is visible with no slicing. Provide screenshots/GIFs and note any asset changes.

Deliverable: updated marker implementation (or asset tweaks) plus notes describing what fixed the clipping.