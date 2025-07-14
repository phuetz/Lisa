import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useGoogleCalendar } from '../useGoogleCalendar';
import { secureTokenStorage } from '../../utils/secureTokenStorage';

// Mock global google object
const mockGoogle = {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn()
    }
  }
};

describe('useGoogleCalendar', () => {
  const mockTokenClient = {
    callback: vi.fn(),
    requestAccessToken: vi.fn()
  };

  beforeEach(() => {
    // @ts-ignore
    global.window.google = mockGoogle;
    mockGoogle.accounts.oauth2.initTokenClient.mockImplementation(() => mockTokenClient);

    vi.spyOn(secureTokenStorage, 'storeToken').mockResolvedValue();
    vi.spyOn(secureTokenStorage, 'getToken').mockResolvedValue(null);
    vi.spyOn(secureTokenStorage, 'removeToken').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    delete global.window.google;
  });

  it('should initialize token client on mount', () => {
    renderHook(() => useGoogleCalendar());
    
    expect(mockGoogle.accounts.oauth2.initTokenClient).toHaveBeenCalledWith({
      client_id: '', // Will be set from env in actual app
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      callback: expect.any(Function),
      error_callback: expect.any(Function)
    });
  });

  it('should handle sign in', async () => {
    const { result } = renderHook(() => useGoogleCalendar());
    
    await act(async () => {
      await result.current.signIn();
    });
    
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalled();
  });

  it('should handle sign out', async () => {
    const { result } = renderHook(() => useGoogleCalendar());

    await act(async () => {
      await result.current.signOut();
    });

    expect(secureTokenStorage.removeToken).toHaveBeenCalled();
  });

  it('should handle token callback', async () => {
    const mockToken = 'test-token';
    
    
    mockGoogle.accounts.oauth2.initTokenClient.mockImplementation((config) => {
      // Call the callback with a mock token
      config.callback({ access_token: mockToken });
      return mockTokenClient;
    });
    
    const { result } = renderHook(() => useGoogleCalendar());
    
    // Wait for the effect to run
    await vi.waitFor(() => {
      expect(result.current.isSignedIn).toBe(true);
    });
    
    expect(secureTokenStorage.storeToken).toHaveBeenCalledWith(mockToken);
  });

  it('should handle token error', async () => {
    const mockError = { error: 'invalid_request' };
    
    
    mockGoogle.accounts.oauth2.initTokenClient.mockImplementation((config) => {
      // Call the error callback
      config.error_callback(mockError);
      return mockTokenClient;
    });
    
    const { result } = renderHook(() => useGoogleCalendar());
    
    // Wait for the effect to run
    await vi.waitFor(() => {
      expect(result.current.error).toEqual(expect.objectContaining(mockError));
    });
  });

  it('should create an event', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'event-123' })
      })
    ) as any;
    
    global.fetch = mockFetch;
    
    const { result } = renderHook(() => useGoogleCalendar());
    
    const eventData = {
      summary: 'Test Event',
      start: { dateTime: '2023-01-01T10:00:00' },
      end: { dateTime: '2023-01-01T11:00:00' }
    };
    
    await act(async () => {
      await result.current.createEvent(eventData);
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
        body: JSON.stringify({
          ...eventData,
          start: { ...eventData.start, timeZone: 'Europe/Paris' },
          end: { ...eventData.end, timeZone: 'Europe/Paris' }
        })
      })
    );
  });
});
