/**
 * Mobile Service - Fonctionnalités natives Capacitor
 * Gère les haptics, keyboard, status bar, etc.
 */

import { Capacitor } from '@capacitor/core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CapacitorPlugin = any;

class MobileService {
  private haptics: CapacitorPlugin = null;
  private keyboard: CapacitorPlugin = null;
  private statusBar: CapacitorPlugin = null;
  private initialized = false;

  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  get platform(): string {
    return Capacitor.getPlatform();
  }

  async initialize(): Promise<void> {
    if (this.initialized || !this.isNative) return;

    try {
      // Charger les plugins dynamiquement
      const [hapticsModule, keyboardModule, statusBarModule] = await Promise.all([
        import('@capacitor/haptics').catch(() => null),
        import('@capacitor/keyboard').catch(() => null),
        import('@capacitor/status-bar').catch(() => null),
      ]);

      if (hapticsModule) this.haptics = hapticsModule.Haptics;
      if (keyboardModule) this.keyboard = keyboardModule.Keyboard;
      if (statusBarModule) this.statusBar = statusBarModule.StatusBar;

      // Configurer le status bar
      await this.configureStatusBar();

      this.initialized = true;
      console.log('[MobileService] Initialized for platform:', this.platform);
    } catch (error) {
      console.warn('[MobileService] Initialization error:', error);
    }
  }

  private async configureStatusBar(): Promise<void> {
    if (!this.statusBar) return;
    
    try {
      await this.statusBar.setStyle({ style: 'Dark' });
      await this.statusBar.setBackgroundColor({ color: '#1a1a2e' });
    } catch (error) {
      console.warn('[MobileService] StatusBar config error:', error);
    }
  }

  // Haptics
  async hapticImpact(style: 'Light' | 'Medium' | 'Heavy' = 'Medium'): Promise<void> {
    if (!this.haptics) return;
    try {
      await this.haptics.impact({ style });
    } catch (error) {
      console.warn('[MobileService] Haptic impact error:', error);
    }
  }

  async hapticNotification(type: 'Success' | 'Warning' | 'Error'): Promise<void> {
    if (!this.haptics) return;
    try {
      await this.haptics.notification({ type });
    } catch (error) {
      console.warn('[MobileService] Haptic notification error:', error);
    }
  }

  async hapticSelection(): Promise<void> {
    if (!this.haptics) return;
    try {
      await this.haptics.selectionStart();
      await this.haptics.selectionEnd();
    } catch (error) {
      console.warn('[MobileService] Haptic selection error:', error);
    }
  }

  // Keyboard
  async showKeyboard(): Promise<void> {
    if (!this.keyboard) return;
    try {
      await this.keyboard.show();
    } catch (error) {
      console.warn('[MobileService] Show keyboard error:', error);
    }
  }

  async hideKeyboard(): Promise<void> {
    if (!this.keyboard) return;
    try {
      await this.keyboard.hide();
    } catch (error) {
      console.warn('[MobileService] Hide keyboard error:', error);
    }
  }

  onKeyboardShow(callback: () => void): () => void {
    if (!this.keyboard) return () => {};
    
    let cleanup: (() => void) | null = null;
    this.keyboard.addListener('keyboardWillShow', callback).then((handle: { remove: () => void }) => {
      cleanup = handle.remove;
    });
    
    return () => cleanup?.();
  }

  onKeyboardHide(callback: () => void): () => void {
    if (!this.keyboard) return () => {};
    
    let cleanup: (() => void) | null = null;
    this.keyboard.addListener('keyboardWillHide', callback).then((handle: { remove: () => void }) => {
      cleanup = handle.remove;
    });
    
    return () => cleanup?.();
  }
}

export const mobileService = new MobileService();
export default mobileService;
