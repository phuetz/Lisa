/**
 * useVoiceChat - Hook pour la conversation vocale bidirectionnelle
 * Gère la reconnaissance vocale (STT) et la synthèse vocale (TTS)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Types pour Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface UseVoiceChatOptions {
  language?: string;
  autoSpeak?: boolean;
  voiceName?: string;
  speechRate?: number;
  speechPitch?: number;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

export interface UseVoiceChatReturn {
  // STT (Speech-to-Text)
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  
  // TTS (Text-to-Speech)
  isSpeaking: boolean;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  
  // Voice settings
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  speechPitch: number;
  setSpeechPitch: (pitch: number) => void;
  
  // Status
  isSupported: boolean;
  error: string | null;
}

export function useVoiceChat(options: UseVoiceChatOptions = {}): UseVoiceChatReturn {
  const {
    language = 'fr-FR',
    autoSpeak: _autoSpeak = false,
    onTranscript,
    onSpeakStart,
    onSpeakEnd,
  } = options;

  // STT State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speechRate, setSpeechRate] = useState(options.speechRate || 1.0);
  const [speechPitch, setSpeechPitch] = useState(options.speechPitch || 1.0);
  
  // Common State
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const shouldRestartRef = useRef(false);

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      setError('La reconnaissance vocale n\'est pas supportée par ce navigateur.');
      return;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const availableVoices = synthRef.current?.getVoices() || [];
        setVoices(availableVoices);
        
        // Select French voice by default
        if (!selectedVoice && availableVoices.length > 0) {
          const frVoice = availableVoices.find(v => v.lang.startsWith('fr'));
          setSelectedVoice(frVoice || availableVoices[0]);
        }
      };

      loadVoices();
      synthRef.current.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);

  // Start listening
  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    // Stop any ongoing speech
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      shouldRestartRef.current = true;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        
        if (result.isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }
      
      if (final) {
        setTranscript(prev => prev + (prev ? ' ' : '') + final.trim());
        setInterimTranscript('');
        onTranscript?.(final.trim(), true);
      }
      
      if (interim) {
        setInterimTranscript(interim);
        onTranscript?.(interim, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        // Don't show error for no speech
        return;
      }
      
      switch (event.error) {
        case 'audio-capture':
          setError('Aucun microphone détecté.');
          break;
        case 'not-allowed':
          setError('Accès au microphone refusé.');
          break;
        case 'network':
          setError('Erreur réseau.');
          break;
        default:
          setError(`Erreur: ${event.error}`);
      }
      setIsListening(false);
      shouldRestartRef.current = false;
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          shouldRestartRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch {
      setError('Impossible de démarrer la reconnaissance vocale.');
    }
  }, [language, onTranscript]);

  // Stop listening
  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      setTranscript('');
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Speak text
  const speak = useCallback((text: string) => {
    if (!synthRef.current || !text.trim()) return;

    // Stop listening while speaking
    if (isListening) {
      stopListening();
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.lang = language;

    utterance.onstart = () => {
      setIsSpeaking(true);
      onSpeakStart?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onSpeakEnd?.();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setError('Erreur lors de la synthèse vocale.');
    };

    synthRef.current.speak(utterance);
  }, [selectedVoice, speechRate, speechPitch, language, isListening, stopListening, onSpeakStart, onSpeakEnd]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [stopListening, stopSpeaking]);

  return {
    // STT
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    
    // TTS
    isSpeaking,
    speak,
    stopSpeaking,
    
    // Voice settings
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    speechPitch,
    setSpeechPitch,
    
    // Status
    isSupported,
    error,
  };
}

export default useVoiceChat;
