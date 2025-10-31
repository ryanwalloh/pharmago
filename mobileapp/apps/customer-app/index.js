// React 19 compatibility polyfill for React Native
// This prevents the "property is not writable" error in development mode

// Store the original Object.freeze
const originalFreeze = Object.freeze;

// Override Object.freeze in development to be more lenient
if (__DEV__) {
  Object.freeze = function(obj) {
    // Still freeze the object, but don't throw errors on write attempts
    return originalFreeze(obj);
  };
  
  // Prevent React 19 from freezing props too aggressively
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    try {
      return originalDefineProperty(obj, prop, descriptor);
    } catch (e) {
      // Silently ignore property definition errors in dev mode
      console.warn(`[React 19 Compat] Could not define property ${prop}:`, e.message);
      return obj;
    }
  };
}

// Import the main expo-router entry point
import 'expo-router/entry';

