/**
 * Persona Store
 * Gestion des personas Lisa (similaire aux GPTs personnalisés)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LisaPersona, KnowledgeFile, PersonaCapabilities, PersonalityTraits } from '../types/persona';
import { DEFAULT_PERSONA } from '../types/persona';

interface PersonaStore {
  // State
  personas: LisaPersona[];
  activePersonaId: string;
  isEditing: boolean;
  editingPersona: Partial<LisaPersona> | null;

  // Actions - CRUD
  createPersona: (persona: Omit<LisaPersona, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePersona: (id: string, updates: Partial<LisaPersona>) => void;
  deletePersona: (id: string) => void;
  duplicatePersona: (id: string) => string;

  // Actions - Active Persona
  setActivePersona: (id: string) => void;
  getActivePersona: () => LisaPersona;

  // Actions - Editing
  startEditing: (persona?: Partial<LisaPersona>) => void;
  updateEditing: (updates: Partial<LisaPersona>) => void;
  saveEditing: () => string | null;
  cancelEditing: () => void;

  // Actions - Knowledge
  addKnowledgeFile: (personaId: string, file: Omit<KnowledgeFile, 'id' | 'uploadedAt'>) => void;
  removeKnowledgeFile: (personaId: string, fileId: string) => void;

  // Actions - Export/Import
  exportPersona: (id: string) => string;
  importPersona: (data: string) => string | null;

  // Getters
  getPersonaById: (id: string) => LisaPersona | undefined;
  getSystemPrompt: () => string;
}

export const usePersonaStore = create<PersonaStore>()(
  persist(
    (set, get) => ({
      personas: [DEFAULT_PERSONA],
      activePersonaId: 'default',
      isEditing: false,
      editingPersona: null,

      createPersona: (personaData) => {
        const id = crypto.randomUUID();
        const newPersona: LisaPersona = {
          ...personaData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          personas: [...state.personas, newPersona],
        }));

        return id;
      },

      updatePersona: (id, updates) => {
        set((state) => ({
          personas: state.personas.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date() }
              : p
          ),
        }));
      },

      deletePersona: (id) => {
        if (id === 'default') return; // Cannot delete default
        
        set((state) => ({
          personas: state.personas.filter((p) => p.id !== id),
          activePersonaId: state.activePersonaId === id ? 'default' : state.activePersonaId,
        }));
      },

      duplicatePersona: (id) => {
        const { personas } = get();
        const original = personas.find((p) => p.id === id);
        if (!original) return '';

        const newId = crypto.randomUUID();
        const duplicate: LisaPersona = {
          ...original,
          id: newId,
          name: `${original.name} (copie)`,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          personas: [...state.personas, duplicate],
        }));

        return newId;
      },

      setActivePersona: (id) => {
        set({ activePersonaId: id });
      },

      getActivePersona: () => {
        const { personas, activePersonaId } = get();
        return personas.find((p) => p.id === activePersonaId) || DEFAULT_PERSONA;
      },

      startEditing: (persona) => {
        set({
          isEditing: true,
          editingPersona: persona || {
            name: '',
            description: '',
            instructions: '',
            conversationStarters: [''],
            capabilities: { ...DEFAULT_PERSONA.capabilities },
            knowledge: [],
            voice: { ...DEFAULT_PERSONA.voice },
            personality: { ...DEFAULT_PERSONA.personality },
          },
        });
      },

      updateEditing: (updates) => {
        set((state) => ({
          editingPersona: state.editingPersona
            ? { ...state.editingPersona, ...updates }
            : null,
        }));
      },

      saveEditing: () => {
        const { editingPersona, createPersona, updatePersona } = get();
        if (!editingPersona) return null;

        if (editingPersona.id) {
          // Update existing
          updatePersona(editingPersona.id, editingPersona);
          set({ isEditing: false, editingPersona: null });
          return editingPersona.id;
        } else {
          // Create new
          const id = createPersona(editingPersona as Omit<LisaPersona, 'id' | 'createdAt' | 'updatedAt'>);
          set({ isEditing: false, editingPersona: null });
          return id;
        }
      },

      cancelEditing: () => {
        set({ isEditing: false, editingPersona: null });
      },

      addKnowledgeFile: (personaId, fileData) => {
        const file: KnowledgeFile = {
          ...fileData,
          id: crypto.randomUUID(),
          uploadedAt: new Date(),
        };

        set((state) => ({
          personas: state.personas.map((p) =>
            p.id === personaId
              ? { ...p, knowledge: [...p.knowledge, file], updatedAt: new Date() }
              : p
          ),
        }));
      },

      removeKnowledgeFile: (personaId, fileId) => {
        set((state) => ({
          personas: state.personas.map((p) =>
            p.id === personaId
              ? {
                  ...p,
                  knowledge: p.knowledge.filter((f) => f.id !== fileId),
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
      },

      exportPersona: (id) => {
        const { personas } = get();
        const persona = personas.find((p) => p.id === id);
        if (!persona) return '';

        const exportData = { ...persona };
        // Remove knowledge content for export (too large)
        exportData.knowledge = exportData.knowledge.map((k) => ({
          ...k,
          content: undefined,
        }));

        return JSON.stringify(exportData, null, 2);
      },

      importPersona: (data) => {
        try {
          const persona: LisaPersona = JSON.parse(data);
          persona.id = crypto.randomUUID();
          persona.isDefault = false;
          persona.createdAt = new Date();
          persona.updatedAt = new Date();

          set((state) => ({
            personas: [...state.personas, persona],
          }));

          return persona.id;
        } catch (error) {
          console.error('Failed to import persona:', error);
          return null;
        }
      },

      getPersonaById: (id) => {
        const { personas } = get();
        return personas.find((p) => p.id === id);
      },

      getSystemPrompt: () => {
        const persona = get().getActivePersona();
        
        // Build system prompt from persona settings
        const personalityDesc = buildPersonalityDescription(persona.personality);
        const capabilitiesDesc = buildCapabilitiesDescription(persona.capabilities);
        
        return `${persona.instructions}

${personalityDesc}

${capabilitiesDesc}

Conversation starters suggérés:
${persona.conversationStarters.map((s) => `- ${s}`).join('\n')}
`;
      },
    }),
    {
      name: 'persona-storage',
      version: 1,
    }
  )
);

// Helper functions
function buildPersonalityDescription(traits: PersonalityTraits): string {
  const descriptions: string[] = [];

  switch (traits.formality) {
    case 'casual': descriptions.push('Utilise un ton décontracté et amical'); break;
    case 'formal': descriptions.push('Utilise un ton professionnel et formel'); break;
    default: descriptions.push('Utilise un ton équilibré');
  }

  switch (traits.verbosity) {
    case 'concise': descriptions.push('Sois concis et va droit au but'); break;
    case 'detailed': descriptions.push('Fournis des explications détaillées'); break;
    default: descriptions.push('Adapte la longueur de tes réponses au contexte');
  }

  switch (traits.humor) {
    case 'playful': descriptions.push('N\'hésite pas à utiliser l\'humour'); break;
    case 'light': descriptions.push('Un peu d\'humour léger est bienvenu'); break;
    default: descriptions.push('Reste factuel et sérieux');
  }

  switch (traits.empathy) {
    case 'high': descriptions.push('Montre beaucoup d\'empathie et de compréhension'); break;
    case 'minimal': descriptions.push('Reste neutre émotionnellement'); break;
    default: descriptions.push('Montre de l\'empathie quand c\'est approprié');
  }

  switch (traits.creativity) {
    case 'creative': descriptions.push('Sois créatif et imaginatif dans tes réponses'); break;
    case 'factual': descriptions.push('Reste factuel et précis, évite les digressions'); break;
    default: descriptions.push('Équilibre faits et créativité selon le contexte');
  }

  return `Style de communication:\n${descriptions.map((d) => `- ${d}`).join('\n')}`;
}

function buildCapabilitiesDescription(caps: PersonaCapabilities): string {
  const enabled: string[] = [];
  const disabled: string[] = [];

  if (caps.vision) enabled.push('Vision (analyse d\'images et vidéo)');
  else disabled.push('Vision');

  if (caps.hearing) enabled.push('Ouïe (reconnaissance vocale)');
  else disabled.push('Ouïe');

  if (caps.codeInterpreter) enabled.push('Interpréteur de code');
  else disabled.push('Interpréteur de code');

  if (caps.webSearch) enabled.push('Recherche web');
  else disabled.push('Recherche web');

  if (caps.fileUpload) enabled.push('Upload de fichiers');
  else disabled.push('Upload de fichiers');

  if (caps.imageGeneration) enabled.push('Génération d\'images');
  else disabled.push('Génération d\'images');

  if (caps.ros) enabled.push('Contrôle robotique (ROS)');
  else disabled.push('Contrôle robotique');

  if (caps.mqtt) enabled.push('Domotique (MQTT)');
  else disabled.push('Domotique');

  if (caps.memory) enabled.push('Mémoire long-terme');
  else disabled.push('Mémoire long-terme');

  return `Capacités activées: ${enabled.join(', ')}\nCapacités désactivées: ${disabled.join(', ')}`;
}
