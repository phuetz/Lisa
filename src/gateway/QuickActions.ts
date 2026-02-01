/**
 * Lisa Quick Actions
 * Customizable quick actions and shortcuts
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface QuickAction {
  id: string;
  name: string;
  description?: string;
  icon: string;
  category: QuickActionCategory;
  type: QuickActionType;
  action: string;
  data?: Record<string, unknown>;
  shortcut?: string;
  isEnabled: boolean;
  isPinned: boolean;
  usageCount: number;
  lastUsed?: Date;
}

export type QuickActionCategory = 
  | 'chat'
  | 'agents'
  | 'tools'
  | 'navigation'
  | 'system'
  | 'custom';

export type QuickActionType = 
  | 'prompt'
  | 'command'
  | 'navigation'
  | 'agent'
  | 'skill'
  | 'workflow'
  | 'external';

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'new-chat',
    name: 'Nouvelle conversation',
    description: 'Démarrer une nouvelle conversation',
    icon: '💬',
    category: 'chat',
    type: 'command',
    action: 'chat:new',
    shortcut: 'Ctrl+N',
    isEnabled: true,
    isPinned: true,
    usageCount: 0
  },
  {
    id: 'search',
    name: 'Rechercher',
    description: 'Rechercher dans les conversations',
    icon: '🔍',
    category: 'chat',
    type: 'command',
    action: 'chat:search',
    shortcut: 'Ctrl+F',
    isEnabled: true,
    isPinned: true,
    usageCount: 0
  },
  {
    id: 'export',
    name: 'Exporter',
    description: 'Exporter la conversation actuelle',
    icon: '📤',
    category: 'chat',
    type: 'command',
    action: 'chat:export',
    isEnabled: true,
    isPinned: false,
    usageCount: 0
  },
  {
    id: 'summarize',
    name: 'Résumer',
    description: 'Résumer le texte sélectionné',
    icon: '📝',
    category: 'tools',
    type: 'prompt',
    action: 'Résume ce texte de manière concise:',
    isEnabled: true,
    isPinned: true,
    usageCount: 0
  },
  {
    id: 'translate',
    name: 'Traduire',
    description: 'Traduire en français',
    icon: '🌍',
    category: 'tools',
    type: 'prompt',
    action: 'Traduis ce texte en français:',
    isEnabled: true,
    isPinned: true,
    usageCount: 0
  },
  {
    id: 'explain',
    name: 'Expliquer',
    description: 'Expliquer simplement',
    icon: '💡',
    category: 'tools',
    type: 'prompt',
    action: 'Explique ceci de manière simple et claire:',
    isEnabled: true,
    isPinned: false,
    usageCount: 0
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Analyser et améliorer le code',
    icon: '🔧',
    category: 'tools',
    type: 'prompt',
    action: 'Analyse ce code et suggère des améliorations:',
    isEnabled: true,
    isPinned: false,
    usageCount: 0
  },
  {
    id: 'fix-grammar',
    name: 'Corriger',
    description: 'Corriger la grammaire et le style',
    icon: '✏️',
    category: 'tools',
    type: 'prompt',
    action: 'Corrige la grammaire et améliore le style de ce texte:',
    isEnabled: true,
    isPinned: false,
    usageCount: 0
  },
  {
    id: 'planner-agent',
    name: 'Planifier',
    description: 'Utiliser l\'agent de planification',
    icon: '📋',
    category: 'agents',
    type: 'agent',
    action: 'planner',
    isEnabled: true,
    isPinned: false,
    usageCount: 0
  },
  {
    id: 'coder-agent',
    name: 'Coder',
    description: 'Utiliser l\'agent de code',
    icon: '💻',
    category: 'agents',
    type: 'agent',
    action: 'coder',
    isEnabled: true,
    isPinned: false,
    usageCount: 0
  },
  {
    id: 'web-search',
    name: 'Recherche Web',
    description: 'Rechercher sur le web',
    icon: '🌐',
    category: 'tools',
    type: 'skill',
    action: 'web_search',
    isEnabled: true,
    isPinned: false,
    usageCount: 0
  },
  {
    id: 'settings',
    name: 'Paramètres',
    description: 'Ouvrir les paramètres',
    icon: '⚙️',
    category: 'navigation',
    type: 'navigation',
    action: '/settings',
    isEnabled: true,
    isPinned: false,
    usageCount: 0
  },
  {
    id: 'gateway',
    name: 'Gateway',
    description: 'Ouvrir le Gateway Dashboard',
    icon: '🌐',
    category: 'navigation',
    type: 'navigation',
    action: '/gateway',
    isEnabled: true,
    isPinned: false,
    usageCount: 0
  }
];

export class QuickActionsManager extends BrowserEventEmitter {
  private actions: Map<string, QuickAction> = new Map();
  private recentActions: string[] = [];
  private maxRecent = 5;

  constructor() {
    super();
    this.loadDefaultActions();
    this.loadFromStorage();
  }

  private loadDefaultActions(): void {
    for (const action of DEFAULT_QUICK_ACTIONS) {
      this.actions.set(action.id, { ...action });
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('lisa-quick-actions');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Merge with defaults (keep user customizations)
        if (data.actions) {
          for (const action of data.actions) {
            if (this.actions.has(action.id)) {
              const existing = this.actions.get(action.id)!;
              this.actions.set(action.id, { ...existing, ...action });
            } else {
              this.actions.set(action.id, action);
            }
          }
        }

        if (data.recentActions) {
          this.recentActions = data.recentActions;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = {
        actions: Array.from(this.actions.values()),
        recentActions: this.recentActions
      };
      localStorage.setItem('lisa-quick-actions', JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  // Action management
  get(id: string): QuickAction | undefined {
    return this.actions.get(id);
  }

  list(filter?: {
    category?: QuickActionCategory;
    type?: QuickActionType;
    enabledOnly?: boolean;
    pinnedOnly?: boolean;
  }): QuickAction[] {
    let actions = Array.from(this.actions.values());

    if (filter?.category) {
      actions = actions.filter(a => a.category === filter.category);
    }
    if (filter?.type) {
      actions = actions.filter(a => a.type === filter.type);
    }
    if (filter?.enabledOnly) {
      actions = actions.filter(a => a.isEnabled);
    }
    if (filter?.pinnedOnly) {
      actions = actions.filter(a => a.isPinned);
    }

    return actions.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.usageCount - a.usageCount;
    });
  }

  getPinned(): QuickAction[] {
    return this.list({ pinnedOnly: true, enabledOnly: true });
  }

  getRecent(): QuickAction[] {
    return this.recentActions
      .map(id => this.actions.get(id))
      .filter((a): a is QuickAction => a !== undefined && a.isEnabled);
  }

  getSuggested(): QuickAction[] {
    // Return top used actions that aren't pinned
    return this.list({ enabledOnly: true })
      .filter(a => !a.isPinned)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
  }

  // Execute action
  execute(id: string): QuickAction | null {
    const action = this.actions.get(id);
    if (!action || !action.isEnabled) return null;

    // Update usage stats
    action.usageCount++;
    action.lastUsed = new Date();

    // Update recent
    this.recentActions = [id, ...this.recentActions.filter(i => i !== id)].slice(0, this.maxRecent);

    this.emit('action:executed', action);
    this.saveToStorage();

    return action;
  }

  // CRUD
  create(action: Omit<QuickAction, 'id' | 'usageCount' | 'lastUsed'>): QuickAction {
    const id = `custom_${Date.now().toString(36)}`;
    const newAction: QuickAction = {
      ...action,
      id,
      usageCount: 0
    };

    this.actions.set(id, newAction);
    this.emit('action:created', newAction);
    this.saveToStorage();

    return newAction;
  }

  update(id: string, updates: Partial<Pick<QuickAction, 'name' | 'description' | 'icon' | 'action' | 'shortcut' | 'isEnabled' | 'isPinned'>>): boolean {
    const action = this.actions.get(id);
    if (!action) return false;

    Object.assign(action, updates);
    this.emit('action:updated', action);
    this.saveToStorage();
    return true;
  }

  delete(id: string): boolean {
    // Don't delete default actions
    if (DEFAULT_QUICK_ACTIONS.some(a => a.id === id)) {
      return false;
    }

    const deleted = this.actions.delete(id);
    if (deleted) {
      this.recentActions = this.recentActions.filter(i => i !== id);
      this.emit('action:deleted', { id });
      this.saveToStorage();
    }
    return deleted;
  }

  // Pin/Unpin
  pin(id: string): boolean {
    return this.update(id, { isPinned: true });
  }

  unpin(id: string): boolean {
    return this.update(id, { isPinned: false });
  }

  // Enable/Disable
  enable(id: string): boolean {
    return this.update(id, { isEnabled: true });
  }

  disable(id: string): boolean {
    return this.update(id, { isEnabled: false });
  }

  // Search
  search(query: string): QuickAction[] {
    const q = query.toLowerCase();
    return this.list({ enabledOnly: true }).filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.action.toLowerCase().includes(q)
    );
  }

  // Stats
  getStats(): {
    total: number;
    enabled: number;
    pinned: number;
    custom: number;
    totalExecutions: number;
  } {
    const actions = Array.from(this.actions.values());
    const customCount = actions.filter(a => a.id.startsWith('custom_')).length;

    return {
      total: actions.length,
      enabled: actions.filter(a => a.isEnabled).length,
      pinned: actions.filter(a => a.isPinned).length,
      custom: customCount,
      totalExecutions: actions.reduce((sum, a) => sum + a.usageCount, 0)
    };
  }

  // Reset
  reset(): void {
    this.actions.clear();
    this.recentActions = [];
    this.loadDefaultActions();
    this.emit('actions:reset');
    this.saveToStorage();
  }
}

// Singleton
let quickActionsInstance: QuickActionsManager | null = null;

export function getQuickActionsManager(): QuickActionsManager {
  if (!quickActionsInstance) {
    quickActionsInstance = new QuickActionsManager();
  }
  return quickActionsInstance;
}

export function resetQuickActionsManager(): void {
  if (quickActionsInstance) {
    quickActionsInstance.removeAllListeners();
    quickActionsInstance = null;
  }
}

