/**
 * Tests for personaStore
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePersonaStore } from '../personaStore';
import { DEFAULT_PERSONA } from '../../types/persona';
import type { LisaPersona as _LisaPersona, PersonaCapabilities as _PersonaCapabilities, PersonalityTraits as _PersonalityTraits, VoiceSettings as _VoiceSettings } from '../../types/persona';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
});

describe('personaStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    usePersonaStore.setState({
      personas: [DEFAULT_PERSONA],
      activePersonaId: 'default',
      isEditing: false,
      editingPersona: null,
    });
  });

  describe('initial state', () => {
    it('should have default persona in personas array', () => {
      const state = usePersonaStore.getState();

      expect(state.personas).toHaveLength(1);
      expect(state.personas[0].id).toBe('default');
      expect(state.personas[0].name).toBe('Lisa');
    });

    it('should have default as active persona', () => {
      const state = usePersonaStore.getState();

      expect(state.activePersonaId).toBe('default');
    });

    it('should not be in editing mode initially', () => {
      const state = usePersonaStore.getState();

      expect(state.isEditing).toBe(false);
      expect(state.editingPersona).toBeNull();
    });
  });

  describe('createPersona', () => {
    it('should create a new persona with generated id', () => {
      const { createPersona } = usePersonaStore.getState();

      const newPersonaData = {
        name: 'Test Persona',
        description: 'A test persona',
        instructions: 'Test instructions',
        conversationStarters: ['Hello'],
        capabilities: DEFAULT_PERSONA.capabilities,
        knowledge: [],
        voice: DEFAULT_PERSONA.voice,
        personality: DEFAULT_PERSONA.personality,
      };

      const id = createPersona(newPersonaData);

      expect(id).toBeDefined();
      expect(id).toContain('test-uuid-');

      const state = usePersonaStore.getState();
      expect(state.personas).toHaveLength(2);

      const newPersona = state.personas.find(p => p.id === id);
      expect(newPersona?.name).toBe('Test Persona');
      expect(newPersona?.createdAt).toBeInstanceOf(Date);
      expect(newPersona?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updatePersona', () => {
    it('should update an existing persona', () => {
      const { createPersona, updatePersona } = usePersonaStore.getState();

      const id = createPersona({
        name: 'Original Name',
        description: 'Original',
        instructions: '',
        conversationStarters: [],
        capabilities: DEFAULT_PERSONA.capabilities,
        knowledge: [],
        voice: DEFAULT_PERSONA.voice,
        personality: DEFAULT_PERSONA.personality,
      });

      updatePersona(id, { name: 'Updated Name' });

      const state = usePersonaStore.getState();
      const updated = state.personas.find(p => p.id === id);
      expect(updated?.name).toBe('Updated Name');
    });

    it('should update the updatedAt timestamp', () => {
      const { updatePersona } = usePersonaStore.getState();
      const originalPersona = usePersonaStore.getState().personas[0];
      const originalUpdatedAt = originalPersona.updatedAt;

      // Small delay to ensure different timestamp
      updatePersona('default', { description: 'Updated description' });

      const state = usePersonaStore.getState();
      const updated = state.personas.find(p => p.id === 'default');
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('deletePersona', () => {
    it('should delete a persona', () => {
      const { createPersona, deletePersona } = usePersonaStore.getState();

      const id = createPersona({
        name: 'To Delete',
        description: '',
        instructions: '',
        conversationStarters: [],
        capabilities: DEFAULT_PERSONA.capabilities,
        knowledge: [],
        voice: DEFAULT_PERSONA.voice,
        personality: DEFAULT_PERSONA.personality,
      });

      expect(usePersonaStore.getState().personas).toHaveLength(2);

      deletePersona(id);

      const state = usePersonaStore.getState();
      expect(state.personas).toHaveLength(1);
      expect(state.personas.find(p => p.id === id)).toBeUndefined();
    });

    it('should not delete the default persona', () => {
      const { deletePersona } = usePersonaStore.getState();

      deletePersona('default');

      const state = usePersonaStore.getState();
      expect(state.personas).toHaveLength(1);
      expect(state.personas[0].id).toBe('default');
    });

    it('should reset activePersonaId to default if active persona is deleted', () => {
      const { createPersona, setActivePersona, deletePersona } = usePersonaStore.getState();

      const id = createPersona({
        name: 'Active Persona',
        description: '',
        instructions: '',
        conversationStarters: [],
        capabilities: DEFAULT_PERSONA.capabilities,
        knowledge: [],
        voice: DEFAULT_PERSONA.voice,
        personality: DEFAULT_PERSONA.personality,
      });

      setActivePersona(id);
      expect(usePersonaStore.getState().activePersonaId).toBe(id);

      deletePersona(id);

      expect(usePersonaStore.getState().activePersonaId).toBe('default');
    });
  });

  describe('duplicatePersona', () => {
    it('should create a copy of an existing persona', () => {
      const { duplicatePersona } = usePersonaStore.getState();

      const newId = duplicatePersona('default');

      expect(newId).toBeDefined();
      expect(newId).not.toBe('default');

      const state = usePersonaStore.getState();
      expect(state.personas).toHaveLength(2);

      const duplicate = state.personas.find(p => p.id === newId);
      expect(duplicate?.name).toBe('Lisa (copie)');
      expect(duplicate?.isDefault).toBe(false);
    });

    it('should return empty string for non-existent persona', () => {
      const { duplicatePersona } = usePersonaStore.getState();

      const result = duplicatePersona('non-existent');

      expect(result).toBe('');
    });
  });

  describe('setActivePersona', () => {
    it('should set the active persona', () => {
      const { createPersona, setActivePersona } = usePersonaStore.getState();

      const id = createPersona({
        name: 'New Active',
        description: '',
        instructions: '',
        conversationStarters: [],
        capabilities: DEFAULT_PERSONA.capabilities,
        knowledge: [],
        voice: DEFAULT_PERSONA.voice,
        personality: DEFAULT_PERSONA.personality,
      });

      setActivePersona(id);

      expect(usePersonaStore.getState().activePersonaId).toBe(id);
    });
  });

  describe('getActivePersona', () => {
    it('should return the active persona', () => {
      const { getActivePersona } = usePersonaStore.getState();

      const active = getActivePersona();

      expect(active.id).toBe('default');
      expect(active.name).toBe('Lisa');
    });

    it('should return default if active persona not found', () => {
      usePersonaStore.setState({ activePersonaId: 'non-existent' });

      const { getActivePersona } = usePersonaStore.getState();
      const active = getActivePersona();

      expect(active.id).toBe('default');
    });
  });

  describe('editing workflow', () => {
    it('should start editing with default values', () => {
      const { startEditing } = usePersonaStore.getState();

      startEditing();

      const state = usePersonaStore.getState();
      expect(state.isEditing).toBe(true);
      expect(state.editingPersona).toBeDefined();
      expect(state.editingPersona?.name).toBe('');
    });

    it('should start editing with provided persona', () => {
      const { startEditing } = usePersonaStore.getState();

      startEditing({ name: 'Pre-filled', description: 'Test' });

      const state = usePersonaStore.getState();
      expect(state.editingPersona?.name).toBe('Pre-filled');
      expect(state.editingPersona?.description).toBe('Test');
    });

    it('should update editing persona', () => {
      const { startEditing, updateEditing } = usePersonaStore.getState();

      startEditing();
      updateEditing({ name: 'Updated Name' });

      const state = usePersonaStore.getState();
      expect(state.editingPersona?.name).toBe('Updated Name');
    });

    it('should save new persona when editing without id', () => {
      const { startEditing, updateEditing, saveEditing } = usePersonaStore.getState();

      startEditing();
      updateEditing({
        name: 'New Persona',
        description: 'Description',
        instructions: 'Instructions',
        conversationStarters: ['Hello'],
        capabilities: DEFAULT_PERSONA.capabilities,
        knowledge: [],
        voice: DEFAULT_PERSONA.voice,
        personality: DEFAULT_PERSONA.personality,
      });

      const id = saveEditing();

      expect(id).toBeDefined();

      const state = usePersonaStore.getState();
      expect(state.isEditing).toBe(false);
      expect(state.editingPersona).toBeNull();
      expect(state.personas).toHaveLength(2);
    });

    it('should update existing persona when editing with id', () => {
      const { startEditing, updateEditing: _updateEditing, saveEditing } = usePersonaStore.getState();

      startEditing({ id: 'default', name: 'Lisa Updated' });

      const id = saveEditing();

      expect(id).toBe('default');

      const state = usePersonaStore.getState();
      expect(state.personas[0].name).toBe('Lisa Updated');
    });

    it('should cancel editing', () => {
      const { startEditing, cancelEditing } = usePersonaStore.getState();

      startEditing({ name: 'Will be cancelled' });
      expect(usePersonaStore.getState().isEditing).toBe(true);

      cancelEditing();

      const state = usePersonaStore.getState();
      expect(state.isEditing).toBe(false);
      expect(state.editingPersona).toBeNull();
    });
  });

  describe('knowledge files', () => {
    it('should add a knowledge file to a persona', () => {
      const { addKnowledgeFile } = usePersonaStore.getState();

      addKnowledgeFile('default', {
        name: 'test.pdf',
        type: 'pdf',
        size: 1024,
        content: 'Test content',
      });

      const state = usePersonaStore.getState();
      const persona = state.personas.find(p => p.id === 'default');
      expect(persona?.knowledge).toHaveLength(1);
      expect(persona?.knowledge[0].name).toBe('test.pdf');
      expect(persona?.knowledge[0].id).toBeDefined();
      expect(persona?.knowledge[0].uploadedAt).toBeInstanceOf(Date);
    });

    it('should remove a knowledge file from a persona', () => {
      const { addKnowledgeFile, removeKnowledgeFile, getPersonaById } = usePersonaStore.getState();

      addKnowledgeFile('default', {
        name: 'test.pdf',
        type: 'pdf',
        size: 1024,
      });

      const persona = getPersonaById('default');
      const fileId = persona?.knowledge[0].id;

      removeKnowledgeFile('default', fileId!);

      const state = usePersonaStore.getState();
      const updatedPersona = state.personas.find(p => p.id === 'default');
      expect(updatedPersona?.knowledge).toHaveLength(0);
    });
  });

  describe('export/import', () => {
    it('should export a persona as JSON', () => {
      const { exportPersona } = usePersonaStore.getState();

      const exported = exportPersona('default');

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(parsed.name).toBe('Lisa');
      expect(parsed.id).toBe('default');
    });

    it('should return empty string for non-existent persona export', () => {
      const { exportPersona } = usePersonaStore.getState();

      const exported = exportPersona('non-existent');

      expect(exported).toBe('');
    });

    it('should import a persona from JSON', () => {
      const { importPersona } = usePersonaStore.getState();

      const personaData = JSON.stringify({
        name: 'Imported Persona',
        description: 'Imported',
        instructions: '',
        conversationStarters: [],
        capabilities: DEFAULT_PERSONA.capabilities,
        knowledge: [],
        voice: DEFAULT_PERSONA.voice,
        personality: DEFAULT_PERSONA.personality,
      });

      const id = importPersona(personaData);

      expect(id).toBeDefined();

      const state = usePersonaStore.getState();
      expect(state.personas).toHaveLength(2);

      const imported = state.personas.find(p => p.id === id);
      expect(imported?.name).toBe('Imported Persona');
      expect(imported?.isDefault).toBe(false);
    });

    it('should return null for invalid JSON import', () => {
      const { importPersona } = usePersonaStore.getState();

      const id = importPersona('invalid json');

      expect(id).toBeNull();
    });
  });

  describe('getPersonaById', () => {
    it('should return persona by id', () => {
      const { getPersonaById } = usePersonaStore.getState();

      const persona = getPersonaById('default');

      expect(persona?.name).toBe('Lisa');
    });

    it('should return undefined for non-existent id', () => {
      const { getPersonaById } = usePersonaStore.getState();

      const persona = getPersonaById('non-existent');

      expect(persona).toBeUndefined();
    });
  });

  describe('getSystemPrompt', () => {
    it('should build system prompt from active persona', () => {
      const { getSystemPrompt } = usePersonaStore.getState();

      const prompt = getSystemPrompt();

      expect(prompt).toContain('Tu es Lisa');
      expect(prompt).toContain('Style de communication');
      expect(prompt).toContain('Capacités activées');
    });
  });
});
