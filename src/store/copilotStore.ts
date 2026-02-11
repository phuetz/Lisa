/**
 * copilotStore.ts — Unified Copilot state
 *
 * Combines: event bus / timeline, session memory (ephemeral),
 * pinned memory (persisted), and agent board traces.
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

/* ================================================================
   TYPES
   ================================================================ */

export interface CopilotTimelineEvent {
  id: string;
  type: 'vision.update' | 'audio.event' | 'intent.proposed' | 'action.executed' | 'agent.trace';
  timestamp: number;
  source?: string;
  title: string;
  description?: string;
  color: 'cyan' | 'purple' | 'amber' | 'emerald' | 'blue';
  payload?: unknown;
}

export interface SessionContext {
  lastVisionSummary?: string;
  lastAudioSummary?: string;
  lastIntent?: string;
  lastAction?: string;
  updatedAt: number;
}

export interface SessionMemory {
  events: CopilotTimelineEvent[];
  context: SessionContext;
  startedAt: number;
  expiresAt: number;
}

export interface PinnedMemoryItem {
  id: string;
  text: string;
  source?: string;
  createdAt: number;
}

export interface AgentTrace {
  agentName: string;
  lastSummary: string;
  lastAction?: string;
  confidence?: number;
  updatedAt: number;
}

/* ================================================================
   STATE INTERFACE
   ================================================================ */

interface CopilotState {
  // Timeline
  events: CopilotTimelineEvent[];
  pushEvent: (evt: Omit<CopilotTimelineEvent, 'id'>) => void;
  clearTimeline: () => void;

  // Session memory (ephemeral, 30-min window)
  session: SessionMemory;
  updateSessionContext: (ctx: Partial<SessionContext>) => void;
  forgetSession: () => void;

  // Pinned memory (persisted via localStorage)
  pinned: PinnedMemoryItem[];
  pinItem: (text: string, source?: string) => void;
  unpinItem: (id: string) => void;

  // Agent board
  agents: Record<string, AgentTrace>;
  updateAgentTrace: (name: string, trace: Partial<Omit<AgentTrace, 'agentName'>>) => void;

  // UI toggles
  memoryDrawerOpen: boolean;
  agentBoardOpen: boolean;
  toggleMemoryDrawer: () => void;
  toggleAgentBoard: () => void;
}

/* ================================================================
   HELPERS
   ================================================================ */

const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MAX_TIMELINE_EVENTS = 200;
const MAX_SESSION_EVENTS = 200;
const MAX_PINNED_ITEMS = 100;

function createFreshSession(): SessionMemory {
  const now = Date.now();
  return {
    events: [],
    context: { updatedAt: now },
    startedAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };
}

/* ================================================================
   STORE
   ================================================================ */

export const useCopilotStore = create<CopilotState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        /* ---------- Timeline ---------- */
        events: [],

        pushEvent: (evt) => {
          const event: CopilotTimelineEvent = { ...evt, id: crypto.randomUUID() };
          set((state) => {
            const events = [event, ...state.events].slice(0, MAX_TIMELINE_EVENTS);
            // Don't accumulate session events after expiry
            const sessionExpired = Date.now() > state.session.expiresAt;
            const sessionEvents = sessionExpired
              ? state.session.events
              : [event, ...state.session.events].slice(0, MAX_SESSION_EVENTS);
            return {
              events,
              session: { ...state.session, events: sessionEvents },
            };
          });
        },

        clearTimeline: () =>
          set((state) => ({
            events: [],
            session: { ...state.session, events: [] },
          })),

        /* ---------- Session Memory ---------- */
        session: createFreshSession(),

        updateSessionContext: (ctx) =>
          set((state) => ({
            session: {
              ...state.session,
              context: { ...state.session.context, ...ctx, updatedAt: Date.now() },
            },
          })),

        forgetSession: () =>
          set({
            events: [],
            session: createFreshSession(),
            agents: {},
          }),

        /* ---------- Pinned Memory ---------- */
        pinned: [],

        pinItem: (text, source) =>
          set((state) => {
            // Prevent duplicate pins with the same text
            if (state.pinned.some((p) => p.text === text)) return state;
            // Enforce max limit — drop oldest when full
            const existing = state.pinned.length >= MAX_PINNED_ITEMS
              ? state.pinned.slice(0, MAX_PINNED_ITEMS - 1)
              : state.pinned;
            return {
              pinned: [
                { id: crypto.randomUUID(), text, source, createdAt: Date.now() },
                ...existing,
              ],
            };
          }),

        unpinItem: (id) =>
          set((state) => ({
            pinned: state.pinned.filter((p) => p.id !== id),
          })),

        /* ---------- Agent Board ---------- */
        agents: {},

        updateAgentTrace: (name, trace) =>
          set((state) => ({
            agents: {
              ...state.agents,
              [name]: {
                ...(state.agents[name] || { agentName: name, lastSummary: '', updatedAt: 0 }),
                ...trace,
                agentName: name,
              },
            },
          })),

        /* ---------- UI Toggles ---------- */
        memoryDrawerOpen: false,
        agentBoardOpen: false,

        toggleMemoryDrawer: () =>
          set((state) => ({
            memoryDrawerOpen: !state.memoryDrawerOpen,
            agentBoardOpen: false, // close the other
          })),

        toggleAgentBoard: () =>
          set((state) => ({
            agentBoardOpen: !state.agentBoardOpen,
            memoryDrawerOpen: false, // close the other
          })),
      }),
      {
        name: 'copilot-pinned',
        partialize: (state) => ({ pinned: state.pinned }),
      },
    ),
  ),
);

/* ---------- Selectors ---------- */
export const copilotSelectors = {
  events: (s: CopilotState) => s.events,
  session: (s: CopilotState) => s.session,
  pinned: (s: CopilotState) => s.pinned,
  agents: (s: CopilotState) => s.agents,
};
