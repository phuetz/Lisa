import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  autoRestart?: boolean;
  onResult?: (transcript: string, event: SpeechRecognitionEvent) => void;
  onError?: (error: SpeechRecognitionErrorEvent) => void;
}

interface UseSpeechRecognitionState {
  listening: boolean;
  supported: boolean;
  error: string | null;
}

interface SpeechRecognitionHook {
  start: () => void;
  stop: () => void;
  listening: boolean;
  supported: boolean;
  error: string | null;
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}): SpeechRecognitionHook {
  const {
    language = 'fr-FR',
    continuous = true,
    interimResults = false,
    autoRestart = true,
    onResult,
    onError,
  } = options;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isActiveRef = useRef(false);
  const [state, setState] = useState<UseSpeechRecognitionState>({
    listening: false,
    supported: true,
    error: null,
  });

  const initializeRecognition = useCallback(() => {
    if (typeof window === 'undefined') {
      setState((prev) => ({ ...prev, supported: false }));
      return null;
    }

    // @ts-expect-error: SpeechRecognition may not exist in lib dom typings
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setState((prev) => ({ ...prev, supported: false }));
      return null;
    }

    const recognition: SpeechRecognition = new SpeechRec();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onresult = (event) => {
      const { results } = event;
      const transcript = results[results.length - 1][0].transcript.trim();
      if (transcript && onResult) {
        onResult(transcript, event);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setState((prev) => ({ ...prev, listening: false, error: event.error }));
      isActiveRef.current = false;
      onError?.(event);
    };

    recognition.onend = () => {
      setState((prev) => ({ ...prev, listening: false }));
      if (autoRestart && isActiveRef.current) {
        recognition.start();
        setState((prev) => ({ ...prev, listening: true }));
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [autoRestart, continuous, interimResults, language, onError, onResult]);

  useEffect(() => {
    const recognition = initializeRecognition();
    return () => {
      if (recognition) {
        recognition.stop();
      }
      recognitionRef.current = null;
      isActiveRef.current = false;
    };
  }, [initializeRecognition]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setState((prev) => ({ ...prev, supported: false }));
      return;
    }

    try {
      recognition.start();
      isActiveRef.current = true;
      setState((prev) => ({ ...prev, listening: true, error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState((prev) => ({ ...prev, error: message }));
    }
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.stop();
    isActiveRef.current = false;
    setState((prev) => ({ ...prev, listening: false }));
  }, []);

  return {
    start,
    stop,
    listening: state.listening,
    supported: state.supported,
    error: state.error,
  };
}
