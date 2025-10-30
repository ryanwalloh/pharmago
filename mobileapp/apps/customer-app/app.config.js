// Dynamic Expo config to keep secrets out of app.json
// Reads Google Maps key from env

// Prefer dotenv if available; fall back to process.env
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: './.env' });
} catch (_) {}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51SMVqmJAiW57btKoSHW90pbFU3X7p6gFFxSFBq1IpatB6vD3LtUsjDShOV470HrGTZnuIUyQt0PDperJ13XfG1ue00iSbUd3Dp';

/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'PharmGo Customer',
    slug: 'pharmago-customer',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mobileapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.pharmago.customer',
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
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ],
      config: {
        googleMaps: GOOGLE_MAPS_API_KEY ? { apiKey: GOOGLE_MAPS_API_KEY } : undefined,
      },
      package: 'com.pharmago.customer',
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      '@stripe/stripe-react-native',
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
        'expo-camera',
        {
          cameraPermission:
            'Allow $(PRODUCT_NAME) to access your camera to take prescription photos.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow $(PRODUCT_NAME) to access your photos to select prescription images.',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow $(PRODUCT_NAME) to use your location to set your delivery address.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    fonts: [
      './assets/fonts/Nexa-ExtraLight.ttf',
      './assets/fonts/Nexa-Heavy.ttf',
    ],
    extra: {
      // Also expose to JS runtime for reverse geocoding fallback
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
    },
  },
};


