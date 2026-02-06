/**
 * Tests for CalendarAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalendarAgent, type CalendarIntent, type CalendarEvent } from '../implementations/CalendarAgent';
import { AgentDomains } from '../core/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock sessionStorage for auth token
const mockSessionStorage: Record<string, string> = {};

Object.defineProperty(global, 'sessionStorage', {
  value: {
    getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockSessionStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockSessionStorage[key];
    }),
    clear: vi.fn(() => {
      for (const key in mockSessionStorage) {
        delete mockSessionStorage[key];
      }
    })
  },
  writable: true
});

describe('CalendarAgent', () => {
  let agent: CalendarAgent;
  const mockToken = 'mock-google-access-token';

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new CalendarAgent();

    // Set up authenticated state by default
    mockSessionStorage['google_access_token'] = mockToken;

    // Default mock for fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        items: []
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete mockSessionStorage['google_access_token'];
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('CalendarAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('calendrier');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.1.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.PRODUCTIVITY);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('create_calendar_event');
      expect(agent.capabilities).toContain('list_calendar_events');
      expect(agent.capabilities).toContain('delete_calendar_event');
      expect(agent.capabilities).toContain('update_calendar_event');
      expect(agent.capabilities).toContain('find_available_time');
    });

    it('should require authentication', () => {
      expect(agent.requiresAuthentication).toBe(true);
    });

    it('should have defined inputs and outputs', () => {
      expect(agent.inputs).toBeDefined();
      expect(agent.outputs).toBeDefined();
    });
  });

  describe('canHandle', () => {
    it('should return high confidence for calendar-related regex patterns', async () => {
      const confidence1 = await agent.canHandle('add an event to my calendar');
      expect(confidence1).toBe(0.85);

      const confidence2 = await agent.canHandle('schedule a meeting');
      expect(confidence2).toBe(0.85);

      const confidence3 = await agent.canHandle("what's on my calendar");
      expect(confidence3).toBe(0.85);
    });

    it('should return medium confidence for calendar keywords', async () => {
      const confidence1 = await agent.canHandle('calendar');
      expect(confidence1).toBe(0.6);

      const confidence2 = await agent.canHandle('meeting tomorrow');
      expect(confidence2).toBe(0.6);

      const confidence3 = await agent.canHandle('schedule');
      expect(confidence3).toBe(0.6);
    });

    it('should return zero for unrelated queries', async () => {
      const confidence = await agent.canHandle('what is the weather today?');
      expect(confidence).toBe(0);
    });

    it('should handle French queries', async () => {
      const confidence1 = await agent.canHandle('ajouter un evenement');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle("qu'est-ce qu'il y a dans mon agenda");
      expect(confidence2).toBe(0.85);
    });
  });

  describe('authentication', () => {
    it('should return auth required error when not authenticated', async () => {
      delete mockSessionStorage['google_access_token'];

      const result = await agent.execute({
        intent: 'list_events' as CalendarIntent,
        parameters: { period: 'today' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authenticated');
      expect(result.output.authRequired).toBe(true);
      expect(result.output.authProvider).toBe('google');
    });
  });

  describe('execute - create_event intent', () => {
    const validEventParams: CalendarEvent = {
      summary: 'Team Meeting',
      start: {
        dateTime: '2025-03-01T10:00:00.000Z',
        timeZone: 'Europe/Paris'
      },
      end: {
        dateTime: '2025-03-01T11:00:00.000Z',
        timeZone: 'Europe/Paris'
      },
      description: 'Weekly team sync',
      location: 'Conference Room A'
    };

    it('should create an event successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'event-123',
          summary: validEventParams.summary,
          start: validEventParams.start,
          end: validEventParams.end,
          htmlLink: 'https://calendar.google.com/event/123'
        })
      });

      const result = await agent.execute({
        intent: 'create_event' as CalendarIntent,
        parameters: validEventParams
      });

      expect(result.success).toBe(true);
      expect(result.output.created).toBe(true);
      expect(result.output.id).toBe('event-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`
          })
        })
      );
    });

    it('should fail when summary is missing', async () => {
      const result = await agent.execute({
        intent: 'create_event' as CalendarIntent,
        parameters: {
          start: validEventParams.start,
          end: validEventParams.end
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Event summary/title is required');
    });

    it('should fail when start time is missing', async () => {
      const result = await agent.execute({
        intent: 'create_event' as CalendarIntent,
        parameters: {
          summary: 'Test Event',
          end: validEventParams.end
        }
      });

      expect(result.success).toBe(false);
    });

    it('should fail when end time is before start time', async () => {
      const result = await agent.execute({
        intent: 'create_event' as CalendarIntent,
        parameters: {
          summary: 'Test Event',
          start: { dateTime: '2025-03-01T12:00:00.000Z' },
          end: { dateTime: '2025-03-01T10:00:00.000Z' }
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('end time must be after start time');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'Calendar API error' }
        })
      });

      const result = await agent.execute({
        intent: 'create_event' as CalendarIntent,
        parameters: validEventParams
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - list_events intent', () => {
    const mockEvents = [
      {
        id: 'event-1',
        summary: 'Morning Standup',
        start: { dateTime: '2025-03-01T09:00:00Z' },
        end: { dateTime: '2025-03-01T09:30:00Z' }
      },
      {
        id: 'event-2',
        summary: 'Lunch Meeting',
        start: { dateTime: '2025-03-01T12:00:00Z' },
        end: { dateTime: '2025-03-01T13:00:00Z' }
      }
    ];

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: mockEvents })
      });
    });

    it('should list events for today', async () => {
      const result = await agent.execute({
        intent: 'list_events' as CalendarIntent,
        parameters: { period: 'today' }
      });

      expect(result.success).toBe(true);
      expect(result.output.period).toBe('today');
      expect(result.output.events).toBeDefined();
    });

    it('should list events for tomorrow', async () => {
      const result = await agent.execute({
        intent: 'list_events' as CalendarIntent,
        parameters: { period: 'tomorrow' }
      });

      expect(result.success).toBe(true);
      expect(result.output.period).toBe('tomorrow');
    });

    it('should list events for this week', async () => {
      const result = await agent.execute({
        intent: 'list_events' as CalendarIntent,
        parameters: { period: 'week' }
      });

      expect(result.success).toBe(true);
      expect(result.output.period).toBe('week');
    });

    it('should list events for this month', async () => {
      const result = await agent.execute({
        intent: 'list_events' as CalendarIntent,
        parameters: { period: 'month' }
      });

      expect(result.success).toBe(true);
      expect(result.output.period).toBe('month');
    });

    it('should list events for custom date range', async () => {
      const result = await agent.execute({
        intent: 'list_events' as CalendarIntent,
        parameters: {
          period: 'custom',
          startDate: '2025-03-01T00:00:00.000Z',
          endDate: '2025-03-15T23:59:59.999Z'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.period).toBe('custom');
    });

    it('should fail with custom period without dates', async () => {
      const result = await agent.execute({
        intent: 'list_events' as CalendarIntent,
        parameters: { period: 'custom' }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - delete_event intent', () => {
    it('should delete an event successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      });

      const result = await agent.execute({
        intent: 'delete_event' as CalendarIntent,
        parameters: { eventId: 'event-123' }
      });

      expect(result.success).toBe(true);
      expect(result.output.deleted).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events/event-123',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should handle 404 when event is already deleted', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await agent.execute({
        intent: 'delete_event' as CalendarIntent,
        parameters: { eventId: 'event-123' }
      });

      expect(result.success).toBe(true);
      expect(result.output.status).toBe('not_found');
    });

    it('should fail when eventId is missing', async () => {
      const result = await agent.execute({
        intent: 'delete_event' as CalendarIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Event ID is required');
    });
  });

  describe('execute - update_event intent', () => {
    const mockExistingEvent = {
      id: 'event-123',
      summary: 'Original Title',
      start: { dateTime: '2025-03-01T10:00:00Z', timeZone: 'Europe/Paris' },
      end: { dateTime: '2025-03-01T11:00:00Z', timeZone: 'Europe/Paris' }
    };

    it('should update an event successfully', async () => {
      // Mock GET request for current event
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExistingEvent)
      });

      // Mock PUT request for update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockExistingEvent,
          summary: 'Updated Title',
          htmlLink: 'https://calendar.google.com/event/123'
        })
      });

      const result = await agent.execute({
        intent: 'update_event' as CalendarIntent,
        parameters: {
          eventId: 'event-123',
          eventData: { summary: 'Updated Title' }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.updated).toBe(true);
      expect(result.output.summary).toBe('Updated Title');
    });

    it('should fail when eventId is missing', async () => {
      const result = await agent.execute({
        intent: 'update_event' as CalendarIntent,
        parameters: {
          eventData: { summary: 'New Title' }
        }
      });

      expect(result.success).toBe(false);
    });

    it('should handle event not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({})
      });

      const result = await agent.execute({
        intent: 'update_event' as CalendarIntent,
        parameters: {
          eventId: 'non-existent',
          eventData: { summary: 'New Title' }
        }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - find_available_time intent', () => {
    it('should find available time slots', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          start: { dateTime: '2025-03-01T10:00:00Z' },
          end: { dateTime: '2025-03-01T11:00:00Z' }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: mockEvents })
      });

      const result = await agent.execute({
        intent: 'find_available_time' as CalendarIntent,
        parameters: {
          duration: 30
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.durationRequested).toBe(30);
      expect(result.output.availableSlots).toBeDefined();
    });

    it('should find available slots for a specific date', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] })
      });

      const result = await agent.execute({
        intent: 'find_available_time' as CalendarIntent,
        parameters: {
          duration: 60,
          date: '2025-03-15T00:00:00.000Z'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.numberOfSlots).toBeGreaterThan(0);
    });

    it('should fail when duration is invalid', async () => {
      const result = await agent.execute({
        intent: 'find_available_time' as CalendarIntent,
        parameters: {
          duration: -30
        }
      });

      expect(result.success).toBe(false);
    });

    it('should fail when duration is missing', async () => {
      const result = await agent.execute({
        intent: 'find_available_time' as CalendarIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - unsupported intent', () => {
    it('should return error for unsupported intent', async () => {
      const result = await agent.execute({
        intent: 'unsupported_intent' as any,
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateInput', () => {
    it('should validate create_event parameters', async () => {
      const valid = await agent.validateInput({
        intent: 'create_event' as CalendarIntent,
        parameters: {
          summary: 'Test Event',
          start: { dateTime: '2025-03-01T10:00:00.000Z' },
          end: { dateTime: '2025-03-01T11:00:00.000Z' }
        }
      });

      expect(valid.valid).toBe(true);

      const invalid = await agent.validateInput({
        intent: 'create_event' as CalendarIntent,
        parameters: {}
      });

      expect(invalid.valid).toBe(false);
    });

    it('should validate list_events period parameter', async () => {
      const invalid = await agent.validateInput({
        intent: 'list_events' as CalendarIntent,
        parameters: { period: 'invalid' }
      });

      expect(invalid.valid).toBe(false);
    });

    it('should validate delete_event requires eventId', async () => {
      const invalid = await agent.validateInput({
        intent: 'delete_event' as CalendarIntent,
        parameters: {}
      });

      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain('Event ID is required');
    });

    it('should validate find_available_time requires duration', async () => {
      const invalid = await agent.validateInput({
        intent: 'find_available_time' as CalendarIntent,
        parameters: {}
      });

      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain('Valid duration in minutes is required');
    });
  });

  describe('getRequiredParameters', () => {
    it('should return correct parameters for create_event', async () => {
      const params = await agent.getRequiredParameters('create_event');

      expect(params.some(p => p.name === 'summary')).toBe(true);
      expect(params.some(p => p.name === 'start')).toBe(true);
      expect(params.some(p => p.name === 'end')).toBe(true);
    });

    it('should return correct parameters for list_events', async () => {
      const params = await agent.getRequiredParameters('list_events');

      expect(params.some(p => p.name === 'period')).toBe(true);
    });

    it('should return correct parameters for delete_event', async () => {
      const params = await agent.getRequiredParameters('delete_event');

      expect(params.some(p => p.name === 'eventId')).toBe(true);
    });

    it('should return correct parameters for find_available_time', async () => {
      const params = await agent.getRequiredParameters('find_available_time');

      expect(params.some(p => p.name === 'duration')).toBe(true);
    });

    it('should return empty array for unknown task', async () => {
      const params = await agent.getRequiredParameters('unknown_task');
      expect(params).toHaveLength(0);
    });
  });

  describe('getCapabilities', () => {
    it('should return all capabilities with descriptions', async () => {
      const capabilities = await agent.getCapabilities();

      expect(capabilities).toHaveLength(5);
      expect(capabilities.map(c => c.name)).toContain('Create Calendar Event');
      expect(capabilities.map(c => c.name)).toContain('List Calendar Events');
      expect(capabilities.map(c => c.name)).toContain('Delete Calendar Event');
      expect(capabilities.map(c => c.name)).toContain('Update Calendar Event');
      expect(capabilities.map(c => c.name)).toContain('Find Available Time');

      capabilities.forEach(cap => {
        expect(cap.description).toBeDefined();
        expect(cap.requiredParameters).toBeDefined();
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await agent.execute({
        intent: 'list_events' as CalendarIntent,
        parameters: { period: 'today' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('metadata', () => {
    it('should include execution time in metadata', async () => {
      const result = await agent.execute({
        intent: 'list_events' as CalendarIntent,
        parameters: { period: 'today' }
      });

      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should include source in metadata on success', async () => {
      const result = await agent.execute({
        intent: 'list_events' as CalendarIntent,
        parameters: { period: 'today' }
      });

      expect(result.metadata?.source).toContain('calendar-');
    });
  });
});
