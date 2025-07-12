import { useState, useEffect, useCallback } from 'react';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { agentRegistry } from '../agents/registry';

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

interface CreateEventInput {
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  description?: string;
  location?: string;
}

interface UseGoogleCalendarReturn {
  isSignedIn: boolean;
  user: GoogleUser | null;
  events: GoogleCalendarEvent[];
  signIn: () => Promise<void>;
  signOut: () => void;
  createEvent: (event: CreateEventInput) => Promise<GoogleCalendarEvent>;
  isLoading: boolean;
  error: Error | null;
}

export function useGoogleCalendar(): UseGoogleCalendarReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const { setState } = useVisionAudioStore();

  // Load Google API client
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Google API client is loaded
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    const token = sessionStorage.getItem('google_access_token');
    if (token) {
      fetchUserProfile(token);
      fetchEvents();
    }
  }, []);

  const fetchUserProfile = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch user profile');
      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      signOut();
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const calendarAgent = agentRegistry.getAgent('CalendarAgent');
      if (!calendarAgent) throw new Error('CalendarAgent not found');

      const result = await calendarAgent.execute({ command: 'list_events', period: 'week' });

      if (result.success) {
        setEvents(result.output || []);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch events');
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err : new Error('Failed to load calendar events'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!window.google) {
      setError(new Error('Google API client not loaded'));
      return;
    }

    setIsLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              sessionStorage.setItem('google_access_token', tokenResponse.access_token);
              await fetchUserProfile(tokenResponse.access_token);
              await fetchEvents();
              resolve();
            } else {
              reject(new Error('Failed to obtain access token'));
            }
          },
        });
        client.requestAccessToken();
      });
    } catch (err) {
      console.error('Sign-in error:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile, fetchEvents]);

  const createEvent = useCallback(async (event: CreateEventInput) => {
    const calendarAgent = agentRegistry.getAgent('CalendarAgent');
    if (!calendarAgent) throw new Error('CalendarAgent not found');

    const result = await calendarAgent.execute({ command: 'create_event', ...event });

    if (result.success) {
      // Refresh events after creation
      await fetchEvents();
      return result.output;
    } else {
      throw new Error(result.error || 'Failed to create event');
    }
  }, [fetchEvents]);

  const signOut = useCallback(() => {
    const token = sessionStorage.getItem('google_access_token');
    sessionStorage.removeItem('google_access_token');
    setUser(null);
    setEvents([]);
    // Revoke token with Google
    if (token) {
      fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`).catch(console.error);
    }
  }, []);

  // Update voice intents when events change
  useEffect(() => {
    if (events.length > 0) {
      const todayEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime).toDateString();
        return eventDate === new Date().toDateString();
      });

      setState({
        calendarEvents: {
          today: todayEvents,
          upcoming: events,
        },
      });
    }
  }, [events, setState]);

  return {
    isSignedIn: !!user,
    user,
    events,
    signIn,
    signOut,
    createEvent,
    isLoading,
    error,
  };
}
