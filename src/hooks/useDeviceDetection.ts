/**
 * Hook pour détecter le type d'appareil (mobile/desktop)
 * Utilisé pour charger le layout approprié
 */

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export interface DeviceInfo {
  isMobile: boolean;
  isCapacitor: boolean;
  platform: 'web' | 'android' | 'ios';
  isTouch: boolean;
  screenWidth: number;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => getDeviceInfo());

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceInfo;
};

function getDeviceInfo(): DeviceInfo {
  const isCapacitor = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform() as 'web' | 'android' | 'ios';
  const screenWidth = window.innerWidth;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Considérer comme mobile si:
  // - On est sur une plateforme native (Capacitor)
  // - OU l'écran est petit (< 768px) ET c'est un appareil tactile
  const isMobile = isCapacitor || (screenWidth < 768 && isTouch);

  return {
    isMobile,
    isCapacitor,
    platform,
    isTouch,
    screenWidth,
  };
}

export default useDeviceDetection;
