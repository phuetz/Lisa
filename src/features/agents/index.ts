/**
 * Agent System Entry Point
 * 
 * Ce fichier centralise l'accès au registre d'agents et aux types de base.
 * Le chargement des agents est désormais géré de manière asynchrone (lazy loading)
 * directement par le AgentRegistry pour optimiser les performances et éviter 
 * les dépendances circulaires.
 */

import { agentRegistry } from './registry';

/**
 * Fonction d'initialisation (Legacy compatibility)
 * Les agents sont maintenant chargés à la demande par le registre.
 * Cette fonction reste pour ne pas casser le démarrage mais ne fait plus d'imports massifs.
 */
export const registerAllAgents = (): void => {
  const availableCount = agentRegistry.listAvailableAgentNames().length;
  console.log(`Agent system ready. ${availableCount} agents available via lazy loading.`);
};

// Export des types et interfaces de base
export * from '../features/agents/core/types';

// Export du registre d'agents (Source unique de vérité)
export { agentRegistry } from './registry';
