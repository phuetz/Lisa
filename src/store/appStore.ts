import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Percept, VisionPayload } from '../senses/vision'; // Import new types

/* ---------- Shared domain types (copied from previous store) ---------- */
export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  description?: string;
  location?: string;
}

// These types are now replaced or augmented by VisionPayload
// export type FaceResult = { landmarks: Float32Array; boundingBox: DOMRectReadOnly; score: number }[];
// export type HandResult = { landmarks: Float32Array; handedness: 'Left' | 'Right'; score: number }[];
// export type ObjectResult = { box: DOMRectReadOnly; category: string; score: number }[];
export type PoseResult = { landmarks: Float32Array; score: number }[];
export type AudioResult = { category: string; score: number; timestamp: number };

import { HearingPerceptPayload } from '../senses/hearing';

export interface Alarm { id: string; time: number; label?: string; triggered?: boolean; recurrence?: 'daily' | 'weekdays' }
export interface Timer { id: string; finish: number; label?: string; triggered?: boolean }
export interface Todo { id: string; text: string }

export interface ChatMessage { role: string; content: string }

export interface ConversationContext {
  lastUtterance?: string;
  lastIntent?: string;
  lastSpokenText?: string;
  subject?: string;
  timestamp: number;
  followUpExpected?: boolean;
  chatHistory?: ChatMessage[];
}

export interface WorkflowStep {
  id: number;
  description: string;
  agent: string;
  command: string;
  args: Record<string, any>;
  dependencies: number[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  startTime?: number;
  endTime?: number;
  duration?: number;
  output?: any;
  error?: string;
}

export type NodeExecutionStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped';
export type EdgeExecutionStatus = 'idle' | 'active' | 'skipped';

/* ---------- Slice definitions ---------- */

interface VisionSlice {
  percepts?: Percept<VisionPayload>[]; // Updated to use new Percept type
  lastSilenceMs: number;
  smileDetected: boolean;
  speechDetected: boolean;
}

interface AudioSlice {
  audio?: AudioResult;
  audioEnabled: boolean;
  hearingPercepts?: Percept<HearingPerceptPayload>[];
  setAudioEnabled: (enabled: boolean) => void;
}

interface WorkflowSlice {
  plan: WorkflowStep[] | null;
  templates: string[];
  checkpoints: string[];
  nodeExecutionStatus: Record<string, NodeExecutionStatus>;
  edgeExecutionStatus: Record<string, EdgeExecutionStatus>;
  setPlan: (plan: WorkflowStep[] | null) => void;
  setTemplates: (templates: string[]) => void;
  setCheckpoints: (checkpoints: string[]) => void;
  setNodeExecutionStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  setEdgeExecutionStatus: (edgeId: string, status: EdgeExecutionStatus) => void;
  resetExecutionStatus: () => void;
}

interface UiSlice {
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
  };
  setLastPlanExplanation: (explanation: string | null, traceId?: string) => void;
}

interface CommonSlice {
  setState: (
    partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)
  ) => void;
}

export type AppState = VisionSlice & AudioSlice & WorkflowSlice & UiSlice & CommonSlice;
// Legacy compatibility
export type VisionAudioState = AppState;

/* ---------- Slice creators ---------- */

const createVisionSlice = (): VisionSlice => ({
  percepts: [],
  lastSilenceMs: 0,
  smileDetected: false,
  speechDetected: false,
});

const createAudioSlice = (set: any): AudioSlice => ({
  audio: undefined,
  audioEnabled: true,
  hearingPercepts: [],
  setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
});

const createWorkflowSlice = (set: any): WorkflowSlice => ({
  plan: null,
  templates: [],
  checkpoints: [],
  nodeExecutionStatus: {},
  edgeExecutionStatus: {},
  setPlan: (plan) => set({ plan }),
  setTemplates: (templates) => set({ templates }),
  setCheckpoints: (checkpoints) => set({ checkpoints }),
  setNodeExecutionStatus: (nodeId, status) =>
    set((state: AppState) => {
      state.workflow.nodeExecutionStatus[nodeId] = status;
    }),
  setEdgeExecutionStatus: (edgeId, status) =>
    set((state: AppState) => {
      state.workflow.edgeExecutionStatus[edgeId] = status;
    }),
  resetExecutionStatus: () =>
    set((state: AppState) => {
      state.workflow.nodeExecutionStatus = {};
      state.workflow.edgeExecutionStatus = {};
    }),
});

const createUiSlice = (set: any): UiSlice => ({
  todos: [],
  alarms: [],
  timers: [],
  listeningActive: false,
  clipboardMonitoringEnabled: false,
  clipboardSummary: undefined,
  lastPlanExplanation: null,
  lastPlanTraceId: undefined,
  intent: undefined,
  intentPayload: undefined,
  conversationContext: undefined,
  featureFlags: {
    advancedVision: false,
    advancedHearing: false,
  },
  setLastPlanExplanation: (explanation, traceId) =>
    set({ lastPlanExplanation: explanation, lastPlanTraceId: traceId }),
});

const createCommonSlice = (set: any, get: any): CommonSlice => ({
  setState: (partial) =>
    set(typeof partial === 'function' ? (partial as any)(get()) : partial),
});

/* ---------- Store ---------- */

export const useAppStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        ...createVisionSlice(),
        ...createAudioSlice(set),
        ...createWorkflowSlice(set),
        ...createUiSlice(set),
        ...createCommonSlice(set, get),
      })),
      { name: 'lisa-store' }
    )
  )
);
