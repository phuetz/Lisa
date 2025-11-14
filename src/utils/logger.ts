/**
 * logger.ts
 *
 * Enhanced centralized logging system for tracking workflow execution,
 * debugging, and providing transparency into agent operations.
 * Now includes structured logging with levels, persistence, and advanced filtering.
 */

import type { WorkflowEvent, WorkflowEventType } from '../types/Planner';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface StructuredLogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
  tags?: string[];
}

/** Maximum number of events to keep in memory */
const MAX_EVENTS = 1000;
const MAX_STRUCTURED_LOGS = 1000;

/** In-memory storage of recent events */
const eventLog: WorkflowEvent[] = [];
const structuredLogs: StructuredLogEntry[] = [];

/** Current minimum log level */
let currentLogLevel: LogLevel = LogLevel.INFO;

/** Persistence flag */
let persistenceEnabled = false;
const STORAGE_KEY = 'lisa_structured_logs';

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

  // Log via structured logger as well
  logInfo(message, 'Workflow', { type, payload });

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

// ============================================================================
// STRUCTURED LOGGING API
// ============================================================================

/**
 * Core structured logging function
 */
function log(
  level: LogLevel,
  message: string,
  context?: string,
  data?: any,
  error?: Error,
  tags?: string[]
): void {
  if (level < currentLogLevel) {
    return;
  }

  const entry: StructuredLogEntry = {
    timestamp: Date.now(),
    level,
    message,
    context,
    data,
    error,
    tags,
  };

  // Store log
  structuredLogs.push(entry);
  if (structuredLogs.length > MAX_STRUCTURED_LOGS) {
    structuredLogs.shift();
  }

  // Console output with formatting
  logToConsole(entry);

  // Persist if enabled
  if (persistenceEnabled) {
    saveToStorage();
  }
}

/**
 * Log to browser console with appropriate formatting
 */
function logToConsole(entry: StructuredLogEntry): void {
  const prefix = entry.context ? `[${entry.context}]` : '[Lisa]';
  const timestamp = new Date(entry.timestamp).toISOString();
  const levelName = LogLevel[entry.level];
  const message = `${timestamp} ${levelName} ${prefix} ${entry.message}`;

  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(message, entry.data || '');
      break;
    case LogLevel.INFO:
      console.info(message, entry.data || '');
      break;
    case LogLevel.WARN:
      console.warn(message, entry.data || '');
      break;
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(message, entry.error || entry.data || '');
      if (entry.error?.stack) {
        console.error(entry.error.stack);
      }
      break;
  }
}

/**
 * Log a debug message
 */
export function logDebug(message: string, context?: string, data?: any): void {
  log(LogLevel.DEBUG, message, context, data);
}

/**
 * Log an info message
 */
export function logInfo(message: string, context?: string, data?: any): void {
  log(LogLevel.INFO, message, context, data);
}

/**
 * Log a warning message
 */
export function logWarn(message: string, context?: string, data?: any): void {
  log(LogLevel.WARN, message, context, data);
}

/**
 * Log an error message
 */
export function logError(message: string, context?: string, error?: Error | any): void {
  const errorObj = error instanceof Error ? error : undefined;
  const data = error instanceof Error ? undefined : error;
  log(LogLevel.ERROR, message, context, data, errorObj);
}

/**
 * Log a fatal error message
 */
export function logFatal(message: string, context?: string, error?: Error | any): void {
  const errorObj = error instanceof Error ? error : undefined;
  const data = error instanceof Error ? undefined : error;
  log(LogLevel.FATAL, message, context, data, errorObj);
}

/**
 * Get all structured logs
 */
export function getStructuredLogs(): StructuredLogEntry[] {
  return [...structuredLogs];
}

/**
 * Get logs by level
 */
export function getLogsByLevel(level: LogLevel): StructuredLogEntry[] {
  return structuredLogs.filter(log => log.level === level);
}

/**
 * Get logs by context
 */
export function getLogsByContext(context: string): StructuredLogEntry[] {
  return structuredLogs.filter(log => log.context === context);
}

/**
 * Search logs by message
 */
export function searchLogs(query: string): StructuredLogEntry[] {
  const lowerQuery = query.toLowerCase();
  return structuredLogs.filter(log =>
    log.message.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Set minimum log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Enable persistence to localStorage
 */
export function enablePersistence(enable: boolean = true): void {
  persistenceEnabled = enable;
}

/**
 * Clear all structured logs
 */
export function clearStructuredLogs(): void {
  structuredLogs.length = 0;
  if (persistenceEnabled) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Export logs as JSON
 */
export function exportLogs(): string {
  return JSON.stringify({
    logs: structuredLogs,
    exportedAt: Date.now(),
  });
}

/**
 * Import logs from JSON
 */
export function importLogs(data: string): void {
  try {
    const parsed = JSON.parse(data);
    structuredLogs.length = 0;
    structuredLogs.push(...(parsed.logs || []));
  } catch (error) {
    console.error('[Logger] Failed to import logs:', error);
  }
}

/**
 * Save logs to localStorage
 */
function saveToStorage(): void {
  try {
    const data = exportLogs();
    localStorage.setItem(STORAGE_KEY, data);
  } catch (error) {
    console.error('[Logger] Failed to save to storage:', error);
  }
}

/**
 * Load logs from localStorage
 */
export function loadLogsFromStorage(): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      importLogs(data);
    }
  } catch (error) {
    console.error('[Logger] Failed to load from storage:', error);
  }
}

/**
 * Get log statistics
 */
export function getLogStats(): {
  total: number;
  byLevel: Record<string, number>;
  byContext: Record<string, number>;
} {
  const byLevel: Record<string, number> = {};
  const byContext: Record<string, number> = {};

  for (const log of structuredLogs) {
    const levelName = LogLevel[log.level];
    byLevel[levelName] = (byLevel[levelName] || 0) + 1;

    if (log.context) {
      byContext[log.context] = (byContext[log.context] || 0) + 1;
    }
  }

  return {
    total: structuredLogs.length,
    byLevel,
    byContext,
  };
}

// Initialize logger
if (import.meta.env.DEV) {
  setLogLevel(LogLevel.DEBUG);
} else {
  setLogLevel(LogLevel.INFO);
}

enablePersistence(true);
loadLogsFromStorage();
