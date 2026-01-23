/**
 * 📱 Capacitor Module Exports
 * 
 * Point d'entrée pour toutes les fonctionnalités Capacitor.
 */

export { initCapacitor, cleanupCapacitor, isCapacitorNative } from './init';
export { 
  usePlatform, 
  useHaptics, 
  useNativeCamera, 
  usePushNotifications, 
  useStatusBar,
  type Platform,
  type DeviceType,
  type PlatformInfo,
} from '../hooks/usePlatform';
