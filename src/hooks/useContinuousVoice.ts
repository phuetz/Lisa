/**
 * useContinuousVoice - Continuous voice conversation mode
 * Enables hands-free conversation with automatic listening
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMobile } from './useMobile';

interface ContinuousVoiceOptions {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  silenceTimeout?: number; // ms before considering speech ended
  autoRestart?: boolean;
  language?: string;
}

interface ContinuousVoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
}

// Check if speech recognition is supported
const isSpeechRecognitionSupported = (): boolean => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

export const useContinuousVoice = (options: ContinuousVoiceOptions) => {
  const {
    onTranscript,
    onError,
    silenceTimeout = 1500,
    autoRestart = true,
    language = 'fr-FR',
  } = options;

  const { hapticTap, hapticSuccess } = useMobile();
  
  const [state, setState] = useState<ContinuousVoiceState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    transcript: '',
    error: null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setState(s => ({ ...s, error: 'Reconnaissance vocale non supportée' }));
      return null;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setState(s => ({ ...s, isListening: true, error: null }));
      hapticTap();
    };

    recognition.onresult = (event) => {
      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update transcript display
      setState(s => ({
        ...s,
        transcript: finalTranscript || interimTranscript,
      }));

      // Set silence timer for final transcript
      if (finalTranscript) {
        silenceTimerRef.current = setTimeout(() => {
          if (finalTranscript.trim()) {
            hapticSuccess();
            onTranscript(finalTranscript.trim());
            setState(s => ({ ...s, transcript: '', isProcessing: true }));
          }
        }, silenceTimeout);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      const errorMessage = event.error === 'no-speech' 
        ? 'Aucune parole détectée'
        : event.error === 'audio-capture'
        ? 'Micro non disponible'
        : `Erreur: ${event.error}`;

      setState(s => ({ ...s, error: errorMessage }));
      onError?.(errorMessage);

      // Auto-restart on recoverable errors
      if (autoRestart && isActiveRef.current && event.error !== 'not-allowed') {
        setTimeout(() => {
          if (isActiveRef.current) {
            recognition.start();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      setState(s => ({ ...s, isListening: false }));
      
      // Auto-restart if still active
      if (autoRestart && isActiveRef.current) {
        setTimeout(() => {
          if (isActiveRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // Already started
            }
          }
        }, 100);
      }
    };

    return recognition;
  }, [language, silenceTimeout, autoRestart, onTranscript, onError, hapticTap, hapticSuccess]);

  // Start continuous listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (recognitionRef.current) {
      isActiveRef.current = true;
      try {
        recognitionRef.current.start();
      } catch {
        // Already started, restart
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 100);
      }
    }
  }, [initRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    isActiveRef.current = false;
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setState(s => ({ ...s, isListening: false, transcript: '' }));
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Text-to-speech for responses
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('TTS non supporté'));
        return;
      }

      // Stop listening while speaking
      const wasListening = isActiveRef.current;
      if (wasListening) {
        recognitionRef.current?.stop();
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setState(s => ({ ...s, isSpeaking: true, isProcessing: false }));
      };

      utterance.onend = () => {
        setState(s => ({ ...s, isSpeaking: false }));
        
        // Resume listening after speaking
        if (wasListening && autoRestart) {
          setTimeout(() => {
            if (isActiveRef.current) {
              recognitionRef.current?.start();
            }
          }, 500);
        }
        
        resolve();
      };

      utterance.onerror = (event) => {
        setState(s => ({ ...s, isSpeaking: false }));
        reject(new Error(event.error));
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, [language, autoRestart]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setState(s => ({ ...s, isSpeaking: false }));
  }, []);

  // Mark processing complete
  const setProcessingComplete = useCallback(() => {
    setState(s => ({ ...s, isProcessing: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    ...state,
    isSupported: isSpeechRecognitionSupported(),
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    setProcessingComplete,
  };
};

export default useContinuousVoice;
