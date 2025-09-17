# Mobile App Library Installation Guide

## Overview
This guide documents all libraries and dependencies installed in the PharmaGo mobile application to prevent duplication and ensure consistent development environment setup.

## Table of Contents
1. [Core Dependencies](#core-dependencies)
2. [UI and Styling Libraries](#ui-and-styling-libraries)
3. [Camera and Media Libraries](#camera-and-media-libraries)
4. [Authentication and Storage](#authentication-and-storage)
5. [Development Tools](#development-tools)
6. [Installation Commands](#installation-commands)
7. [Configuration Files](#configuration-files)

## Core Dependencies

### React Native and Expo
```bash
# Core framework
npm install expo@~51.0.0
npm install react@18.2.0
npm install react-native@0.74.5

# Navigation
npm install expo-router@~3.5.0
```

### TypeScript Support
```bash
# TypeScript and type definitions
npm install --save-dev typescript
npm install --save-dev @types/react
npm install --save-dev @types/react-native
```

## UI and Styling Libraries

### Custom Fonts
```bash
# Font loading
npm install expo-font
```

**Font Files Installed:**
- `Nexa-ExtraLight.ttf`
- `Nexa-Heavy.ttf`

**Configuration in `app.json`:**
```json
{
  "expo": {
    "fonts": [
      "./assets/fonts/Nexa-ExtraLight.ttf",
      "./assets/fonts/Nexa-Heavy.ttf"
    ]
  }
}
```

### SVG Support
```bash
# SVG rendering
npm install react-native-svg
```

**Usage Example:**
```typescript
import Svg, { Path } from 'react-native-svg';

const CustomIcon = ({ size = 20, color = '#999999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="..." fill={color} />
  </Svg>
);
```

### Vector Icons
```bash
# Icon components
npm install @expo/vector-icons
```

## Camera and Media Libraries

### Camera Functionality
```bash
# Camera access
npm install expo-camera
```

**Configuration in `app.json`:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to take prescription photos.",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone for video recording."
        }
      ]
    ]
  }
}
```

### Image Picker
```bash
# Image selection from gallery and camera
npm install expo-image-picker
```

**Configuration in `app.json`:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to select prescription images."
        }
      ]
    ]
  }
}
```

### File System
```bash
# File system operations
npm install expo-file-system
```

### Media Library (Deprecated)
```bash
# Note: This library is deprecated
# Use expo-image-picker instead
npm uninstall expo-media-library
```

**Important**: `expo-media-library` has been removed due to deprecation warnings. Use `expo-image-picker` for all media operations.

## Authentication and Storage

### Async Storage
```bash
# Persistent data storage
npm install @react-native-async-storage/async-storage
```

**Usage Example:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store data
await AsyncStorage.setItem('user', JSON.stringify(userData));

// Retrieve data
const storedData = await AsyncStorage.getItem('user');
```

### Secure Storage (Optional)
```bash
# Secure token storage
npm install expo-secure-store
```

## Development Tools

### Code Quality
```bash
# Linting and formatting
npm install --save-dev eslint
npm install --save-dev prettier
npm install --save-dev @typescript-eslint/eslint-plugin
npm install --save-dev @typescript-eslint/parser
```

### Development Server
```bash
# Development tools
npm install --save-dev @expo/cli
```

## Installation Commands

### Complete Installation Script
```bash
# Navigate to mobile app directory
cd mobileapp

# Install core dependencies
npm install expo@~51.0.0 react@18.2.0 react-native@0.74.5
npm install expo-router@~3.5.0

# Install UI libraries
npm install expo-font react-native-svg @expo/vector-icons

# Install camera and media
npm install expo-camera expo-image-picker expo-file-system

# Install storage
npm install @react-native-async-storage/async-storage

# Install development tools
npm install --save-dev typescript @types/react @types/react-native
npm install --save-dev eslint prettier @typescript-eslint/eslint-plugin

# Install Expo CLI globally (if not already installed)
npm install -g @expo/cli
```

### Platform-Specific Installation
```bash
# For iOS (if using bare React Native)
cd ios && pod install

# For Android (if using bare React Native)
cd android && ./gradlew clean
```

## Configuration Files

### package.json Dependencies
```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "expo-router": "~3.5.0",
    "expo-font": "~12.0.0",
    "react-native-svg": "15.2.0",
    "@expo/vector-icons": "^14.0.0",
    "expo-camera": "~15.0.0",
    "expo-image-picker": "~15.0.0",
    "expo-file-system": "~17.0.0",
    "@react-native-async-storage/async-storage": "1.23.1"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "~18.2.0",
    "@types/react-native": "^0.73.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### app.json Configuration
```json
{
  "expo": {
    "name": "PharmaGo Customer App",
    "slug": "pharmago-customer",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.pharmago.customer"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.pharmago.customer",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to take prescription photos.",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone for video recording."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to select prescription images."
        }
      ]
    ],
    "fonts": [
      "./assets/fonts/Nexa-ExtraLight.ttf",
      "./assets/fonts/Nexa-Heavy.ttf"
    ]
  }
}
```

## Version Compatibility

### Expo SDK 51 Compatibility
- **React**: 18.2.0
- **React Native**: 0.74.5
- **TypeScript**: 5.0+
- **Node.js**: 18.0+

### Library Versions
- **expo-camera**: ~15.0.0
- **expo-image-picker**: ~15.0.0
- **expo-file-system**: ~17.0.0
- **react-native-svg**: 15.2.0
- **@react-native-async-storage/async-storage**: 1.23.1

## Troubleshooting

### Common Installation Issues

#### 1. Package Conflicts
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### 2. Expo Plugin Errors
```bash
# Clean Expo cache
npx expo install --fix

# Rebuild native code
npx expo prebuild --clean
```

#### 3. TypeScript Errors
```bash
# Update TypeScript definitions
npm install --save-dev @types/react@latest @types/react-native@latest
```

### Platform-Specific Issues

#### iOS
```bash
# Clean iOS build
cd ios && xcodebuild clean

# Reinstall pods
cd ios && pod install --repo-update
```

#### Android
```bash
# Clean Android build
cd android && ./gradlew clean

# Clear Gradle cache
rm -rf ~/.gradle/caches
```

## Development Workflow

### 1. Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd pharmago/mobileapp

# Install dependencies
npm install

# Start development server
npx expo start
```

### 2. Adding New Libraries
```bash
# Install new library
npm install <library-name>

# If it's an Expo library, use expo install
npx expo install <library-name>

# Update app.json if needed for plugins
# Rebuild if native code changed
npx expo prebuild --clean
```

### 3. Updating Libraries
```bash
# Check for updates
npm outdated

# Update specific library
npm install <library-name>@latest

# Update all libraries (use with caution)
npm update
```

## Best Practices

### 1. Library Management
- Always use `npx expo install` for Expo-compatible libraries
- Keep `package.json` and `app.json` synchronized
- Document any custom configurations

### 2. Version Control
- Commit `package.json` and `package-lock.json`
- Don't commit `node_modules`
- Use `.gitignore` for build artifacts

### 3. Documentation
- Update this guide when adding new libraries
- Document any custom configurations
- Include troubleshooting steps for new libraries

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: Development Team
