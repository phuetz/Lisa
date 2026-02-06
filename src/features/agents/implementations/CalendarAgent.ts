/**
 * CalendarAgent - Manages calendar events and scheduling
 * 
 * This agent handles calendar operations including creating, listing, and managing events
 * via the Google Calendar API.
 */

import { AgentDomains } from '../core/types';
import { z } from 'zod';
import type {
  AgentCapability,
  AgentExecuteProps,
  AgentExecuteResult, 
  AgentParameter,
  BaseAgent
} from '../core/types';
import { agentRegistry } from '../core/registry';

/**
 * Supported calendar intents
 */
export const CreateEventParamsSchema = z.object({
  summary: z.string().min(1, 'Event summary/title is required'),
  start: z.object({
    dateTime: z.string().datetime(),
    timeZone: z.string().optional(),
  }).refine(data => new Date(data.dateTime).toString() !== 'Invalid Date', { message: 'Invalid start date/time' }),
  end: z.object({
    dateTime: z.string().datetime(),
    timeZone: z.string().optional(),
  }).refine(data => new Date(data.dateTime).toString() !== 'Invalid Date', { message: 'Invalid end date/time' }),
  description: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).optional(),
}).refine(data => new Date(data.end.dateTime) > new Date(data.start.dateTime), { message: 'Event end time must be after start time' });

export const ListEventsParamsSchema = z.object({
  period: z.enum(['today', 'tomorrow', 'week', 'month', 'custom']).default('today'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(data => {
  if (data.period === 'custom' && (!data.startDate || !data.endDate)) {
    return false; // Custom period requires both start and end dates
  }
  return true;
}, { message: 'Custom period requires both startDate and endDate' });

export const DeleteEventParamsSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
});

export const UpdateEventParamsSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  eventData: z.object({
    summary: z.string().min(1).optional(),
    start: z.object({
      dateTime: z.string().datetime(),
      timeZone: z.string().optional(),
    }).optional(),
    end: z.object({
      dateTime: z.string().datetime(),
      timeZone: z.string().optional(),
    }).optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).optional(),
  })
});

export const FindAvailableTimeParamsSchema = z.object({
  duration: z.number().int().positive('Duration must be a positive number of minutes'),
  date: z.string().datetime().optional(),
});

export type CalendarIntent = 
  | 'create_event'
  | 'list_events'
  | 'delete_event'
  | 'update_event'
  | 'find_available_time';
  
/**
 * Time period types
 */
export type TimePeriod = 'today' | 'tomorrow' | 'week' | 'month' | 'custom';

/**
 * Calendar event interface
 */
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string; name?: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

/**
 * Helper function to get auth token from session storage
 * This is a temporary solution. In the future, the agent should handle its own auth.
 */
function getAuthToken(): string | null {
  return sessionStorage.getItem('google_access_token');
}

export class CalendarAgent implements BaseAgent {
  name = 'CalendarAgent';
  description = 'Gère les événements du calendrier Google, y compris la création, la mise à jour et la consultation';
  version = '1.1.0';
  domain = AgentDomains.PRODUCTIVITY;
  capabilities = [
    'create_calendar_event',
    'list_calendar_events',
    'delete_calendar_event',
    'update_calendar_event',
    'find_available_time'
  ];
  requiresAuthentication = true;

  // Define inputs and outputs for the workflow editor
  inputs = [
    { id: 'trigger', type: 'any', label: 'Déclencheur' },
  ];

  outputs = [
    { id: 'result', type: 'object', label: 'Résultat' },
    { id: 'error', type: 'object', label: 'Erreur' },
  ];

  // Define a combined config schema for all intents
  configSchema = z.discriminatedUnion('intent', [
    CreateEventParamsSchema.extend({ intent: z.literal('create_event') }),
    ListEventsParamsSchema.extend({ intent: z.literal('list_events') }),
    DeleteEventParamsSchema.extend({ intent: z.literal('delete_event') }),
    UpdateEventParamsSchema.extend({ intent: z.literal('update_event') }),
    FindAvailableTimeParamsSchema.extend({ intent: z.literal('find_available_time') }),
  ]);

  /**
   * Main execution method for the agent
   */
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const intent = props.intent as CalendarIntent || props.command as CalendarIntent;
    const parameters = props.parameters || {};

    try {
      // Validate input using Zod schemas
      let validationResult;
      switch (intent) {
        case 'create_event':
          validationResult = CreateEventParamsSchema.safeParse(parameters);
          break;
        case 'list_events':
          validationResult = ListEventsParamsSchema.safeParse(parameters);
          break;
        case 'delete_event':
          validationResult = DeleteEventParamsSchema.safeParse(parameters);
          break;
        case 'update_event':
          validationResult = UpdateEventParamsSchema.safeParse(parameters);
          break;
        case 'find_available_time':
          validationResult = FindAvailableTimeParamsSchema.safeParse(parameters);
          break;
        default:
          validationResult = { success: false, error: 'Unsupported intent' };
      }

      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors.map(err => err.message).join(', '),
          output: null,
          metadata: {
            executionTime: Date.now() - startTime
          }
        };
      }

      // Check authentication
      const token = getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'Not authenticated with Google Calendar',
          output: {
            authRequired: true,
            authProvider: 'google',
            authScope: 'https://www.googleapis.com/auth/calendar'
          },
          metadata: {
            executionTime: Date.now() - startTime
          }
        };
      }

      // Process intent
      let result;
      switch (intent) {
        case 'create_event':
          result = await this.createEvent(parameters as any);
          break;
        case 'list_events':
          result = await this.listEvents(parameters as any);
          break;
        case 'delete_event':
          result = await this.deleteEvent(parameters.eventId);
          break;
        case 'update_event':
          result = await this.updateEvent(parameters.eventId, parameters.eventData);
          break;
        case 'find_available_time':
          result = await this.findAvailableTime(parameters.duration, parameters.date);
          break;
        default:
          return {
            success: false,
            output: `Intent non supporté: ${intent}`,
            error: new Error('UNSUPPORTED_INTENT'),
            metadata: {
              executionTime: Date.now() - startTime
            }
          };
      }

      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          source: `calendar-${intent}`
        }
      };
    } catch (error: any) {
      console.error(`CalendarAgent error executing ${props.intent || props.command}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        output: null,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Determines if this agent can handle a specific query
   */
  async canHandle(query: string, _context?: any): Promise<number> {
    const lowerQuery = query.toLowerCase();
    
    const calendarKeywords = [
      'calendar', 'calendrier', 'agenda', 'schedule', 'planifier',
      'event', 'événement', 'meeting', 'réunion', 'appointment', 'rendez-vous',
      'reminder', 'rappel', 'schedule', 'planifier',
      'booking', 'réservation',
      'available', 'availability', 'disponible', 'disponibilité'
    ];
    
    const calendarRegexes = [
      /add (an? )?event|create (an? )?event|schedule (an? )?meeting/i,
      /ajouter (un )?événement|créer (un )?événement|planifier (une )?réunion/i,
      /what('s| is) on my calendar|what do i have scheduled/i,
      /qu('| )est-ce qu('| )il y a dans mon (calendrier|agenda)/i,
      /find (an? )?(available|free) (time|slot)/i,
      /trouver (un )?créneau (disponible|libre)/i
    ];
    
    // Check for keyword matches
    for (const keyword of calendarKeywords) {
      if (lowerQuery.includes(keyword)) {
        return 0.6; // 60% confidence
      }
    }
    
    // Check for regex patterns
    for (const regex of calendarRegexes) {
      if (regex.test(lowerQuery)) {
        return 0.85; // 85% confidence
      }
    }
    
    return 0; // Cannot handle
  }
  
  /**
   * Returns required parameters for a specific task
   */
  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    let schema: z.ZodObject<any> | undefined;
    switch (task) {
      case 'create_event':
        schema = CreateEventParamsSchema;
        break;
      case 'list_events':
        schema = ListEventsParamsSchema;
        break;
      case 'delete_event':
        schema = DeleteEventParamsSchema;
        break;
      case 'update_event':
        schema = UpdateEventParamsSchema;
        break;
      case 'find_available_time':
        schema = FindAvailableTimeParamsSchema;
        break;
      default:
        return [];
    }

    if (!schema) return [];

    const params: AgentParameter[] = [];
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key] as z.ZodAny;
      const isOptional = fieldSchema.isOptional();
      const isNullable = fieldSchema.isNullable();
      const isRequired = !isOptional && !isNullable;

      let type: string;
      let defaultValue: any;
      let enumValues: string[] | undefined;

      let baseSchema = fieldSchema;
      while (baseSchema instanceof z.ZodOptional || baseSchema instanceof z.ZodNullable) {
        baseSchema = baseSchema.unwrap();
      }

      switch (baseSchema._def.typeName) {
        case z.ZodString.name:
          type = 'string';
          if (baseSchema instanceof z.ZodEnum) {
            enumValues = baseSchema._def.values;
          }
          break;
        case z.ZodNumber.name:
          type = 'number';
          break;
        case z.ZodBoolean.name:
          type = 'boolean';
          break;
        case z.ZodObject.name:
          type = 'object';
          break;
        case z.ZodArray.name:
          type = 'array';
          break;
        default:
          type = 'any';
      }

      // Extract default value if available
      if (fieldSchema._def.defaultValue !== undefined) {
        defaultValue = fieldSchema._def.defaultValue();
      } else if (fieldSchema._def.typeName === z.ZodEnum.name && fieldSchema._def.default !== undefined) {
        defaultValue = fieldSchema._def.default;
      }

      params.push({
        name: key,
        type: type,
        required: isRequired,
        description: fieldSchema.description || '',
        defaultValue: defaultValue,
        enum: enumValues,
      });
    }
    return params;
  }
  
  /**
   * Returns detailed capability information
   */
  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: 'Create Calendar Event',
        description: 'Creates a new event in Google Calendar',
        requiredParameters: await this.getRequiredParameters('create_event')
      },
      {
        name: 'List Calendar Events',
        description: 'Lists events from Google Calendar for a specified period',
        requiredParameters: await this.getRequiredParameters('list_events')
      },
      {
        name: 'Delete Calendar Event',
        description: 'Deletes an event from Google Calendar',
        requiredParameters: await this.getRequiredParameters('delete_event')
      },
      {
        name: 'Update Calendar Event',
        description: 'Updates an existing event in Google Calendar',
        requiredParameters: await this.getRequiredParameters('update_event')
      },
      {
        name: 'Find Available Time',
        description: 'Finds available time slots in calendar',
        requiredParameters: await this.getRequiredParameters('find_available_time')
      }
    ];
  }

  /**
   * Validates input parameters
   */
  async validateInput(props: AgentExecuteProps): Promise<{ valid: boolean; errors?: string[] }> {
    const intent = props.intent as CalendarIntent || props.command as CalendarIntent;
    const parameters = props.parameters || {};
    const errors: string[] = [];
    
    switch (intent) {
      case 'create_event':
        if (!parameters.summary) {
          errors.push('Event summary/title is required');
        }
        if (!parameters.start?.dateTime) {
          errors.push('Event start date/time is required');
        }
        if (!parameters.end?.dateTime) {
          errors.push('Event end date/time is required');
        }
        // Validate that end time is after start time
        if (parameters.start?.dateTime && parameters.end?.dateTime) {
          const startTime = new Date(parameters.start.dateTime);
          const endTime = new Date(parameters.end.dateTime);
          if (endTime <= startTime) {
            errors.push('Event end time must be after start time');
          }
        }
        break;
      case 'list_events':
        if (parameters.period && !['today', 'week', 'month', 'custom'].includes(parameters.period)) {
          errors.push('Invalid period. Must be one of: today, week, month, custom');
        }
        break;
      case 'delete_event':
      case 'update_event':
        if (!parameters.eventId) {
          errors.push('Event ID is required');
        }
        break;
      case 'find_available_time':
        if (!parameters.duration || isNaN(Number(parameters.duration)) || Number(parameters.duration) <= 0) {
          errors.push('Valid duration in minutes is required');
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Creates a new event in Google Calendar
   */
  private async createEvent(props: CalendarEvent): Promise<any> {
    const token = getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated', output: null };

    try {
      // Ensure timezone is set
      const eventData = {
        ...props,
        start: { ...props.start, timeZone: props.start.timeZone || 'Europe/Paris' },
        end: { ...props.end, timeZone: props.end.timeZone || 'Europe/Paris' },
      };
      
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create event');
      }

      const newEvent = await response.json();
      return {
        id: newEvent.id,
        summary: newEvent.summary,
        start: newEvent.start,
        end: newEvent.end,
        htmlLink: newEvent.htmlLink,
        status: 'confirmed',
        created: true
      };
    } catch (error: any) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }
  
  /**
   * Deletes an event from Google Calendar
   */
  private async deleteEvent(eventId: string): Promise<any> {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated with Google Calendar');
    
    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        // For DELETE, if it returns 404, the event might be already deleted
        if (response.status === 404) {
          return { deleted: true, status: 'not_found', message: 'Event not found or already deleted' };
        }
        
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' }}));
        throw new Error(error.error?.message || `Failed to delete event: ${response.statusText}`);
      }
      
      return { deleted: true, status: 'success', eventId };
    } catch (error: any) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }
  
  /**
   * Updates an existing event in Google Calendar
   */
  private async updateEvent(eventId: string, eventData: Partial<CalendarEvent>): Promise<any> {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated with Google Calendar');
    
    try {
      // First, get the current event to merge with updates
      const getResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (!getResponse.ok) {
        if (getResponse.status === 404) {
          throw new Error('Event not found');
        }
        const error = await getResponse.json();
        throw new Error(error.error?.message || 'Failed to fetch event for updating');
      }
      
      const currentEvent = await getResponse.json();
      
      // Merge current event with updates
      const updatedEvent = {
        ...currentEvent,
        ...eventData,
        // Handle nested objects carefully
        start: eventData.start ? {
          ...currentEvent.start,
          ...eventData.start,
          timeZone: (eventData.start?.timeZone || currentEvent.start?.timeZone || 'Europe/Paris')
        } : currentEvent.start,
        end: eventData.end ? {
          ...currentEvent.end,
          ...eventData.end,
          timeZone: (eventData.end?.timeZone || currentEvent.end?.timeZone || 'Europe/Paris')
        } : currentEvent.end
      };
      
      // Send update to Google Calendar
      const updateResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEvent),
      });
      
      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error?.message || 'Failed to update event');
      }
      
      const result = await updateResponse.json();
      return {
        id: result.id,
        summary: result.summary,
        start: result.start,
        end: result.end,
        updated: true,
        htmlLink: result.htmlLink
      };
    } catch (error: any) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }
  
  /**
   * Finds available time slots in the calendar
   */
  private async findAvailableTime(durationMinutes: number, date?: string): Promise<any> {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated with Google Calendar');
    
    try {
      // Parse search date
      const searchDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(searchDate);
      startOfDay.setHours(9, 0, 0, 0); // Default start at 9:00 AM
      
      const endOfDay = new Date(searchDate);
      endOfDay.setHours(18, 0, 0, 0); // Default end at 6:00 PM
      
      // Get events for the search date
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
          `?timeMin=${startOfDay.toISOString()}` +
          `&timeMax=${endOfDay.toISOString()}` +
          '&singleEvents=true' +
          '&orderBy=startTime',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch events for availability check');
      }
      
      const data = await response.json();
      const events = data.items || [];
      
      // Find available slots
      const availableSlots = [];
      let currentTime = new Date(startOfDay);
      
      // Convert duration from minutes to milliseconds
      const durationMs = durationMinutes * 60 * 1000;
      
      // Loop through events to find gaps
      for (let i = 0; i <= events.length; i++) {
        const nextEventStart = i < events.length 
          ? new Date(events[i].start.dateTime || events[i].start.date) 
          : new Date(endOfDay);
        
        const gap = nextEventStart.getTime() - currentTime.getTime();
        
        // Check if gap is large enough for the requested duration
        if (gap >= durationMs) {
          availableSlots.push({
            start: new Date(currentTime).toISOString(),
            end: new Date(currentTime.getTime() + durationMs).toISOString(),
            durationMinutes
          });
        }
        
        // Move current time to the end of this event
        if (i < events.length) {
          currentTime = new Date(events[i].end.dateTime || events[i].end.date);
        }
      }
      
      return {
        date: searchDate.toISOString().split('T')[0],
        durationRequested: durationMinutes,
        availableSlots,
        numberOfSlots: availableSlots.length
      };
    } catch (error: any) {
      console.error('Error finding available time:', error);
      throw error;
    }
  }

  /**
   * Lists events from Google Calendar for a specified period
   */
  private async listEvents(props: { period: TimePeriod, startDate?: string, endDate?: string }): Promise<any> {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated with Google Calendar');

    try {
      const now = new Date();
      let timeMin = new Date(now);
      let timeMax = new Date(now);
      
      // Set appropriate time range based on period
      switch(props.period) {
        case 'today':
          // Start from now, end at end of today
          timeMax.setHours(23, 59, 59, 999);
          break;
        case 'tomorrow':
          // Start from start of tomorrow, end at end of tomorrow
          timeMin.setDate(now.getDate() + 1);
          timeMin.setHours(0, 0, 0, 0);
          timeMax.setDate(now.getDate() + 1);
          timeMax.setHours(23, 59, 59, 999);
          break;
        case 'week':
          // Start from now, end at 7 days from now
          timeMax.setDate(now.getDate() + 7);
          break;
        case 'month':
          // Start from now, end at 30 days from now
          timeMax.setDate(now.getDate() + 30);
          break;
        case 'custom':
          // Use custom date range if provided
          if (props.startDate) {
            timeMin = new Date(props.startDate);
          }
          if (props.endDate) {
            timeMax = new Date(props.endDate);
          }
          break;
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
          `?timeMin=${timeMin.toISOString()}` +
          `&timeMax=${timeMax.toISOString()}` +
          '&singleEvents=true' +
          '&orderBy=startTime',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Failed to parse error response' }}));
        throw new Error(error.error?.message || `Failed to fetch events: ${response.statusText}`);
      }

      const data = await response.json();
      const events = data.items || [];
      
      // Format events for cleaner output
      const formattedEvents = events.map((event: any) => ({
        id: event.id,
        summary: event.summary || 'Unnamed event',
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
        htmlLink: event.htmlLink,
        creator: event.creator,
        attendees: event.attendees,
        status: event.status
      }));
      
      return {
        period: props.period,
        timeRange: {
          start: timeMin.toISOString(),
          end: timeMax.toISOString()
        },
        events: formattedEvents,
        count: formattedEvents.length
      };
    } catch (error: any) {
      console.error('Error listing calendar events:', error);
      throw error;
    }
  }
}

// Register a valid instance of the agent with the registry.
const calendarAgent = new CalendarAgent();
// Add valid property required by BaseAgent interface
Object.defineProperty(calendarAgent, 'valid', {
  value: true,
  writable: false,
  enumerable: true
});
agentRegistry.register(calendarAgent);
