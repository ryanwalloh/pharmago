// Dynamic Expo config to keep secrets out of app.json
// Reads Google Maps key from env

// Prefer dotenv if available; fall back to process.env
try {
  require('dotenv').config({ path: './.env' });
} catch (_) {
  // dotenv not available, will use process.env directly
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCCuDLJMhB-23kQiXYpXwi-yYGvKz7OgSQ';
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51SMVqmJAiW57btKoSHW90pbFU3X7p6gFFxSFBq1IpatB6vD3LtUsjDShOV470HrGTZnuIUyQt0PDperJ13XfG1ue00iSbUd3Dp';

/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'PharmaGo',
    slug: 'pharmago-customer',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mobileapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.pharmago.customer',
      config: {
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#FFFFFF',
        foregroundImage: './assets/images/icon.png',
        backgroundImage: './assets/images/icon.png',
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
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
      package: 'com.pharmago.customer',
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.com.pharmago.customer',
          enableGooglePay: true,
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/icon.png',
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
      reactCompiler: false,
    },
    androidStatusBar: {
      backgroundColor: '#ffffff',
    },
    extra: {
      // Also expose to JS runtime for reverse geocoding fallback
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
      eas: {
        projectId: '638794ca-099f-4a87-8c41-e4bde462cd36',
      },
    },
  },
};


