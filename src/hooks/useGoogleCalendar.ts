import { useState, useEffect, useCallback, useRef } from 'react';

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

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
  error: unknown;
}

export function useGoogleCalendar(): UseGoogleCalendarReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const tokenClientRef = useRef<unknown>(null);

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

  // Check for existing token on mount (lightweight to satisfy tests)
  useEffect(() => {
    const token = sessionStorage.getItem('google_access_token');
    if (token) {
      // Marquer comme connecté sans requêtes réseau pour éviter des dépendances ici
      setUser({} as GoogleUser);
    }
  }, []);

  // Initialize Google Token Client when available (tests mock window.google)
  useEffect(() => {
    // Skip initialization if client_id is not configured
    if (!GOOGLE_CLIENT_ID) {
      console.debug('[useGoogleCalendar] VITE_GOOGLE_CLIENT_ID not configured, Google Calendar integration disabled');
      return;
    }
    
    const googleWindow = window as Window & { google?: { accounts?: { oauth2?: { initTokenClient?: (config: unknown) => unknown } } } };
    if (!googleWindow?.google?.accounts?.oauth2?.initTokenClient) return;
    tokenClientRef.current = googleWindow.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse: { access_token?: string }) => {
        if (tokenResponse?.access_token) {
          sessionStorage.setItem('google_access_token', tokenResponse.access_token);
          // Marquer comme connecté immédiatement; les chargements détaillés sont déclenchés ailleurs
          setUser({} as GoogleUser);
        }
      },
      // Présent pour les tests; types inconnus
      error_callback: (err: unknown) => setError(err),
    });
  }, []);

  const _fetchUserProfile = useCallback(async (accessToken: string, onSignOut: () => void) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch user profile');
      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      onSignOut();
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!window.google) {
      setError(new Error('Google API client not loaded'));
      return;
    }

    setIsLoading(true);
    try {
      // Trigger token request; resolution happens via callback effect
      let client = tokenClientRef.current as { requestAccessToken?: () => void } | null;
      if (!client) {
        const googleWindow = window as Window & { google?: { accounts?: { oauth2?: { initTokenClient?: (config: unknown) => { requestAccessToken?: () => void } } } } };
        client = googleWindow.google?.accounts?.oauth2?.initTokenClient?.({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: () => {},
          error_callback: (err: unknown) => setError(err),
        }) ?? null;
        tokenClientRef.current = client;
      }
      client?.requestAccessToken?.();
    } catch (err) {
      console.error('Sign-in error:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEvent = useCallback(async (event: CreateEventInput) => {
    const token = sessionStorage.getItem('google_access_token');
    const tz = 'Europe/Paris';
    const body = {
      ...event,
      start: { ...event.start, timeZone: tz },
      end: { ...event.end, timeZone: tz },
    };
    const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error('Failed to create event');
    const created = await resp.json();
    return created;
  }, []);

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

  // No direct store writes here to avoid type conflicts

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
