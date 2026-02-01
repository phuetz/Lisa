/**
 * UI Store - Domain-specific selectors for UI state
 * Provides typed access to UI-related state from appStore
 *
 * Usage:
 *   import { useUiStore, uiSelectors, uiActions } from '../store/uiStore';
 *   const todos = useUiStore(uiSelectors.todos);
 *   const featureFlags = useUiStore(uiSelectors.featureFlags);
 */

import { useAppStore, type AppState, type Todo, type Alarm, type Timer, type ConversationContext } from './appStore';

/* ---------- UI State Type ---------- */
export interface UiState {
  todos: Todo[];
  alarms: Alarm[];
  timers: Timer[];
  listeningActive: boolean;
  clipboardMonitoringEnabled: boolean;
  clipboardSummary?: string;
  lastPlanExplanation: string | null;
  lastPlanTraceId?: string;
  intent?: string;
  intentPayload?: unknown;
  conversationContext?: ConversationContext;
  featureFlags: {
    advancedVision: boolean;
    advancedHearing: boolean;
    fallDetector: boolean;
  };
  selectedLLM: string;
  selectedVisionModel: string;
  hearingLanguage: string;
  fallDetected: boolean;
  fallEventTimestamp: number | null;
}

/* ---------- Re-export types ---------- */
export type { Todo, Alarm, Timer, ConversationContext };

/* ---------- Selectors ---------- */
export const uiSelectors = {
  /** Todos list */
  todos: (state: AppState): Todo[] => state.todos,

  /** Alarms list */
  alarms: (state: AppState): Alarm[] => state.alarms,

  /** Timers list */
  timers: (state: AppState): Timer[] => state.timers,

  /** Listening active state */
  listeningActive: (state: AppState): boolean => state.listeningActive,

  /** Clipboard monitoring enabled */
  clipboardMonitoringEnabled: (state: AppState): boolean => state.clipboardMonitoringEnabled,

  /** Clipboard summary */
  clipboardSummary: (state: AppState): string | undefined => state.clipboardSummary,

  /** Last plan explanation */
  lastPlanExplanation: (state: AppState): string | null => state.lastPlanExplanation,

  /** Last plan trace ID */
  lastPlanTraceId: (state: AppState): string | undefined => state.lastPlanTraceId,

  /** Current intent */
  intent: (state: AppState): string | undefined => state.intent,

  /** Intent payload */
  intentPayload: (state: AppState): unknown => state.intentPayload,

  /** Conversation context */
  conversationContext: (state: AppState): ConversationContext | undefined => state.conversationContext,

  /** Feature flags */
  featureFlags: (state: AppState) => state.featureFlags,

  /** Selected LLM */
  selectedLLM: (state: AppState): string => state.selectedLLM,

  /** Selected vision model */
  selectedVisionModel: (state: AppState): string => state.selectedVisionModel,

  /** Hearing language */
  hearingLanguage: (state: AppState): string => state.hearingLanguage,

  /** Fall detected */
  fallDetected: (state: AppState): boolean => state.fallDetected,

  /** Fall event timestamp */
  fallEventTimestamp: (state: AppState): number | null => state.fallEventTimestamp,

  /** Get active alarms (not triggered) */
  activeAlarms: (state: AppState): Alarm[] =>
    state.alarms.filter(a => !a.triggered),

  /** Get active timers (not finished) */
  activeTimers: (state: AppState): Timer[] =>
    state.timers.filter(t => !t.triggered && t.finish > Date.now()),

  /** Todos count */
  todosCount: (state: AppState): number => state.todos.length,

  /** Check if advanced vision is enabled */
  isAdvancedVisionEnabled: (state: AppState): boolean => state.featureFlags.advancedVision,

  /** Check if advanced hearing is enabled */
  isAdvancedHearingEnabled: (state: AppState): boolean => state.featureFlags.advancedHearing,

  /** Check if fall detector is enabled */
  isFallDetectorEnabled: (state: AppState): boolean => state.featureFlags.fallDetector,
};

/* ---------- Actions ---------- */
export const uiActions = {
  /** Add a todo */
  addTodo: (text: string) => {
    const todos = useAppStore.getState().todos;
    const newTodo: Todo = { id: crypto.randomUUID(), text };
    useAppStore.getState().setState({ todos: [...todos, newTodo] });
  },

  /** Remove a todo */
  removeTodo: (id: string) => {
    const todos = useAppStore.getState().todos;
    useAppStore.getState().setState({ todos: todos.filter(t => t.id !== id) });
  },

  /** Clear all todos */
  clearTodos: () => {
    useAppStore.getState().setState({ todos: [] });
  },

  /** Add an alarm */
  addAlarm: (alarm: Omit<Alarm, 'id'>) => {
    const alarms = useAppStore.getState().alarms;
    const newAlarm: Alarm = { ...alarm, id: crypto.randomUUID() };
    useAppStore.getState().setState({ alarms: [...alarms, newAlarm] });
  },

  /** Remove an alarm */
  removeAlarm: (id: string) => {
    const alarms = useAppStore.getState().alarms;
    useAppStore.getState().setState({ alarms: alarms.filter(a => a.id !== id) });
  },

  /** Trigger an alarm */
  triggerAlarm: (id: string) => {
    const alarms = useAppStore.getState().alarms;
    useAppStore.getState().setState({
      alarms: alarms.map(a => a.id === id ? { ...a, triggered: true } : a)
    });
  },

  /** Add a timer */
  addTimer: (timer: Omit<Timer, 'id'>) => {
    const timers = useAppStore.getState().timers;
    const newTimer: Timer = { ...timer, id: crypto.randomUUID() };
    useAppStore.getState().setState({ timers: [...timers, newTimer] });
  },

  /** Remove a timer */
  removeTimer: (id: string) => {
    const timers = useAppStore.getState().timers;
    useAppStore.getState().setState({ timers: timers.filter(t => t.id !== id) });
  },

  /** Set listening active */
  setListeningActive: (active: boolean) => {
    useAppStore.getState().setState({ listeningActive: active });
  },

  /** Set clipboard monitoring */
  setClipboardMonitoringEnabled: (enabled: boolean) => {
    useAppStore.getState().setState({ clipboardMonitoringEnabled: enabled });
  },

  /** Set clipboard summary */
  setClipboardSummary: (summary: string | undefined) => {
    useAppStore.getState().setState({ clipboardSummary: summary });
  },

  /** Set last plan explanation */
  setLastPlanExplanation: (explanation: string | null, traceId?: string) => {
    useAppStore.getState().setLastPlanExplanation(explanation, traceId);
  },

  /** Set intent */
  setIntent: (intent: string | undefined, payload?: unknown) => {
    useAppStore.getState().setState({ intent, intentPayload: payload });
  },

  /** Set conversation context */
  setConversationContext: (context: ConversationContext | undefined) => {
    useAppStore.getState().setState({ conversationContext: context });
  },

  /** Update conversation context */
  updateConversationContext: (partial: Partial<ConversationContext>) => {
    const current = useAppStore.getState().conversationContext;
    useAppStore.getState().setState({
      conversationContext: { ...current, ...partial, timestamp: Date.now() } as ConversationContext
    });
  },

  /** Set selected LLM */
  setSelectedLLM: (llm: string) => {
    useAppStore.getState().setState({ selectedLLM: llm });
  },

  /** Set selected vision model */
  setSelectedVisionModel: (model: string) => {
    useAppStore.getState().setState({ selectedVisionModel: model });
  },

  /** Set hearing language */
  setHearingLanguage: (language: string) => {
    useAppStore.getState().setState({ hearingLanguage: language });
  },

  /** Set fall detected */
  setFallDetected: (detected: boolean, timestamp?: number) => {
    useAppStore.getState().setState({
      fallDetected: detected,
      fallEventTimestamp: detected ? (timestamp ?? Date.now()) : null
    });
  },

  /** Clear fall alert */
  clearFallAlert: () => {
    useAppStore.getState().setState({
      fallDetected: false,
      fallEventTimestamp: null
    });
  },

  /** Update feature flags */
  setFeatureFlags: (flags: Partial<UiState['featureFlags']>) => {
    const current = useAppStore.getState().featureFlags;
    useAppStore.getState().setState({
      featureFlags: { ...current, ...flags }
    });
  },
};

/* ---------- Hook ---------- */
/**
 * Hook to access UI state with a selector
 * @example
 * const todos = useUiStore(uiSelectors.todos);
 * const isListening = useUiStore(uiSelectors.listeningActive);
 */
export function useUiStore<T>(selector: (state: AppState) => T): T {
  return useAppStore(selector);
}

/* ---------- Direct state access (for non-React code) ---------- */
export const getUiState = (): Partial<UiState> => ({
  todos: useAppStore.getState().todos,
  alarms: useAppStore.getState().alarms,
  timers: useAppStore.getState().timers,
  listeningActive: useAppStore.getState().listeningActive,
  featureFlags: useAppStore.getState().featureFlags,
  selectedLLM: useAppStore.getState().selectedLLM,
  fallDetected: useAppStore.getState().fallDetected,
});

/* ---------- Subscribe to UI state changes ---------- */
export const subscribeToUi = (
  selector: (state: AppState) => unknown,
  callback: (value: unknown, prevValue: unknown) => void
) => {
  return useAppStore.subscribe(selector, callback);
};
