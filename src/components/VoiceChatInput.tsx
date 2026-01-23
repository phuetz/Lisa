/**
 * VoiceChatInput - Composant d'entrée vocale pour le chat
 * Permet de dicter des messages et d'écouter les réponses
 */

import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2, Settings2 } from 'lucide-react';
import { useVoiceChat } from '../hooks/useVoiceChat';

interface VoiceChatInputProps {
  onSendMessage: (message: string) => void;
  onSpeakResponse?: (text: string) => void;
  lastResponse?: string;
  isProcessing?: boolean;
  placeholder?: string;
}

export function VoiceChatInput({
  onSendMessage,
  lastResponse,
  isProcessing = false,
  placeholder = 'Tapez ou dictez votre message...',
}: VoiceChatInputProps) {
  const [inputText, setInputText] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const {
    isListening,
    transcript,
    interimTranscript,
    toggleListening,
    isSpeaking,
    speak,
    stopSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    isSupported,
    error,
  } = useVoiceChat({
    language: 'fr-FR',
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setInputText(prev => prev + (prev ? ' ' : '') + text);
      }
    },
  });

  // Auto-speak responses
  useEffect(() => {
    if (lastResponse && autoSpeak && !isProcessing) {
      speak(lastResponse);
    }
  }, [lastResponse, autoSpeak, isProcessing, speak]);

  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  const handleSend = () => {
    const message = inputText.trim();
    if (message && !isProcessing) {
      onSendMessage(message);
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));

  if (!isSupported) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-300">
        La reconnaissance vocale n'est pas supportée par ce navigateur.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl z-10">
          <h4 className="text-sm font-semibold text-white mb-3">Paramètres vocaux</h4>
          
          {/* Voice Selection */}
          <div className="mb-3">
            <label className="text-xs text-slate-400 mb-1 block">Voix</label>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value);
                if (voice) setSelectedVoice(voice);
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
            >
              {frenchVoices.length > 0 ? (
                frenchVoices.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name}
                  </option>
                ))
              ) : (
                voices.slice(0, 10).map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Speech Rate */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Vitesse</span>
              <span className="text-white">{speechRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Auto-speak toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Lecture auto des réponses</span>
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`w-10 h-5 rounded-full transition-colors ${
                autoSpeak ? 'bg-blue-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                  autoSpeak ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Main Input Area */}
      <div className="flex items-end gap-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-2">
        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2.5 rounded-xl transition-colors ${
            showSettings
              ? 'bg-blue-500/20 text-blue-400'
              : 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
          }`}
          title="Paramètres vocaux"
        >
          <Settings2 className="w-5 h-5" />
        </button>

        {/* Voice Input Button */}
        <button
          onClick={toggleListening}
          className={`p-2.5 rounded-xl transition-all ${
            isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
          }`}
          title={isListening ? 'Arrêter la dictée' : 'Dicter un message'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={inputText + (interimTranscript ? ` ${interimTranscript}` : '')}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Parlez maintenant...' : placeholder}
            rows={1}
            className="w-full bg-transparent border-none outline-none resize-none text-white placeholder-slate-500 py-2.5 px-1 max-h-32"
            style={{ minHeight: '40px' }}
          />
          {interimTranscript && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400">
              écoute...
            </span>
          )}
        </div>

        {/* Speaker Button */}
        <button
          onClick={() => isSpeaking ? stopSpeaking() : (lastResponse && speak(lastResponse))}
          className={`p-2.5 rounded-xl transition-colors ${
            isSpeaking
              ? 'bg-purple-500/20 text-purple-400'
              : 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
          }`}
          title={isSpeaking ? 'Arrêter la lecture' : 'Relire la dernière réponse'}
          disabled={!lastResponse && !isSpeaking}
        >
          {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isProcessing}
          className={`p-2.5 rounded-xl transition-all ${
            inputText.trim() && !isProcessing
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
          }`}
          title="Envoyer"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Status Bar */}
      {isListening && (
        <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Écoute en cours - Parlez maintenant
        </div>
      )}
    </div>
  );
}

export default VoiceChatInput;
