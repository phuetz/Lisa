/**
 * Lisa Keyboard Shortcuts Manager
 * Global keyboard shortcuts for quick actions
 * Inspired by OpenClaw's keyboard navigation
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: string[]; // e.g., ['Ctrl', 'K'] or ['Cmd', 'Shift', 'P']
  category: ShortcutCategory;
  action: string;
  enabled: boolean;
  global: boolean; // Works even when input is focused
}

export type ShortcutCategory = 
  | 'navigation'
  | 'chat'
  | 'editor'
  | 'general'
  | 'tools'
  | 'workflow'
  | 'accessibility';

export interface ShortcutContext {
  activeElement: string;
  path: string;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
}

// Default shortcuts
const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, 'id'>[] = [
  // Navigation
  { name: 'Go to Chat', description: 'Aller au chat', keys: ['Ctrl', 'Shift', 'C'], category: 'navigation', action: 'navigate:/chat', enabled: true, global: true },
  { name: 'Go to Dashboard', description: 'Aller au dashboard', keys: ['Ctrl', 'Shift', 'D'], category: 'navigation', action: 'navigate:/dashboard', enabled: true, global: true },
  { name: 'Go to Gateway', description: 'Aller au gateway', keys: ['Ctrl', 'Shift', 'G'], category: 'navigation', action: 'navigate:/gateway', enabled: true, global: true },
  { name: 'Go to Skills', description: 'Aller aux skills', keys: ['Ctrl', 'Shift', 'S'], category: 'navigation', action: 'navigate:/skills', enabled: true, global: true },
  { name: 'Go to Automation', description: 'Aller à l\'automation', keys: ['Ctrl', 'Shift', 'A'], category: 'navigation', action: 'navigate:/automation', enabled: true, global: true },
  
  // Chat
  { name: 'New Chat', description: 'Nouvelle conversation', keys: ['Ctrl', 'N'], category: 'chat', action: 'chat:new', enabled: true, global: false },
  { name: 'Focus Input', description: 'Focus sur l\'input', keys: ['Ctrl', 'I'], category: 'chat', action: 'chat:focus', enabled: true, global: true },
  { name: 'Send Message', description: 'Envoyer le message', keys: ['Ctrl', 'Enter'], category: 'chat', action: 'chat:send', enabled: true, global: false },
  { name: 'Stop Generation', description: 'Arrêter la génération', keys: ['Escape'], category: 'chat', action: 'chat:stop', enabled: true, global: true },
  { name: 'Regenerate', description: 'Régénérer la réponse', keys: ['Ctrl', 'Shift', 'R'], category: 'chat', action: 'chat:regenerate', enabled: true, global: false },
  { name: 'Copy Last Response', description: 'Copier la dernière réponse', keys: ['Ctrl', 'Shift', 'Y'], category: 'chat', action: 'chat:copyLast', enabled: true, global: false },
  
  // General
  { name: 'Command Palette', description: 'Ouvrir la palette de commandes', keys: ['Ctrl', 'K'], category: 'general', action: 'palette:open', enabled: true, global: true },
  { name: 'Search', description: 'Rechercher', keys: ['Ctrl', 'F'], category: 'general', action: 'search:open', enabled: true, global: true },
  { name: 'Settings', description: 'Ouvrir les paramètres', keys: ['Ctrl', ','], category: 'general', action: 'settings:open', enabled: true, global: true },
  { name: 'Toggle Sidebar', description: 'Afficher/masquer la sidebar', keys: ['Ctrl', 'B'], category: 'general', action: 'sidebar:toggle', enabled: true, global: true },
  { name: 'Toggle Dark Mode', description: 'Changer le thème', keys: ['Ctrl', 'Shift', 'L'], category: 'general', action: 'theme:toggle', enabled: true, global: true },
  { name: 'Help', description: 'Afficher l\'aide', keys: ['F1'], category: 'general', action: 'help:open', enabled: true, global: true },
  
  // Tools
  { name: 'Toggle Voice', description: 'Activer/désactiver la voix', keys: ['Ctrl', 'M'], category: 'tools', action: 'voice:toggle', enabled: true, global: true },
  { name: 'Take Screenshot', description: 'Capturer l\'écran', keys: ['Ctrl', 'Shift', 'X'], category: 'tools', action: 'screenshot:take', enabled: true, global: true },
  { name: 'Open File', description: 'Ouvrir un fichier', keys: ['Ctrl', 'O'], category: 'tools', action: 'file:open', enabled: true, global: false },
  { name: 'Export Chat', description: 'Exporter la conversation', keys: ['Ctrl', 'E'], category: 'tools', action: 'chat:export', enabled: true, global: false },
  
  // Workflow
  { name: 'Run Workflow', description: 'Exécuter le workflow', keys: ['Ctrl', 'Shift', 'Enter'], category: 'workflow', action: 'workflow:run', enabled: true, global: false },
  { name: 'Pause Workflow', description: 'Mettre en pause', keys: ['Ctrl', 'Shift', 'P'], category: 'workflow', action: 'workflow:pause', enabled: true, global: false },
  
  // Accessibility
  { name: 'Increase Font Size', description: 'Augmenter la taille', keys: ['Ctrl', '+'], category: 'accessibility', action: 'font:increase', enabled: true, global: true },
  { name: 'Decrease Font Size', description: 'Réduire la taille', keys: ['Ctrl', '-'], category: 'accessibility', action: 'font:decrease', enabled: true, global: true },
  { name: 'Reset Font Size', description: 'Taille par défaut', keys: ['Ctrl', '0'], category: 'accessibility', action: 'font:reset', enabled: true, global: true },
  { name: 'High Contrast', description: 'Mode contraste élevé', keys: ['Ctrl', 'Shift', 'H'], category: 'accessibility', action: 'accessibility:contrast', enabled: true, global: true },
];

export class KeyboardShortcutManager extends BrowserEventEmitter {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private keyMap: Map<string, string> = new Map(); // Serialized keys -> shortcut ID
  private isListening = false;
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    super();
    this.loadDefaultShortcuts();
  }

  private loadDefaultShortcuts(): void {
    for (const shortcut of DEFAULT_SHORTCUTS) {
      const id = `sc_${shortcut.action.replace(/[^a-z0-9]/gi, '_')}`;
      this.registerShortcut({ ...shortcut, id });
    }
  }

  // Lifecycle
  start(): void {
    if (this.isListening || typeof window === 'undefined') return;

    this.boundHandler = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundHandler);
    this.isListening = true;
    
    console.log('[Keyboard] Shortcuts manager started');
  }

  stop(): void {
    if (!this.isListening || typeof window === 'undefined') return;

    if (this.boundHandler) {
      window.removeEventListener('keydown', this.boundHandler);
      this.boundHandler = null;
    }
    this.isListening = false;
    
    console.log('[Keyboard] Shortcuts manager stopped');
  }

  // Shortcut management
  registerShortcut(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
    this.keyMap.set(this.serializeKeys(shortcut.keys), shortcut.id);
    this.emit('shortcut:registered', shortcut);
  }

  unregisterShortcut(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    this.keyMap.delete(this.serializeKeys(shortcut.keys));
    this.shortcuts.delete(id);
    this.emit('shortcut:unregistered', { id });
    
    return true;
  }

  updateShortcut(id: string, updates: Partial<Omit<KeyboardShortcut, 'id'>>): KeyboardShortcut | null {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return null;

    // If keys are being updated, update the keyMap
    if (updates.keys) {
      this.keyMap.delete(this.serializeKeys(shortcut.keys));
      this.keyMap.set(this.serializeKeys(updates.keys), id);
    }

    Object.assign(shortcut, updates);
    this.emit('shortcut:updated', shortcut);
    
    return shortcut;
  }

  enableShortcut(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = true;
      return true;
    }
    return false;
  }

  disableShortcut(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = false;
      return true;
    }
    return false;
  }

  getShortcut(id: string): KeyboardShortcut | undefined {
    return this.shortcuts.get(id);
  }

  listShortcuts(filter?: {
    category?: ShortcutCategory;
    enabledOnly?: boolean;
  }): KeyboardShortcut[] {
    let shortcuts = Array.from(this.shortcuts.values());

    if (filter?.category) {
      shortcuts = shortcuts.filter(s => s.category === filter.category);
    }
    if (filter?.enabledOnly) {
      shortcuts = shortcuts.filter(s => s.enabled);
    }

    return shortcuts.sort((a, b) => a.name.localeCompare(b.name));
  }

  getByCategory(): Record<ShortcutCategory, KeyboardShortcut[]> {
    const result: Record<ShortcutCategory, KeyboardShortcut[]> = {
      navigation: [],
      chat: [],
      editor: [],
      general: [],
      tools: [],
      workflow: [],
      accessibility: []
    };

    for (const shortcut of this.shortcuts.values()) {
      result[shortcut.category].push(shortcut);
    }

    return result;
  }

  // Key handling
  private handleKeyDown(event: KeyboardEvent): void {
    // Build key combination
    const keys: string[] = [];
    
    if (event.ctrlKey || event.metaKey) keys.push('Ctrl');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');
    
    // Get the actual key
    const key = this.normalizeKey(event.key);
    if (key && !['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      keys.push(key);
    }

    if (keys.length === 0) return;

    // Check if this combination matches a shortcut
    const serialized = this.serializeKeys(keys);
    const shortcutId = this.keyMap.get(serialized);
    
    if (!shortcutId) return;

    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut || !shortcut.enabled) return;

    // Check if shortcut should work in current context
    const context = this.getContext();
    
    if (!shortcut.global && this.isInputFocused(context)) {
      // Allow some shortcuts even in input (like Escape, Ctrl+Enter)
      const allowedInInput = ['Escape', 'Ctrl+Enter'];
      if (!allowedInInput.includes(serialized)) {
        return;
      }
    }

    // Prevent default and execute
    event.preventDefault();
    event.stopPropagation();

    this.executeShortcut(shortcut, context);
  }

  private normalizeKey(key: string): string {
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      '+': '+',
      '-': '-',
      '=': '=',
      ',': ',',
      '.': '.',
      '/': '/',
      '`': '`',
      '[': '[',
      ']': ']',
      '\\': '\\',
      ';': ';',
      "'": "'",
    };

    // Handle special keys
    if (keyMap[key]) return keyMap[key];
    
    // Uppercase single letters
    if (key.length === 1 && /[a-z]/i.test(key)) {
      return key.toUpperCase();
    }

    // Capitalize first letter for others
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  private serializeKeys(keys: string[]): string {
    // Normalize order: Ctrl, Alt, Shift, then other keys
    const modifiers = ['Ctrl', 'Alt', 'Shift'];
    const mods = keys.filter(k => modifiers.includes(k)).sort((a, b) => 
      modifiers.indexOf(a) - modifiers.indexOf(b)
    );
    const others = keys.filter(k => !modifiers.includes(k));
    
    return [...mods, ...others].join('+');
  }

  private getContext(): ShortcutContext {
    const activeElement = document.activeElement;
    
    return {
      activeElement: activeElement?.tagName || '',
      path: window.location.pathname,
      modifiers: {
        ctrl: false,
        alt: false,
        shift: false,
        meta: false
      }
    };
  }

  private isInputFocused(context: ShortcutContext): boolean {
    const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    return inputTags.includes(context.activeElement) ||
           document.activeElement?.getAttribute('contenteditable') === 'true';
  }

  private executeShortcut(shortcut: KeyboardShortcut, context: ShortcutContext): void {
    console.log(`[Keyboard] Executing: ${shortcut.name} (${shortcut.action})`);
    
    this.emit('shortcut:executed', {
      shortcut,
      context
    });

    // Parse and emit specific action
    const [type, payload] = shortcut.action.split(':');
    
    this.emit(`action:${type}`, {
      action: payload,
      shortcut,
      context
    });
  }

  // Check for conflicts
  hasConflict(keys: string[], excludeId?: string): KeyboardShortcut | null {
    const serialized = this.serializeKeys(keys);
    const existingId = this.keyMap.get(serialized);
    
    if (existingId && existingId !== excludeId) {
      return this.shortcuts.get(existingId) || null;
    }
    
    return null;
  }

  // Format keys for display
  formatKeys(keys: string[]): string {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    
    const symbolMap: Record<string, string> = isMac ? {
      'Ctrl': '⌘',
      'Alt': '⌥',
      'Shift': '⇧',
      'Enter': '↩',
      'Escape': '⎋',
      'Space': '␣',
      'Up': '↑',
      'Down': '↓',
      'Left': '←',
      'Right': '→',
      'Backspace': '⌫',
      'Delete': '⌦',
      'Tab': '⇥'
    } : {
      'Enter': '↩',
      'Escape': 'Esc',
      'Space': 'Space',
      'Backspace': '⌫',
      'Delete': 'Del',
      'Tab': 'Tab'
    };

    return keys.map(k => symbolMap[k] || k).join(isMac ? '' : '+');
  }

  // Export/Import
  exportShortcuts(): string {
    return JSON.stringify(Array.from(this.shortcuts.values()), null, 2);
  }

  importShortcuts(json: string): number {
    const shortcuts = JSON.parse(json) as KeyboardShortcut[];
    let imported = 0;

    for (const shortcut of shortcuts) {
      if (!this.hasConflict(shortcut.keys)) {
        this.registerShortcut(shortcut);
        imported++;
      }
    }

    return imported;
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.shortcuts.clear();
    this.keyMap.clear();
    this.loadDefaultShortcuts();
    this.emit('shortcuts:reset');
  }

  // Get stats
  getStats(): {
    total: number;
    enabled: number;
    byCategory: Record<string, number>;
  } {
    const shortcuts = Array.from(this.shortcuts.values());
    const byCategory: Record<string, number> = {};

    for (const s of shortcuts) {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    }

    return {
      total: shortcuts.length,
      enabled: shortcuts.filter(s => s.enabled).length,
      byCategory
    };
  }
}

// Singleton
let keyboardShortcutManagerInstance: KeyboardShortcutManager | null = null;

export function getKeyboardShortcutManager(): KeyboardShortcutManager {
  if (!keyboardShortcutManagerInstance) {
    keyboardShortcutManagerInstance = new KeyboardShortcutManager();
  }
  return keyboardShortcutManagerInstance;
}

export function resetKeyboardShortcutManager(): void {
  if (keyboardShortcutManagerInstance) {
    keyboardShortcutManagerInstance.stop();
    keyboardShortcutManagerInstance.removeAllListeners();
    keyboardShortcutManagerInstance = null;
  }
}

