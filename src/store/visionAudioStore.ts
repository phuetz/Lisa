import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  description?: string;
  location?: string;
}

export type FaceResult = { landmarks: Float32Array; boundingBox: DOMRectReadOnly; score: number }[];
export type HandResult = { landmarks: Float32Array; handedness: 'Left' | 'Right'; score: number }[];
export type ObjectResult = { box: DOMRectReadOnly; category: string; score: number }[];
export type PoseResult = { landmarks: Float32Array; score: number }[];
export type AudioResult = {
  category: string;
  score: number;
  timestamp: number;
};

export interface Alarm { id: string; time: number; label?: string; triggered?: boolean; recurrence?: 'daily' | 'weekdays' }
export interface Timer { id: string; finish: number; label?: string; triggered?: boolean }
export interface Todo { id: string; text: string }

export interface ChatMessage {
  role: string; // 'user' | 'assistant' | 'system'
  content: string;
}

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

export interface VisionAudioState {
  faces?: FaceResult;
  hands?: HandResult;
  objects?: ObjectResult;
  poses?: PoseResult;
  audio?: AudioResult;
  lastSilenceMs: number;
  smileDetected: boolean;
  speechDetected: boolean;
  intent?: string;
  intentPayload?: unknown;
  alarms: Alarm[];
  timers: Timer[];
  listeningActive: boolean;
  todos: Todo[];
  calendarEvents: {
    today: CalendarEvent[];
    upcoming: CalendarEvent[];
  };
  conversationContext?: ConversationContext;
  // Clipboard summarizer state
  clipboardMonitoringEnabled: boolean;
  clipboardSummary?: string;
  // Speech synthesis state
  audioEnabled: boolean;
  lastSpokenText?: string;
  lastIntent?: { intent: string; entities: any };
  isListening: boolean;
  // Agent workflow state
  plan: WorkflowStep[] | null;
  templates: string[];
  checkpoints: string[];
  // Plan UI feedback
  lastPlanExplanation: string | null;
  lastPlanTraceId?: string;
  // State updaters
  setPlan: (plan: WorkflowStep[] | null) => void;
  setTemplates: (templates: string[]) => void;
  setCheckpoints: (checkpoints: string[]) => void;
  setLastSpokenText: (text: string) => void;
  setLastIntent: (intent: string, entities: any) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setLastPlanExplanation: (explanation: string | null, traceId?: string) => void;
  setState: (partial: Partial<VisionAudioState> | ((s: VisionAudioState) => Partial<VisionAudioState>)) => void;
}

export const useVisionAudioStore = create<VisionAudioState>()(persist((set, _get) => ({
  lastSilenceMs: 0,
  smileDetected: false,
  speechDetected: false,
  alarms: [],
  timers: [],
  listeningActive: false,
  todos: [],
  calendarEvents: {
    today: [],
    upcoming: [],
  },
  conversationContext: undefined,
  // Initialize clipboard summarizer state
  clipboardMonitoringEnabled: false,
  clipboardSummary: undefined,
  // Initialize speech synthesis state
  audioEnabled: true,
  lastSpokenText: undefined,
  lastIntent: undefined,
  isListening: false,
  // Initialize workflow state
  plan: null,
  templates: [],
  checkpoints: [],
  // Initialize plan UI feedback
  lastPlanExplanation: null,
  // State updaters
  setPlan: (plan) => set({ plan }),
  setTemplates: (templates) => set({ templates }),
  setCheckpoints: (checkpoints) => set({ checkpoints }),
  setLastSpokenText: (text) => set({ lastSpokenText: text }),
  setLastIntent: (intent, entities) => set({ lastIntent: { intent, entities } }),
  setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
  setLastPlanExplanation: (explanation, traceId) => set({ 
    lastPlanExplanation: explanation, 
    lastPlanTraceId: traceId 
  }),
  setState: (partial) => set(partial as any),
}),{name:'lisa-store'}));
