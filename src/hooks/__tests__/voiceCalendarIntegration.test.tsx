import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useVoiceIntent } from '../useVoiceIntent';
import { useGoogleCalendar } from '../useGoogleCalendar';

// Mock the hooks
vi.mock('../useGoogleCalendar');

// Mock SpeechRecognition
class MockSpeechRecognition {
  start = vi.fn();
  stop = vi.fn();
  onresult = vi.fn();
  lang = '';
  continuous = false;
  interimResults = false;
}

const mockSpeechRecognition = new MockSpeechRecognition();
// @ts-ignore
window.SpeechRecognition = vi.fn().mockImplementation(() => mockSpeechRecognition);
// @ts-ignore
window.webkitSpeechRecognition = vi.fn().mockImplementation(() => mockSpeechRecognition);

describe('Voice and Calendar Integration', () => {
  const mockCreateEvent = vi.fn();
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock useGoogleCalendar
    (useGoogleCalendar as jest.Mock).mockReturnValue({
      isSignedIn: true,
      createEvent: mockCreateEvent,
      signIn: vi.fn(),
      signOut: vi.fn(),
      events: [],
      isLoading: false,
      error: null
    });
  });

  it('should create a calendar event via voice command', async () => {
    // Render the hook
    const { result } = renderHook(() => useVoiceIntent());
    
    // Simulate speech recognition result
    const mockEvent = {
      results: [
        [
          {
            transcript: 'Ajoute un événement à 14h30 Réunion avec l\'équipe',
            confidence: 1
          }
        ]
      ]
    };
    
    // Trigger the speech recognition result
    act(() => {
      mockSpeechRecognition.onresult(mockEvent);
    });
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify the event was created with the correct parameters
    expect(mockCreateEvent).toHaveBeenCalledWith({
      summary: 'Réunion avec l\'équipe',
      start: { dateTime: '2023-01-01T14:30:00' },
      end: { dateTime: '2023-01-01T23:59:00' }
    });
  });

  it('should handle errors when creating events', async () => {
    // Mock a failing createEvent
    mockCreateEvent.mockRejectedValueOnce(new Error('API Error'));
    
    // Spy on console.error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Render the hook
    const { result } = renderHook(() => useVoiceIntent());
    
    // Simulate speech recognition result
    const mockEvent = {
      results: [
        [
          {
            transcript: 'Ajoute un événement à 15h00 Test erreur',
            confidence: 1
          }
        ]
      ]
    };
    
    // Trigger the speech recognition result
    act(() => {
      mockSpeechRecognition.onresult(mockEvent);
    });
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error handling intent:', expect.any(Error));
    
    // Cleanup
    consoleErrorSpy.mockRestore();
  });

  it('should list calendar events via voice command', async () => {
    // Mock the store
    const mockSetState = vi.fn();
    vi.mock('../../store/visionAudioStore', () => ({
      useVisionAudioStore: (selector: any) => selector({
        setState: mockSetState,
        todos: []
      })
    }));
    
    // Re-import to apply the mock
    const { useVoiceIntent: useVoiceIntentWithMock } = await import('../useVoiceIntent');
    
    // Render the hook
    const { result } = renderHook(() => useVoiceIntentWithMock());
    
    // Simulate speech recognition result
    const mockEvent = {
      results: [
        [
          {
            transcript: 'Affiche mon agenda de la semaine',
            confidence: 1
          }
        ]
      ]
    };
    
    // Trigger the speech recognition result
    act(() => {
      mockSpeechRecognition.onresult(mockEvent);
    });
    
    // Verify the state was updated to show calendar events
    expect(mockSetState).toHaveBeenCalledWith({
      intent: 'list_events',
      intentPayload: { period: 'week' }
    });
  });
});
