/**
 * 📱 usePlatform Hook
 * 
 * Détecte la plateforme (iOS, Android, Web) et fournit des utilitaires mobiles.
 * Intègre Capacitor pour les fonctionnalités natives.
 */

import { useState, useEffect, useCallback } from 'react';

export type Platform = 'ios' | 'android' | 'web';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface PlatformInfo {
  platform: Platform;
  deviceType: DeviceType;
  isNative: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  isPWA: boolean;
  hasNotch: boolean;
  isOnline: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
}

/**
 * Détecte si l'app tourne dans Capacitor (natif)
 */
function detectCapacitor(): boolean {
  return typeof window !== 'undefined' && 
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

/**
 * Détecte la plateforme
 */
function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'web';
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Capacitor native detection
  const capacitor = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  if (capacitor?.getPlatform) {
    const platform = capacitor.getPlatform();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
  }
  
  // Fallback to user agent
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  
  return 'web';
}

/**
 * Détecte le type d'appareil
 */
function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  const ua = navigator.userAgent.toLowerCase();
  
  // Tablet detection
  if (/ipad/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) {
    return 'tablet';
  }
  
  // Mobile detection - prioritize UA for landscape phones
  if (/iphone|ipod|android.*mobile|windows phone|blackberry/.test(ua)) {
    return 'mobile';
  }
  
  // Fallback: small screens are mobile
  if (width < 768) {
    return 'mobile';
  }
  
  // Tablet by screen size
  if (width >= 768 && width < 1024) {
    return 'tablet';
  }
  
  return 'desktop';
}

/**
 * Détecte si l'app est installée en PWA
 */
function detectPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Détecte si l'appareil a un notch (iPhone X+)
 */
function detectNotch(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Guard: ensure document.body exists (Android WebView startup)
  if (!document.body) return false;
  
  // Check CSS env() support for safe-area-inset
  const div = document.createElement('div');
  div.style.paddingTop = 'env(safe-area-inset-top)';
  document.body.appendChild(div);
  const hasNotch = getComputedStyle(div).paddingTop !== '0px';
  document.body.removeChild(div);
  
  return hasNotch;
}

/**
 * Détecte si c'est un appareil tactile
 */
function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Hook principal pour la détection de plateforme
 */
export function usePlatform(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>(() => getInitialInfo());

  function getInitialInfo(): PlatformInfo {
    const platform = detectPlatform();
    const deviceType = detectDeviceType();
    const isNative = detectCapacitor();
    
    return {
      platform,
      deviceType,
      isNative,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      isIOS: platform === 'ios',
      isAndroid: platform === 'android',
      isWeb: platform === 'web' && !isNative,
      isPWA: detectPWA(),
      hasNotch: detectNotch(),
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isTouchDevice: detectTouchDevice(),
      screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
      screenHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
      pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
      orientation: typeof window !== 'undefined' && window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    };
  }

  useEffect(() => {
    const handleResize = () => {
      setInfo(prev => ({
        ...prev,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        deviceType: detectDeviceType(),
        isMobile: detectDeviceType() === 'mobile',
        isTablet: detectDeviceType() === 'tablet',
        isDesktop: detectDeviceType() === 'desktop',
      }));
    };

    const handleOnline = () => setInfo(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setInfo(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('resize', handleResize);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return info;
}

/**
 * Hook pour le retour haptique
 */
export function useHaptics() {
  const { isNative } = usePlatform();

  const vibrate = useCallback(async (pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium') => {
    if (isNative) {
      try {
        const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
        
        switch (pattern) {
          case 'light':
            await Haptics.impact({ style: ImpactStyle.Light });
            break;
          case 'medium':
            await Haptics.impact({ style: ImpactStyle.Medium });
            break;
          case 'heavy':
            await Haptics.impact({ style: ImpactStyle.Heavy });
            break;
          case 'success':
            await Haptics.notification({ type: NotificationType.Success });
            break;
          case 'warning':
            await Haptics.notification({ type: NotificationType.Warning });
            break;
          case 'error':
            await Haptics.notification({ type: NotificationType.Error });
            break;
        }
      } catch {
        // Fallback to web vibration
        if ('vibrate' in navigator) {
          navigator.vibrate(pattern === 'heavy' ? 100 : pattern === 'light' ? 10 : 50);
        }
      }
    } else if ('vibrate' in navigator) {
      navigator.vibrate(pattern === 'heavy' ? 100 : pattern === 'light' ? 10 : 50);
    }
  }, [isNative]);

  const selectionChanged = useCallback(async () => {
    if (isNative) {
      try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.selectionChanged();
      } catch {
        // Silent fail
      }
    }
  }, [isNative]);

  return { vibrate, selectionChanged };
}

/**
 * Hook pour la caméra native
 */
export function useNativeCamera() {
  const { isNative } = usePlatform();

  const takePhoto = useCallback(async () => {
    if (!isNative) {
      // Fallback to web file input
      return new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    }

    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      return photo.dataUrl || null;
    } catch {
      return null;
    }
  }, [isNative]);

  const pickFromGallery = useCallback(async () => {
    if (!isNative) {
      return new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    }

    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });
      return photo.dataUrl || null;
    } catch {
      return null;
    }
  }, [isNative]);

  return { takePhoto, pickFromGallery };
}

/**
 * Hook pour les notifications push
 */
export function usePushNotifications() {
  const { isNative } = usePlatform();
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const requestPermission = useCallback(async () => {
    if (isNative) {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const result = await PushNotifications.requestPermissions();
        setPermissionStatus(result.receive);
        
        if (result.receive === 'granted') {
          await PushNotifications.register();
        }
        
        return result.receive === 'granted';
      } catch {
        return false;
      }
    } else if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermissionStatus(result as 'granted' | 'denied' | 'prompt');
      return result === 'granted';
    }
    return false;
  }, [isNative]);

  return { permissionStatus, requestPermission };
}

/**
 * Hook pour la barre de status
 */
export function useStatusBar() {
  const { isNative, isIOS, isAndroid } = usePlatform();

  const setStyle = useCallback(async (style: 'dark' | 'light') => {
    if (!isNative) return;

    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: style === 'dark' ? Style.Dark : Style.Light });
    } catch {
      // Silent fail
    }
  }, [isNative]);

  const setBackgroundColor = useCallback(async (color: string) => {
    if (!isNative || !isAndroid) return;

    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.setBackgroundColor({ color });
    } catch {
      // Silent fail
    }
  }, [isNative, isAndroid]);

  const hide = useCallback(async () => {
    if (!isNative) return;

    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.hide();
    } catch {
      // Silent fail
    }
  }, [isNative]);

  const show = useCallback(async () => {
    if (!isNative) return;

    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.show();
    } catch {
      // Silent fail
    }
  }, [isNative]);

  return { setStyle, setBackgroundColor, hide, show, isIOS, isAndroid };
}

export default usePlatform;
