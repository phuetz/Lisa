/**
 * Lisa Settings Manager
 * Persistent user preferences and configuration
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface Settings {
  // General
  general: {
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  
  // Appearance
  appearance: {
    theme: string;
    fontSize: number;
    fontFamily: string;
    compactMode: boolean;
    showAvatars: boolean;
    animationsEnabled: boolean;
  };
  
  // Chat
  chat: {
    sendOnEnter: boolean;
    showTimestamps: boolean;
    groupMessages: boolean;
    enableMarkdown: boolean;
    enableCodeHighlight: boolean;
    enableLatex: boolean;
    maxHistoryLength: number;
  };
  
  // AI
  ai: {
    defaultModel: string;
    temperature: number;
    maxTokens: number;
    streamResponses: boolean;
    showThinking: boolean;
    autoSuggest: boolean;
  };
  
  // Voice
  voice: {
    enabled: boolean;
    wakeWord: string;
    sensitivity: number;
    language: string;
    autoListen: boolean;
    speakResponses: boolean;
    voiceId: string;
  };
  
  // Notifications
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
  
  // Privacy
  privacy: {
    saveHistory: boolean;
    shareAnalytics: boolean;
    encryptStorage: boolean;
  };
  
  // Accessibility
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReaderMode: boolean;
    keyboardNavigation: boolean;
    focusIndicators: boolean;
  };
  
  // Advanced
  advanced: {
    developerMode: boolean;
    debugLogging: boolean;
    experimentalFeatures: boolean;
    apiEndpoint: string;
    timeout: number;
  };
}

export interface SettingSchema {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'range';
  label: string;
  description?: string;
  category: keyof Settings;
  default: unknown;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  validator?: (value: unknown) => boolean;
}

const DEFAULT_SETTINGS: Settings = {
  general: {
    language: 'fr',
    timezone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  appearance: {
    theme: 'lisa-dark',
    fontSize: 14,
    fontFamily: 'Inter',
    compactMode: false,
    showAvatars: true,
    animationsEnabled: true
  },
  chat: {
    sendOnEnter: true,
    showTimestamps: true,
    groupMessages: true,
    enableMarkdown: true,
    enableCodeHighlight: true,
    enableLatex: true,
    maxHistoryLength: 100
  },
  ai: {
    defaultModel: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    streamResponses: true,
    showThinking: false,
    autoSuggest: true
  },
  voice: {
    enabled: false,
    wakeWord: 'hey lisa',
    sensitivity: 0.7,
    language: 'fr-FR',
    autoListen: false,
    speakResponses: false,
    voiceId: 'default'
  },
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00'
  },
  privacy: {
    saveHistory: true,
    shareAnalytics: false,
    encryptStorage: false
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    screenReaderMode: false,
    keyboardNavigation: true,
    focusIndicators: true
  },
  advanced: {
    developerMode: false,
    debugLogging: false,
    experimentalFeatures: false,
    apiEndpoint: '',
    timeout: 30000
  }
};

// Settings schemas for UI
const SETTINGS_SCHEMAS: SettingSchema[] = [
  // General
  { key: 'language', type: 'select', label: 'Langue', category: 'general', default: 'fr', options: [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'de', label: 'Deutsch' }
  ]},
  { key: 'timezone', type: 'select', label: 'Fuseau horaire', category: 'general', default: 'Europe/Paris', options: [
    { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
    { value: 'Europe/London', label: 'Londres (UTC+0)' },
    { value: 'America/New_York', label: 'New York (UTC-5)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' }
  ]},
  { key: 'timeFormat', type: 'select', label: 'Format heure', category: 'general', default: '24h', options: [
    { value: '24h', label: '24 heures' },
    { value: '12h', label: '12 heures (AM/PM)' }
  ]},
  
  // Appearance
  { key: 'theme', type: 'select', label: 'Thème', category: 'appearance', default: 'lisa-dark', options: [
    { value: 'lisa-dark', label: 'Lisa Dark' },
    { value: 'lisa-light', label: 'Lisa Light' },
    { value: 'midnight-purple', label: 'Midnight Purple' },
    { value: 'ocean-blue', label: 'Ocean Blue' }
  ]},
  { key: 'fontSize', type: 'range', label: 'Taille police', category: 'appearance', default: 14, min: 10, max: 24, step: 1 },
  { key: 'compactMode', type: 'boolean', label: 'Mode compact', description: 'Réduit les espaces', category: 'appearance', default: false },
  { key: 'showAvatars', type: 'boolean', label: 'Afficher avatars', category: 'appearance', default: true },
  { key: 'animationsEnabled', type: 'boolean', label: 'Animations', category: 'appearance', default: true },
  
  // Chat
  { key: 'sendOnEnter', type: 'boolean', label: 'Envoyer avec Entrée', category: 'chat', default: true },
  { key: 'showTimestamps', type: 'boolean', label: 'Afficher horodatages', category: 'chat', default: true },
  { key: 'enableMarkdown', type: 'boolean', label: 'Markdown', category: 'chat', default: true },
  { key: 'enableCodeHighlight', type: 'boolean', label: 'Coloration syntaxique', category: 'chat', default: true },
  { key: 'enableLatex', type: 'boolean', label: 'Rendu LaTeX', category: 'chat', default: true },
  
  // AI
  { key: 'defaultModel', type: 'select', label: 'Modèle par défaut', category: 'ai', default: 'gpt-4o', options: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'gemini-pro', label: 'Gemini Pro' }
  ]},
  { key: 'temperature', type: 'range', label: 'Température', description: 'Créativité des réponses', category: 'ai', default: 0.7, min: 0, max: 1, step: 0.1 },
  { key: 'streamResponses', type: 'boolean', label: 'Streaming', description: 'Affichage progressif', category: 'ai', default: true },
  { key: 'showThinking', type: 'boolean', label: 'Afficher la réflexion', category: 'ai', default: false },
  
  // Voice
  { key: 'enabled', type: 'boolean', label: 'Voice Wake activé', category: 'voice', default: false },
  { key: 'wakeWord', type: 'string', label: 'Mot de réveil', category: 'voice', default: 'hey lisa' },
  { key: 'sensitivity', type: 'range', label: 'Sensibilité', category: 'voice', default: 0.7, min: 0.1, max: 1, step: 0.1 },
  { key: 'speakResponses', type: 'boolean', label: 'Lire les réponses', category: 'voice', default: false },
  
  // Notifications
  { key: 'enabled', type: 'boolean', label: 'Notifications activées', category: 'notifications', default: true },
  { key: 'sound', type: 'boolean', label: 'Son', category: 'notifications', default: true },
  { key: 'desktop', type: 'boolean', label: 'Notifications bureau', category: 'notifications', default: true },
  { key: 'quietHoursEnabled', type: 'boolean', label: 'Heures calmes', category: 'notifications', default: false },
  
  // Privacy
  { key: 'saveHistory', type: 'boolean', label: 'Sauvegarder historique', category: 'privacy', default: true },
  { key: 'shareAnalytics', type: 'boolean', label: 'Partager analytics', category: 'privacy', default: false },
  { key: 'encryptStorage', type: 'boolean', label: 'Chiffrer stockage', category: 'privacy', default: false },
  
  // Accessibility
  { key: 'highContrast', type: 'boolean', label: 'Contraste élevé', category: 'accessibility', default: false },
  { key: 'reducedMotion', type: 'boolean', label: 'Réduire animations', category: 'accessibility', default: false },
  { key: 'screenReaderMode', type: 'boolean', label: 'Mode lecteur écran', category: 'accessibility', default: false },
  { key: 'keyboardNavigation', type: 'boolean', label: 'Navigation clavier', category: 'accessibility', default: true },
  
  // Advanced
  { key: 'developerMode', type: 'boolean', label: 'Mode développeur', category: 'advanced', default: false },
  { key: 'debugLogging', type: 'boolean', label: 'Logs debug', category: 'advanced', default: false },
  { key: 'experimentalFeatures', type: 'boolean', label: 'Fonctionnalités expérimentales', category: 'advanced', default: false }
];

export class SettingsManager extends BrowserEventEmitter {
  private settings: Settings;
  private schemas: SettingSchema[] = SETTINGS_SCHEMAS;
  private storageKey = 'lisa-settings';

  constructor() {
    super();
    this.settings = this.loadSettings();
  }

  private loadSettings(): Settings {
    if (typeof localStorage === 'undefined') {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return this.mergeSettings(DEFAULT_SETTINGS, parsed);
      }
    } catch (error) {
      console.error('[Settings] Error loading settings:', error);
    }

    return { ...DEFAULT_SETTINGS };
  }

  private mergeSettings(defaults: Settings, saved: Partial<Settings>): Settings {
    const result = { ...defaults };
    
    for (const category of Object.keys(defaults) as (keyof Settings)[]) {
      if (saved[category]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)[category] = { ...defaults[category], ...saved[category] };
      }
    }
    
    return result;
  }

  private saveSettings(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.error('[Settings] Error saving settings:', error);
    }
  }

  // Get/Set
  get<K extends keyof Settings>(category: K): Settings[K] {
    return this.settings[category];
  }

  set<K extends keyof Settings>(category: K, values: Partial<Settings[K]>): void {
    const oldValues = { ...this.settings[category] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.settings as any)[category] = { ...this.settings[category], ...values };
    
    this.saveSettings();
    this.emit('settings:changed', { category, oldValues, newValues: this.settings[category] });
  }

  getSetting<K extends keyof Settings, S extends keyof Settings[K]>(
    category: K,
    key: S
  ): Settings[K][S] {
    return this.settings[category][key];
  }

  setSetting<K extends keyof Settings, S extends keyof Settings[K]>(
    category: K,
    key: S,
    value: Settings[K][S]
  ): void {
    const oldValue = this.settings[category][key];
    (this.settings[category] as Record<string, unknown>)[key as string] = value;
    
    this.saveSettings();
    this.emit('setting:changed', { category, key, oldValue, newValue: value });
  }

  getAll(): Settings {
    return { ...this.settings };
  }

  // Schemas
  getSchemas(category?: keyof Settings): SettingSchema[] {
    if (category) {
      return this.schemas.filter(s => s.category === category);
    }
    return this.schemas;
  }

  getCategories(): (keyof Settings)[] {
    return Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];
  }

  getCategoryLabel(category: keyof Settings): string {
    const labels: Record<keyof Settings, string> = {
      general: 'Général',
      appearance: 'Apparence',
      chat: 'Chat',
      ai: 'Intelligence Artificielle',
      voice: 'Voix',
      notifications: 'Notifications',
      privacy: 'Confidentialité',
      accessibility: 'Accessibilité',
      advanced: 'Avancé'
    };
    return labels[category];
  }

  // Reset
  resetCategory(category: keyof Settings): void {
    this.settings[category] = { ...DEFAULT_SETTINGS[category] };
    this.saveSettings();
    this.emit('settings:reset', { category });
  }

  resetAll(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    this.emit('settings:resetAll');
  }

  // Export/Import
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  importSettings(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      this.settings = this.mergeSettings(DEFAULT_SETTINGS, imported);
      this.saveSettings();
      this.emit('settings:imported');
      return true;
    } catch {
      return false;
    }
  }

  // Validation
  validateSetting(schema: SettingSchema, value: unknown): boolean {
    if (schema.validator) {
      return schema.validator(value);
    }

    switch (schema.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
      case 'range':
        if (typeof value !== 'number') return false;
        if (schema.min !== undefined && value < schema.min) return false;
        if (schema.max !== undefined && value > schema.max) return false;
        return true;
      case 'boolean':
        return typeof value === 'boolean';
      case 'select':
        return schema.options?.some(opt => opt.value === value) ?? false;
      default:
        return true;
    }
  }
}

// Singleton
let settingsManagerInstance: SettingsManager | null = null;

export function getSettingsManager(): SettingsManager {
  if (!settingsManagerInstance) {
    settingsManagerInstance = new SettingsManager();
  }
  return settingsManagerInstance;
}

export function resetSettingsManager(): void {
  if (settingsManagerInstance) {
    settingsManagerInstance.removeAllListeners();
    settingsManagerInstance = null;
  }
}

