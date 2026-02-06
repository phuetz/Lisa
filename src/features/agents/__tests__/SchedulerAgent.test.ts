/**
 * Tests for SchedulerAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SchedulerAgent } from '../implementations/SchedulerAgent';
import { AgentDomains } from '../core/types';

describe('SchedulerAgent', () => {
  let agent: SchedulerAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new SchedulerAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('SchedulerAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('scheduling');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.PRODUCTIVITY);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('availability_analysis');
      expect(agent.capabilities).toContain('time_optimization');
      expect(agent.capabilities).toContain('meeting_scheduling');
      expect(agent.capabilities).toContain('conflict_detection');
      expect(agent.capabilities).toContain('smart_suggestions');
      expect(agent.capabilities).toContain('calendar_integration');
    });
  });

  describe('canHandle', () => {
    it('should return confidence for scheduling keywords', async () => {
      const confidence1 = await agent.canHandle('schedule a meeting');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle('find available time');
      expect(confidence2).toBeGreaterThan(0);

      const confidence3 = await agent.canHandle('calendar availability');
      expect(confidence3).toBeGreaterThan(0);
    });

    it('should handle French scheduling keywords', async () => {
      const confidence1 = await agent.canHandle('planifier une réunion');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle('disponibilité');
      expect(confidence2).toBeGreaterThan(0);
    });

    it('should return zero for unrelated queries', async () => {
      const confidence = await agent.canHandle('what is the weather');
      expect(confidence).toBe(0);
    });
  });

  describe('execute - find_availability intent', () => {
    it('should find available time slots', async () => {
      const startDate = new Date('2025-03-01T09:00:00');
      const endDate = new Date('2025-03-01T17:00:00');

      const result = await agent.execute({
        intent: 'find_availability',
        parameters: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          duration: 60
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.availableSlots).toBeDefined();
      expect(result.output.totalSlots).toBeGreaterThan(0);
      expect(result.output.bestSlot).toBeDefined();
    });

    it('should respect duration parameter', async () => {
      const result = await agent.execute({
        intent: 'find_availability',
        parameters: {
          startDate: new Date('2025-03-01T09:00:00').toISOString(),
          endDate: new Date('2025-03-01T17:00:00').toISOString(),
          duration: 90
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.availableSlots).toBeDefined();
    });

    it('should fail without start date', async () => {
      const result = await agent.execute({
        intent: 'find_availability',
        parameters: {
          endDate: new Date().toISOString()
        }
      });

      expect(result.success).toBe(false);
    });

    it('should fail without end date', async () => {
      const result = await agent.execute({
        intent: 'find_availability',
        parameters: {
          startDate: new Date().toISOString()
        }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - suggest_time intent', () => {
    it('should suggest time for meeting', async () => {
      const result = await agent.execute({
        intent: 'suggest_time',
        parameters: {
          purpose: 'Team sync',
          duration: 60
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.suggestions).toBeDefined();
      expect(result.output.primarySuggestion).toBeDefined();
    });

    it('should respect morning preference', async () => {
      const result = await agent.execute({
        intent: 'suggest_time',
        parameters: {
          duration: 60,
          preferredTimeOfDay: 'morning'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.suggestions.length).toBeGreaterThan(0);
    });

    it('should respect afternoon preference', async () => {
      const result = await agent.execute({
        intent: 'suggest_time',
        parameters: {
          duration: 60,
          preferredTimeOfDay: 'afternoon'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.suggestions.length).toBeGreaterThan(0);
    });

    it('should return multiple suggestions', async () => {
      const result = await agent.execute({
        intent: 'suggest_time',
        parameters: {
          duration: 60
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.suggestions.length).toBeGreaterThan(0);
    });

    it('should include urgency level', async () => {
      const result = await agent.execute({
        intent: 'suggest_time',
        parameters: {
          duration: 60,
          urgency: 'high'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.urgency).toBe('high');
    });
  });

  describe('execute - detect_conflicts intent', () => {
    it('should detect no conflicts', async () => {
      const newEvent = {
        start: '2025-03-01T10:00:00',
        end: '2025-03-01T11:00:00'
      };

      const result = await agent.execute({
        intent: 'detect_conflicts',
        parameters: {
          events: [],
          newEvent
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.hasConflicts).toBe(false);
      expect(result.output.conflictCount).toBe(0);
    });

    it('should detect conflicts', async () => {
      const events = [{
        start: '2025-03-01T10:00:00',
        end: '2025-03-01T11:00:00',
        title: 'Existing meeting'
      }];

      const newEvent = {
        start: '2025-03-01T10:30:00',
        end: '2025-03-01T11:30:00',
        title: 'New meeting'
      };

      const result = await agent.execute({
        intent: 'detect_conflicts',
        parameters: {
          events,
          newEvent
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.hasConflicts).toBe(true);
      expect(result.output.conflictCount).toBeGreaterThan(0);
    });

    it('should fail without new event', async () => {
      const result = await agent.execute({
        intent: 'detect_conflicts',
        parameters: {
          events: []
        }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - optimize_schedule intent', () => {
    it('should analyze schedule for optimizations', async () => {
      const events = [
        {
          start: '2025-03-01T09:00:00',
          end: '2025-03-01T10:00:00',
          title: 'Meeting 1'
        },
        {
          start: '2025-03-01T10:00:00',
          end: '2025-03-01T11:00:00',
          title: 'Meeting 2'
        }
      ];

      const result = await agent.execute({
        intent: 'optimize_schedule',
        parameters: {
          events
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.optimizations).toBeDefined();
      expect(result.output.optimizationScore).toBeDefined();
    });

    it('should detect back-to-back meetings', async () => {
      const events = [
        {
          start: '2025-03-01T09:00:00',
          end: '2025-03-01T10:00:00'
        },
        {
          start: '2025-03-01T10:05:00',
          end: '2025-03-01T11:00:00'
        }
      ];

      const result = await agent.execute({
        intent: 'optimize_schedule',
        parameters: { events }
      });

      expect(result.success).toBe(true);
      expect(result.output.optimizations.length).toBeGreaterThan(0);
    });

    it('should suggest splitting long meetings', async () => {
      const events = [
        {
          start: '2025-03-01T09:00:00',
          end: '2025-03-01T11:00:00' // 2 hours
        }
      ];

      const result = await agent.execute({
        intent: 'optimize_schedule',
        parameters: { events }
      });

      expect(result.success).toBe(true);
      // Should suggest optimizations for long meeting
      expect(result.output.optimizations.length).toBeGreaterThan(0);
    });
  });

  describe('execute - analyze_workload intent', () => {
    it('should analyze workload', async () => {
      const events = [
        {
          start: '2025-03-01T09:00:00',
          end: '2025-03-01T10:00:00'
        },
        {
          start: '2025-03-01T11:00:00',
          end: '2025-03-01T12:00:00'
        }
      ];

      const result = await agent.execute({
        intent: 'analyze_workload',
        parameters: {
          events,
          period: 'week'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.totalHours).toBeDefined();
      expect(result.output.averagePerDay).toBeDefined();
      expect(result.output.status).toBeDefined();
      expect(result.output.recommendation).toBeDefined();
    });

    it('should categorize light workload', async () => {
      const events = [
        {
          start: '2025-03-01T09:00:00',
          end: '2025-03-01T10:00:00'
        }
      ];

      const result = await agent.execute({
        intent: 'analyze_workload',
        parameters: {
          events,
          period: 'week'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.status).toBe('light');
    });

    it('should categorize heavy workload', async () => {
      const events = [
        {
          start: '2025-03-01T08:00:00',
          end: '2025-03-01T17:00:00'
        }
      ];

      const result = await agent.execute({
        intent: 'analyze_workload',
        parameters: {
          events,
          period: 'week'
        }
      });

      expect(result.success).toBe(true);
      expect(['heavy', 'overloaded']).toContain(result.output.status);
    });
  });

  describe('execute - schedule_meeting intent', () => {
    it('should schedule meeting', async () => {
      const result = await agent.execute({
        intent: 'schedule_meeting',
        parameters: {
          title: 'Team Sync',
          duration: 60,
          participants: ['alice@example.com', 'bob@example.com']
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.meeting).toBeDefined();
      expect(result.output.meeting.title).toBe('Team Sync');
      expect(result.output.meeting.duration).toBe(60);
    });

    it('should provide alternatives', async () => {
      const result = await agent.execute({
        intent: 'schedule_meeting',
        parameters: {
          title: 'Meeting',
          duration: 60
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.alternatives).toBeDefined();
    });

    it('should include confidence score', async () => {
      const result = await agent.execute({
        intent: 'schedule_meeting',
        parameters: {
          title: 'Meeting',
          duration: 60
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.confidence).toBeDefined();
      expect(result.output.confidence).toBeGreaterThan(0);
      expect(result.output.confidence).toBeLessThanOrEqual(1);
    });

    it('should fail without title', async () => {
      const result = await agent.execute({
        intent: 'schedule_meeting',
        parameters: {
          duration: 60
        }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - unknown intent', () => {
    it('should return error for unknown intent', async () => {
      const result = await agent.execute({
        intent: 'unknown_intent',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown intent');
    });
  });

  describe('metadata', () => {
    it('should include execution time in metadata', async () => {
      const result = await agent.execute({
        intent: 'suggest_time',
        parameters: { duration: 60 }
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should include source in metadata', async () => {
      const result = await agent.execute({
        intent: 'suggest_time',
        parameters: { duration: 60 }
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.source).toBe('SchedulerAgent');
    });

    it('should include timestamp in metadata', async () => {
      const result = await agent.execute({
        intent: 'suggest_time',
        parameters: { duration: 60 }
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.timestamp).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      const result = await agent.execute({
        intent: 'find_availability',
        parameters: {
          startDate: 'invalid-date',
          endDate: 'invalid-date'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
