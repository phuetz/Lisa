/**
 * System Prompts Index
 * 
 * Les prompts sont stockés dans des fichiers .md pour faciliter l'édition.
 * Ce fichier les exporte pour utilisation dans l'application.
 */

// Import des prompts en raw text
import lisaDefaultPrompt from './lisa-default.md?raw';
import lisaCoderPrompt from './lisa-coder.md?raw';
import lisaCreativePrompt from './lisa-creative.md?raw';
import lisaConcisePrompt from './lisa-concise.md?raw';
import lisaTeacherPrompt from './lisa-teacher.md?raw';

export interface SystemPromptDefinition {
  id: string;
  name: string;
  prompt: string;
  icon?: string;
  description?: string;
}

/**
 * Prompts système par défaut de Lisa
 * Modifier les fichiers .md dans src/prompts/ pour personnaliser
 */
export const SYSTEM_PROMPTS: SystemPromptDefinition[] = [
  {
    id: 'default',
    name: 'Lisa - Par défaut',
    prompt: lisaDefaultPrompt,
    icon: '🧠',
    description: 'Assistante complète, bienveillante et technique',
  },
  {
    id: 'coder',
    name: 'Lisa - Expert Code',
    prompt: lisaCoderPrompt,
    icon: '💻',
    description: 'Spécialisée développement et architecture',
  },
  {
    id: 'creative',
    name: 'Lisa - Créative',
    prompt: lisaCreativePrompt,
    icon: '🎨',
    description: 'Mode imagination et écriture',
  },
  {
    id: 'concise',
    name: 'Lisa - Concise',
    prompt: lisaConcisePrompt,
    icon: '⚡',
    description: 'Réponses ultra-courtes et directes',
  },
  {
    id: 'teacher',
    name: 'Lisa - Professeur',
    prompt: lisaTeacherPrompt,
    icon: '📚',
    description: 'Mode pédagogue patient',
  },
];

/**
 * Récupère un prompt par son ID
 */
export const getPromptById = (id: string): SystemPromptDefinition | undefined => {
  return SYSTEM_PROMPTS.find(p => p.id === id);
};

/**
 * Récupère le prompt par défaut
 */
export const getDefaultPrompt = (): SystemPromptDefinition => {
  return SYSTEM_PROMPTS[0];
};

export default SYSTEM_PROMPTS;
