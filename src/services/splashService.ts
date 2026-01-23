/**
 * Splash Screen Service - Animated Splash for Lisa Android
 * Controls the native splash screen with smooth transitions
 */

import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

// ============================================================================
// Splash Screen Configuration
// ============================================================================

export interface SplashConfig {
  showDuration?: number;
  fadeOutDuration?: number;
  fadeInDuration?: number;
  autoHide?: boolean;
  showSpinner?: boolean;
  spinnerColor?: string;
  backgroundColor?: string;
}

const DEFAULT_CONFIG: SplashConfig = {
  showDuration: 2000,
  fadeOutDuration: 500,
  fadeInDuration: 300,
  autoHide: false,
  showSpinner: false,
  backgroundColor: '#1a1a1a',
};

// ============================================================================
// Splash Screen Service
// ============================================================================

class SplashService {
  private isNative: boolean;
  private isShowing: boolean = true;
  private config: SplashConfig;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.config = DEFAULT_CONFIG;
  }

  /**
   * Configure splash screen options
   */
  configure(config: Partial<SplashConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Show the splash screen
   */
  async show(options?: Partial<SplashConfig>): Promise<void> {
    if (!this.isNative) return;

    const mergedOptions = { ...this.config, ...options };

    try {
      await SplashScreen.show({
        showDuration: mergedOptions.showDuration,
        fadeInDuration: mergedOptions.fadeInDuration,
        fadeOutDuration: mergedOptions.fadeOutDuration,
        autoHide: mergedOptions.autoHide,
      });
      this.isShowing = true;
    } catch (error) {
      console.warn('Failed to show splash screen:', error);
    }
  }

  /**
   * Hide the splash screen with animation
   */
  async hide(fadeOutDuration?: number): Promise<void> {
    if (!this.isNative || !this.isShowing) return;

    try {
      await SplashScreen.hide({
        fadeOutDuration: fadeOutDuration ?? this.config.fadeOutDuration ?? 500,
      });
      this.isShowing = false;
    } catch (error) {
      console.warn('Failed to hide splash screen:', error);
    }
  }

  /**
   * Hide splash screen after app is ready
   * Call this when your main component has mounted
   */
  async hideWhenReady(minDisplayTime: number = 1500): Promise<void> {
    if (!this.isNative) return;

    // Ensure splash is shown for at least minDisplayTime
    await this.delay(minDisplayTime);
    await this.hide();
  }

  /**
   * Animate transition from splash to app
   * Returns a promise that resolves when transition is complete
   */
  async animateTransition(
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (!this.isNative) {
      onProgress?.(1);
      return;
    }

    const duration = this.config.fadeOutDuration ?? 500;
    const steps = 20;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      onProgress?.(i / steps);
      await this.delay(stepDuration);
    }

    await this.hide(100); // Quick final fade
  }

  /**
   * Check if splash is currently showing
   */
  isVisible(): boolean {
    return this.isShowing;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const splashService = new SplashService();

// ============================================================================
// React Hook for Splash Screen
// ============================================================================

import { useEffect, useState } from 'react';

export const useSplashScreen = (autoHideDelay: number = 1500) => {
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const hideSplash = async () => {
      await splashService.animateTransition(setProgress);
      setIsReady(true);
    };

    // Start hiding after component mounts and min delay
    const timer = setTimeout(hideSplash, autoHideDelay);

    return () => clearTimeout(timer);
  }, [autoHideDelay]);

  return {
    isReady,
    progress,
    hideSplash: () => splashService.hide(),
    showSplash: () => splashService.show(),
  };
};

// ============================================================================
// App Initialization Helper
// ============================================================================

/**
 * Initialize app with splash screen handling
 * Use this in your main App component
 */
export const initializeApp = async (
  onInitialized?: () => void,
  minSplashTime: number = 2000
): Promise<void> => {
  const startTime = Date.now();

  // Perform any app initialization here
  // (load settings, check auth, etc.)
  
  // Calculate remaining time to show splash
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, minSplashTime - elapsed);
  
  if (remaining > 0) {
    await new Promise(resolve => setTimeout(resolve, remaining));
  }

  // Hide splash and notify
  await splashService.hide();
  onInitialized?.();
};

export default splashService;
