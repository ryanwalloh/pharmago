// Dynamic Expo config for rider-app
// Reads Google Maps key from env

// Prefer dotenv if available; fall back to process.env
try {
  require('dotenv').config({ path: './.env' });
} catch (_) {}

// ✅ FIX: Hardcoded fallback API key (same as customer app)
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCCuDLJMhB-23kQiXYpXwi-yYGvKz7OgSQ';

/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  expo: {
    owner: 'ryamazingw',
    name: 'PharmGo Rider',
    slug: 'pharmago-rider',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mobileapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,  // ✅ REQUIRED: Reanimated 4.x requires New Architecture
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.pharmago.rider',
      config: {
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ],
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
      package: 'com.pharmago.rider',
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow $(PRODUCT_NAME) to use your location for delivery tracking and navigation.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow $(PRODUCT_NAME) to access your photos.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: false,  // ✅ SAFETY FIX: Disable experimental feature (was: true)
    },
    fonts: [
      './assets/fonts/Nexa-ExtraLight.ttf',
      './assets/fonts/Nexa-Heavy.ttf',
    ],
    extra: {
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      eas: {
        projectId: '7cdc768d-ac59-494a-a333-f2c202436d7c',
      },
    },
  },
};

