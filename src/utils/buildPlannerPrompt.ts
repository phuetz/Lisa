/**
 * buildPlannerPrompt.ts
 * 
 * Utility for generating prompts used by the PlannerAgent
 * to create or revise multi-step workflows.
 */

import { agentRegistry } from '../agents/registry';
import { logEvent } from './logger';
import type { WorkflowStep } from '../types/Planner';

/**
 * Options de personnalisation pour les prompts de planification
 */
export interface PromptOptions {
  /**
   * Niveau de détail requis pour le plan
   */
  detailLevel?: 'concise' | 'standard' | 'detailed';
  
  /**
   * Format de sortie souhaité
   */
  outputFormat?: 'json' | 'markdown' | 'hybrid';
  
  /**
   * Inclure ou non les raisonnements pour chaque étape
   */
  includeReasoning?: boolean;
  
  /**
   * Langue de sortie
   */
  language?: 'fr' | 'en';
  
  /**
   * Contraintes à respecter dans le plan
   */
  constraints?: string[];
  
  /**
   * Contexte utilisateur à prendre en compte
   */
  userContext?: Record<string, unknown>;
}

/**
 * Construit un template de base pour tous les prompts de planification
 */
function buildBaseTemplate(
  options: PromptOptions = {},
  isRevision: boolean = false
): string {
  const detailLevel = options.detailLevel || 'standard';
  const language = options.language || 'fr';
  
  // Instructions spécifiques au niveau de détail
  const detailInstructions = {
    concise: 'Créez un plan minimaliste et efficace avec le moins d\'étapes possible.',
    standard: 'Créez un plan équilibré avec des étapes clairement définies.',
    detailed: 'Créez un plan détaillé avec des vérifications intermédiaires et une gestion d\'erreur robuste.'
  }[detailLevel];
  
  // Instructions sur le format de sortie
  const formatInstructions = {
    json: 'Votre réponse DOIT être un tableau JSON valide d\'objets "étape".',
    markdown: 'Votre réponse doit être un plan formaté en Markdown avec des étapes numérotées.',
    hybrid: 'Votre réponse doit inclure un plan en Markdown ET un tableau JSON dans un bloc de code.'
  }[options.outputFormat || 'json'];
  
  // Instructions sur le raisonnement
  const reasoningInstructions = options.includeReasoning 
    ? 'Pour chaque étape, expliquez brièvement votre raisonnement dans le champ "reasoning".'
    : '';
  
  // Instructions sur les contraintes
  const constraintsSection = options.constraints && options.constraints.length > 0
    ? `\nContraintes à respecter:\n${options.constraints.map(c => `- ${c}`).join('\n')}` 
    : '';
  
  // Sélectionner le titre en fonction de la langue et du type (révision ou création)
  const titles = {
    fr: {
      new: 'Création d\'un nouveau plan',
      revision: 'Révision d\'un plan existant'
    },
    en: {
      new: 'Creating a new plan',
      revision: 'Revising an existing plan'
    }
  };
  
  const title = titles[language as keyof typeof titles]?.[isRevision ? 'revision' : 'new'] || 
                titles.fr[isRevision ? 'revision' : 'new'];
  
  // Assembler le template de base
  return `
# ${title}

${detailInstructions}

${constraintsSection}

${reasoningInstructions}

${formatInstructions}
  `;
}

/**
 * Génère un prompt pour créer ou réviser un plan
 * 
 * @param goal - Requête ou objectif de l'utilisateur en langage naturel
 * @param currentPlan - Étapes de workflow existantes (pour révision)
 * @param error - Message d'erreur provenant d'une exécution échouée
 * @param options - Options de personnalisation du prompt
 * @returns Chaîne de prompt formatée pour le LLM
 */
export function buildPlannerPrompt(
  goal: string,
  currentPlan?: WorkflowStep[],
  error?: string,
  options: PromptOptions = {}
): string {
  // Obtenir les descriptions de tous les agents disponibles
  const agentDescriptions = agentRegistry
    .getAllAgents()
    .map(a => ` - ${a.name}: ${a.description || 'Agent sans description'}`)
    .join('\n');
  
  const isRevision = Boolean(currentPlan && error);
  
  // Construire le template de base
  const baseTemplate = buildBaseTemplate(options, isRevision);
  
  // Déterminer s'il s'agit d'un nouveau plan ou d'une révision
  const requestSection = isRevision 
    ? `
## Plan précédent (échec)

Le plan précédent a échoué. Créez un nouveau plan pour atteindre l'objectif initial.

**Objectif initial:** "${goal}"

**Plan qui a échoué:**
\`\`\`json
${JSON.stringify(currentPlan, null, 2)}
\`\`\`

**Message d'erreur:** "${error}"

Analysez l'erreur et créez un plan révisé.
    ` 
    : `
## Objectif à atteindre

**Requête utilisateur:** "${goal}"
    `;

  // Ajouter le contexte utilisateur si disponible
  const contextSection = options.userContext && Object.keys(options.userContext).length > 0
    ? `
## Contexte utilisateur
${Object.entries(options.userContext).map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`).join('\n')}
    `
    : '';

  // Ajouter les spécifications des étapes
  const stepSpecSection = `
## Spécifications des étapes

${options.outputFormat === 'json' || options.outputFormat === 'hybrid' ? `
Chaque étape du plan doit avoir:
- "id": Un entier unique.
- "description": Une description lisible par un humain.
- "agent": L'agent à utiliser.
- "command": La commande à exécuter.
- "args": Un objet d'arguments.${options.includeReasoning ? `\n- "reasoning": Explication courte de votre raisonnement.` : ''}
- "dependencies": Un tableau d'IDs d'étapes qui doivent être complétées avant que cette étape puisse commencer. Un tableau vide [] signifie qu'elle peut s'exécuter immédiatement.
` : ''}
  `;

  // Construire la section des agents disponibles
  const agentSection = `
## Agents disponibles

${agentDescriptions}
  `;

  // Journal pour le débogage
  logEvent('prompt_generated', { 
    isRevision, 
    detailLevel: options.detailLevel || 'standard',
    outputFormat: options.outputFormat || 'json',
    goalLength: goal.length
  }, 'Generated planner prompt');

  // Assembler le prompt complet
  return `${baseTemplate}${requestSection}${contextSection}${stepSpecSection}${agentSection}`;
}

/**
 * Génère un prompt pour expliquer un plan à l'utilisateur
 * 
 * @param plan - Le plan à expliquer
 * @param goal - L'objectif original
 * @param options - Options de personnalisation du prompt
 * @returns Prompt pour générer une explication
 */
export function buildPlanExplanationPrompt(
  plan: WorkflowStep[],
  goal: string,
  options: PromptOptions = {}
): string {
  const language = options.language || 'fr';
  const detailLevel = options.detailLevel || 'standard';
  
  const detailMultiplier = {
    concise: 'très brève (1-2 phrases)',
    standard: 'concise (3-4 phrases)',
    detailed: 'détaillée mais claire'
  }[detailLevel];
  
  const title = language === 'fr' ? 'Explication d\'un plan' : 'Plan explanation';
  
  return `
# ${title}

Vous êtes un assistant qui explique des plans d'action de manière claire et accessible.

Fournissez une explication ${detailMultiplier} du plan suivant, qui vise à répondre à la requête: "${goal}"

\`\`\`json
${JSON.stringify(plan, null, 2)}
\`\`\`

Votre réponse doit être facilement compréhensible par un utilisateur non technique.
Concentrez-vous sur ce que le plan va accomplir plutôt que sur les détails techniques.
  `;
}
