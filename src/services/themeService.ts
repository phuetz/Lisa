/**
 * Theme Service
 * Gère le thème clair/sombre avec détection système automatique
 */

export type ThemeMode = 'light' | 'dark' | 'system';

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

  textPrimary: '#1a1a1a',
  textSecondary: '#4a4a4a',
  textMuted: '#8e8ea0',

  accent: '#10b981',
  accentHover: '#059669',
  accentMuted: 'rgba(16, 185, 129, 0.1)',

  border: '#e5e5e5',
  borderLight: '#f0f0f0',

  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  userBubble: '#10b981',
  assistantBubble: '#f7f7f8',
};

const DARK_COLORS: ThemeColors = {
  bgPrimary: '#000000',
  bgSecondary: '#171717',
  bgTertiary: '#2d2d2d',
  bgOverlay: 'rgba(0, 0, 0, 0.7)',

  textPrimary: '#ececf1',
  textSecondary: '#c5c5d2',
  textMuted: '#8e8ea0',

  accent: '#10b981',
  accentHover: '#34d399',
  accentMuted: 'rgba(16, 185, 129, 0.15)',

  border: '#2d2d2d',
  borderLight: '#3d3d3d',

  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  userBubble: '#10b981',
  assistantBubble: '#2d2d2d',
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
      colors: resolved === 'dark' ? DARK_COLORS : LIGHT_COLORS,
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
    this.state.colors = this.state.resolved === 'dark' ? DARK_COLORS : LIGHT_COLORS;
    
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
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
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
    return mode;
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
        this.state.colors = this.state.resolved === 'dark' ? DARK_COLORS : LIGHT_COLORS;
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
    
    // Ajouter/retirer la classe dark
    root.classList.toggle('dark', this.state.resolved === 'dark');
    root.classList.toggle('light', this.state.resolved === 'light');

    // Définir l'attribut data-theme
    root.setAttribute('data-theme', this.state.resolved);

    // Appliquer les CSS variables
    const vars = this.getCSSVariables();
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
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
export { LIGHT_COLORS, DARK_COLORS };
export type { ThemeColors, ThemeState };
