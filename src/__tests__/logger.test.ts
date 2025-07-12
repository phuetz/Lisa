import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logEvent, getEvents, clearEvents, formatEvent } from '../utils/logger';
import type { WorkflowEvent } from '../types/Planner';

describe('logger', () => {
  beforeEach(() => {
    // Clear events before each test
    clearEvents();
    
    // Mock console.log
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should log events and store them in memory', () => {
    const type = 'step_completed';
    const payload = { stepId: 1, result: 'success' };
    const message = 'Step 1 completed successfully';
    
    const event = logEvent(type, payload, message);
    
    // Verify the returned event structure
    expect(event).toEqual({
      type,
      payload,
      message,
      timestamp: expect.any(Number)
    });
    
    // Verify it was logged to console
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[step_completed]'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message));
  });

  it('should retrieve events filtered by type', () => {
    // Log multiple event types
    logEvent('plan_generated', { planId: 'abc123' }, 'Plan generated');
    logEvent('step_started', { stepId: 1 }, 'Step 1 started');
    logEvent('step_completed', { stepId: 1 }, 'Step 1 completed');
    logEvent('step_started', { stepId: 2 }, 'Step 2 started');
    
    // Get all events
    const allEvents = getEvents();
    expect(allEvents.length).toBe(4);
    
    // Get filtered events
    const startedEvents = getEvents('step_started');
    expect(startedEvents.length).toBe(2);
    expect(startedEvents[0].message).toBe('Step 2 started');
    expect(startedEvents[1].message).toBe('Step 1 started');
  });

  it('should limit the number of events returned', () => {
    // Log many events
    for (let i = 0; i < 10; i++) {
      logEvent('test_event', { index: i }, `Event ${i}`);
    }
    
    // Get with limit
    const limitedEvents = getEvents(undefined, 5);
    expect(limitedEvents.length).toBe(5);
    expect(limitedEvents[0].payload.index).toBe(9); // Most recent first
  });

  it('should clear events from memory', () => {
    logEvent('test_event', {}, 'Test event');
    expect(getEvents().length).toBe(1);
    
    clearEvents();
    expect(getEvents().length).toBe(0);
  });

  it('should format events for display', () => {
    const event: WorkflowEvent = {
      type: 'plan_completed',
      timestamp: new Date('2025-01-01T12:00:00Z').getTime(),
      payload: { success: true },
      message: 'Plan execution finished'
    };
    
    const formatted = formatEvent(event);
    expect(formatted).toContain('PLAN_COMPLETED');
    expect(formatted).toContain('Plan execution finished');
  });
});
