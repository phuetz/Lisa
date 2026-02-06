/**
 * @deprecated Ce module est déprécié. Utilisez src/features/agents à la place.
 *
 * Ce fichier existe uniquement pour la compatibilité arrière.
 * Tous les agents sont maintenant dans src/features/agents/
 *
 * Migration:
 *   // AVANT (déprécié)
 *   import { agentRegistry } from './agents';
 *
 *   // APRÈS (recommandé)
 *   import { agentRegistry } from './features/agents';
 */

// Re-export everything from the new location
export * from '../features/agents';
export { agentRegistry } from '../features/agents';

// Legacy function - now a no-op since agents use lazy-loading
/**
 * @deprecated Cette fonction n'est plus nécessaire.
 * Les agents sont maintenant chargés paresseusement via le registre.
 */
export const registerAllAgents = (): void => {
  console.warn(
    '[DEPRECATED] registerAllAgents() is deprecated. ' +
    'Agents are now lazy-loaded via agentRegistry.getAgentAsync(). ' +
    'Please update your imports to use src/features/agents directly.'
  );
};
