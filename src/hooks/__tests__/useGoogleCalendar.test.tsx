import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useGoogleCalendar } from '../useGoogleCalendar';

describe('useGoogleCalendar', () => {
  beforeEach(() => {
    // Mock sessionStorage
    const mockStorage: Record<string, string> = {};
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockStorage[key] = value;
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key] || null);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete mockStorage[key];
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should return hook interface', () => {
    const { result } = renderHook(() => useGoogleCalendar());
    
    expect(result.current).toHaveProperty('isSignedIn');
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('events');
    expect(result.current).toHaveProperty('signIn');
    expect(result.current).toHaveProperty('signOut');
    expect(result.current).toHaveProperty('createEvent');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
  });

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useGoogleCalendar());
    
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.events).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should have signIn as a function', () => {
    const { result } = renderHook(() => useGoogleCalendar());
    
    expect(typeof result.current.signIn).toBe('function');
  });

  it('should have signOut as a function', () => {
    const { result } = renderHook(() => useGoogleCalendar());
    
    expect(typeof result.current.signOut).toBe('function');
  });

  it('should have createEvent as a function', () => {
    const { result } = renderHook(() => useGoogleCalendar());
    
    expect(typeof result.current.createEvent).toBe('function');
  });

  it('should handle sign out and clear storage', async () => {
    const { result } = renderHook(() => useGoogleCalendar());
    
    await act(async () => {
      result.current.signOut();
    });
    
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('google_access_token');
    expect(result.current.isSignedIn).toBe(false);
  });

  it('should detect existing token on mount', () => {
    // Set a token before rendering
    sessionStorage.setItem('google_access_token', 'existing-token');
    
    const { result } = renderHook(() => useGoogleCalendar());
    
    // User should be set if token exists (implementation detail)
    expect(result.current.user).not.toBeNull();
  });
});
