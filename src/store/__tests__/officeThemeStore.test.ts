/**
 * Tests for officeThemeStore
 * IT-001: Theme System Foundation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock matchMedia BEFORE importing modules that use it
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: query === '(prefers-color-scheme: dark)' ? false : true,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

vi.stubGlobal('matchMedia', matchMediaMock);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

// Now import the modules
import { useOfficeThemeStore } from '../officeThemeStore';
import { officeThemes, getThemeById, getDefaultTheme, resolveMode } from '../../theme/officeThemes';

describe('officeThemeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    localStorageMock.clear();
    useOfficeThemeStore.setState({
      themeId: 'office-classic',
      mode: 'light',
      fontSize: 'medium',
      fontFamily: 'Segoe UI',
      borderRadius: 8,
      compactMode: false,
      highContrast: false,
      reduceMotion: false,
      transitionsEnabled: true,
      customThemes: [],
      _resolvedMode: 'light',
    });
  });

  describe('Theme Selection', () => {
    it('should have office-classic as default theme', () => {
      const { themeId } = useOfficeThemeStore.getState();
      expect(themeId).toBe('office-classic');
    });

    it('should set theme correctly', () => {
      const { setTheme } = useOfficeThemeStore.getState();
      setTheme('teams-purple');

      const state = useOfficeThemeStore.getState();
      expect(state.themeId).toBe('teams-purple');
    });

    it('should get current theme object', () => {
      const { getCurrentTheme } = useOfficeThemeStore.getState();
      const theme = getCurrentTheme();

      expect(theme).toBeDefined();
      expect(theme.id).toBe('office-classic');
      expect(theme.name).toBe('Office Classic');
    });

    it('should get current colors based on mode', () => {
      const { getCurrentColors } = useOfficeThemeStore.getState();
      const colors = getCurrentColors();

      expect(colors).toBeDefined();
      expect(colors.ribbon).toBe('#f3f2f1'); // Office Classic light ribbon color
      expect(colors.accent).toBe('#0078d4');
    });
  });

  describe('Mode Selection', () => {
    it('should have light mode as default', () => {
      const { mode } = useOfficeThemeStore.getState();
      expect(mode).toBe('light');
    });

    it('should set mode correctly', () => {
      const { setMode } = useOfficeThemeStore.getState();
      setMode('dark');

      const state = useOfficeThemeStore.getState();
      expect(state.mode).toBe('dark');
      expect(state._resolvedMode).toBe('dark');
    });

    it('should resolve system mode based on matchMedia', () => {
      const { setMode } = useOfficeThemeStore.getState();
      setMode('system');

      const state = useOfficeThemeStore.getState();
      expect(state.mode).toBe('system');
      // Mock returns false for dark mode, so resolved should be light
      expect(state._resolvedMode).toBe('light');
    });

    it('should return correct colors for dark mode', () => {
      const { setMode, getCurrentColors } = useOfficeThemeStore.getState();
      setMode('dark');

      const colors = getCurrentColors();
      expect(colors.ribbon).toBe('#2d2d2d'); // Office Classic dark ribbon color
    });
  });

  describe('UI Preferences', () => {
    it('should set font size', () => {
      const { setFontSize } = useOfficeThemeStore.getState();
      setFontSize('large');

      const state = useOfficeThemeStore.getState();
      expect(state.fontSize).toBe('large');
    });

    it('should set font family', () => {
      const { setFontFamily } = useOfficeThemeStore.getState();
      setFontFamily('Arial');

      const state = useOfficeThemeStore.getState();
      expect(state.fontFamily).toBe('Arial');
    });

    it('should set border radius', () => {
      const { setBorderRadius } = useOfficeThemeStore.getState();
      setBorderRadius(12);

      const state = useOfficeThemeStore.getState();
      expect(state.borderRadius).toBe(12);
    });

    it('should toggle compact mode', () => {
      const { toggleCompactMode } = useOfficeThemeStore.getState();

      expect(useOfficeThemeStore.getState().compactMode).toBe(false);
      toggleCompactMode();
      expect(useOfficeThemeStore.getState().compactMode).toBe(true);
      toggleCompactMode();
      expect(useOfficeThemeStore.getState().compactMode).toBe(false);
    });

    it('should toggle high contrast', () => {
      const { toggleHighContrast } = useOfficeThemeStore.getState();

      expect(useOfficeThemeStore.getState().highContrast).toBe(false);
      toggleHighContrast();
      expect(useOfficeThemeStore.getState().highContrast).toBe(true);
    });

    it('should toggle reduce motion', () => {
      const { toggleReduceMotion } = useOfficeThemeStore.getState();

      expect(useOfficeThemeStore.getState().reduceMotion).toBe(false);
      toggleReduceMotion();
      expect(useOfficeThemeStore.getState().reduceMotion).toBe(true);
    });

    it('should toggle transitions', () => {
      const { toggleTransitions } = useOfficeThemeStore.getState();

      expect(useOfficeThemeStore.getState().transitionsEnabled).toBe(true);
      toggleTransitions();
      expect(useOfficeThemeStore.getState().transitionsEnabled).toBe(false);
    });
  });

  describe('Custom Themes', () => {
    const customTheme = {
      id: 'custom-theme',
      name: 'My Custom Theme',
      description: 'A custom test theme',
      icon: '🎨',
      light: officeThemes[0].light,
      dark: officeThemes[0].dark,
      isCustom: true,
    };

    it('should add custom theme', () => {
      const { addCustomTheme, getAllThemes } = useOfficeThemeStore.getState();
      addCustomTheme(customTheme);

      const allThemes = getAllThemes();
      const found = allThemes.find(t => t.id === 'custom-theme');
      expect(found).toBeDefined();
      expect(found?.isCustom).toBe(true);
    });

    it('should remove custom theme', () => {
      const { addCustomTheme, removeCustomTheme, getAllThemes } = useOfficeThemeStore.getState();
      addCustomTheme(customTheme);

      let allThemes = getAllThemes();
      expect(allThemes.some(t => t.id === 'custom-theme')).toBe(true);

      removeCustomTheme('custom-theme');
      allThemes = getAllThemes();
      expect(allThemes.some(t => t.id === 'custom-theme')).toBe(false);
    });

    it('should reset to default theme when removing active custom theme', () => {
      const { addCustomTheme, setTheme, removeCustomTheme } = useOfficeThemeStore.getState();
      addCustomTheme(customTheme);
      setTheme('custom-theme');

      expect(useOfficeThemeStore.getState().themeId).toBe('custom-theme');

      removeCustomTheme('custom-theme');
      // Should reset to office-blue (default in removeCustomTheme)
      expect(useOfficeThemeStore.getState().themeId).toBe('office-blue');
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset all settings to defaults', () => {
      const { setTheme, setMode, setFontSize, toggleCompactMode, resetToDefaults } = useOfficeThemeStore.getState();

      // Change various settings
      setTheme('teams-purple');
      setMode('dark');
      setFontSize('large');
      toggleCompactMode();

      // Verify changes
      let state = useOfficeThemeStore.getState();
      expect(state.themeId).toBe('teams-purple');
      expect(state.mode).toBe('dark');
      expect(state.fontSize).toBe('large');
      expect(state.compactMode).toBe(true);

      // Reset
      resetToDefaults();

      // Verify defaults
      state = useOfficeThemeStore.getState();
      expect(state.themeId).toBe('office-classic');
      expect(state.mode).toBe('light');
      expect(state.fontSize).toBe('medium');
      expect(state.compactMode).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    it('getAllThemes should return all predefined themes plus custom', () => {
      const { getAllThemes, addCustomTheme } = useOfficeThemeStore.getState();

      const baseCount = officeThemes.length;
      let themes = getAllThemes();
      expect(themes.length).toBe(baseCount);

      addCustomTheme({
        id: 'test-theme',
        name: 'Test',
        description: 'Test theme',
        icon: '🧪',
        light: officeThemes[0].light,
        dark: officeThemes[0].dark,
      });

      themes = getAllThemes();
      expect(themes.length).toBe(baseCount + 1);
    });

    it('getResolvedMode should return correct resolved mode', () => {
      const { setMode, getResolvedMode } = useOfficeThemeStore.getState();

      setMode('light');
      expect(getResolvedMode()).toBe('light');

      setMode('dark');
      expect(getResolvedMode()).toBe('dark');
    });
  });
});

describe('officeThemes helpers', () => {
  describe('getThemeById', () => {
    it('should return theme by id', () => {
      const theme = getThemeById('office-classic');
      expect(theme).toBeDefined();
      expect(theme?.name).toBe('Office Classic');
    });

    it('should return undefined for unknown id', () => {
      const theme = getThemeById('non-existent');
      expect(theme).toBeUndefined();
    });
  });

  describe('getDefaultTheme', () => {
    it('should return first theme as default', () => {
      const theme = getDefaultTheme();
      expect(theme).toBeDefined();
      expect(theme.id).toBe('lisa-classic');
    });
  });

  describe('resolveMode', () => {
    it('should return light for light mode', () => {
      expect(resolveMode('light')).toBe('light');
    });

    it('should return dark for dark mode', () => {
      expect(resolveMode('dark')).toBe('dark');
    });

    it('should resolve system mode based on matchMedia', () => {
      // Mock returns false for dark mode
      expect(resolveMode('system')).toBe('light');
    });
  });
});
