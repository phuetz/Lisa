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
 * @param payload - Event-specific data (can be any structure)
 * @param message - Human-readable description of the event
 * @returns The created event object
 */
export function logEvent(
  type: WorkflowEventType,
  payload: any,
  message: string
): WorkflowEvent {
  const event: WorkflowEvent = {
    type,
    timestamp: Date.now(),
    payload,
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
