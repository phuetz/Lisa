/**
 * Déclarations de types globaux pour le module workflow
 */

// Augmentation des types Monaco
declare global {
  interface Window {
    monaco: typeof import('monaco-editor');
    require: (moduleId: string) => any;
  }
}

// Types de base pour les données de nœud
export interface NodeInputOutput {
  id: string;
  type: string;
  label: string;
  value?: unknown;
  required?: boolean;
}

export interface NodeConfig {
  [key: string]: unknown;
}

// Types de nœuds workflow
export interface WorkflowNode {
  id: string;
  type: string;
  inputs?: Record<string, NodeInputOutput>;
  outputs?: Record<string, NodeInputOutput>;
  config?: NodeConfig;
  label?: string;
  description?: string;
}

// Types pour l'exécution du workflow
export interface ExecutionVariables {
  [key: string]: string | number | boolean | object | null;
}

export interface ExecutionOptions {
  debugMode?: boolean;
  stepByStep?: boolean;
  timeout?: number;
  maxRetries?: number;
  environment?: string;
  variables?: ExecutionVariables;
}

// Types pour les résultats d'exécution
export interface NodeExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string | Error;
  duration: number;
  timestamp: string;
}

export interface ExecutionResult {
  success: boolean;
  nodeResults: Record<string, NodeExecutionResult>;
  errors?: Record<string, string | Error>;
  duration: number;
  startTime: string;
  endTime: string;
  path: string[];
}

// Types pour les arêtes (connections)
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

// Types pour les templates de workflow
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  version?: string;
  author?: string;
  tags?: string[];
}

// Types pour les workflows sauvegardés
export interface SavedWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
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
