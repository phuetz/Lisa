/**
 * Office Theme Store
 * Zustand store for managing Office-style themes
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  OfficeTheme,
  ThemeColorScheme,
  ThemeMode,
  officeThemes,
  getThemeById,
  getDefaultTheme,
  resolveMode,
  applyCssVariables,
  getSystemColorScheme,
} from '../theme/officeThemes';

interface OfficeThemeState {
  // Current theme
  themeId: string;
  mode: ThemeMode;

  // UI preferences
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
  borderRadius: number;
  compactMode: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  transitionsEnabled: boolean;

  // Custom themes
  customThemes: OfficeTheme[];

  // Computed values (not persisted)
  _resolvedMode: 'light' | 'dark';

  // Actions
  setTheme: (themeId: string) => void;
  setMode: (mode: ThemeMode) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setFontFamily: (font: string) => void;
  setBorderRadius: (radius: number) => void;
  toggleCompactMode: () => void;
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;
  toggleTransitions: () => void;
  addCustomTheme: (theme: OfficeTheme) => void;
  removeCustomTheme: (themeId: string) => void;
  resetToDefaults: () => void;

  // Getters
  getCurrentTheme: () => OfficeTheme;
  getCurrentColors: () => ThemeColorScheme;
  getAllThemes: () => OfficeTheme[];
  getResolvedMode: () => 'light' | 'dark';
}

const DEFAULT_STATE = {
  themeId: 'teams-purple',
  mode: 'system' as ThemeMode,
  fontSize: 'medium' as const,
  fontFamily: 'Segoe UI',
  borderRadius: 8,
  compactMode: false,
  highContrast: false,
  reduceMotion: false,
  transitionsEnabled: true,
  customThemes: [] as OfficeTheme[],
  _resolvedMode: 'light' as const,
};

export const useOfficeThemeStore = create<OfficeThemeState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      _resolvedMode: getSystemColorScheme(),

      setTheme: (themeId) => {
        set({ themeId });
        // Apply CSS variables
        const state = get();
        const theme = getThemeById(themeId) || getDefaultTheme();
        const colors = state._resolvedMode === 'dark' ? theme.dark : theme.light;
        applyCssVariables(colors);
      },

      setMode: (mode) => {
        const resolved = resolveMode(mode);
        set({ mode, _resolvedMode: resolved });
        // Apply CSS variables
        const state = get();
        const theme = getThemeById(state.themeId) || getDefaultTheme();
        const colors = resolved === 'dark' ? theme.dark : theme.light;
        applyCssVariables(colors);
      },

      setFontSize: (size) => set({ fontSize: size }),
      setFontFamily: (font) => set({ fontFamily: font }),
      setBorderRadius: (radius) => set({ borderRadius: radius }),
      toggleCompactMode: () => set((s) => ({ compactMode: !s.compactMode })),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),
      toggleTransitions: () => set((s) => ({ transitionsEnabled: !s.transitionsEnabled })),

      addCustomTheme: (theme) => {
        set((s) => ({
          customThemes: [...s.customThemes, { ...theme, isCustom: true }],
        }));
      },

      removeCustomTheme: (themeId) => {
        set((s) => ({
          customThemes: s.customThemes.filter((t) => t.id !== themeId),
          // Reset to default if removing active theme
          themeId: s.themeId === themeId ? 'office-blue' : s.themeId,
        }));
      },

      resetToDefaults: () => {
        set(DEFAULT_STATE);
        const theme = getDefaultTheme();
        const colors = theme.light;
        applyCssVariables(colors);
      },

      getCurrentTheme: () => {
        const state = get();
        const allThemes = [...officeThemes, ...state.customThemes];
        return allThemes.find((t) => t.id === state.themeId) || getDefaultTheme();
      },

      getCurrentColors: () => {
        const state = get();
        const theme = state.getCurrentTheme();
        return state._resolvedMode === 'dark' ? theme.dark : theme.light;
      },

      getAllThemes: () => {
        const state = get();
        return [...officeThemes, ...state.customThemes];
      },

      getResolvedMode: () => {
        return get()._resolvedMode;
      },
    }),
    {
      name: 'lisa-office-theme',
      version: 1,
      partialize: (state) => ({
        themeId: state.themeId,
        mode: state.mode,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        borderRadius: state.borderRadius,
        compactMode: state.compactMode,
        highContrast: state.highContrast,
        reduceMotion: state.reduceMotion,
        transitionsEnabled: state.transitionsEnabled,
        customThemes: state.customThemes,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Resolve mode and apply theme after rehydration
          const resolved = resolveMode(state.mode);
          state._resolvedMode = resolved;
          const theme = getThemeById(state.themeId) || getDefaultTheme();
          const colors = resolved === 'dark' ? theme.dark : theme.light;
          applyCssVariables(colors);
        }
      },
    }
  )
);

// Listen for system color scheme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const state = useOfficeThemeStore.getState();
    if (state.mode === 'system') {
      const resolved = e.matches ? 'dark' : 'light';
      useOfficeThemeStore.setState({ _resolvedMode: resolved });
      const theme = state.getCurrentTheme();
      const colors = resolved === 'dark' ? theme.dark : theme.light;
      applyCssVariables(colors);
    }
  });
}

// Hook for accessing colors
export const useOfficeColors = () => {
  const store = useOfficeThemeStore();
  return store.getCurrentColors();
};

// Hook for checking dark mode
export const useIsDarkMode = () => {
  const resolvedMode = useOfficeThemeStore((s) => s._resolvedMode);
  return resolvedMode === 'dark';
};

export default useOfficeThemeStore;
