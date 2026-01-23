/**
 * AudioTranscription - Composant de transcription audio en temps réel
 * Utilise Web Speech API pour la reconnaissance vocale
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Trash2 } from 'lucide-react';

interface TranscriptEntry {
  id: number;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

// Extend Window interface for SpeechRecognition
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

export function AudioTranscription() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const idCounterRef = useRef(0);

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      setError('La reconnaissance vocale n\'est pas supportée par ce navigateur. Utilisez Chrome ou Edge.');
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimText]);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR'; // French language

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      console.log('[AudioTranscription] Started listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        
        if (result.isFinal) {
          idCounterRef.current += 1;
          setTranscript(prev => [...prev, {
            id: idCounterRef.current,
            text: text.trim(),
            timestamp: new Date(),
            isFinal: true,
          }]);
          setInterimText('');
        } else {
          interim += text;
        }
      }
      
      if (interim) {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[AudioTranscription] Error:', event.error);
      
      switch (event.error) {
        case 'no-speech':
          // Don't show error for no speech, just continue
          break;
        case 'audio-capture':
          setError('Aucun microphone détecté. Vérifiez vos paramètres audio.');
          setIsListening(false);
          break;
        case 'not-allowed':
          setError('Accès au microphone refusé. Autorisez l\'accès dans les paramètres du navigateur.');
          setIsListening(false);
          break;
        case 'network':
          setError('Erreur réseau. Vérifiez votre connexion internet.');
          break;
        default:
          setError(`Erreur: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('[AudioTranscription] Ended');
      // Auto-restart if still supposed to be listening
      if (isListening && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('[AudioTranscription] Could not restart:', e);
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.error('[AudioTranscription] Failed to start:', e);
      setError('Impossible de démarrer la reconnaissance vocale.');
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // Prevent auto-restart
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const clearTranscript = () => {
    setTranscript([]);
    setInterimText('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  if (!isSupported) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <MicOff className="w-12 h-12 mx-auto mb-4 text-red-400" />
        <h3 className="text-lg font-semibold text-red-300 mb-2">Non supporté</h3>
        <p className="text-red-200/70">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Transcription Audio en Temps Réel</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearTranscript}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-colors"
            title="Effacer la transcription"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleListening}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                Arrêter
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Démarrer
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status indicator */}
      {isListening && (
        <div className="px-6 py-2 bg-green-500/10 border-b border-green-500/20 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-green-300">Écoute en cours... Parlez maintenant</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Transcript area */}
      <div className="p-6 h-96 overflow-y-auto">
        {transcript.length === 0 && !interimText ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Cliquez sur "Démarrer" pour commencer la transcription</p>
              <p className="text-sm mt-2 text-slate-500">La transcription apparaîtra ici en temps réel</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {transcript.map((entry) => (
              <div key={entry.id} className="flex gap-3">
                <span className="text-xs text-slate-500 font-mono whitespace-nowrap pt-1">
                  {formatTime(entry.timestamp)}
                </span>
                <p className="text-slate-200 leading-relaxed">{entry.text}</p>
              </div>
            ))}
            {interimText && (
              <div className="flex gap-3">
                <span className="text-xs text-blue-400 font-mono whitespace-nowrap pt-1">
                  ...
                </span>
                <p className="text-blue-300/70 italic leading-relaxed">{interimText}</p>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-900/30 flex items-center justify-between text-sm text-slate-400">
        <span>{transcript.length} phrase{transcript.length !== 1 ? 's' : ''} transcrite{transcript.length !== 1 ? 's' : ''}</span>
        <span>Langue: Français (FR)</span>
      </div>
    </div>
  );
}

export default AudioTranscription;
