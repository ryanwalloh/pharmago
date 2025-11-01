# 📋 Pre-Build Checklist for Customer App

## ✅ Completed Setup

### 1. **EAS Configuration** ✓
- ✅ `eas.json` properly configured with preview and production profiles
- ✅ Environment variables set for API base URL
- ✅ Android APK build type configured
- ✅ iOS simulator build configured for preview
- ✅ Distribution set to "internal" for preview builds

### 2. **App Configuration** ✓
- ✅ `app.config.js` configured with:
  - App name: "PharmaGo"
  - Bundle identifier: `com.pharmago.customer`
  - Google Maps API keys (Android & iOS)
  - Stripe configuration
  - Camera, Location, and Image Picker permissions
  - Proper icon and splash screen

### 3. **Assets** ✓
All critical assets verified:
- ✅ `assets/login.png` - Login page background
- ✅ `assets/createaccount.png` - Signup page background
- ✅ `assets/welcomepage.png` - Welcome page background
- ✅ `assets/pharmalogo.png` - App logo
- ✅ `assets/images/icon.png` - App icon
- ✅ `assets/icon.png` - Splash screen icon

### 4. **Code Quality** ✓
- ✅ No TypeScript compilation errors
- ✅ No ESLint errors
- ✅ All imports properly resolved
- ✅ Fixed API service visibility (makeRequest/makeDirectRequest)
- ✅ Fixed prescription service type safety

### 5. **API Configuration** ✓
- ✅ Default API base URL: `https://pharmago-backend-production.up.railway.app`
- ✅ Fallback mechanism in place
- ✅ Environment variable support ready

### 6. **Features Implemented** ✓
- ✅ Welcome screen with login/signup flow
- ✅ Login page with background image and overlay
- ✅ Create account page with background image and overlay
- ✅ Main dashboard with categories and products
- ✅ Order history with active and recent orders
- ✅ Order tracking with real-time WebSocket updates
- ✅ Profile page with customer details
- ✅ Prescription upload modal
- ✅ Payment integration (Stripe)
- ✅ Google Maps integration
- ✅ Bottom navigation across all pages

---

## 🚀 Build Commands

### **Android Preview Build (Recommended)**
```bash
cd mobileapp/apps/customer-app
eas build --profile preview --platform android
```

### **iOS Preview Build (Simulator)**
```bash
cd mobileapp/apps/customer-app
eas build --profile preview --platform ios
```

### **Both Platforms**
```bash
cd mobileapp/apps/customer-app
eas build --profile preview --platform all
```

---

## 📱 Installation Instructions

### After Build Completes:

1. **Android (APK)**
   - Download the APK from the EAS build page
   - Install on your Android device
   - Allow installation from unknown sources if prompted

2. **iOS (Simulator)**
   - Download the `.tar.gz` file
   - Extract and drag the `.app` to your iOS Simulator
   - Or install via command: `xcrun simctl install booted path/to/app.app`

---

## ⚠️ Known Considerations

### Required for Runtime:
- ✅ Backend must be running on Railway
- ✅ Google Maps API key must be valid
- ✅ Stripe publishable key must be valid
- ✅ Device must have internet connection

### Permissions Required:
- ✅ Camera (for prescription photos)
- ✅ Photo Library (for prescription upload)
- ✅ Location (for delivery address)

---

## 🔍 Pre-Build Verification

Run these commands before building:

```bash
# Navigate to customer app
cd mobileapp/apps/customer-app

# Check for TypeScript errors
npx tsc --noEmit

# Check for linting errors
npm run lint

# Verify dependencies are installed
npm install
```

---

## 📦 Build Profile Details

### Preview Profile:
- **Purpose**: Internal testing and distribution
- **Android**: Release APK (installable on any device)
- **iOS**: Simulator build (for testing on Mac)
- **API Endpoint**: Railway production backend
- **Distribution**: Internal (EAS download link)

### Production Profile:
- **Purpose**: Production release to stores
- **Android**: APK or AAB for Play Store
- **iOS**: Release build for App Store
- **API Endpoint**: Railway production backend

---

## ✨ What's New in This Build

1. **Modern Welcome Flow**
   - Beautiful full-screen welcome page
   - Login/Signup with background images and overlays
   - Smooth navigation flow

2. **Enhanced UI/UX**
   - All pages responsive for different screen sizes
   - Custom fonts (Nexa) throughout
   - Professional design with shadows and gradients

3. **Complete Features**
   - Full order flow from search to checkout
   - Real-time order tracking with WebSocket
   - Prescription upload with camera/gallery
   - Stripe payment integration
   - Google Maps address selection

4. **Bug Fixes**
   - Fixed customer ID storage for cart orders
   - Fixed Stripe payment sheet display
   - Fixed pharmacy storefront image loading
   - Fixed category search functionality

---

## 🎯 Ready to Build!

All checks passed. You can proceed with the build command:

```bash
cd mobileapp/apps/customer-app
eas build --profile preview --platform android
```

Expected build time: **15-20 minutes**

Once complete, you'll receive a download link for the APK!

---

**Last Updated**: November 1, 2025  
**Version**: 1.0.0  
**Build Profile**: Preview  
**Target Platform**: Android/iOS

