import React from 'react';
import type { Node } from 'reactflow';

/**
 * Signature commune à tous les panneaux de configuration spécifiques.
 * Elle correspond à la même interface utilisée par `NodeConfigPanel` générique.
 */
export interface NodeSpecificConfigProps {
  node: Node;
  onClose: () => void;
}

/**
 * Registre interne (type → composant React).
 * Les modules de nœud peuvent l'enrichir via `registerNodeConfigComponent`.
 */
const registry: Record<string, React.FC<NodeSpecificConfigProps>> = {};

/**
 * Enregistrement programmatique (optionnel) d'un composant de configuration.
 * Peut être appelé dans des fichiers de nœud pour auto-enregistrer leur panneau.
 */
export function registerNodeConfigComponent(
  nodeType: string,
  component: React.FC<NodeSpecificConfigProps>,
) {
  registry[nodeType] = component;
}

/**
 * Récupère le composant de configuration spécifique pour un type donné.
 * Renvoie `undefined` si aucun composant particulier n'est enregistré.
 */
export function getNodeConfigComponent(
  nodeType: string,
): React.FC<NodeSpecificConfigProps> | undefined {
  return registry[nodeType];
}

// Export par défaut pour inspection/débogage éventuels
export default registry;
