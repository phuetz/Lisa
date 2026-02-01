/**
 * Chat Settings Store
 * Gestion des paramètres du chat (modèle, thème, system prompt, etc.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SYSTEM_PROMPTS } from '../prompts';

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'lmstudio' | 'openai' | 'anthropic' | 'ollama' | 'gemini' | 'xai';
  baseUrl?: string;
  apiKey?: string;
}

export const DEFAULT_MODELS: ModelConfig[] = [
  // Local models (LM Studio) - IDs doivent correspondre aux modèles chargés
  { id: 'mistralai/devstral-small-2-2512', name: '⭐ Devstral Small 2 (Local)', provider: 'lmstudio' },
  { id: 'mistralai/magistral-small-2509', name: 'Magistral Small (Local)', provider: 'lmstudio' },
  { id: 'openai-gpt-oss-20b-abliterated-uncensored-neo-imatrix', name: 'GPT-OSS 20B (Local)', provider: 'lmstudio' },
  { id: 'devstral-small', name: 'Devstral Small (Local)', provider: 'lmstudio' },
  { id: 'mistral-7b', name: 'Mistral 7B (Local)', provider: 'lmstudio' },
  // Google Gemini (verified available models - Jan 2026)
  { id: 'gemini-2.5-flash', name: '⭐ Gemini 2.5 Flash (Recommandé)', provider: 'gemini' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Avancé)', provider: 'gemini' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
  // OpenAI
  { id: 'gpt-4', name: 'GPT-4 (OpenAI)', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (OpenAI)', provider: 'openai' },
  // Anthropic
  { id: 'claude-3', name: 'Claude 3 (Anthropic)', provider: 'anthropic' },
  // xAI Grok
  { id: 'grok-4-latest', name: '⭐ Grok 4 (xAI)', provider: 'xai' },
  { id: 'grok-3-latest', name: 'Grok 3 (xAI)', provider: 'xai' },
  { id: 'grok-3-fast', name: 'Grok 3 Fast (xAI)', provider: 'xai' },
  { id: 'grok-2-latest', name: 'Grok 2 (xAI)', provider: 'xai' },
  { id: 'grok-2-vision-latest', name: 'Grok 2 Vision (xAI)', provider: 'xai' },
];

// System prompts chargés depuis src/prompts/*.md
// Modifier les fichiers .md pour personnaliser les prompts
export const DEFAULT_SYSTEM_PROMPTS = SYSTEM_PROMPTS.map(p => ({
  id: p.id,
  name: p.name,
  prompt: p.prompt,
}));

// ThemeMode is now managed by officeThemeStore
// Import and use: import { useOfficeThemeStore } from './officeThemeStore';

interface ChatSettingsStore {
  // Model settings
  selectedModelId: string;
  customModels: ModelConfig[];
  temperature: number;
  maxTokens: number;

  // System prompt
  selectedSystemPromptId: string;
  customSystemPrompts: { id: string; name: string; prompt: string }[];
  conversationSystemPrompts: Record<string, string>; // Per-conversation overrides

  // Features
  streamingEnabled: boolean;
  incognitoMode: boolean;
  autoSpeakEnabled: boolean;
  
  // Voice settings
  selectedVoiceProvider: 'browser' | 'elevenlabs' | 'azure';
  elevenLabsApiKey?: string;
  azureSpeechKey?: string;
  
  // API Keys for AI providers
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  xaiApiKey?: string;
  
  // Memory
  longTermMemoryEnabled: boolean;
  userPreferences: Record<string, string>;

  // RAG Settings
  ragEnabled: boolean;
  ragProvider: 'local' | 'openai' | 'transformers';
  ragSimilarityThreshold: number;
  ragMaxResults: number;
  
  // Actions
  setSelectedModel: (modelId: string) => void;
  addCustomModel: (model: ModelConfig) => void;
  removeCustomModel: (modelId: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  
  setSelectedSystemPrompt: (promptId: string) => void;
  addCustomSystemPrompt: (prompt: { name: string; prompt: string }) => void;
  removeCustomSystemPrompt: (promptId: string) => void;
  updateCustomSystemPrompt: (promptId: string, updates: { name?: string; prompt?: string }) => void;
  setConversationSystemPrompt: (conversationId: string, prompt: string) => void;
  getEffectiveSystemPrompt: (conversationId?: string) => string;

  // Note: Theme is now managed by officeThemeStore
  // Use: useOfficeThemeStore().setMode() instead

  toggleStreaming: () => void;
  toggleIncognito: () => void;
  toggleAutoSpeak: () => void;
  
  setVoiceProvider: (provider: 'browser' | 'elevenlabs' | 'azure') => void;
  setElevenLabsApiKey: (key: string) => void;
  setAzureSpeechKey: (key: string) => void;
  
  // AI Provider API Keys
  setGeminiApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setAnthropicApiKey: (key: string) => void;
  setXaiApiKey: (key: string) => void;
  getApiKeyForProvider: (provider: string) => string | undefined;
  
  toggleLongTermMemory: () => void;
  setUserPreference: (key: string, value: string) => void;
  getUserPreference: (key: string) => string | undefined;

  // RAG Actions
  toggleRag: () => void;
  setRagProvider: (provider: 'local' | 'openai' | 'transformers') => void;
  setRagSimilarityThreshold: (threshold: number) => void;
  setRagMaxResults: (maxResults: number) => void;
  
  // Export/Import all settings
  exportSettings: () => string;
  importSettings: (data: string) => void;
  resetSettings: () => void;
}

export const useChatSettingsStore = create<ChatSettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedModelId: 'mistralai/magistral-small-2509',
      customModels: [],
      temperature: 0.7,
      maxTokens: 4096,
      
      selectedSystemPromptId: 'default',
      customSystemPrompts: [],
      conversationSystemPrompts: {},

      streamingEnabled: true,
      incognitoMode: false,
      autoSpeakEnabled: false,
      
      selectedVoiceProvider: 'browser',
      elevenLabsApiKey: undefined,
      azureSpeechKey: undefined,
      
      // AI Provider API Keys (initial values)
      geminiApiKey: undefined,
      openaiApiKey: undefined,
      anthropicApiKey: undefined,
      
      longTermMemoryEnabled: true,
      userPreferences: {},

      // RAG Settings (default values)
      ragEnabled: true,
      ragProvider: 'local',
      ragSimilarityThreshold: 0.5,
      ragMaxResults: 5,
      
      // Actions
      setSelectedModel: (modelId) => set({ selectedModelId: modelId }),
      
      addCustomModel: (model) => set((state) => ({
        customModels: [...state.customModels, { ...model, id: crypto.randomUUID() }],
      })),
      
      removeCustomModel: (modelId) => set((state) => ({
        customModels: state.customModels.filter((m) => m.id !== modelId),
      })),
      
      setTemperature: (temp) => set({ temperature: Math.max(0, Math.min(2, temp)) }),
      
      setMaxTokens: (tokens) => set({ maxTokens: Math.max(100, Math.min(32000, tokens)) }),
      
      setSelectedSystemPrompt: (promptId) => set({ selectedSystemPromptId: promptId }),
      
      addCustomSystemPrompt: (prompt) => set((state) => ({
        customSystemPrompts: [
          ...state.customSystemPrompts,
          { ...prompt, id: crypto.randomUUID() },
        ],
      })),
      
      removeCustomSystemPrompt: (promptId) => set((state) => ({
        customSystemPrompts: state.customSystemPrompts.filter((p) => p.id !== promptId),
        selectedSystemPromptId: state.selectedSystemPromptId === promptId ? 'default' : state.selectedSystemPromptId,
      })),
      
      updateCustomSystemPrompt: (promptId, updates) => set((state) => ({
        customSystemPrompts: state.customSystemPrompts.map((p) =>
          p.id === promptId ? { ...p, ...updates } : p
        ),
      })),
      
      setConversationSystemPrompt: (conversationId, prompt) => set((state) => ({
        conversationSystemPrompts: {
          ...state.conversationSystemPrompts,
          [conversationId]: prompt,
        },
      })),
      
      getEffectiveSystemPrompt: (conversationId) => {
        const state = get();
        
        // Check conversation-specific override first
        if (conversationId && state.conversationSystemPrompts[conversationId]) {
          return state.conversationSystemPrompts[conversationId];
        }
        
        // Check custom prompts
        const customPrompt = state.customSystemPrompts.find(
          (p) => p.id === state.selectedSystemPromptId
        );
        if (customPrompt) return customPrompt.prompt;
        
        // Check default prompts
        const defaultPrompt = DEFAULT_SYSTEM_PROMPTS.find(
          (p) => p.id === state.selectedSystemPromptId
        );
        if (defaultPrompt) return defaultPrompt.prompt;
        
        // Fallback
        return DEFAULT_SYSTEM_PROMPTS[0].prompt;
      },

      toggleStreaming: () => set((state) => ({ streamingEnabled: !state.streamingEnabled })),
      
      toggleIncognito: () => set((state) => ({ incognitoMode: !state.incognitoMode })),
      
      toggleAutoSpeak: () => set((state) => ({ autoSpeakEnabled: !state.autoSpeakEnabled })),
      
      setVoiceProvider: (provider) => set({ selectedVoiceProvider: provider }),
      
      setElevenLabsApiKey: (key) => set({ elevenLabsApiKey: key }),
      
      setAzureSpeechKey: (key) => set({ azureSpeechKey: key }),
      
      // AI Provider API Keys
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setAnthropicApiKey: (key) => set({ anthropicApiKey: key }),
      setXaiApiKey: (key) => set({ xaiApiKey: key }),
      getApiKeyForProvider: (provider) => {
        const state = get();
        switch (provider) {
          case 'gemini': return state.geminiApiKey;
          case 'openai': return state.openaiApiKey;
          case 'anthropic': return state.anthropicApiKey;
          case 'xai': return state.xaiApiKey;
          default: return undefined;
        }
      },
      
      toggleLongTermMemory: () => set((state) => ({ longTermMemoryEnabled: !state.longTermMemoryEnabled })),
      
      setUserPreference: (key, value) => set((state) => ({
        userPreferences: { ...state.userPreferences, [key]: value },
      })),
      
      getUserPreference: (key) => get().userPreferences[key],

      // RAG Actions
      toggleRag: () => set((state) => ({ ragEnabled: !state.ragEnabled })),

      setRagProvider: (provider) => set({ ragProvider: provider }),

      setRagSimilarityThreshold: (threshold) => set({
        ragSimilarityThreshold: Math.max(0, Math.min(1, threshold))
      }),

      setRagMaxResults: (maxResults) => set({
        ragMaxResults: Math.max(1, Math.min(20, maxResults))
      }),

      exportSettings: () => {
        const state = get();
        return JSON.stringify({
          selectedModelId: state.selectedModelId,
          customModels: state.customModels,
          temperature: state.temperature,
          maxTokens: state.maxTokens,
          selectedSystemPromptId: state.selectedSystemPromptId,
          customSystemPrompts: state.customSystemPrompts,
          streamingEnabled: state.streamingEnabled,
          autoSpeakEnabled: state.autoSpeakEnabled,
          longTermMemoryEnabled: state.longTermMemoryEnabled,
          userPreferences: state.userPreferences,
          ragEnabled: state.ragEnabled,
          ragProvider: state.ragProvider,
          ragSimilarityThreshold: state.ragSimilarityThreshold,
          ragMaxResults: state.ragMaxResults,
        }, null, 2);
      },
      
      importSettings: (data) => {
        try {
          const settings = JSON.parse(data);
          set((state) => ({ ...state, ...settings }));
        } catch (error) {
          console.error('Failed to import settings:', error);
        }
      },
      
      resetSettings: () => set({
        selectedModelId: 'mistralai/magistral-small-2509',
        customModels: [],
        temperature: 0.7,
        maxTokens: 4096,
        selectedSystemPromptId: 'default',
        customSystemPrompts: [],
        conversationSystemPrompts: {},
        streamingEnabled: true,
        incognitoMode: false,
        autoSpeakEnabled: false,
        selectedVoiceProvider: 'browser',
        longTermMemoryEnabled: true,
        userPreferences: {},
        ragEnabled: true,
        ragProvider: 'local',
        ragSimilarityThreshold: 0.5,
        ragMaxResults: 5,
      }),
    }),
    {
      name: 'chat-settings-storage',
      version: 1,
    }
  )
);
