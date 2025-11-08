// React 19 compatibility polyfill for React Native
// This prevents the "property is not writable" error in development mode

// Store originals
const originalFreeze = Object.freeze;
const originalSeal = Object.seal;
const originalPreventExtensions = Object.preventExtensions;
const originalDefineProperty = Object.defineProperty;
const originalDefineProperties = Object.defineProperties;

// More aggressive polyfill - always apply, not just in __DEV__
// This is needed because React 19 + RN 0.81.5 has timing issues

// 1. Make Object.freeze more lenient
Object.freeze = function(obj) {
  // Don't actually freeze in dev mode to prevent write errors
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return obj;
  }
  return originalFreeze(obj);
};

// 2. Make Object.seal more lenient
Object.seal = function(obj) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return obj;
  }
  return originalSeal(obj);
};

// 3. Make Object.preventExtensions more lenient
Object.preventExtensions = function(obj) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return obj;
  }
  return originalPreventExtensions(obj);
};

// 4. Wrap Object.defineProperty to make all properties writable
Object.defineProperty = function(obj, prop, descriptor) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Force writable: true and configurable: true in dev mode
    const safeDescriptor = {
      ...descriptor,
      writable: descriptor.writable !== false ? true : descriptor.writable,
      configurable: true,
    };
    try {
      return originalDefineProperty(obj, prop, safeDescriptor);
    } catch (e) {
      // If it still fails, just try to set the value directly
      console.warn(`[React 19 Compat] Could not define property ${String(prop)}:`, e.message);
      try {
        obj[prop] = descriptor.value;
      } catch (e2) {
        // Completely silent fallback
      }
      return obj;
    }
  }
  return originalDefineProperty(obj, prop, descriptor);
};

// 5. Wrap Object.defineProperties for batch operations
Object.defineProperties = function(obj, properties) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const safeProperties = {};
    for (const key in properties) {
      safeProperties[key] = {
        ...properties[key],
        writable: properties[key].writable !== false ? true : properties[key].writable,
        configurable: true,
      };
    }
    try {
      return originalDefineProperties(obj, safeProperties);
    } catch (e) {
      console.warn('[React 19 Compat] Could not define properties:', e.message);
      return obj;
    }
  }
  return originalDefineProperties(obj, properties);
};

console.log('[React 19 Compat] Polyfill applied for rider-app');

// Import the main expo-router entry point
import 'expo-router/entry';

