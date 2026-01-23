/**
 * Types stricts pour le Workflow Store
 * Élimine tous les types 'any' pour une meilleure sécurité de type
 */

import type { Node, Edge } from 'reactflow';
import type { 
  WorkflowTemplate,
  SavedWorkflow,
  NodeExecutionResult,
} from '../types/workflow.d';

// Types pour les credentials
export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface OpenAICredentials {
  apiKey: string;
}

export interface StripeCredentials {
  apiKey: string;
}

export interface SlackCredentials {
  webhookUrl: string;
}

export interface GitHubCredentials {
  token: string;
}

export interface AllCredentials {
  google: GoogleCredentials;
  aws: AWSCredentials;
  openai: OpenAICredentials;
  stripe: StripeCredentials;
  slack: SlackCredentials;
  github: GitHubCredentials;
  [key: string]: GoogleCredentials | AWSCredentials | OpenAICredentials | StripeCredentials | SlackCredentials | GitHubCredentials;
}

// Types pour les logs d'exécution
export interface ExecutionLog {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  nodeId?: string;
  data?: unknown;
}

// Types pour l'historique d'exécution
export interface ExecutionHistoryEntry {
  id: string;
  workflowId: string;
  startTime: string;
  endTime: string;
  duration: number;
  success: boolean;
  nodeResults: Record<string, NodeExecutionResult>;
  errors?: Record<string, string | Error>;
  triggeredBy?: 'manual' | 'webhook' | 'schedule' | 'api';
}

// Types pour les variables globales
export interface GlobalVariable {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'secret';
  description?: string;
}

export type GlobalVariables = Record<string, GlobalVariable>;

// Types pour les environnements
export interface Environment {
  name: string;
  apiUrl: string;
  apiKey: string;
  variables?: Record<string, string>;
}

export type Environments = Record<string, Environment>;

// Types pour les collaborateurs
export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: string[];
  joinedAt: string;
}

// Types pour les versions de workflow
export interface WorkflowVersion {
  id: string;
  message: string;
  timestamp: string;
  data: SavedWorkflow;
  author: string;
  changes?: string[];
}

export type WorkflowVersions = Record<string, WorkflowVersion[]>;

// Types pour les webhooks
export interface WebhookEndpoint {
  workflowId: string;
  url: string;
  created: string;
  enabled?: boolean;
  secret?: string;
}

export type WebhookEndpoints = Record<string, WebhookEndpoint>;

// Types pour les tâches planifiées
export interface ScheduledJob {
  workflowId: string;
  cronExpression: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  timezone?: string;
}

export type ScheduledJobs = Record<string, ScheduledJob>;

// Types pour les statistiques d'exécution
export interface NodeStats {
  executions: number;
  successRate: number;
  averageDuration: number;
  lastExecution?: string;
}

export interface ErrorStats {
  count: number;
  lastOccurrence: string;
  message: string;
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  nodeStats: Record<string, NodeStats>;
  errorStats: Record<string, ErrorStats>;
}

// Types pour les paramètres système
export interface NotificationSettings {
  onError: boolean;
  onSuccess: boolean;
  webhookUrl: string;
  email: string;
}

export interface RateLimitConfig {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
}

export interface SystemSettings {
  maxExecutionTime: number;
  maxRetries: number;
  rateLimits: Record<string, RateLimitConfig>;
  notifications: NotificationSettings;
}

// Type pour le clipboard
export interface ClipboardData {
  nodes: Node[];
  edges: Edge[];
}

// Type pour les templates de workflow
export type WorkflowTemplates = Record<string, WorkflowTemplate>;

// Type pour les workflows sauvegardés
export type SavedWorkflows = Record<string, SavedWorkflow>;
