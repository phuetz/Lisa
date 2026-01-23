import type { Percept } from './percept';

export type EventHandler<T = any> = (event: T) => void;

export interface EventBus {
  on<T>(event: string, handler: EventHandler<T>): () => void;
  emit<T>(event: string, data: T): void;
}

/**
 * Standard Events
 */
export const LisaEvents = {
  PERCEPT_RECEIVED: 'percept:received',
  AGENT_START: 'agent:start',
  AGENT_COMPLETE: 'agent:complete',
  ERROR: 'system:error'
} as const;

export interface PerceptEvent {
  percept: Percept;
}
