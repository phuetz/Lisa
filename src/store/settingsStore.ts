/**
 * Settings Store
 * Manages workspace settings, provider credentials, and model catalog.
 * Adapted from PromptCommander's settings store for Lisa.
 */

import { create } from 'zustand';
import type { WorkspaceSettings, ProviderCredential, ModelCatalogEntry, ProviderKey } from '../types/promptcommander';
import { db } from '../db/database';
import { loadSettings, updateSettings as persistSettings } from '../db/settings';
import { DEFAULT_MODELS } from '../domain/modelCatalog';

interface SettingsState {
  settings: WorkspaceSettings;
  credentials: ProviderCredential[];
  models: ModelCatalogEntry[];
  initialized: boolean;

  init: (force?: boolean) => Promise<void>;
  updateSettings: (patch: Partial<WorkspaceSettings>) => void;

  // Credentials
  setCredential: (provider: ProviderKey, apiKey: string, baseUrl?: string) => Promise<void>;
  getApiKey: (provider: ProviderKey) => string;
  getBaseUrl: (provider: ProviderKey) => string | undefined;
  isProviderConfigured: (provider: ProviderKey) => boolean;

  // Models
  getModel: (modelId: string) => ModelCatalogEntry | undefined;
  getEnabledModels: () => ModelCatalogEntry[];
  getModelsForProvider: (provider: ProviderKey) => ModelCatalogEntry[];
  toggleModelFavorite: (modelId: string) => Promise<void>;
  toggleModelEnabled: (modelId: string) => Promise<void>;
  updateModelPricing: (modelId: string, priceInput: number, priceOutput: number) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: loadSettings(),
  credentials: [],
  models: [],
  initialized: false,

  async init(force?: boolean) {
    if (get().initialized && !force) return;

    try {
      // Seed default models if empty
      const modelCount = await db.models.count();
      if (modelCount === 0) {
        await db.models.bulkPut(DEFAULT_MODELS);
      }

      // Load from Dexie
      const dbCredentials = await db.credentials.toArray();
      const models = await db.models.orderBy('sortOrder').toArray();

      set({ credentials: dbCredentials, models, initialized: true });
    } catch (error) {
      console.error('[SettingsStore] Init failed:', error);
      // Fallback: use defaults in memory
      set({ models: DEFAULT_MODELS, initialized: true });
    }
  },

  updateSettings(patch) {
    const updated = persistSettings(patch);
    set({ settings: updated });
  },

  async setCredential(provider, apiKey, baseUrl) {
    const localProviders: ProviderKey[] = ['ollama', 'lmstudio', 'codebuddy'];
    if (apiKey.trim() === '' && !localProviders.includes(provider) && !baseUrl) {
      return;
    }

    const existing = get().credentials.find(c => c.provider === provider);
    const cred: ProviderCredential = {
      id: existing?.id || provider,
      provider,
      label: provider,
      apiKey,
      baseUrl,
      isEnabled: !!apiKey || localProviders.includes(provider),
      lastValidationStatus: 'unknown',
    };

    await db.credentials.put(cred);
    set(state => ({
      credentials: [...state.credentials.filter(c => c.provider !== provider), cred],
    }));
  },

  getApiKey(provider) {
    return get().credentials.find(c => c.provider === provider)?.apiKey || '';
  },

  getBaseUrl(provider) {
    return get().credentials.find(c => c.provider === provider)?.baseUrl;
  },

  isProviderConfigured(provider) {
    const localProviders: ProviderKey[] = ['ollama', 'lmstudio', 'codebuddy'];
    if (localProviders.includes(provider)) return true;
    const cred = get().credentials.find(c => c.provider === provider);
    return !!(cred?.apiKey && cred.isEnabled);
  },

  getModel(modelId) {
    return get().models.find(m => m.id === modelId);
  },

  getEnabledModels() {
    return get().models.filter(m => m.isEnabled);
  },

  getModelsForProvider(provider) {
    return get().models.filter(m => m.provider === provider && m.isEnabled);
  },

  async toggleModelFavorite(modelId) {
    const model = get().models.find(m => m.id === modelId);
    if (!model) return;
    await db.models.update(modelId, { isFavorite: !model.isFavorite });
    const models = await db.models.orderBy('sortOrder').toArray();
    set({ models });
  },

  async toggleModelEnabled(modelId) {
    const model = get().models.find(m => m.id === modelId);
    if (!model) return;
    await db.models.update(modelId, { isEnabled: !model.isEnabled });
    const models = await db.models.orderBy('sortOrder').toArray();
    set({ models });
  },

  async updateModelPricing(modelId, priceInput, priceOutput) {
    await db.models.update(modelId, { priceInputPer1M: priceInput, priceOutputPer1M: priceOutput });
    const models = await db.models.orderBy('sortOrder').toArray();
    set({ models });
  },
}));
