/**
 * useTheme Hook
 * Hook React pour la gestion du thème
 */

import { useState, useEffect, useCallback } from 'react';
import { themeService, type ThemeMode, type ThemeColors } from '../services/themeService';

interface UseThemeReturn {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  getColor: (key: keyof ThemeColors) => string;
}

export function useTheme(): UseThemeReturn {
  const [mode, setModeState] = useState<ThemeMode>(themeService.mode);
  const [resolved, setResolved] = useState<'light' | 'dark'>(themeService.resolved);
  const [colors, setColors] = useState<ThemeColors>(themeService.colors);

  useEffect(() => {
    const unsubscribe = themeService.subscribe((state) => {
      setModeState(state.mode);
      setResolved(state.resolved);
      setColors(state.colors);
    });

    return unsubscribe;
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    themeService.setMode(newMode);
  }, []);

  const toggle = useCallback(() => {
    themeService.toggle();
  }, []);

  const getColor = useCallback((key: keyof ThemeColors) => {
    return themeService.getColor(key);
  }, []);

  return {
    mode,
    resolved,
    isDark: resolved === 'dark',
    colors,
    setMode,
    toggle,
    getColor,
  };
}

export default useTheme;
