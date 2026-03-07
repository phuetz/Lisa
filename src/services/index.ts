/**
 * Services Index
 * Central export for all Lisa services
 */

// AI Services
export { aiService, type AIProvider, type AIMessage, type AIServiceConfig } from './aiService';
export { getConnectionManager, type ConnectionStatus, type AIProviderType } from './ConnectionManager';

// Session Management (OpenClaw-inspired)
export {
  sessionCompactor,
  SessionCompactor,
  type CompactionConfig,
  type CompactedSession,
  type ExtractedFact,
  type CompactionEvent,
  type TranscriptEntry
} from './SessionCompactor';

export {
  channelSessionManager,
  type Channel,
  type ChannelType,
  type ChannelConfig,
  type ChannelSession,
  type ChannelEvent
} from './ChannelSessionManager';

export {
  sessionManager,
  SessionManager,
  MemorySessionStore,
  SQLiteSessionStore,
  type Session,
  type SessionMessage,
  type SessionStoreConfig,
  type ISessionStore
} from './SessionStore';

// Memory Services
export { memoryService, type Memory, type MemoryContext, type MemoryStats } from './MemoryService';

// RAG Service
export { ragService } from './RAGService';

// LM Studio Service
export { lmStudioService } from './LMStudioService';

// Smart Home Service
export { smartHomeService } from './SmartHomeService';

// Offline Service
export { offlineService } from './offlineService';

// Widget Service
export { widgetService } from './widgetService';

// Push Notification Service
export { pushNotificationService } from './pushNotificationService';

// Single Tool Mode
export {
  singleToolMode,
  SingleToolMode,
  type SingleToolModeConfig,
  type SingleToolModeState
} from './SingleToolMode';

// CodeAct Mode (Code as Action)
export {
  CodeActMode,
  getCodeActMode,
  type CodeActConfig,
  type CodeActState
} from './CodeActMode';

// Deploy Service
export {
  generateDeployConfig,
  getDeployInstructions,
  getSupportedPlatforms,
  downloadConfig,
  downloadConfigFiles,
  sanitizeAppName,
  sanitizeEnvValue,
  type CloudPlatform,
  type DeployConfig,
  type GenerateResult
} from './DeployService';

// Knowledge Graph
export {
  KnowledgeGraph,
  getKnowledgeGraph,
  type Triple,
  type Predicate,
  type TriplePattern,
  type GraphStats,
  type SubgraphResult,
  type VisualizationNode,
  type VisualizationEdge,
  type VisualizationData
} from './KnowledgeGraphService';
