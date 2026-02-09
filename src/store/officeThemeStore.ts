/**
 * Office Theme Store
 * Zustand store for managing Office-style themes
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type OfficeTheme,
  type ThemeColorScheme,
  type ThemeMode,
  officeThemes,
  getThemeById,
  getDefaultTheme,
  resolveMode,
  applyCssVariables,
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
  themeId: 'office-classic',
  mode: 'light' as ThemeMode,
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
      // Don't use getSystemColorScheme() here - it causes race with persistence
      // The onRehydrateStorage callback will set the correct mode

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

      getCurrentColors: (): ThemeColorScheme => {
        // AudioReader Studio theme - override all legacy Office themes
        // This maps to the CSS variables in index.css for consistency
        const state = get();
        const isDark = state._resolvedMode === 'dark';

        if (isDark) {
          return {
            ribbon: '#0e0e16',
            ribbonText: '#e8e8f0',
            ribbonHover: '#1a1a26',
            ribbonActive: 'rgba(245, 166, 35, 0.10)',
            sidebar: '#0e0e16',
            sidebarText: '#6a6a82',
            sidebarHover: 'rgba(245, 166, 35, 0.06)',
            sidebarActive: 'rgba(245, 166, 35, 0.10)',
            editor: '#0a0a0f',
            editorText: '#e8e8f0',
            editorSecondary: '#9898b0',
            dialog: '#12121a',
            dialogText: '#e8e8f0',
            accent: '#f5a623',
            accentHover: '#e6951a',
            accentText: '#0a0a0f',
            border: '#2d2d44',
            divider: '#1e1e30',
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#06b6d4',
            inputBg: '#1a1a26',
            inputBorder: '#2d2d44',
            inputFocus: '#f5a623',
          };
        }

        return {
          ribbon: '#eaeaee',
          ribbonText: '#1a1a2e',
          ribbonHover: '#f0f0f4',
          ribbonActive: 'rgba(224, 138, 0, 0.10)',
          sidebar: '#eaeaee',
          sidebarText: '#8a8a9e',
          sidebarHover: 'rgba(224, 138, 0, 0.06)',
          sidebarActive: 'rgba(224, 138, 0, 0.10)',
          editor: '#f5f5f7',
          editorText: '#1a1a2e',
          editorSecondary: '#5a5a70',
          dialog: '#ffffff',
          dialogText: '#1a1a2e',
          accent: '#e08a00',
          accentHover: '#c87a00',
          accentText: '#ffffff',
          border: '#d4d4dc',
          divider: '#eaeaf0',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#06b6d4',
          inputBg: '#f0f0f4',
          inputBorder: '#d4d4dc',
          inputFocus: '#e08a00',
        };
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

// Apply initial theme on store creation (for first load without persisted state)
if (typeof window !== 'undefined') {
  // Small delay to ensure DOM is ready
  requestAnimationFrame(() => {
    const state = useOfficeThemeStore.getState();
    const theme = getThemeById(state.themeId) || getDefaultTheme();
    const colors = state._resolvedMode === 'dark' ? theme.dark : theme.light;
    applyCssVariables(colors);
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${state._resolvedMode}`);
  });
}

// Listen for system color scheme changes
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  try {
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
  } catch {
    // matchMedia not available (e.g., in test environment)
  }
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
