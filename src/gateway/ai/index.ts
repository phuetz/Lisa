/**
 * Gateway AI - AI/ML related modules
 *
 * This module exports AI-focused components:
 * - ModelManager: Multi-model management
 * - ModelFailover: Automatic failover between providers
 * - StreamingManager: Streaming response handling
 * - AgentOrchestrator: Agent workflow orchestration
 * - ContextManager: Context window management
 *
 * Migration Guide:
 *   // Old import (still works)
 *   import { ModelManager } from '@/gateway';
 *
 *   // New import (recommended for AI components)
 *   import { ModelManager } from '@/gateway/ai';
 */

// Model Manager
export { ModelManager, getModelManager, resetModelManager } from '../ModelManager';
export type {
  AIModel,
  ModelProvider as AIModelProvider,
  ModelType,
  ModelCapability,
  ModelConfig as AIModelConfig,
  ProviderConfig
} from '../ModelManager';

// Model Failover
export { ModelFailover, getModelFailover, resetModelFailover } from '../ModelFailover';
export type {
  ModelConfig as FailoverModelConfig,
  FailoverConfig,
  ModelHealth,
  CompletionRequest,
  CompletionResponse,
  ModelProvider as FailoverModelProvider
} from '../ModelFailover';

// Streaming Manager
export { StreamingManager, getStreamingManager, resetStreamingManager } from '../StreamingManager';
export type {
  StreamConfig,
  StreamChunk,
  StreamSession,
  RetryPolicy
} from '../StreamingManager';

// Agent Orchestrator
export { AgentOrchestrator, getAgentOrchestrator, resetAgentOrchestrator } from '../AgentOrchestrator';
export type {
  AgentDefinition,
  AgentTask,
  Workflow,
  WorkflowStep
} from '../AgentOrchestrator';

// Context Manager
export { ContextManager, getContextManager, resetContextManager } from '../ContextManager';
export type {
  ContextEntry,
  ContextWindow,
  ContextConfig
} from '../ContextManager';
