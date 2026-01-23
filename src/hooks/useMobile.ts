/**
 * Hook pour les fonctionnalités mobiles natives
 * Fournit haptics, keyboard events, et utilitaires mobile
 */

import { useEffect, useCallback } from 'react';
import { mobileService } from '../services/mobileService';

export const useMobile = () => {
  // Initialiser le service au montage
  useEffect(() => {
    mobileService.initialize();
  }, []);

  // Haptic feedback
  const hapticTap = useCallback(() => {
    mobileService.hapticImpact('Light');
  }, []);

  const hapticSuccess = useCallback(() => {
    mobileService.hapticNotification('Success');
  }, []);

  const hapticError = useCallback(() => {
    mobileService.hapticNotification('Error');
  }, []);

  const hapticWarning = useCallback(() => {
    mobileService.hapticNotification('Warning');
  }, []);

  const hapticSelection = useCallback(() => {
    mobileService.hapticSelection();
  }, []);

  // Keyboard control
  const showKeyboard = useCallback(() => {
    mobileService.showKeyboard();
  }, []);

  const hideKeyboard = useCallback(() => {
    mobileService.hideKeyboard();
  }, []);

  return {
    isNative: mobileService.isNative,
    platform: mobileService.platform,
    hapticTap,
    hapticSuccess,
    hapticError,
    hapticWarning,
    hapticSelection,
    showKeyboard,
    hideKeyboard,
    onKeyboardShow: mobileService.onKeyboardShow.bind(mobileService),
    onKeyboardHide: mobileService.onKeyboardHide.bind(mobileService),
  };
};

export default useMobile;
