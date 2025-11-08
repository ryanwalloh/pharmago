// ⚠️ NUCLEAR OPTION: React 19 + RN 0.81.5 compatibility polyfill
// This completely disables property freezing in ALL modes to prevent crashes
// React 19.1.0 is incompatible with RN 0.81.5's initialization sequence

console.log('[React 19 Compat] Starting polyfill installation...');

// Store originals
const originalFreeze = Object.freeze;
const originalSeal = Object.seal;
const originalPreventExtensions = Object.preventExtensions;
const originalDefineProperty = Object.defineProperty;
const originalDefineProperties = Object.defineProperties;

// NUCLEAR: Completely disable freezing (no __DEV__ check)
Object.freeze = function(obj) {
  // Never actually freeze - just return the object as-is
  return obj;
};

Object.seal = function(obj) {
  // Never actually seal - just return the object as-is
  return obj;
};

Object.preventExtensions = function(obj) {
  // Never prevent extensions - just return the object as-is
  return obj;
};

// NUCLEAR: Always make properties writable (no __DEV__ check)
Object.defineProperty = function(obj, prop, descriptor) {
  // Always make properties writable and configurable
  const safeDescriptor = {
    ...descriptor,
    writable: true,
    configurable: true,
  };
  
  try {
    return originalDefineProperty(obj, prop, safeDescriptor);
  } catch (e) {
    // Triple fallback strategy
    try {
      // Try direct assignment
      obj[prop] = descriptor.value;
      return obj;
    } catch (e2) {
      // Last resort: try with original descriptor but mark as handled
      try {
        return originalDefineProperty(obj, prop, { ...descriptor, configurable: true });
      } catch (e3) {
        // Complete silent failure - just return the object
        return obj;
      }
    }
  }
};

Object.defineProperties = function(obj, properties) {
  const safeProperties = {};
  for (const key in properties) {
    safeProperties[key] = {
      ...properties[key],
      writable: true,
      configurable: true,
    };
  }
  
  try {
    return originalDefineProperties(obj, safeProperties);
  } catch (e) {
    // Fallback: define properties one by one
    for (const key in safeProperties) {
      try {
        Object.defineProperty(obj, key, safeProperties[key]);
      } catch (e2) {
        // Skip this property
      }
    }
    return obj;
  }
};

console.log('[React 19 Compat] ✅ Polyfill installed successfully - all freezing disabled');

// Import the main expo-router entry point
import 'expo-router/entry';

