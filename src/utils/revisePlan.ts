/**
 * revisePlan.ts
 * 
 * Module isolé pour la révision de plans qui ont échoué.
 * Fournit une API claire pour corriger et adapter les workflows défaillants.
 */

import { logEvent } from './logger';
import { planTracer } from './planTracer';
import type { WorkflowStep } from '../types/Planner';

interface RevisePlanOptions {
  /**
   * ID de trace pour enregistrer les opérations
   */
  traceId?: string;
  
  /**
   * API Key pour le modèle LLM
   */
  apiKey: string;
  
  /**
   * Modèle à utiliser pour la révision
   */
  model?: string;
  
  /**
   * Nombre maximum de tentatives de révision
   */
  maxAttempts?: number;
  
  /**
   * Callback pour les explications contextuelles destinées à l'UI
   */
  onExplanation?: (explanation: string) => void;
}

const DEFAULT_OPTIONS: Partial<RevisePlanOptions> = {
  model: 'gpt-4-turbo-preview',
  maxAttempts: 3
};

/**
 * Construit un prompt pour réviser un plan qui a échoué
 */
function buildRevisionPrompt(
  request: string, 
  failedPlan: WorkflowStep[],
  errorMessage?: string,
  attempt: number = 1
): string {
  const maxAttempts = 3;
  
  // Extraire les étapes et erreurs
  const planSteps = JSON.stringify(failedPlan, null, 2);
  const errorDetail = errorMessage ? `with error: ${errorMessage}` : 'for unknown reasons';
  
  let urgencyPrefix = '';
  if (attempt > 1) {
    urgencyPrefix = attempt === 2 
      ? "La première révision n'a pas fonctionné. Essayez une approche différente. "
      : `IMPORTANT: Ceci est notre dernière tentative (${attempt}/${maxAttempts}). Soyez très précis. `;
  }

  return `${urgencyPrefix}Le plan suivant a échoué ${errorDetail}:

\`\`\`json
${planSteps}
\`\`\`

La requête originale était: "${request}"

Révisez ce plan pour résoudre le problème. Considérez ces options:
1. Corriger les arguments des étapes existantes
2. Ajouter des étapes préparatoires ou de vérification
3. Ajuster les dépendances entre les étapes
4. Utiliser un agent différent si nécessaire

Répondez UNIQUEMENT avec le JSON du plan révisé. Conservez la même structure mais avec les modifications nécessaires.`;
}

/**
 * Appelle l'API LLM pour réviser un plan
 */
async function callLLM(prompt: string, options: RevisePlanOptions): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_OPTIONS.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API request failed: ${response.status} ${errorText}`);
  }
  
  const result = await response.json();
  return result.choices[0].message.content;
}

/**
 * Génère une explication pour l'UI sur les changements apportés
 */
async function generateExplanation(
  originalPlan: WorkflowStep[],
  revisedPlan: WorkflowStep[],
  errorMessage: string | undefined,
  options: RevisePlanOptions
): Promise<string> {
  // Créer un prompt pour expliquer les changements
  const prompt = `Expliquez brièvement les changements effectués pour corriger ce plan qui a échoué ${errorMessage ? `avec l'erreur: "${errorMessage}"` : 'sans raison connue'}.

Plan original:
\`\`\`json
${JSON.stringify(originalPlan.map(s => ({id: s.id, description: s.description})), null, 2)}
\`\`\`

Plan révisé:
\`\`\`json
${JSON.stringify(revisedPlan.map(s => ({id: s.id, description: s.description})), null, 2)}
\`\`\`

Donnez un résumé des modifications en 1-2 phrases, dans un langage simple pour l'utilisateur:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Modèle plus rapide et moins cher pour de simples explications
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });
    
    if (!response.ok) {
      return "Plan révisé avec corrections techniques.";
    }
    
    const result = await response.json();
    return result.choices[0].message.content.trim();
  } catch (error) {
    return "Plan révisé avec corrections techniques.";
  }
}

/**
 * Fonction principale pour réviser un plan qui a échoué
 */
export async function revisePlan(
  request: string,
  failedPlan: WorkflowStep[],
  errorMessage?: string,
  attempt: number = 1,
  options: Partial<RevisePlanOptions> = {}
): Promise<{
  plan: WorkflowStep[];
  explanation: string;
}> {
  // Fusionner les options avec les valeurs par défaut
  const finalOptions: RevisePlanOptions = { 
    ...DEFAULT_OPTIONS, 
    ...options,
    apiKey: options.apiKey || ''
  };
  
  if (!finalOptions.apiKey) {
    throw new Error('API key is required for plan revision');
  }

  const maxAttempts = finalOptions.maxAttempts || DEFAULT_OPTIONS.maxAttempts || 3;
  if (attempt > maxAttempts) {
    throw new Error(`Maximum revision attempts (${maxAttempts}) exceeded`);
  }

  try {
    // Construire le prompt de révision
    const prompt = buildRevisionPrompt(request, failedPlan, errorMessage, attempt);
    
    // Enregistrer l'opération dans la trace si un ID de trace est fourni
    if (finalOptions.traceId) {
      planTracer.addStep(finalOptions.traceId, 'plan_revision', {
        prompt,
        metadata: { attempt, errorMessage }
      });
    }
    
    // Journal pour le débogage
    logEvent('plan_revision_attempt', 
      { attempt, error: errorMessage }, 
      `Attempting plan revision (${attempt}/${maxAttempts})`
    );

    // Appeler l'API LLM pour obtenir le plan révisé
    const revisionJson = await callLLM(prompt, finalOptions);
    
    try {
      // Traiter la réponse JSON
      const revisedPlan = JSON.parse(revisionJson);
      
      // Valider la structure du plan
      if (!Array.isArray(revisedPlan)) {
        throw new Error('Revised plan is not a valid array');
      }
      
      // Normaliser le plan révisé
      const normalizedPlan = revisedPlan.map(step => ({
        ...step,
        status: 'pending',
        dependencies: Array.isArray(step.dependencies) ? step.dependencies : [],
        args: step.args || {},
      }));
      
      // Générer une explication des changements
      const explanation = await generateExplanation(
        failedPlan,
        normalizedPlan,
        errorMessage,
        finalOptions
      );
      
      // Fournir l'explication via le callback si disponible
      if (finalOptions.onExplanation) {
        finalOptions.onExplanation(explanation);
      }
      
      // Enregistrer le résultat dans la trace
      if (finalOptions.traceId) {
        planTracer.addStep(finalOptions.traceId, 'plan_revision', {
          result: normalizedPlan,
          explanation,
          metadata: { success: true, attempt }
        });
      }
      
      // Journal pour le débogage
      logEvent('plan_revision_success', 
        { attempt, stepCount: normalizedPlan.length }, 
        `Plan revision successful (${attempt}/${maxAttempts})`
      );
      
      return {
        plan: normalizedPlan,
        explanation
      };
    } catch (error) {
      // En cas d'erreur de parsing ou de validation
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Enregistrer l'erreur dans la trace
      if (finalOptions.traceId) {
        planTracer.addStep(finalOptions.traceId, 'plan_revision', {
          error: errorMsg,
          metadata: { success: false, attempt }
        });
      }
      
      throw new Error(`Failed to revise plan: ${errorMsg}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Journal pour le débogage
    logEvent('plan_revision_failed', 
      { attempt, error: errorMsg }, 
      `Plan revision failed (${attempt}/${maxAttempts}): ${errorMsg}`
    );
    
    throw new Error(`Plan revision failed: ${errorMsg}`);
  }
}
