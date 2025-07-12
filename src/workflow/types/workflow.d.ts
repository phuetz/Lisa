/**
 * Déclarations de types globaux pour le module workflow
 */

// Augmentation des types Monaco
declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

// Types de nœuds workflow
export interface WorkflowNode {
  id: string;
  type: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  config?: Record<string, any>;
  label?: string;
  description?: string;
}

// Types pour l'exécution du workflow
export interface ExecutionOptions {
  debugMode?: boolean;
  stepByStep?: boolean;
  timeout?: number;
  maxRetries?: number;
  environment?: string;
  variables?: Record<string, any>;
}

// Types pour les résultats d'exécution
export interface ExecutionResult {
  success: boolean;
  nodeResults: Record<string, any>;
  errors?: Record<string, string | Error>;
  duration: number;
  startTime: string;
  endTime: string;
  path: string[];
}

// Types pour les templates de workflow
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: any[];
  edges: any[];
  version?: string;
  author?: string;
  tags?: string[];
}

// Types pour les workflows sauvegardés
export interface SavedWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  created: string;
  updated: string;
  lastExecution?: {
    time: string;
    success: boolean;
    duration: number;
  };
  version?: string;
  tags?: string[];
}
