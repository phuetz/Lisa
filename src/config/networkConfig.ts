/**
 * Network Configuration for Desktop/Mobile/Web
 * Handles different network configurations for Tauri (desktop), Capacitor (Android/iOS), and Web
 */

import { Capacitor } from '@capacitor/core';

// ============================================================================
// CONFIGURATION MOBILE
// ============================================================================
const MOBILE_LM_STUDIO_HOST = 'localhost';
const DEFAULT_LM_STUDIO_PORT = '1234';

export interface NetworkConfig {
  lmStudioUrl: string;
  ollamaUrl: string;
  isNative: boolean;
  isDesktop: boolean;
  platform: string;
}

/**
 * Detect if running in Tauri desktop environment
 */
export function isRunningInTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** @deprecated Use isRunningInTauri() */
export function isRunningInElectron(): boolean {
  return isRunningInTauri();
}

/**
 * Detect if running in Capacitor native environment
 */
function isRunningOnMobile(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return true;
    if (typeof window !== 'undefined' && window.location.hostname === 'lisa.ai') return true;
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get the appropriate base URL for LM Studio
 */
export function getLMStudioUrl(): string {
  const isNative = isRunningOnMobile();

  if (isRunningInTauri()) {
    const url = `http://localhost:${DEFAULT_LM_STUDIO_PORT}/v1`;
    console.log('[NetworkConfig] Tauri desktop detected. Using LM Studio at:', url);
    return url;
  } else if (isNative) {
    const url = `http://${MOBILE_LM_STUDIO_HOST}:${DEFAULT_LM_STUDIO_PORT}/v1`;
    console.log('[NetworkConfig] Mobile detected. Using LM Studio at:', url);
    return url;
  } else {
    console.log('[NetworkConfig] Using web proxy: /lmstudio/v1');
    return '/lmstudio/v1';
  }
}

/**
 * Get the appropriate base URL for Ollama
 */
export function getOllamaUrl(): string {
  if (isRunningOnMobile()) {
    return `http://${MOBILE_LM_STUDIO_HOST}:11434`;
  }
  return 'http://localhost:11434';
}

/**
 * Get complete network configuration
 */
export function getNetworkConfig(): NetworkConfig {
  const desktop = isRunningInTauri();
  return {
    lmStudioUrl: getLMStudioUrl(),
    ollamaUrl: getOllamaUrl(),
    isNative: isRunningOnMobile(),
    isDesktop: desktop,
    platform: desktop ? 'tauri' : Capacitor.getPlatform()
  };
}

/**
 * Debug: Log current network configuration
 */
export function logNetworkConfig(): void {
  const config = getNetworkConfig();
  console.log('[NetworkConfig] Current configuration:', config);
}

/**
 * Get API base URL — for Tauri, use embedded server; for web, use relative paths
 */
export function getApiBaseUrl(): string {
  if (isRunningInTauri()) {
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
