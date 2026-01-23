/**
 * logger.ts
 * 
 * Centralized typed event logging system for tracking workflow execution,
 * debugging, and providing transparency into agent operations.
 */

import type { WorkflowEvent, WorkflowEventType } from '../types/Planner';

/** Maximum number of events to keep in memory */
const MAX_EVENTS = 1000;

/** In-memory storage of recent events */
const eventLog: WorkflowEvent[] = [];

/**
 * Log a workflow-related event
 * 
 * @param type - Category of event (plan_generated, step_completed, etc.)
 * @param message - Human-readable description of the event
 * @param data - Event-specific data (can be any structure)
 * @returns The created event object
 */
export function logEvent(
  type: WorkflowEventType,
  message: string,
  data?: Record<string, unknown>
): WorkflowEvent;
export function logEvent(
  type: WorkflowEventType,
  data: Record<string, unknown>,
  message: string
): WorkflowEvent;
export function logEvent(
  type: WorkflowEventType,
  messageOrData: string | Record<string, unknown>,
  dataOrMessage?: Record<string, unknown> | string
): WorkflowEvent {
  let message: string;
  let data: Record<string, unknown> | undefined;

  if (typeof messageOrData === 'string') {
    message = messageOrData;
    data = typeof dataOrMessage === 'object' ? dataOrMessage : undefined;
  } else {
    data = messageOrData;
    message = typeof dataOrMessage === 'string' ? dataOrMessage : '';
  }

  const event: WorkflowEvent = {
    type,
    timestamp: Date.now(),
    payload: data,
    message,
  };

  // Add to in-memory log with size limit
  eventLog.unshift(event);
  if (eventLog.length > MAX_EVENTS) {
    eventLog.pop();
  }

  // Also log to console for debugging
  console.log(`[${type}] ${message}`);
  
  return event;
}

/**
 * Get recent events, optionally filtered by type
 * 
 * @param type - Optional event type to filter by
 * @param limit - Maximum number of events to return
 * @returns Array of matching events
 */
export function getEvents(type?: WorkflowEventType, limit = 100): WorkflowEvent[] {
  const filtered = type 
    ? eventLog.filter(event => event.type === type)
    : eventLog;
  
  return filtered.slice(0, limit);
}

/**
 * Clear all recorded events
 */
export function clearEvents(): void {
  eventLog.length = 0;
}

/**
 * Format an event for display
 * 
 * @param event - The event to format
 * @returns Formatted string representation
 */
export function formatEvent(event: WorkflowEvent): string {
  const time = new Date(event.timestamp).toLocaleTimeString();
  return `[${time}] ${event.type.toUpperCase()}: ${event.message}`;
}

// Minimal logger factory used across panels and services
export function createLogger(name: string) {
  const prefix = `[${name}]`;
  return {
    info: (...args: unknown[]) => console.info(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
    debug: (...args: unknown[]) => console.debug(prefix, ...args),
  };
}
