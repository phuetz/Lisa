/**
 * Default Model Catalog
 * 35+ models with pricing data across 8 providers.
 * Adapted from PromptCommander's constants.ts
 */

import type { ModelCatalogEntry, ProviderKey } from '../types/promptcommander';

// ─── Provider Configuration ───────────────────────────────────────

export interface ProviderConfig {
  key: ProviderKey;
  name: string;
  endpoint: string;
  docsUrl: string;
  keyPlaceholder: string;
  supportsCustomEndpoint: boolean;
  color: string;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  openai: { key: 'openai', name: 'OpenAI', endpoint: 'https://api.openai.com/v1', docsUrl: 'https://platform.openai.com/api-keys', keyPlaceholder: 'sk-...', supportsCustomEndpoint: false, color: '#10a37f' },
  anthropic: { key: 'anthropic', name: 'Anthropic', endpoint: 'https://api.anthropic.com', docsUrl: 'https://console.anthropic.com/settings/keys', keyPlaceholder: 'sk-ant-...', supportsCustomEndpoint: false, color: '#d4a574' },
  gemini: { key: 'gemini', name: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta', docsUrl: 'https://aistudio.google.com/apikey', keyPlaceholder: 'AIza...', supportsCustomEndpoint: false, color: '#4285f4' },
  perplexity: { key: 'perplexity', name: 'Perplexity', endpoint: 'https://api.perplexity.ai', docsUrl: 'https://docs.perplexity.ai', keyPlaceholder: 'pplx-...', supportsCustomEndpoint: false, color: '#20808d' },
  mistral: { key: 'mistral', name: 'Mistral', endpoint: 'https://api.mistral.ai/v1', docsUrl: 'https://console.mistral.ai/api-keys', keyPlaceholder: '...', supportsCustomEndpoint: false, color: '#ff7000' },
  xai: { key: 'xai', name: 'xAI (Grok)', endpoint: 'https://api.x.ai/v1', docsUrl: 'https://console.x.ai', keyPlaceholder: 'xai-...', supportsCustomEndpoint: false, color: '#1da1f2' },
  lmstudio: { key: 'lmstudio', name: 'LM Studio', endpoint: 'http://localhost:1234', docsUrl: 'https://lmstudio.ai', keyPlaceholder: '(aucune clé requise)', supportsCustomEndpoint: true, color: '#6366f1' },
  ollama: { key: 'ollama', name: 'Ollama (Local)', endpoint: 'http://localhost:11434', docsUrl: 'https://ollama.com', keyPlaceholder: '(aucune clé requise)', supportsCustomEndpoint: true, color: '#374151' },
  'openai-compatible': { key: 'openai-compatible', name: 'Custom (OpenAI-compatible)', endpoint: '', docsUrl: '', keyPlaceholder: '...', supportsCustomEndpoint: true, color: '#8b5cf6' },
  codebuddy: { key: 'codebuddy', name: 'Code Buddy', endpoint: 'http://localhost:3000', docsUrl: '', keyPlaceholder: 'cb_sk_... (optionnel)', supportsCustomEndpoint: true, color: '#f59e0b' },
};

// ─── Default Model Catalog (prices per 1M tokens) ────────────────

export const DEFAULT_MODELS: ModelCatalogEntry[] = [
  // OpenAI
  { id: 'gpt-4o', provider: 'openai', label: 'GPT-4o', apiModel: 'gpt-4o', capabilities: ['chat', 'vision', 'streaming', 'tools', 'json-mode'], priceInputPer1M: 2.50, priceOutputPer1M: 10.00, contextWindow: 128000, maxOutputTokens: 16384, isFavorite: true, isEnabled: true, sortOrder: 1 },
  { id: 'gpt-4o-mini', provider: 'openai', label: 'GPT-4o Mini', apiModel: 'gpt-4o-mini', capabilities: ['chat', 'vision', 'streaming', 'tools', 'json-mode'], priceInputPer1M: 0.15, priceOutputPer1M: 0.60, contextWindow: 128000, maxOutputTokens: 16384, isFavorite: true, isEnabled: true, sortOrder: 2 },
  { id: 'o3-mini', provider: 'openai', label: 'o3 Mini', apiModel: 'o3-mini', capabilities: ['chat', 'reasoning', 'streaming'], priceInputPer1M: 1.10, priceOutputPer1M: 4.40, contextWindow: 200000, maxOutputTokens: 100000, isFavorite: false, isEnabled: true, sortOrder: 3 },
  { id: 'gpt-4-turbo', provider: 'openai', label: 'GPT-4 Turbo', apiModel: 'gpt-4-turbo', capabilities: ['chat', 'vision', 'streaming', 'tools', 'json-mode'], priceInputPer1M: 10.00, priceOutputPer1M: 30.00, contextWindow: 128000, maxOutputTokens: 4096, isFavorite: false, isEnabled: true, sortOrder: 4 },
  { id: 'dall-e-3', provider: 'openai', label: 'DALL-E 3', apiModel: 'dall-e-3', capabilities: ['image-generation'], priceInputPer1M: 0, priceOutputPer1M: 0, contextWindow: 0, maxOutputTokens: 0, isFavorite: false, isEnabled: true, sortOrder: 5 },

  // Anthropic
  { id: 'claude-opus-4', provider: 'anthropic', label: 'Claude Opus 4', apiModel: 'claude-opus-4-20250514', capabilities: ['chat', 'vision', 'streaming', 'tools'], priceInputPer1M: 15.00, priceOutputPer1M: 75.00, contextWindow: 200000, maxOutputTokens: 32000, isFavorite: false, isEnabled: true, sortOrder: 10 },
  { id: 'claude-sonnet-4', provider: 'anthropic', label: 'Claude Sonnet 4', apiModel: 'claude-sonnet-4-20250514', capabilities: ['chat', 'vision', 'streaming', 'tools'], priceInputPer1M: 3.00, priceOutputPer1M: 15.00, contextWindow: 200000, maxOutputTokens: 64000, isFavorite: true, isEnabled: true, sortOrder: 11 },
  { id: 'claude-haiku-35', provider: 'anthropic', label: 'Claude Haiku 3.5', apiModel: 'claude-haiku-3-5-20241022', capabilities: ['chat', 'vision', 'streaming', 'tools'], priceInputPer1M: 0.80, priceOutputPer1M: 4.00, contextWindow: 200000, maxOutputTokens: 8192, isFavorite: true, isEnabled: true, sortOrder: 12 },

  // Google Gemini
  { id: 'gemini-2.0-flash', provider: 'gemini', label: 'Gemini 2.0 Flash', apiModel: 'gemini-2.0-flash', capabilities: ['chat', 'vision', 'streaming', 'tools', 'json-mode'], priceInputPer1M: 0.10, priceOutputPer1M: 0.40, contextWindow: 1048576, maxOutputTokens: 8192, isFavorite: true, isEnabled: true, sortOrder: 20 },
  { id: 'gemini-2.0-pro', provider: 'gemini', label: 'Gemini 2.0 Pro', apiModel: 'gemini-2.0-pro-exp-02-05', capabilities: ['chat', 'vision', 'streaming', 'tools', 'json-mode'], priceInputPer1M: 1.25, priceOutputPer1M: 10.00, contextWindow: 2097152, maxOutputTokens: 8192, isFavorite: false, isEnabled: true, sortOrder: 21 },
  { id: 'gemini-1.5-pro', provider: 'gemini', label: 'Gemini 1.5 Pro', apiModel: 'gemini-1.5-pro', capabilities: ['chat', 'vision', 'streaming', 'tools', 'json-mode'], priceInputPer1M: 1.25, priceOutputPer1M: 5.00, contextWindow: 2097152, maxOutputTokens: 8192, isFavorite: false, isEnabled: true, sortOrder: 22 },
  { id: 'gemini-1.5-flash', provider: 'gemini', label: 'Gemini 1.5 Flash', apiModel: 'gemini-1.5-flash', capabilities: ['chat', 'vision', 'streaming', 'tools', 'json-mode'], priceInputPer1M: 0.075, priceOutputPer1M: 0.30, contextWindow: 1048576, maxOutputTokens: 8192, isFavorite: false, isEnabled: true, sortOrder: 23 },

  // xAI
  { id: 'grok-2', provider: 'xai', label: 'Grok-2', apiModel: 'grok-2-latest', capabilities: ['chat', 'streaming', 'tools'], priceInputPer1M: 2.00, priceOutputPer1M: 10.00, contextWindow: 131072, maxOutputTokens: 32000, isFavorite: false, isEnabled: true, sortOrder: 25 },

  // Perplexity
  { id: 'sonar', provider: 'perplexity', label: 'Sonar', apiModel: 'sonar', capabilities: ['chat', 'web-search', 'streaming'], priceInputPer1M: 1.00, priceOutputPer1M: 1.00, contextWindow: 127072, maxOutputTokens: 4096, isFavorite: false, isEnabled: true, sortOrder: 30 },
  { id: 'sonar-pro', provider: 'perplexity', label: 'Sonar Pro', apiModel: 'sonar-pro', capabilities: ['chat', 'web-search', 'streaming'], priceInputPer1M: 3.00, priceOutputPer1M: 15.00, contextWindow: 200000, maxOutputTokens: 8192, isFavorite: false, isEnabled: true, sortOrder: 31 },
  { id: 'sonar-reasoning', provider: 'perplexity', label: 'Sonar Reasoning', apiModel: 'sonar-reasoning', capabilities: ['chat', 'web-search', 'reasoning', 'streaming'], priceInputPer1M: 1.00, priceOutputPer1M: 5.00, contextWindow: 127072, maxOutputTokens: 4096, isFavorite: false, isEnabled: true, sortOrder: 32 },

  // Mistral
  { id: 'mistral-large', provider: 'mistral', label: 'Mistral Large', apiModel: 'mistral-large-latest', capabilities: ['chat', 'streaming', 'tools', 'json-mode'], priceInputPer1M: 2.00, priceOutputPer1M: 6.00, contextWindow: 128000, maxOutputTokens: 8192, isFavorite: false, isEnabled: true, sortOrder: 40 },
  { id: 'mistral-small', provider: 'mistral', label: 'Mistral Small', apiModel: 'mistral-small-latest', capabilities: ['chat', 'streaming', 'tools', 'json-mode'], priceInputPer1M: 0.20, priceOutputPer1M: 0.60, contextWindow: 128000, maxOutputTokens: 8192, isFavorite: false, isEnabled: true, sortOrder: 41 },
  { id: 'mistral-nemo', provider: 'mistral', label: 'Mistral Nemo', apiModel: 'open-mistral-nemo', capabilities: ['chat', 'streaming'], priceInputPer1M: 0.15, priceOutputPer1M: 0.15, contextWindow: 128000, maxOutputTokens: 8192, isFavorite: false, isEnabled: true, sortOrder: 42 },

  // LM Studio (local)
  { id: 'lmstudio-local', provider: 'lmstudio', label: 'LM Studio (Local)', apiModel: 'local-model', capabilities: ['chat', 'streaming'], priceInputPer1M: 0, priceOutputPer1M: 0, contextWindow: 32000, maxOutputTokens: 4096, isFavorite: false, isEnabled: true, sortOrder: 60 },

  // Ollama (local)
  { id: 'ollama-llama3.2', provider: 'ollama', label: 'Llama 3.2 (Local)', apiModel: 'llama3.2', capabilities: ['chat', 'streaming'], priceInputPer1M: 0, priceOutputPer1M: 0, contextWindow: 128000, maxOutputTokens: 4096, isFavorite: false, isEnabled: false, sortOrder: 700 },
  { id: 'ollama-mistral', provider: 'ollama', label: 'Mistral (Local)', apiModel: 'mistral', capabilities: ['chat', 'streaming'], priceInputPer1M: 0, priceOutputPer1M: 0, contextWindow: 32000, maxOutputTokens: 4096, isFavorite: false, isEnabled: false, sortOrder: 701 },
  { id: 'ollama-codellama', provider: 'ollama', label: 'Code Llama (Local)', apiModel: 'codellama', capabilities: ['chat', 'streaming'], priceInputPer1M: 0, priceOutputPer1M: 0, contextWindow: 16000, maxOutputTokens: 4096, isFavorite: false, isEnabled: false, sortOrder: 702 },
];
