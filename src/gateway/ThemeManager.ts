/**
 * Lisa Theme Manager
 * Dynamic theme switching and customization
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface Theme {
  id: string;
  name: string;
  type: 'light' | 'dark' | 'system';
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  isBuiltin: boolean;
}

export interface ThemeColors {
  // Primary
  primary: string;
  primaryHover: string;
  primaryActive: string;
  
  // Background
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Surface
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  
  // Border
  border: string;
  borderHover: string;
  
  // Status
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Accent
  accent: string;
  accentHover: string;
  
  // Code
  codeBackground: string;
  codeText: string;
}

export interface ThemeFonts {
  sans: string;
  mono: string;
  sizeXs: string;
  sizeSm: string;
  sizeBase: string;
  sizeLg: string;
  sizeXl: string;
  size2xl: string;
  size3xl: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

export interface ThemeBorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeShadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

// Built-in themes
const BUILTIN_THEMES: Theme[] = [
  {
    id: 'lisa-dark',
    name: 'Lisa Dark',
    type: 'dark',
    isBuiltin: true,
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryActive: '#1d4ed8',
      background: '#0a0a0a',
      backgroundSecondary: '#1a1a1a',
      backgroundTertiary: '#2a2a2a',
      surface: '#1a1a1a',
      surfaceHover: '#2a2a2a',
      surfaceActive: '#333333',
      text: '#ffffff',
      textSecondary: '#a1a1a1',
      textMuted: '#666666',
      textInverse: '#000000',
      border: '#333333',
      borderHover: '#444444',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      accent: '#8b5cf6',
      accentHover: '#7c3aed',
      codeBackground: '#1e1e1e',
      codeText: '#d4d4d4'
    },
    fonts: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'JetBrains Mono, Menlo, Monaco, monospace',
      sizeXs: '0.75rem',
      sizeSm: '0.875rem',
      sizeBase: '1rem',
      sizeLg: '1.125rem',
      sizeXl: '1.25rem',
      size2xl: '1.5rem',
      size3xl: '1.875rem'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem'
    },
    borderRadius: {
      none: '0',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px'
    },
    shadows: {
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.3)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.3)'
    }
  },
  {
    id: 'lisa-light',
    name: 'Lisa Light',
    type: 'light',
    isBuiltin: true,
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryActive: '#1d4ed8',
      background: '#ffffff',
      backgroundSecondary: '#f5f5f5',
      backgroundTertiary: '#e5e5e5',
      surface: '#ffffff',
      surfaceHover: '#f5f5f5',
      surfaceActive: '#e5e5e5',
      text: '#171717',
      textSecondary: '#525252',
      textMuted: '#a3a3a3',
      textInverse: '#ffffff',
      border: '#e5e5e5',
      borderHover: '#d4d4d4',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      accent: '#8b5cf6',
      accentHover: '#7c3aed',
      codeBackground: '#f4f4f5',
      codeText: '#18181b'
    },
    fonts: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'JetBrains Mono, Menlo, Monaco, monospace',
      sizeXs: '0.75rem',
      sizeSm: '0.875rem',
      sizeBase: '1rem',
      sizeLg: '1.125rem',
      sizeXl: '1.25rem',
      size2xl: '1.5rem',
      size3xl: '1.875rem'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem'
    },
    borderRadius: {
      none: '0',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px'
    },
    shadows: {
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
    }
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    type: 'dark',
    isBuiltin: true,
    colors: {
      primary: '#8b5cf6',
      primaryHover: '#7c3aed',
      primaryActive: '#6d28d9',
      background: '#0f0a1a',
      backgroundSecondary: '#1a1025',
      backgroundTertiary: '#251530',
      surface: '#1a1025',
      surfaceHover: '#251530',
      surfaceActive: '#301a3b',
      text: '#f5f3ff',
      textSecondary: '#c4b5fd',
      textMuted: '#7c3aed',
      textInverse: '#0f0a1a',
      border: '#3b2a4a',
      borderHover: '#4c3a5b',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#8b5cf6',
      accent: '#ec4899',
      accentHover: '#db2777',
      codeBackground: '#1a1025',
      codeText: '#e9d5ff'
    },
    fonts: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'JetBrains Mono, Menlo, Monaco, monospace',
      sizeXs: '0.75rem',
      sizeSm: '0.875rem',
      sizeBase: '1rem',
      sizeLg: '1.125rem',
      sizeXl: '1.25rem',
      size2xl: '1.5rem',
      size3xl: '1.875rem'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem'
    },
    borderRadius: {
      none: '0',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px'
    },
    shadows: {
      none: 'none',
      sm: '0 1px 2px 0 rgb(139 92 246 / 0.1)',
      md: '0 4px 6px -1px rgb(139 92 246 / 0.15)',
      lg: '0 10px 15px -3px rgb(139 92 246 / 0.15)',
      xl: '0 20px 25px -5px rgb(139 92 246 / 0.15)'
    }
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    type: 'dark',
    isBuiltin: true,
    colors: {
      primary: '#06b6d4',
      primaryHover: '#0891b2',
      primaryActive: '#0e7490',
      background: '#0a1520',
      backgroundSecondary: '#0f1f2e',
      backgroundTertiary: '#14293c',
      surface: '#0f1f2e',
      surfaceHover: '#14293c',
      surfaceActive: '#19334a',
      text: '#ecfeff',
      textSecondary: '#a5f3fc',
      textMuted: '#22d3ee',
      textInverse: '#0a1520',
      border: '#164e63',
      borderHover: '#155e75',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
      accent: '#14b8a6',
      accentHover: '#0d9488',
      codeBackground: '#0f1f2e',
      codeText: '#cffafe'
    },
    fonts: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'JetBrains Mono, Menlo, Monaco, monospace',
      sizeXs: '0.75rem',
      sizeSm: '0.875rem',
      sizeBase: '1rem',
      sizeLg: '1.125rem',
      sizeXl: '1.25rem',
      size2xl: '1.5rem',
      size3xl: '1.875rem'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem'
    },
    borderRadius: {
      none: '0',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px'
    },
    shadows: {
      none: 'none',
      sm: '0 1px 2px 0 rgb(6 182 212 / 0.1)',
      md: '0 4px 6px -1px rgb(6 182 212 / 0.15)',
      lg: '0 10px 15px -3px rgb(6 182 212 / 0.15)',
      xl: '0 20px 25px -5px rgb(6 182 212 / 0.15)'
    }
  }
];

export class ThemeManager extends BrowserEventEmitter {
  private themes: Map<string, Theme> = new Map();
  private currentThemeId: string = 'lisa-dark';
  private systemPreference: 'light' | 'dark' = 'dark';

  constructor() {
    super();
    this.loadBuiltinThemes();
    this.detectSystemPreference();
  }

  private loadBuiltinThemes(): void {
    for (const theme of BUILTIN_THEMES) {
      this.themes.set(theme.id, theme);
    }
  }

  private detectSystemPreference(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPreference = query.matches ? 'dark' : 'light';
      
      query.addEventListener('change', (e) => {
        this.systemPreference = e.matches ? 'dark' : 'light';
        
        const currentTheme = this.getCurrentTheme();
        if (currentTheme.type === 'system') {
          this.applyTheme(currentTheme);
          this.emit('theme:systemChanged', this.systemPreference);
        }
      });
    }
  }

  // Theme management
  setTheme(themeId: string): boolean {
    const theme = this.themes.get(themeId);
    if (!theme) return false;

    this.currentThemeId = themeId;
    this.applyTheme(theme);
    this.savePreference(themeId);
    this.emit('theme:changed', theme);
    
    return true;
  }

  getCurrentTheme(): Theme {
    return this.themes.get(this.currentThemeId) || BUILTIN_THEMES[0];
  }

  getTheme(id: string): Theme | undefined {
    return this.themes.get(id);
  }

  listThemes(filter?: { type?: 'light' | 'dark' }): Theme[] {
    let themes = Array.from(this.themes.values());
    
    if (filter?.type) {
      themes = themes.filter(t => t.type === filter.type);
    }
    
    return themes;
  }

  // Custom theme creation
  createTheme(theme: Omit<Theme, 'id' | 'isBuiltin'>): Theme {
    const id = `theme_${Date.now().toString(36)}`;
    const fullTheme: Theme = {
      ...theme,
      id,
      isBuiltin: false
    };

    this.themes.set(id, fullTheme);
    this.emit('theme:created', fullTheme);
    
    return fullTheme;
  }

  deleteTheme(id: string): boolean {
    const theme = this.themes.get(id);
    if (!theme || theme.isBuiltin) return false;

    if (this.currentThemeId === id) {
      this.setTheme('lisa-dark');
    }

    this.themes.delete(id);
    this.emit('theme:deleted', { id });
    
    return true;
  }

  // Apply theme to DOM
  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const effectiveType = theme.type === 'system' ? this.systemPreference : theme.type;

    // Set color scheme
    root.style.colorScheme = effectiveType;
    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-theme-type', effectiveType);

    // Apply CSS variables
    const colors = theme.colors;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-hover', colors.primaryHover);
    root.style.setProperty('--color-primary-active', colors.primaryActive);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-background-secondary', colors.backgroundSecondary);
    root.style.setProperty('--color-background-tertiary', colors.backgroundTertiary);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-surface-hover', colors.surfaceHover);
    root.style.setProperty('--color-surface-active', colors.surfaceActive);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-text-muted', colors.textMuted);
    root.style.setProperty('--color-text-inverse', colors.textInverse);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-border-hover', colors.borderHover);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-warning', colors.warning);
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-info', colors.info);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-accent-hover', colors.accentHover);
    root.style.setProperty('--color-code-background', colors.codeBackground);
    root.style.setProperty('--color-code-text', colors.codeText);

    // Apply font sizes
    const fonts = theme.fonts;
    root.style.setProperty('--font-sans', fonts.sans);
    root.style.setProperty('--font-mono', fonts.mono);
    root.style.setProperty('--font-size-xs', fonts.sizeXs);
    root.style.setProperty('--font-size-sm', fonts.sizeSm);
    root.style.setProperty('--font-size-base', fonts.sizeBase);
    root.style.setProperty('--font-size-lg', fonts.sizeLg);
    root.style.setProperty('--font-size-xl', fonts.sizeXl);
    root.style.setProperty('--font-size-2xl', fonts.size2xl);
    root.style.setProperty('--font-size-3xl', fonts.size3xl);

    // Apply spacing
    const spacing = theme.spacing;
    root.style.setProperty('--spacing-xs', spacing.xs);
    root.style.setProperty('--spacing-sm', spacing.sm);
    root.style.setProperty('--spacing-md', spacing.md);
    root.style.setProperty('--spacing-lg', spacing.lg);
    root.style.setProperty('--spacing-xl', spacing.xl);
    root.style.setProperty('--spacing-2xl', spacing['2xl']);
    root.style.setProperty('--spacing-3xl', spacing['3xl']);

    // Apply border radius
    const radius = theme.borderRadius;
    root.style.setProperty('--radius-none', radius.none);
    root.style.setProperty('--radius-sm', radius.sm);
    root.style.setProperty('--radius-md', radius.md);
    root.style.setProperty('--radius-lg', radius.lg);
    root.style.setProperty('--radius-xl', radius.xl);
    root.style.setProperty('--radius-full', radius.full);

    // Apply shadows
    const shadows = theme.shadows;
    root.style.setProperty('--shadow-none', shadows.none);
    root.style.setProperty('--shadow-sm', shadows.sm);
    root.style.setProperty('--shadow-md', shadows.md);
    root.style.setProperty('--shadow-lg', shadows.lg);
    root.style.setProperty('--shadow-xl', shadows.xl);
  }

  // Persistence
  private savePreference(themeId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lisa-theme', themeId);
    }
  }

  loadSavedPreference(): void {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('lisa-theme');
      if (saved && this.themes.has(saved)) {
        this.setTheme(saved);
      }
    }
  }

  // Toggle between light/dark
  toggleTheme(): Theme {
    const current = this.getCurrentTheme();
    const targetType = current.type === 'dark' ? 'light' : 'dark';
    
    const targetTheme = Array.from(this.themes.values())
      .find(t => t.type === targetType);
    
    if (targetTheme) {
      this.setTheme(targetTheme.id);
      return targetTheme;
    }
    
    return current;
  }

  // Export/Import
  exportThemes(): string {
    const customThemes = Array.from(this.themes.values())
      .filter(t => !t.isBuiltin);
    return JSON.stringify(customThemes, null, 2);
  }

  importThemes(json: string): number {
    const themes = JSON.parse(json) as Theme[];
    let imported = 0;

    for (const theme of themes) {
      if (!this.themes.has(theme.id)) {
        this.themes.set(theme.id, { ...theme, isBuiltin: false });
        imported++;
      }
    }

    return imported;
  }

  // Get effective colors (resolving system preference)
  getEffectiveColors(): ThemeColors {
    const theme = this.getCurrentTheme();
    return theme.colors;
  }

  getSystemPreference(): 'light' | 'dark' {
    return this.systemPreference;
  }
}

// Singleton
let themeManagerInstance: ThemeManager | null = null;

export function getThemeManager(): ThemeManager {
  if (!themeManagerInstance) {
    themeManagerInstance = new ThemeManager();
  }
  return themeManagerInstance;
}

export function resetThemeManager(): void {
  if (themeManagerInstance) {
    themeManagerInstance.removeAllListeners();
    themeManagerInstance = null;
  }
}

