# PharmGo Mobile Apps - Development Build Guide

This guide covers building development clients for both the Customer App and Rider App using EAS (Expo Application Services).

## Prerequisites

- EAS CLI installed globally: `npm install -g eas-cli`
- EAS account and login: `eas login`
- Android Studio (for Android builds) or Xcode (for iOS builds)

## Customer App

### Location
`mobileapp/apps/customer-app/`

### Features
- Prescription uploads with Cloudinary
- Medicine search and pharmacy browsing
- Cart and prescription orders
- Stripe payment integration (v0.50.3)
- Senior citizen discount functionality
- Google Maps integration

### Build Configuration

**App Identifiers:**
- **iOS Bundle ID:** `com.pharmago.customer`
- **Android Package:** `com.pharmago.customer`
- **EAS Project ID:** `e5d9e71b-338b-490e-8b22-4701372eec35`

**Key Dependencies:**
```json
"@stripe/stripe-react-native": "0.50.3",
"expo-dev-client": "~6.0.8",
"expo-image-picker": "~16.0.6",
"expo-camera": "~17.0.8",
"expo-location": "~19.0.7",
"react-native-maps": "1.20.1"
```

**Environment Variables:**
- `EXPO_PUBLIC_API_BASE` - Backend API URL
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe test key

### Build Commands

```bash
# Navigate to customer-app
cd mobileapp/apps/customer-app

# Build for Android (Development)
eas build --profile development --platform android

# Build for iOS (Development)
eas build --profile development --platform ios

# Install the development build on your device
# Android: Download the APK from EAS and install
# iOS: Download via TestFlight or direct install

# Start the development server
npx expo start --dev-client
```

---

## Rider App

### Location
`mobileapp/apps/rider-app/`

### Features
- Delivery tracking and navigation
- Order management
- Real-time location updates
- Google Maps integration

### Build Configuration

**App Identifiers:**
- **iOS Bundle ID:** `com.pharmago.rider`
- **Android Package:** `com.pharmago.rider`
- **EAS Project ID:** Will be generated on first build

**Key Dependencies:**
```json
"expo-dev-client": "~6.0.8",
"expo-location": "~19.0.7",
"expo-image-picker": "~17.0.8",
"react-native-maps": "1.20.1"
```

**Environment Variables:**
- `EXPO_PUBLIC_API_BASE` - Backend API URL
- `GOOGLE_MAPS_API_KEY` - Google Maps API key

### Build Commands

```bash
# Navigate to rider-app
cd mobileapp/apps/rider-app

# Configure EAS (first time only)
eas build:configure

# Build for Android (Development)
eas build --profile development --platform android

# Build for iOS (Development)
eas build --profile development --platform ios

# Install the development build on your device
# Android: Download the APK from EAS and install
# iOS: Download via TestFlight or direct install

# Start the development server
npx expo start --dev-client
```

---

## Common Issues and Solutions

### 1. Stripe Version Mismatch
**Error:** `Unresolved reference 'currentActivity'` in Kotlin compilation

**Solution:** Ensure `@stripe/stripe-react-native` is version `0.50.3` for Expo SDK 54
```bash
npm install @stripe/stripe-react-native@0.50.3 --save-exact
```

### 2. EAS Project Not Configured
**Error:** `EAS project not configured` or `Invalid UUID appId`

**Solution:** Run `eas build:configure` and manually add the generated project ID to `app.config.js`:
```javascript
extra: {
  eas: {
    projectId: 'YOUR_PROJECT_ID_HERE',
  },
}
```

### 3. Dynamic Config Write Error
**Error:** `Cannot automatically write to dynamic config at: app.config.js`

**Solution:** This is expected with `app.config.js`. Manually copy the project ID from the EAS output into your config file.

### 4. Google Maps Not Working
**Error:** Maps show blank or "For development purposes only" watermark

**Solution:** 
- Ensure `GOOGLE_MAPS_API_KEY` is set in your `.env` file
- Enable required APIs in Google Cloud Console:
  - Maps SDK for Android
  - Maps SDK for iOS
  - Geocoding API

### 5. Build Hanging or Timeout
**Solution:**
- Check EAS build queue: https://expo.dev/accounts/[username]/builds
- Cancel stuck builds and retry
- Ensure all dependencies are properly installed

---

## Development Workflow

1. **Make code changes** in your local environment
2. **Test locally** with `npx expo start`
3. **For native changes** (new dependencies, plugins):
   - Push changes to git
   - Rebuild with EAS: `eas build --profile development --platform android`
   - Install new build on device
   - Run `npx expo start --dev-client`
4. **For JavaScript/TypeScript changes only**:
   - Just reload the app (Cmd+R / Ctrl+R)
   - Or shake device and select "Reload"

---

## Building for Production

```bash
# Customer App - Production Build
cd mobileapp/apps/customer-app
eas build --profile production --platform android
eas build --profile production --platform ios

# Rider App - Production Build
cd mobileapp/apps/rider-app
eas build --profile production --platform android
eas build --profile production --platform ios
```

**Note:** Production builds require:
- Proper signing credentials (Android keystore, iOS certificates)
- Production API endpoints in environment variables
- Production Stripe keys
- App store/Play store listings

---

## Useful Commands

```bash
# Check installed package versions
npm list [package-name]

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# View EAS build logs
eas build:list

# Check app configuration
npx expo config --type public

# Doctor check for compatibility issues
npx expo-doctor
```

---

## Support and Resources

- **EAS Documentation:** https://docs.expo.dev/build/introduction/
- **Expo Dev Client:** https://docs.expo.dev/development/build/
- **Stripe React Native:** https://docs.stripe.com/payments/accept-a-payment?platform=react-native
- **React Native Maps:** https://github.com/react-native-maps/react-native-maps

---

**Last Updated:** October 31, 2025

