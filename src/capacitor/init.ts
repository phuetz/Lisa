/**
 * 📱 Capacitor Initialization
 * 
 * Initialise les plugins Capacitor au démarrage de l'application.
 * Ce fichier doit être importé dans main.tsx.
 */

import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Vérifie si l'app tourne dans Capacitor (natif)
 */
export function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' && 
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

/**
 * Initialise Capacitor et ses plugins
 */
export async function initCapacitor(): Promise<void> {
  if (!isCapacitorNative()) {
    console.log('[Capacitor] Running in web mode');
    return;
  }

  console.log('[Capacitor] Initializing native plugins...');

  try {
    // Configure Status Bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1a1a2e' });
    console.log('[Capacitor] StatusBar configured');
  } catch (e) {
    console.warn('[Capacitor] StatusBar not available:', e);
  }

  try {
    // Hide splash screen after app is ready
    await SplashScreen.hide();
    console.log('[Capacitor] SplashScreen hidden');
  } catch (e) {
    console.warn('[Capacitor] SplashScreen not available:', e);
  }

  // Handle app state changes
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('[Capacitor] App state changed:', isActive ? 'active' : 'background');
  });

  // Handle back button on Android
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  // Handle deep links
  App.addListener('appUrlOpen', ({ url }) => {
    console.log('[Capacitor] Deep link opened:', url);
    // Handle deep link routing here
    const path = new URL(url).pathname;
    if (path) {
      window.location.href = path;
    }
  });

  console.log('[Capacitor] Native plugins initialized');
}

/**
 * Nettoie les listeners Capacitor
 */
export async function cleanupCapacitor(): Promise<void> {
  if (!isCapacitorNative()) return;

  await App.removeAllListeners();
  console.log('[Capacitor] Listeners cleaned up');
}

export default initCapacitor;
