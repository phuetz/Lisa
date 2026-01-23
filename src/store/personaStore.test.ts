/**
 * Tests for the personaStore
 * Specifically testing the buildPersonalityDescription helper function
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePersonaStore } from './personaStore';

describe('personaStore', () => {
  beforeEach(() => {
    // Reset store to defaults
    usePersonaStore.setState({
      personas: [usePersonaStore.getState().personas[0]],
      activePersonaId: 'default',
      isEditing: false,
      editingPersona: null,
    });
  });

  describe('getSystemPrompt', () => {
    it('should include all personality traits in the system prompt', () => {
      const { getSystemPrompt, getActivePersona } = usePersonaStore.getState();
      
      const systemPrompt = getSystemPrompt();
      const _persona = getActivePersona();
      
      // The system prompt should contain descriptions for all 5 personality traits
      expect(systemPrompt).toContain('Style de communication:');
      
      // Verify it contains at least 5 bullet points for the 5 traits
      const bulletPoints = systemPrompt.match(/^- .+$/gm) || [];
      expect(bulletPoints.length).toBeGreaterThanOrEqual(5);
    });

    it('should include creativity trait description when set to creative', () => {
      const { createPersona, setActivePersona, getSystemPrompt } = usePersonaStore.getState();
      
      // Create a persona with creative personality
      const id = createPersona({
        name: 'Creative Lisa',
        description: 'A creative assistant',
        instructions: 'Be creative',
        conversationStarters: ['Hello'],
        capabilities: {
          vision: true,
          hearing: true,
          codeInterpreter: true,
          webSearch: true,
          fileUpload: true,
          imageGeneration: false,
          ros: false,
          mqtt: false,
          memory: true,
        },
        knowledge: [],
        voice: {
          enabled: true,
          language: 'fr-FR',
          pitch: 1,
          rate: 1,
        },
        personality: {
          formality: 'balanced',
          verbosity: 'balanced',
          humor: 'light',
          empathy: 'balanced',
          creativity: 'creative', // Set to creative
        },
      });
      
      setActivePersona(id);
      const systemPrompt = getSystemPrompt();
      
      // The system prompt should mention creativity
      expect(systemPrompt).toContain('créatif');
    });

    it('should include creativity trait description when set to factual', () => {
      const { createPersona, setActivePersona, getSystemPrompt } = usePersonaStore.getState();
      
      // Create a persona with factual personality
      const id = createPersona({
        name: 'Factual Lisa',
        description: 'A factual assistant',
        instructions: 'Be factual',
        conversationStarters: ['Hello'],
        capabilities: {
          vision: true,
          hearing: true,
          codeInterpreter: true,
          webSearch: true,
          fileUpload: true,
          imageGeneration: false,
          ros: false,
          mqtt: false,
          memory: true,
        },
        knowledge: [],
        voice: {
          enabled: true,
          language: 'fr-FR',
          pitch: 1,
          rate: 1,
        },
        personality: {
          formality: 'balanced',
          verbosity: 'balanced',
          humor: 'none',
          empathy: 'balanced',
          creativity: 'factual', // Set to factual
        },
      });
      
      setActivePersona(id);
      const systemPrompt = getSystemPrompt();
      
      // The system prompt should mention factual behavior
      expect(systemPrompt).toContain('factuel');
    });

    it('should include balanced creativity description by default', () => {
      const { getSystemPrompt } = usePersonaStore.getState();
      
      // Default persona has balanced creativity
      const systemPrompt = getSystemPrompt();
      
      // Should mention balance between facts and creativity
      expect(systemPrompt).toContain('Équilibre faits et créativité');
    });
  });

  describe('buildPersonalityDescription coverage', () => {
    it('should handle all formality options', () => {
      const { createPersona, setActivePersona, getSystemPrompt } = usePersonaStore.getState();
      
      // Test casual formality
      const casualId = createPersona({
        name: 'Casual',
        description: 'test',
        instructions: 'test',
        conversationStarters: [],
        capabilities: {
          vision: false, hearing: false, codeInterpreter: false, webSearch: false,
          fileUpload: false, imageGeneration: false, ros: false, mqtt: false, memory: false,
        },
        knowledge: [],
        voice: { enabled: false, language: 'fr-FR', pitch: 1, rate: 1 },
        personality: {
          formality: 'casual',
          verbosity: 'balanced',
          humor: 'none',
          empathy: 'balanced',
          creativity: 'balanced',
        },
      });
      
      setActivePersona(casualId);
      expect(getSystemPrompt()).toContain('décontracté');
    });

    it('should handle all verbosity options', () => {
      const { createPersona, setActivePersona, getSystemPrompt } = usePersonaStore.getState();
      
      const conciseId = createPersona({
        name: 'Concise',
        description: 'test',
        instructions: 'test',
        conversationStarters: [],
        capabilities: {
          vision: false, hearing: false, codeInterpreter: false, webSearch: false,
          fileUpload: false, imageGeneration: false, ros: false, mqtt: false, memory: false,
        },
        knowledge: [],
        voice: { enabled: false, language: 'fr-FR', pitch: 1, rate: 1 },
        personality: {
          formality: 'balanced',
          verbosity: 'concise',
          humor: 'none',
          empathy: 'balanced',
          creativity: 'balanced',
        },
      });
      
      setActivePersona(conciseId);
      expect(getSystemPrompt()).toContain('concis');
    });

    it('should handle all humor options', () => {
      const { createPersona, setActivePersona, getSystemPrompt } = usePersonaStore.getState();
      
      const playfulId = createPersona({
        name: 'Playful',
        description: 'test',
        instructions: 'test',
        conversationStarters: [],
        capabilities: {
          vision: false, hearing: false, codeInterpreter: false, webSearch: false,
          fileUpload: false, imageGeneration: false, ros: false, mqtt: false, memory: false,
        },
        knowledge: [],
        voice: { enabled: false, language: 'fr-FR', pitch: 1, rate: 1 },
        personality: {
          formality: 'balanced',
          verbosity: 'balanced',
          humor: 'playful',
          empathy: 'balanced',
          creativity: 'balanced',
        },
      });
      
      setActivePersona(playfulId);
      expect(getSystemPrompt()).toContain('humour');
    });

    it('should handle all empathy options', () => {
      const { createPersona, setActivePersona, getSystemPrompt } = usePersonaStore.getState();
      
      const empatheticId = createPersona({
        name: 'Empathetic',
        description: 'test',
        instructions: 'test',
        conversationStarters: [],
        capabilities: {
          vision: false, hearing: false, codeInterpreter: false, webSearch: false,
          fileUpload: false, imageGeneration: false, ros: false, mqtt: false, memory: false,
        },
        knowledge: [],
        voice: { enabled: false, language: 'fr-FR', pitch: 1, rate: 1 },
        personality: {
          formality: 'balanced',
          verbosity: 'balanced',
          humor: 'none',
          empathy: 'high',
          creativity: 'balanced',
        },
      });
      
      setActivePersona(empatheticId);
      expect(getSystemPrompt()).toContain('empathie');
    });
  });
});
