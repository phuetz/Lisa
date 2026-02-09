/**
 * Theme Service
 * Gère le thème clair/sombre avec détection système automatique
 */

export type ThemeMode = 'light' | 'dark' | 'system' | 'fluentLight' | 'fluentDark';

interface ThemeColors {
  // Background
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgOverlay: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accent
  accent: string;
  accentHover: string;
  accentMuted: string;

  // Borders
  border: string;
  borderLight: string;

  // Status
  success: string;
  warning: string;
  error: string;
  info: string;

  // Chat specific
  userBubble: string;
  assistantBubble: string;
}

interface ThemeState {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  colors: ThemeColors;
}

type ThemeListener = (state: ThemeState) => void;

const LIGHT_COLORS: ThemeColors = {
  bgPrimary: '#ffffff',
  bgSecondary: '#f7f7f8',
  bgTertiary: '#ececf1',
  bgOverlay: 'rgba(0, 0, 0, 0.5)',

  textPrimary: '#1a1a26',
  textSecondary: '#4a4a4a',
  textMuted: '#8e8ea0',

  accent: '#e08a00',
  accentHover: '#c77a00',
  accentMuted: 'rgba(245, 166, 35, 0.1)',

  border: '#e5e5e5',
  borderLight: '#f0f0f0',

  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  userBubble: '#e08a00',
  assistantBubble: '#f7f7f8',
};

const DARK_COLORS: ThemeColors = {
  bgPrimary: '#000000',
  bgSecondary: '#171717',
  bgTertiary: '#1a1a26',
  bgOverlay: 'rgba(0, 0, 0, 0.7)',

  textPrimary: '#e8e8f0',
  textSecondary: '#c5c5d2',
  textMuted: '#8e8ea0',

  accent: '#f5a623',
  accentHover: '#e6951a',
  accentMuted: 'rgba(245, 166, 35, 0.15)',

  border: '#2d2d44',
  borderLight: '#3d3d5c',

  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  userBubble: '#f5a623',
  assistantBubble: '#1a1a26',
};

// Fluent Design Light Theme (Office 365 inspired)
const FLUENT_LIGHT_COLORS: ThemeColors = {
  bgPrimary: '#faf9f8',
  bgSecondary: '#ffffff',
  bgTertiary: '#f3f2f1',
  bgOverlay: 'rgba(0, 0, 0, 0.4)',

  textPrimary: '#323130',
  textSecondary: '#605e5c',
  textMuted: '#a19f9d',

  accent: '#0078d4',
  accentHover: '#106ebe',
  accentMuted: 'rgba(0, 120, 212, 0.1)',

  border: '#edebe9',
  borderLight: '#f3f2f1',

  success: '#107c10',
  warning: '#ffb900',
  error: '#d13438',
  info: '#0078d4',

  userBubble: '#0078d4',
  assistantBubble: '#ffffff',
};

// Fluent Design Dark Theme (Office 365 inspired)
const FLUENT_DARK_COLORS: ThemeColors = {
  bgPrimary: '#1b1a19',
  bgSecondary: '#252423',
  bgTertiary: '#323130',
  bgOverlay: 'rgba(0, 0, 0, 0.6)',

  textPrimary: '#ffffff',
  textSecondary: '#d2d0ce',
  textMuted: '#8a8886',

  accent: '#2b88d8',
  accentHover: '#0078d4',
  accentMuted: 'rgba(43, 136, 216, 0.15)',

  border: '#3b3a39',
  borderLight: '#484644',

  success: '#107c10',
  warning: '#ffb900',
  error: '#d13438',
  info: '#2b88d8',

  userBubble: '#2b88d8',
  assistantBubble: '#323130',
};

const STORAGE_KEY = 'lisa_theme_mode';

class ThemeService {
  private state: ThemeState;
  private listeners: ThemeListener[] = [];
  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    const savedMode = this.loadSavedMode();
    const resolved = this.resolveTheme(savedMode);

    this.state = {
      mode: savedMode,
      resolved,
      colors: this.getColorsForMode(savedMode),
    };

    this.setupSystemThemeListener();
    this.applyTheme();
  }

  get mode(): ThemeMode {
    return this.state.mode;
  }

  get resolved(): 'light' | 'dark' {
    return this.state.resolved;
  }

  get colors(): ThemeColors {
    return this.state.colors;
  }

  get isDark(): boolean {
    return this.state.resolved === 'dark';
  }

  /**
   * Définir le mode de thème
   */
  setMode(mode: ThemeMode): void {
    this.state.mode = mode;
    this.state.resolved = this.resolveTheme(mode);
    this.state.colors = this.getColorsForMode(mode);

    this.saveMode(mode);
    this.applyTheme();
    this.notifyListeners();
  }

  /**
   * Toggle entre light et dark
   */
  toggle(): void {
    const newMode = this.state.resolved === 'dark' ? 'light' : 'dark';
    this.setMode(newMode);
  }

  /**
   * S'abonner aux changements de thème
   */
  subscribe(listener: ThemeListener): () => void {
    this.listeners.push(listener);
    listener(this.state);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Obtenir une couleur spécifique
   */
  getColor(key: keyof ThemeColors): string {
    return this.state.colors[key];
  }

  /**
   * Générer les CSS variables
   */
  getCSSVariables(): Record<string, string> {
    const vars: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(this.state.colors)) {
      vars[`--color-${this.camelToKebab(key)}`] = value;
    }

    return vars;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private loadSavedMode(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system' || saved === 'fluentLight' || saved === 'fluentDark') {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'system';
  }

  private saveMode(mode: ThemeMode): void {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore
    }
  }

  private resolveTheme(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'system') {
      return this.getSystemPreference();
    }
    if (mode === 'fluentLight') {
      return 'light';
    }
    if (mode === 'fluentDark') {
      return 'dark';
    }
    return mode;
  }

  private getColorsForMode(mode: ThemeMode): ThemeColors {
    switch (mode) {
      case 'fluentLight':
        return FLUENT_LIGHT_COLORS;
      case 'fluentDark':
        return FLUENT_DARK_COLORS;
      case 'dark':
        return DARK_COLORS;
      case 'light':
        return LIGHT_COLORS;
      case 'system':
      default:
        return this.getSystemPreference() === 'dark' ? DARK_COLORS : LIGHT_COLORS;
    }
  }

  private getSystemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private setupSystemThemeListener(): void {
    if (typeof window === 'undefined') return;

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handler = () => {
      if (this.state.mode === 'system') {
        this.state.resolved = this.getSystemPreference();
        this.state.colors = this.getColorsForMode(this.state.mode);
        this.applyTheme();
        this.notifyListeners();
      }
    };

    // Modern browsers
    if (this.mediaQuery.addEventListener) {
      this.mediaQuery.addEventListener('change', handler);
    } else {
      // Fallback for older browsers
      this.mediaQuery.addListener(handler);
    }
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const isFluent = this.state.mode === 'fluentLight' || this.state.mode === 'fluentDark';

    // Ajouter/retirer les classes de thème
    root.classList.toggle('dark', this.state.resolved === 'dark');
    root.classList.toggle('light', this.state.resolved === 'light');
    root.classList.toggle('fluent', isFluent);
    root.classList.toggle('fluent-light', this.state.mode === 'fluentLight');
    root.classList.toggle('fluent-dark', this.state.mode === 'fluentDark');

    // Définir l'attribut data-theme
    root.setAttribute('data-theme', this.state.resolved);
    root.setAttribute('data-theme-variant', isFluent ? 'fluent' : 'default');

    // Appliquer les CSS variables
    const vars = this.getCSSVariables();
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }

    // Appliquer les Fluent CSS variables additionnelles
    if (isFluent) {
      root.style.setProperty('--fluent-font-family', "'Segoe UI Variable', 'Segoe UI', -apple-system, sans-serif");
      root.style.setProperty('--fluent-border-radius', '4px');
      root.style.setProperty('--fluent-shadow-rest', '0 2px 4px rgba(0,0,0,0.04), 0 0 2px rgba(0,0,0,0.08)');
      root.style.setProperty('--fluent-shadow-hover', '0 4px 8px rgba(0,0,0,0.08), 0 0 2px rgba(0,0,0,0.08)');
    }

    // Meta theme-color pour mobile
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', this.state.colors.bgPrimary);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

export const themeService = new ThemeService();
export default themeService;

// Export colors for direct usage
export { LIGHT_COLORS, DARK_COLORS, FLUENT_LIGHT_COLORS, FLUENT_DARK_COLORS };
export type { ThemeColors, ThemeState };
