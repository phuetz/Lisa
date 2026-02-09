/**
 * Network Configuration for Mobile/Web
 * Handles different network configurations for Capacitor (Android/iOS) vs Web
 */

import { Capacitor } from '@capacitor/core';

// ============================================================================
// 📱 CONFIGURATION MOBILE
// ============================================================================
// Pour connecter l'application mobile à LM Studio sur votre PC :
//
// OPTION 1 (Recommandée - Plus stable) : IP Réseau Local
// 1. Trouvez l'IP de votre PC (ex: ipconfig sur Windows -> IPv4 Address)
// 2. Remplacez 'localhost' ci-dessous par cette IP (ex: '192.168.1.25')
// 3. Dans LM Studio, activez "Serve on Local Network" (Listen on 0.0.0.0)
//
// OPTION 2 (Développement USB) : ADB Reverse
// 1. Laissez 'localhost' ci-dessous
// 2. Lancez : adb reverse tcp:1234 tcp:1234
// ============================================================================
const MOBILE_LM_STUDIO_HOST = 'localhost'; // <--- CHANGEZ CECI PAR VOTRE IP (ex: '192.168.1.15')
const DEFAULT_LM_STUDIO_PORT = '1234';

export interface NetworkConfig {
  lmStudioUrl: string;
  ollamaUrl: string;
  isNative: boolean;
  isElectron: boolean;
  platform: string;
}

/**
 * Detect if running in Electron desktop environment
 */
export function isRunningInElectron(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
}

/**
 * Detect if running in Capacitor native environment
 * More robust detection that works at runtime
 */
function isRunningOnMobile(): boolean {
  try {
    // Primary check: Capacitor API
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    // Fallback: Check if running in Capacitor WebView (lisa.ai hostname)
    if (typeof window !== 'undefined' && window.location.hostname === 'lisa.ai') {
      return true;
    }
    // Fallback: Check user agent for Android/iOS WebView
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get the appropriate base URL for LM Studio
 * - Web: Uses Vite proxy (/lmstudio) or localhost
 * - Android/iOS: Uses the PC's network IP address directly
 */
export function getLMStudioUrl(): string {
  const isNative = isRunningOnMobile();
  
  console.log('[NetworkConfig] isNative:', isNative, 'hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A');
  
  if (isRunningInElectron()) {
    // Electron: direct localhost, no proxy needed
    const url = `http://localhost:${DEFAULT_LM_STUDIO_PORT}/v1`;
    console.log('[NetworkConfig] Electron detected. Using LM Studio at:', url);
    return url;
  } else if (isNative) {
    // On mobile, use the configured host (localhost with ADB reverse, or specific LAN IP)
    const url = `http://${MOBILE_LM_STUDIO_HOST}:${DEFAULT_LM_STUDIO_PORT}/v1`;
    console.log('[NetworkConfig] Mobile detected. Using LM Studio at:', url);
    console.log('[NetworkConfig] If connection fails, check GUIDE_CONNEXION_MOBILE.md');
    return url;
  } else {
    // On web dev server, use the Vite proxy to avoid CORS issues
    console.log('[NetworkConfig] Using web proxy: /lmstudio/v1');
    return '/lmstudio/v1';
  }
}

/**
 * Get the appropriate base URL for Ollama
 */
export function getOllamaUrl(): string {
  const isNative = isRunningOnMobile();
  
  if (isNative) {
    return `http://${MOBILE_LM_STUDIO_HOST}:11434`;
  } else {
    return 'http://localhost:11434';
  }
}

/**
 * Get complete network configuration
 */
export function getNetworkConfig(): NetworkConfig {
  return {
    lmStudioUrl: getLMStudioUrl(),
    ollamaUrl: getOllamaUrl(),
    isNative: isRunningOnMobile(),
    isElectron: isRunningInElectron(),
    platform: isRunningInElectron() ? 'electron' : Capacitor.getPlatform()
  };
}

/**
 * Debug: Log current network configuration
 */
export function logNetworkConfig(): void {
  const config = getNetworkConfig();
  console.log('[NetworkConfig] Current configuration:', {
    ...config,
    hint: config.isNative 
      ? '⚠️ Running on mobile - make sure LM Studio host IP is correct in .env or networkConfig.ts'
      : '✓ Running on web - using Vite proxy'
  });
}

/**
 * Get API base URL — for Electron, use embedded server; for web, use relative paths
 */
export function getApiBaseUrl(): string {
  if (isRunningInElectron()) {
    return 'http://localhost:3001';
  }
  return '';
}

export default {
  getLMStudioUrl,
  getOllamaUrl,
  getApiBaseUrl,
  getNetworkConfig,
  logNetworkConfig
};
