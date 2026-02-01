/**
 * Store Index
 * Centralized exports for all Zustand stores
 *
 * Store Organization:
 * ─────────────────────────────────────────────────────────────────
 * Domain Stores (independent state)
 * ─────────────────────────────────────────────────────────────────
 * - appStore        : Core app state (workflow, UI basics)
 * - visionStore     : Vision percepts and detection state
 * - audioStore      : Audio percepts and listening state
 * - healthStore     : Health tracking (medications, hydration, etc.)
 * - chatHistoryStore: Conversations and messages
 * - personaStore    : AI personas management
 * - grokCliStore    : Grok CLI integration
 * - metaHumanStore  : 3D avatar state
 *
 * ─────────────────────────────────────────────────────────────────
 * Configuration Stores (user preferences)
 * ─────────────────────────────────────────────────────────────────
 * - chatSettingsStore : Model, prompts, API keys, features
 * - officeThemeStore  : Theme, accessibility, UI preferences
 *
 * ─────────────────────────────────────────────────────────────────
 * Facade Stores (typed accessors to appStore)
 * ─────────────────────────────────────────────────────────────────
 * - workflowStore   : Workflow-specific selectors
 * - uiStore         : UI-specific selectors
 */

// ============================================================
// Domain Stores
// ============================================================

export { useAppStore } from './appStore';
export type {
  AppState,
  WorkflowStep,
  NodeExecutionStatus,
  EdgeExecutionStatus,
  CalendarEvent,
  Todo,
  Alarm,
  Timer,
  ConversationContext,
  ChatMessage,
} from './appStore';

export { useVisionStore } from './visionStore';

export { useAudioStore } from './audioStore';

export { useHealthStore } from './healthStore';
export {
  selectMedications,
  selectHydrationToday,
  selectEmergencyContacts,
  selectFallDetected,
  selectInactivityAlert,
} from './healthStore';

export { useChatHistoryStore } from './chatHistoryStore';
export type { Conversation, Message } from './chatHistoryStore';

export { usePersonaStore } from './personaStore';

export { useGrokCliStore } from './grokCliStore';

export { useMetaHumanStore } from './metaHumanStore';

// ============================================================
// Configuration Stores
// ============================================================

export { useChatSettingsStore, DEFAULT_MODELS, DEFAULT_SYSTEM_PROMPTS } from './chatSettingsStore';
export type { ModelConfig } from './chatSettingsStore';

export {
  useOfficeThemeStore,
  useOfficeColors,
  useIsDarkMode,
} from './officeThemeStore';

// ============================================================
// Facade Stores (typed selectors for appStore)
// ============================================================

export {
  useWorkflowStore,
  selectPlan,
  selectNodeStatus,
  selectIsRunning,
  selectProgress,
} from './workflowStore';

export {
  useUiStore,
  selectTodos,
  selectAlarms,
  selectActiveTimers,
  selectFeatureFlags,
  selectListeningActive,
  selectConversationContext,
} from './uiStore';
