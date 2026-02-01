/**
 * Lisa Plugin System
 * Dynamic plugin loading and management
 * Inspired by OpenClaw's extensibility architecture
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords: string[];
  dependencies?: Record<string, string>;
  permissions: PluginPermission[];
  status: PluginStatus;
  config?: Record<string, unknown>;
  hooks: PluginHooks;
  installedAt: Date;
  updatedAt: Date;
}

export type PluginPermission = 
  | 'messages:read'
  | 'messages:write'
  | 'sessions:read'
  | 'sessions:write'
  | 'tools:invoke'
  | 'tools:register'
  | 'skills:read'
  | 'skills:write'
  | 'storage:read'
  | 'storage:write'
  | 'network:fetch'
  | 'notifications:send'
  | 'ui:render'
  | 'settings:read'
  | 'settings:write';

export type PluginStatus = 'installed' | 'enabled' | 'disabled' | 'error' | 'updating';

export interface PluginHooks {
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  onEnable?: () => Promise<void>;
  onDisable?: () => Promise<void>;
  onMessage?: (message: PluginMessage) => Promise<PluginMessage | void>;
  onToolCall?: (toolCall: PluginToolCall) => Promise<unknown>;
  onSettingsChange?: (settings: Record<string, unknown>) => void;
}

export interface PluginMessage {
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  metadata?: Record<string, unknown>;
}

export interface PluginToolCall {
  toolId: string;
  parameters: Record<string, unknown>;
  sessionId: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  permissions: PluginPermission[];
  main: string; // Entry point
  config?: PluginConfigSchema;
}

export interface PluginConfigSchema {
  properties: Record<string, PluginConfigProperty>;
  required?: string[];
}

export interface PluginConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: unknown;
  enum?: unknown[];
}

export interface PluginContext {
  pluginId: string;
  storage: PluginStorage;
  api: PluginAPI;
  logger: PluginLogger;
}

export interface PluginStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

export interface PluginAPI {
  sendMessage(sessionId: string, content: string): Promise<void>;
  registerTool(tool: PluginToolDefinition): void;
  unregisterTool(toolId: string): void;
  notify(title: string, message: string): void;
  fetch(url: string, options?: RequestInit): Promise<Response>;
}

export interface PluginToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

// Built-in plugins
const BUILTIN_PLUGINS: Omit<Plugin, 'installedAt' | 'updatedAt'>[] = [
  {
    id: 'lisa-markdown-preview',
    name: 'Markdown Preview',
    version: '1.0.0',
    description: 'Prévisualisation Markdown en temps réel',
    author: 'Lisa Team',
    keywords: ['markdown', 'preview', 'render'],
    permissions: ['messages:read', 'ui:render'],
    status: 'enabled',
    hooks: {}
  },
  {
    id: 'lisa-code-highlight',
    name: 'Code Syntax Highlighting',
    version: '1.0.0',
    description: 'Coloration syntaxique du code',
    author: 'Lisa Team',
    keywords: ['code', 'syntax', 'highlight'],
    permissions: ['messages:read', 'ui:render'],
    status: 'enabled',
    hooks: {}
  },
  {
    id: 'lisa-auto-save',
    name: 'Auto Save',
    version: '1.0.0',
    description: 'Sauvegarde automatique des conversations',
    author: 'Lisa Team',
    keywords: ['save', 'backup', 'auto'],
    permissions: ['sessions:read', 'storage:write'],
    status: 'enabled',
    config: {
      interval: 30000,
      maxBackups: 10
    },
    hooks: {}
  },
  {
    id: 'lisa-emoji-picker',
    name: 'Emoji Picker',
    version: '1.0.0',
    description: 'Sélecteur d\'emojis intégré',
    author: 'Lisa Team',
    keywords: ['emoji', 'picker', 'input'],
    permissions: ['ui:render'],
    status: 'enabled',
    hooks: {}
  },
  {
    id: 'lisa-link-preview',
    name: 'Link Preview',
    version: '1.0.0',
    description: 'Prévisualisation des liens partagés',
    author: 'Lisa Team',
    keywords: ['link', 'preview', 'unfurl'],
    permissions: ['messages:read', 'network:fetch', 'ui:render'],
    status: 'enabled',
    hooks: {}
  }
];

export class PluginSystem extends BrowserEventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private storage: Map<string, Map<string, unknown>> = new Map();
  private registeredTools: Map<string, PluginToolDefinition> = new Map();

  constructor() {
    super();
    this.loadBuiltinPlugins();
  }

  private loadBuiltinPlugins(): void {
    const now = new Date();
    for (const plugin of BUILTIN_PLUGINS) {
      this.plugins.set(plugin.id, {
        ...plugin,
        installedAt: now,
        updatedAt: now
      });
    }
  }

  // Plugin lifecycle
  async installPlugin(manifest: PluginManifest, hooks: PluginHooks): Promise<Plugin> {
    const id = `plugin_${manifest.name.toLowerCase().replace(/\s+/g, '-')}_${Date.now().toString(36)}`;
    
    const plugin: Plugin = {
      id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      homepage: manifest.homepage,
      repository: manifest.repository,
      license: manifest.license,
      keywords: manifest.keywords || [],
      permissions: manifest.permissions,
      status: 'installed',
      hooks,
      installedAt: new Date(),
      updatedAt: new Date()
    };

    this.plugins.set(id, plugin);
    this.storage.set(id, new Map());
    
    // Call onLoad hook
    if (hooks.onLoad) {
      try {
        await hooks.onLoad();
      } catch (error) {
        plugin.status = 'error';
        this.emit('plugin:error', { plugin, error });
      }
    }

    this.emit('plugin:installed', plugin);
    return plugin;
  }

  async uninstallPlugin(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;

    // Call onUnload hook
    if (plugin.hooks.onUnload) {
      try {
        await plugin.hooks.onUnload();
      } catch (error) {
        this.emit('plugin:error', { plugin, error });
      }
    }

    // Unregister any tools
    for (const [toolId, _tool] of this.registeredTools) {
      if (toolId.startsWith(`${id}:`)) {
        this.registeredTools.delete(toolId);
      }
    }

    this.plugins.delete(id);
    this.storage.delete(id);
    
    this.emit('plugin:uninstalled', { id });
    return true;
  }

  async enablePlugin(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin || plugin.status === 'enabled') return false;

    if (plugin.hooks.onEnable) {
      try {
        await plugin.hooks.onEnable();
      } catch (error) {
        plugin.status = 'error';
        this.emit('plugin:error', { plugin, error });
        return false;
      }
    }

    plugin.status = 'enabled';
    plugin.updatedAt = new Date();
    
    this.emit('plugin:enabled', plugin);
    return true;
  }

  async disablePlugin(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin || plugin.status === 'disabled') return false;

    if (plugin.hooks.onDisable) {
      try {
        await plugin.hooks.onDisable();
      } catch (error) {
        this.emit('plugin:error', { plugin, error });
      }
    }

    plugin.status = 'disabled';
    plugin.updatedAt = new Date();
    
    this.emit('plugin:disabled', plugin);
    return true;
  }

  // Plugin queries
  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  listPlugins(filter?: {
    status?: PluginStatus;
    keyword?: string;
    permission?: PluginPermission;
  }): Plugin[] {
    let plugins = Array.from(this.plugins.values());

    if (filter?.status) {
      plugins = plugins.filter(p => p.status === filter.status);
    }
    if (filter?.keyword) {
      plugins = plugins.filter(p => p.keywords.includes(filter.keyword!));
    }
    if (filter?.permission) {
      plugins = plugins.filter(p => p.permissions.includes(filter.permission!));
    }

    return plugins;
  }

  getEnabledPlugins(): Plugin[] {
    return this.listPlugins({ status: 'enabled' });
  }

  // Hook execution
  async executeMessageHook(message: PluginMessage): Promise<PluginMessage> {
    let result = message;

    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.hooks.onMessage && this.hasPermission(plugin, 'messages:read')) {
        try {
          const modified = await plugin.hooks.onMessage(result);
          if (modified) {
            result = modified;
          }
        } catch (error) {
          this.emit('plugin:error', { plugin, error, hook: 'onMessage' });
        }
      }
    }

    return result;
  }

  async executeToolHook(toolCall: PluginToolCall): Promise<unknown> {
    // Check if this is a plugin-registered tool
    const tool = this.registeredTools.get(toolCall.toolId);
    if (tool) {
      return tool.handler(toolCall.parameters);
    }

    // Execute plugin hooks
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.hooks.onToolCall && this.hasPermission(plugin, 'tools:invoke')) {
        try {
          const result = await plugin.hooks.onToolCall(toolCall);
          if (result !== undefined) {
            return result;
          }
        } catch (error) {
          this.emit('plugin:error', { plugin, error, hook: 'onToolCall' });
        }
      }
    }

    return undefined;
  }

  // Permission checking
  hasPermission(plugin: Plugin, permission: PluginPermission): boolean {
    return plugin.permissions.includes(permission);
  }

  // Plugin context creation
  createContext(pluginId: string): PluginContext {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const pluginStorage = this.storage.get(pluginId) || new Map();
    
    const storage: PluginStorage = {
      get: async <T>(key: string): Promise<T | null> => {
        return pluginStorage.get(key) as T ?? null;
      },
      set: async <T>(key: string, value: T): Promise<void> => {
        pluginStorage.set(key, value);
      },
      delete: async (key: string): Promise<void> => {
        pluginStorage.delete(key);
      },
      list: async (): Promise<string[]> => {
        return Array.from(pluginStorage.keys());
      }
    };

    const api: PluginAPI = {
      sendMessage: async (sessionId: string, content: string): Promise<void> => {
        if (!this.hasPermission(plugin, 'messages:write')) {
          throw new Error('Permission denied: messages:write');
        }
        this.emit('plugin:sendMessage', { pluginId, sessionId, content });
      },
      registerTool: (tool: PluginToolDefinition): void => {
        if (!this.hasPermission(plugin, 'tools:register')) {
          throw new Error('Permission denied: tools:register');
        }
        const fullToolId = `${pluginId}:${tool.id}`;
        this.registeredTools.set(fullToolId, tool);
        this.emit('plugin:toolRegistered', { pluginId, tool });
      },
      unregisterTool: (toolId: string): void => {
        const fullToolId = `${pluginId}:${toolId}`;
        this.registeredTools.delete(fullToolId);
        this.emit('plugin:toolUnregistered', { pluginId, toolId });
      },
      notify: (title: string, message: string): void => {
        if (!this.hasPermission(plugin, 'notifications:send')) {
          throw new Error('Permission denied: notifications:send');
        }
        this.emit('plugin:notify', { pluginId, title, message });
      },
      fetch: async (url: string, options?: RequestInit): Promise<Response> => {
        if (!this.hasPermission(plugin, 'network:fetch')) {
          throw new Error('Permission denied: network:fetch');
        }
        return fetch(url, options);
      }
    };

    const logger: PluginLogger = {
      debug: (message: string, ...args: unknown[]) => {
        console.debug(`[${plugin.name}]`, message, ...args);
      },
      info: (message: string, ...args: unknown[]) => {
        console.info(`[${plugin.name}]`, message, ...args);
      },
      warn: (message: string, ...args: unknown[]) => {
        console.warn(`[${plugin.name}]`, message, ...args);
      },
      error: (message: string, ...args: unknown[]) => {
        console.error(`[${plugin.name}]`, message, ...args);
      }
    };

    return { pluginId, storage, api, logger };
  }

  // Plugin configuration
  updatePluginConfig(id: string, config: Record<string, unknown>): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;

    plugin.config = { ...plugin.config, ...config };
    plugin.updatedAt = new Date();

    if (plugin.hooks.onSettingsChange) {
      plugin.hooks.onSettingsChange(plugin.config);
    }

    this.emit('plugin:configUpdated', { plugin, config });
    return true;
  }

  getPluginConfig(id: string): Record<string, unknown> | undefined {
    return this.plugins.get(id)?.config;
  }

  // Stats
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    error: number;
    registeredTools: number;
  } {
    const plugins = Array.from(this.plugins.values());
    return {
      total: plugins.length,
      enabled: plugins.filter(p => p.status === 'enabled').length,
      disabled: plugins.filter(p => p.status === 'disabled').length,
      error: plugins.filter(p => p.status === 'error').length,
      registeredTools: this.registeredTools.size
    };
  }

  // Export/Import
  exportPluginData(id: string): string | null {
    const plugin = this.plugins.get(id);
    const storage = this.storage.get(id);
    
    if (!plugin) return null;

    return JSON.stringify({
      plugin: {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        config: plugin.config
      },
      storage: storage ? Object.fromEntries(storage) : {}
    }, null, 2);
  }

  importPluginData(id: string, data: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;

    try {
      const parsed = JSON.parse(data);
      
      if (parsed.config) {
        plugin.config = parsed.config;
      }
      
      if (parsed.storage) {
        const storage = new Map(Object.entries(parsed.storage));
        this.storage.set(id, storage);
      }

      return true;
    } catch {
      return false;
    }
  }
}

// Singleton
let pluginSystemInstance: PluginSystem | null = null;

export function getPluginSystem(): PluginSystem {
  if (!pluginSystemInstance) {
    pluginSystemInstance = new PluginSystem();
  }
  return pluginSystemInstance;
}

export function resetPluginSystem(): void {
  if (pluginSystemInstance) {
    pluginSystemInstance.removeAllListeners();
    pluginSystemInstance = null;
  }
}

