/**
 * Tests for chatSettingsStore
 * TASK-4.1: Couverture tests 100%
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatSettingsStore, DEFAULT_MODELS, DEFAULT_SYSTEM_PROMPTS } from '../chatSettingsStore';

// Mock window.matchMedia for theme tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('chatSettingsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatSettingsStore.getState().resetSettings();
  });

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const state = useChatSettingsStore.getState();

      expect(state.selectedModelId).toBe('mistralai/magistral-small-2509');
      expect(state.temperature).toBe(0.7);
      expect(state.maxTokens).toBe(4096);
      expect(state.streamingEnabled).toBe(true);
      expect(state.incognitoMode).toBe(false);
      expect(state.autoSpeakEnabled).toBe(false);
      expect(state.theme).toBe('dark');
      expect(state.selectedVoiceProvider).toBe('browser');
      expect(state.longTermMemoryEnabled).toBe(true);
    });
  });

  describe('Model Settings', () => {
    it('should set selected model', () => {
      useChatSettingsStore.getState().setSelectedModel('gpt-4');
      expect(useChatSettingsStore.getState().selectedModelId).toBe('gpt-4');
    });

    it('should add custom model', () => {
      useChatSettingsStore.getState().addCustomModel({
        id: 'custom-model',
        name: 'Custom Model',
        provider: 'openai',
      });

      const state = useChatSettingsStore.getState();
      expect(state.customModels).toHaveLength(1);
      expect(state.customModels[0].name).toBe('Custom Model');
      // ID should be regenerated
      expect(state.customModels[0].id).not.toBe('custom-model');
    });

    it('should remove custom model', () => {
      useChatSettingsStore.getState().addCustomModel({
        id: 'temp',
        name: 'Temp Model',
        provider: 'lmstudio',
      });

      const modelId = useChatSettingsStore.getState().customModels[0].id;
      useChatSettingsStore.getState().removeCustomModel(modelId);

      expect(useChatSettingsStore.getState().customModels).toHaveLength(0);
    });
  });

  describe('Temperature', () => {
    it('should set temperature within valid range', () => {
      useChatSettingsStore.getState().setTemperature(1.5);
      expect(useChatSettingsStore.getState().temperature).toBe(1.5);
    });

    it('should clamp temperature to min 0', () => {
      useChatSettingsStore.getState().setTemperature(-1);
      expect(useChatSettingsStore.getState().temperature).toBe(0);
    });

    it('should clamp temperature to max 2', () => {
      useChatSettingsStore.getState().setTemperature(5);
      expect(useChatSettingsStore.getState().temperature).toBe(2);
    });
  });

  describe('Max Tokens', () => {
    it('should set max tokens within valid range', () => {
      useChatSettingsStore.getState().setMaxTokens(8192);
      expect(useChatSettingsStore.getState().maxTokens).toBe(8192);
    });

    it('should clamp max tokens to min 100', () => {
      useChatSettingsStore.getState().setMaxTokens(10);
      expect(useChatSettingsStore.getState().maxTokens).toBe(100);
    });

    it('should clamp max tokens to max 32000', () => {
      useChatSettingsStore.getState().setMaxTokens(100000);
      expect(useChatSettingsStore.getState().maxTokens).toBe(32000);
    });
  });

  describe('System Prompts', () => {
    it('should set selected system prompt', () => {
      useChatSettingsStore.getState().setSelectedSystemPrompt('coder');
      expect(useChatSettingsStore.getState().selectedSystemPromptId).toBe('coder');
    });

    it('should add custom system prompt', () => {
      useChatSettingsStore.getState().addCustomSystemPrompt({
        name: 'My Custom Prompt',
        prompt: 'You are a helpful assistant.',
      });

      const state = useChatSettingsStore.getState();
      expect(state.customSystemPrompts).toHaveLength(1);
      expect(state.customSystemPrompts[0].name).toBe('My Custom Prompt');
    });

    it('should remove custom system prompt and reset selection if needed', () => {
      useChatSettingsStore.getState().addCustomSystemPrompt({
        name: 'To Remove',
        prompt: 'Test',
      });

      const promptId = useChatSettingsStore.getState().customSystemPrompts[0].id;
      useChatSettingsStore.getState().setSelectedSystemPrompt(promptId);

      useChatSettingsStore.getState().removeCustomSystemPrompt(promptId);

      expect(useChatSettingsStore.getState().customSystemPrompts).toHaveLength(0);
      expect(useChatSettingsStore.getState().selectedSystemPromptId).toBe('default');
    });

    it('should set conversation-specific system prompt', () => {
      useChatSettingsStore.getState().setConversationSystemPrompt('conv-123', 'Custom prompt for this conversation');

      expect(useChatSettingsStore.getState().conversationSystemPrompts['conv-123']).toBe(
        'Custom prompt for this conversation'
      );
    });

    it('should get effective system prompt - conversation override', () => {
      useChatSettingsStore.getState().setConversationSystemPrompt('conv-123', 'Override prompt');

      const prompt = useChatSettingsStore.getState().getEffectiveSystemPrompt('conv-123');
      expect(prompt).toBe('Override prompt');
    });

    it('should get effective system prompt - custom prompt', () => {
      useChatSettingsStore.getState().addCustomSystemPrompt({
        name: 'Custom',
        prompt: 'Custom prompt content',
      });
      const promptId = useChatSettingsStore.getState().customSystemPrompts[0].id;
      useChatSettingsStore.getState().setSelectedSystemPrompt(promptId);

      const prompt = useChatSettingsStore.getState().getEffectiveSystemPrompt();
      expect(prompt).toBe('Custom prompt content');
    });

    it('should get effective system prompt - default prompt', () => {
      useChatSettingsStore.getState().setSelectedSystemPrompt('coder');

      const prompt = useChatSettingsStore.getState().getEffectiveSystemPrompt();
      expect(prompt).toContain('Expert Code');
    });

    it('should fallback to first default prompt if selected not found', () => {
      useChatSettingsStore.setState({ selectedSystemPromptId: 'non-existent' });

      const prompt = useChatSettingsStore.getState().getEffectiveSystemPrompt();
      expect(prompt).toBe(DEFAULT_SYSTEM_PROMPTS[0].prompt);
    });
  });

  describe('Theme', () => {
    it('should set theme', () => {
      useChatSettingsStore.getState().setTheme('light');
      expect(useChatSettingsStore.getState().theme).toBe('light');

      useChatSettingsStore.getState().setTheme('system');
      expect(useChatSettingsStore.getState().theme).toBe('system');
    });
  });

  describe('Feature Toggles', () => {
    it('should toggle streaming', () => {
      expect(useChatSettingsStore.getState().streamingEnabled).toBe(true);

      useChatSettingsStore.getState().toggleStreaming();
      expect(useChatSettingsStore.getState().streamingEnabled).toBe(false);

      useChatSettingsStore.getState().toggleStreaming();
      expect(useChatSettingsStore.getState().streamingEnabled).toBe(true);
    });

    it('should toggle incognito mode', () => {
      expect(useChatSettingsStore.getState().incognitoMode).toBe(false);

      useChatSettingsStore.getState().toggleIncognito();
      expect(useChatSettingsStore.getState().incognitoMode).toBe(true);
    });

    it('should toggle auto speak', () => {
      expect(useChatSettingsStore.getState().autoSpeakEnabled).toBe(false);

      useChatSettingsStore.getState().toggleAutoSpeak();
      expect(useChatSettingsStore.getState().autoSpeakEnabled).toBe(true);
    });

    it('should toggle long term memory', () => {
      expect(useChatSettingsStore.getState().longTermMemoryEnabled).toBe(true);

      useChatSettingsStore.getState().toggleLongTermMemory();
      expect(useChatSettingsStore.getState().longTermMemoryEnabled).toBe(false);
    });
  });

  describe('Voice Settings', () => {
    it('should set voice provider', () => {
      useChatSettingsStore.getState().setVoiceProvider('elevenlabs');
      expect(useChatSettingsStore.getState().selectedVoiceProvider).toBe('elevenlabs');
    });

    it('should set ElevenLabs API key', () => {
      useChatSettingsStore.getState().setElevenLabsApiKey('test-key-123');
      expect(useChatSettingsStore.getState().elevenLabsApiKey).toBe('test-key-123');
    });

    it('should set Azure Speech key', () => {
      useChatSettingsStore.getState().setAzureSpeechKey('azure-key-456');
      expect(useChatSettingsStore.getState().azureSpeechKey).toBe('azure-key-456');
    });
  });

  describe('AI Provider API Keys', () => {
    it('should set Gemini API key', () => {
      useChatSettingsStore.getState().setGeminiApiKey('gemini-key');
      expect(useChatSettingsStore.getState().geminiApiKey).toBe('gemini-key');
    });

    it('should set OpenAI API key', () => {
      useChatSettingsStore.getState().setOpenaiApiKey('openai-key');
      expect(useChatSettingsStore.getState().openaiApiKey).toBe('openai-key');
    });

    it('should set Anthropic API key', () => {
      useChatSettingsStore.getState().setAnthropicApiKey('anthropic-key');
      expect(useChatSettingsStore.getState().anthropicApiKey).toBe('anthropic-key');
    });

    it('should set xAI API key', () => {
      useChatSettingsStore.getState().setXaiApiKey('xai-key');
      expect(useChatSettingsStore.getState().xaiApiKey).toBe('xai-key');
    });

    it('should get API key for provider', () => {
      useChatSettingsStore.getState().setGeminiApiKey('gemini-key');
      useChatSettingsStore.getState().setOpenaiApiKey('openai-key');
      useChatSettingsStore.getState().setAnthropicApiKey('anthropic-key');
      useChatSettingsStore.getState().setXaiApiKey('xai-key');

      expect(useChatSettingsStore.getState().getApiKeyForProvider('gemini')).toBe('gemini-key');
      expect(useChatSettingsStore.getState().getApiKeyForProvider('openai')).toBe('openai-key');
      expect(useChatSettingsStore.getState().getApiKeyForProvider('anthropic')).toBe('anthropic-key');
      expect(useChatSettingsStore.getState().getApiKeyForProvider('xai')).toBe('xai-key');
      expect(useChatSettingsStore.getState().getApiKeyForProvider('unknown')).toBeUndefined();
    });
  });

  describe('User Preferences', () => {
    it('should set and get user preference', () => {
      useChatSettingsStore.getState().setUserPreference('language', 'fr');
      expect(useChatSettingsStore.getState().getUserPreference('language')).toBe('fr');
    });

    it('should return undefined for non-existent preference', () => {
      expect(useChatSettingsStore.getState().getUserPreference('non-existent')).toBeUndefined();
    });
  });

  describe('Export/Import Settings', () => {
    it('should export settings as JSON string', () => {
      useChatSettingsStore.getState().setTemperature(1.0);
      useChatSettingsStore.getState().setSelectedModel('gpt-4');

      const exported = useChatSettingsStore.getState().exportSettings();
      const parsed = JSON.parse(exported);

      expect(parsed.temperature).toBe(1.0);
      expect(parsed.selectedModelId).toBe('gpt-4');
    });

    it('should import settings from JSON string', () => {
      const settingsData = JSON.stringify({
        temperature: 0.9,
        selectedModelId: 'claude-3',
        streamingEnabled: false,
      });

      useChatSettingsStore.getState().importSettings(settingsData);

      const state = useChatSettingsStore.getState();
      expect(state.temperature).toBe(0.9);
      expect(state.selectedModelId).toBe('claude-3');
      expect(state.streamingEnabled).toBe(false);
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      useChatSettingsStore.getState().importSettings('invalid json');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Reset Settings', () => {
    it('should reset all settings to defaults', () => {
      // Change some settings
      useChatSettingsStore.getState().setTemperature(1.5);
      useChatSettingsStore.getState().setSelectedModel('gpt-4');
      useChatSettingsStore.getState().toggleStreaming();

      // Reset
      useChatSettingsStore.getState().resetSettings();

      const state = useChatSettingsStore.getState();
      expect(state.temperature).toBe(0.7);
      expect(state.selectedModelId).toBe('mistralai/magistral-small-2509');
      expect(state.streamingEnabled).toBe(true);
    });
  });

  describe('DEFAULT_MODELS', () => {
    it('should have correct structure', () => {
      expect(DEFAULT_MODELS.length).toBeGreaterThan(0);

      DEFAULT_MODELS.forEach((model) => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.provider).toBeDefined();
        expect(['lmstudio', 'openai', 'anthropic', 'ollama', 'gemini', 'xai']).toContain(model.provider);
      });
    });

    it('should include xAI/Grok models', () => {
      const grokModels = DEFAULT_MODELS.filter((m) => m.provider === 'xai');
      expect(grokModels.length).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_SYSTEM_PROMPTS', () => {
    it('should have correct structure', () => {
      expect(DEFAULT_SYSTEM_PROMPTS.length).toBeGreaterThan(0);

      DEFAULT_SYSTEM_PROMPTS.forEach((prompt) => {
        expect(prompt.id).toBeDefined();
        expect(prompt.name).toBeDefined();
        expect(prompt.prompt).toBeDefined();
        expect(typeof prompt.prompt).toBe('string');
      });
    });

    it('should have a default prompt', () => {
      const defaultPrompt = DEFAULT_SYSTEM_PROMPTS.find((p) => p.id === 'default');
      expect(defaultPrompt).toBeDefined();
    });
  });
});
