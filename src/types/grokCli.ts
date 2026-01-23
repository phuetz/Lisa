/**
 * GrokCli Types
 * Types pour l'intégration de grok-cli dans Lisa
 * 
 * Grok-CLI est exposé comme backend spécialisé "code + terminal + repo"
 * piloté par Lisa via GrokCliService et GrokCliAgent.
 */

// ============================================
// SECTION 1: Types de base Grok-CLI
// ============================================

/** Modèles AI supportés par grok-cli (depuis ~/.grok/user-settings.json) */
export type GrokModel = 
  // Modèles Grok (xAI)
  | 'grok-code-fast-1'  // Défaut - rapide pour code
  | 'grok-4-latest'     // Dernier Grok 4
  | 'grok-3-latest'     // Dernier Grok 3
  | 'grok-3-fast'       // Grok 3 rapide
  | 'grok-3-mini-fast'  // Grok 3 mini rapide
  // Legacy/Alias
  | 'grok-3'
  | 'grok-4'
  // Local LLM (si localLLMEnabled)
  | 'local-model';

/** Mode d'exécution YOLO (legacy, remplacé par GrokCliSecurityMode) */
export type YoloMode = 'off' | 'safe' | 'on';

/** Mode de raisonnement avancé (Tree-of-Thought + MCTS) */
export type GrokCliReasoningMode =
  | 'shallow'    // Réponse rapide
  | 'medium'     // Réflexion standard (4K tokens)
  | 'deep'       // Réflexion profonde (10K tokens) - "megathink"
  | 'exhaustive'; // Réflexion exhaustive (32K tokens) - "ultrathink"

/** Mode de sécurité Grok-CLI */
export type GrokCliSecurityMode =
  | 'read_only'   // 🔒 Mode sécurisé - lecture seule
  | 'auto'        // ⚖️ Mode standard - confirmation pour actions destructives
  | 'full_access'; // 🔓 Mode confiance - exécution directe

/** Types de tâches supportées */
export type GrokCliTaskKind =
  | 'explain'   // Expliquer du code
  | 'review'    // Code review
  | 'fix'       // Corriger un bug (APR Engine)
  | 'refactor'  // Refactoriser du code
  | 'test'      // Générer des tests
  | 'search'    // Rechercher dans le code (RAG)
  | 'custom';   // Tâche personnalisée

/** Skills disponibles */
export type GrokSkill = 
  | 'typescript-expert'
  | 'react-specialist'
  | 'security-auditor'
  | 'database-expert'
  | 'devops-engineer'
  | 'api-designer'
  | 'performance-optimizer'
  | 'documentation-writer';

/** Pipelines disponibles */
export type GrokPipeline = 
  | 'code-review'
  | 'bug-fix'
  | 'security-audit'
  | 'documentation'
  | 'refactoring';

/** Configuration Local LLM (depuis .grok/settings.json) */
export interface LocalLLMConfig {
  enabled: boolean;
  provider: 'llamacpp' | 'ollama' | 'lmstudio';
  endpoint: string;
  model: string;
  /** Force function calling support for local models */
  forceTools?: boolean;
  /** Auto-detect tool support at startup */
  probeTools?: boolean;
}

// ============================================
// SECTION 2: Types de Tâches (Task-based API)
// ============================================

/** Statut d'exécution d'une tâche */
export type GrokCliRunStatus =
  | 'pending'    // En attente
  | 'running'    // En cours d'exécution
  | 'succeeded'  // Terminée avec succès
  | 'failed'     // Échec
  | 'cancelled'; // Annulée

/** Tâche Grok-CLI */
export interface GrokCliTask {
  id: string;
  kind: GrokCliTaskKind;
  title?: string;
  description: string;           // Prompt utilisateur ou objectif
  repoPath: string;              // Chemin du projet local
  filePattern?: string;          // Optionnel: fichiers ciblés (glob)
  reasoningMode: GrokCliReasoningMode;
  securityMode: GrokCliSecurityMode;
  maxRounds?: number;            // Rounds agentiques max
  budgetUsd?: number;            // Budget max pour la tâche
  createdAt: string;             // ISO 8601
}

/** Diff généré par Grok-CLI */
export interface GrokCliDiff {
  filePath: string;
  before?: string;               // Contenu avant modification
  after?: string;                // Contenu après modification
  patch?: string;                // Diff unifié
}

/** Coût d'une tâche */
export interface GrokCliCost {
  totalUsd: number;
  inputTokens?: number;
  outputTokens?: number;
}

/** Entrée de log */
export interface GrokCliLogEntry {
  ts: string;                    // Timestamp ISO 8601
  level: 'info' | 'warning' | 'error' | 'debug';
  source: 'lisa' | 'grok-cli';
  message: string;
}

/** Résultat d'une tâche Grok-CLI */
export interface GrokCliResult {
  taskId: string;
  status: GrokCliRunStatus;
  summary: string;               // Résumé humain
  diffs: GrokCliDiff[];
  logs: GrokCliLogEntry[];
  cost?: GrokCliCost;
  rawOutput?: unknown;           // Payload brut renvoyé par Grok-CLI
  startedAt?: string;            // ISO 8601
  finishedAt?: string;           // ISO 8601
}

// ============================================
// SECTION 3: Configuration
// ============================================

/** Configuration de grok-cli */
export interface GrokCliConfig {
  apiKey?: string;
  baseUrl?: string;
  model: GrokModel;
  yoloMode: YoloMode;            // Legacy
  securityMode: GrokCliSecurityMode;
  reasoningMode: GrokCliReasoningMode;
  maxRounds: number;
  autoEdit: boolean;
  activeSkills: GrokSkill[];
  customInstructions?: string;
  defaultRepoPath?: string;      // Chemin par défaut du repo
  budgetUsd?: number;            // Budget global
  // Settings additionnels (depuis grok-cli)
  baseURL?: string;              // URL de l'API (défaut: https://api.x.ai/v1)
  maxCost?: number;              // Coût max par session en USD (défaut: $10)
  localLLM?: LocalLLMConfig;     // Configuration LLM local
}

/** Message dans une conversation grok-cli */
export interface GrokMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  toolCalls?: GrokToolCall[];
  tokens?: {
    input: number;
    output: number;
  };
}

/** Appel d'outil grok-cli */
export interface GrokToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: GrokToolResult;
}

/** Résultat d'un outil grok-cli */
export interface GrokToolResult {
  success: boolean;
  output: string;
  error?: string;
  requiresConfirmation?: boolean;
}

// ============================================
// SECTION 4: Sessions et Messages
// ============================================

/** Session grok-cli */
export interface GrokSession {
  id: string;
  name: string;
  messages: GrokMessage[];
  tasks: GrokCliTask[];          // Tâches de la session
  results: GrokCliResult[];      // Résultats des tâches
  createdAt: Date;
  updatedAt: Date;
  config: GrokCliConfig;
  stats: GrokSessionStats;
  branches: GrokBranch[];
  currentBranchId: string;
}

/** Statistiques de session */
export interface GrokSessionStats {
  totalTokens: number;
  totalCost: number;
  toolCallsCount: number;
  roundsUsed: number;
  startTime: Date;
  endTime?: Date;
}

/** Branche de conversation (fork/merge) */
export interface GrokBranch {
  id: string;
  name: string;
  parentBranchId?: string;
  messageStartIndex: number;
  createdAt: Date;
}

/** Mémoire persistante grok-cli */
export interface GrokMemory {
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Résultat d'exécution de commande grok-cli */
export interface GrokExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  toolsUsed: string[];
  tokensUsed: {
    input: number;
    output: number;
  };
  cost: number;
  duration: number;
}

/** Options pour exécuter une commande */
export interface GrokExecuteOptions {
  prompt: string;
  model?: GrokModel;
  yoloMode?: YoloMode;
  skills?: GrokSkill[];
  workingDirectory?: string;
  timeout?: number;
  onStream?: (chunk: string) => void;
  onToolCall?: (toolCall: GrokToolCall) => void;
  onConfirmation?: (action: string) => Promise<boolean>;
}

/** Résultat de pipeline */
export interface GrokPipelineResult {
  pipeline: GrokPipeline;
  success: boolean;
  steps: GrokPipelineStep[];
  summary: string;
  duration: number;
}

/** Étape de pipeline */
export interface GrokPipelineStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  error?: string;
  duration?: number;
}

/** Configuration des coûts */
export interface GrokCostConfig {
  sessionBudget?: number;
  dailyLimit?: number;
  warningThreshold?: number;
}

/** Rapport de coûts */
export interface GrokCostReport {
  sessionCost: number;
  dailyCost: number;
  totalCost: number;
  tokensUsed: {
    input: number;
    output: number;
  };
  budgetRemaining?: number;
  isOverBudget: boolean;
}

/** Événements grok-cli */
export type GrokEventType = 
  | 'message'
  | 'tool-call'
  | 'tool-result'
  | 'confirmation-required'
  | 'stream-chunk'
  | 'session-start'
  | 'session-end'
  | 'error'
  | 'cost-update';

export interface GrokEvent {
  type: GrokEventType;
  data: unknown;
  timestamp: Date;
}

/** État du store grok-cli */
export interface GrokCliState {
  // Configuration
  config: GrokCliConfig;
  
  // Session active
  currentSession: GrokSession | null;
  sessions: GrokSession[];
  
  // Mémoire persistante
  memories: GrokMemory[];
  
  // État d'exécution
  isExecuting: boolean;
  isStreaming: boolean;
  currentOutput: string;
  
  // Coûts
  costReport: GrokCostReport;
  costConfig: GrokCostConfig;
  
  // Actions
  setConfig: (config: Partial<GrokCliConfig>) => void;
  createSession: (name?: string) => GrokSession;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  
  // Exécution
  execute: (options: GrokExecuteOptions) => Promise<GrokExecutionResult>;
  abort: () => void;
  
  // Pipelines
  runPipeline: (pipeline: GrokPipeline, target?: string) => Promise<GrokPipelineResult>;
  
  // Mémoire
  remember: (key: string, value: string) => void;
  recall: (key: string) => string | undefined;
  forgetMemory: (key: string) => void;
  listMemories: () => GrokMemory[];
  
  // Branches
  forkBranch: (name: string) => GrokBranch;
  checkoutBranch: (branchId: string) => void;
  mergeBranch: (branchId: string) => void;
  
  // Skills
  activateSkill: (skill: GrokSkill) => void;
  deactivateSkill: (skill: GrokSkill) => void;
  
  // YOLO
  setYoloMode: (mode: YoloMode) => void;
  
  // Coûts
  setCostConfig: (config: Partial<GrokCostConfig>) => void;
  resetCosts: () => void;
}

// ============================================
// SECTION 5: Valeurs par défaut
// ============================================

/** Default configuration (basée sur ~/.grok/user-settings.json) */
export const DEFAULT_GROK_CONFIG: GrokCliConfig = {
  model: 'grok-code-fast-1', // Défaut de grok-cli
  yoloMode: 'off',
  securityMode: 'auto',
  reasoningMode: 'medium',
  maxRounds: 30,
  autoEdit: false,
  activeSkills: [],
  // Settings additionnels
  baseURL: 'https://api.x.ai/v1',
  maxCost: 10, // $10 par défaut
};

/** Coûts par modèle ($/1M tokens) - estimation basée sur xAI pricing */
export const GROK_MODEL_COSTS: Record<GrokModel, { input: number; output: number }> = {
  // Modèles Grok (xAI) - https://api.x.ai/v1
  'grok-code-fast-1': { input: 2, output: 10 },   // Rapide pour code
  'grok-4-latest': { input: 10, output: 30 },     // Plus puissant
  'grok-3-latest': { input: 5, output: 15 },      // Standard
  'grok-3-fast': { input: 3, output: 10 },        // Rapide
  'grok-3-mini-fast': { input: 0.5, output: 1.5 }, // Mini économique
  // Legacy/Alias
  'grok-3': { input: 5, output: 15 },
  'grok-4': { input: 10, output: 30 },
  // Local LLM (coût nul)
  'local-model': { input: 0, output: 0 },
};

/** Default Local LLM configuration (LM Studio sur port 1234) */
export const DEFAULT_LOCAL_LLM_CONFIG: LocalLLMConfig = {
  enabled: true,  // Activé par défaut si LM Studio tourne
  provider: 'lmstudio',
  endpoint: 'http://host.docker.internal:1234/v1',  // LM Studio (Docker internal)
  model: 'mistralai/ministral-3-3b',  // Modèle recommandé avec force-tools
};
