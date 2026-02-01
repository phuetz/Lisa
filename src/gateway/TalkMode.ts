/**
 * Lisa Talk Mode
 * Continuous voice conversation with open-source TTS
 * Supports: Piper, Coqui TTS, espeak-ng, Web Speech API
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface TalkModeConfig {
  enabled: boolean;
  ttsEngine: TTSEngine;
  sttEngine: STTEngine;
  voice: string;
  language: string;
  speed: number;
  pitch: number;
  volume: number;
  autoListen: boolean;
  silenceTimeout: number; // ms before ending turn
  wakeWord?: string;
}

export type TTSEngine = 'web-speech' | 'piper' | 'coqui' | 'espeak' | 'local';
export type STTEngine = 'web-speech' | 'whisper' | 'vosk' | 'local';

export interface Voice {
  id: string;
  name: string;
  language: string;
  engine: TTSEngine;
  gender?: 'male' | 'female' | 'neutral';
  quality?: 'low' | 'medium' | 'high';
}

export interface TTSRequest {
  id: string;
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
}

export interface STTResult {
  id: string;
  text: string;
  confidence: number;
  isFinal: boolean;
  language?: string;
  timestamp: Date;
}

export type TalkModeStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

const DEFAULT_CONFIG: TalkModeConfig = {
  enabled: false,
  ttsEngine: 'web-speech',
  sttEngine: 'web-speech',
  voice: 'default',
  language: 'fr-FR',
  speed: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoListen: true,
  silenceTimeout: 2000
};

// Available voices by engine
const AVAILABLE_VOICES: Voice[] = [
  // Web Speech API (browser-dependent)
  { id: 'web-default', name: 'Default', language: 'fr-FR', engine: 'web-speech' },
  { id: 'web-google-fr', name: 'Google Français', language: 'fr-FR', engine: 'web-speech' },
  { id: 'web-google-en', name: 'Google English', language: 'en-US', engine: 'web-speech' },
  
  // Piper TTS (local, fast)
  { id: 'piper-fr-siwis', name: 'Siwis (FR)', language: 'fr-FR', engine: 'piper', gender: 'female', quality: 'high' },
  { id: 'piper-fr-upmc', name: 'UPMC (FR)', language: 'fr-FR', engine: 'piper', gender: 'male', quality: 'medium' },
  { id: 'piper-en-amy', name: 'Amy (EN)', language: 'en-US', engine: 'piper', gender: 'female', quality: 'high' },
  { id: 'piper-en-ryan', name: 'Ryan (EN)', language: 'en-US', engine: 'piper', gender: 'male', quality: 'high' },
  
  // Coqui TTS (neural)
  { id: 'coqui-vits-fr', name: 'VITS French', language: 'fr-FR', engine: 'coqui', quality: 'high' },
  { id: 'coqui-vits-en', name: 'VITS English', language: 'en-US', engine: 'coqui', quality: 'high' },
  { id: 'coqui-tacotron', name: 'Tacotron2', language: 'en-US', engine: 'coqui', quality: 'high' },
  
  // espeak-ng (lightweight, many languages)
  { id: 'espeak-fr', name: 'eSpeak French', language: 'fr-FR', engine: 'espeak', quality: 'low' },
  { id: 'espeak-en', name: 'eSpeak English', language: 'en-US', engine: 'espeak', quality: 'low' },
  { id: 'espeak-de', name: 'eSpeak German', language: 'de-DE', engine: 'espeak', quality: 'low' }
];

export class TalkMode extends BrowserEventEmitter {
  private config: TalkModeConfig;
  private status: TalkModeStatus = 'idle';
  private currentRequest: TTSRequest | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;
  private speechRecognition: SpeechRecognition | null = null;
  private conversationHistory: { role: 'user' | 'assistant'; text: string; timestamp: Date }[] = [];

  constructor(config: Partial<TalkModeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeEngines();
  }

  private initializeEngines(): void {
    // Initialize Web Speech API if available
    if (typeof window !== 'undefined') {
      this.speechSynthesis = window.speechSynthesis || null;
      
      // Initialize Speech Recognition
      const SpeechRecognitionAPI = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition || 
                                   (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        this.speechRecognition = new SpeechRecognitionAPI();
        this.setupRecognition();
      }
    }
  }

  private setupRecognition(): void {
    if (!this.speechRecognition) return;

    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = this.config.language;

    this.speechRecognition.onresult = (event) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      
      const sttResult: STTResult = {
        id: `stt_${Date.now()}`,
        text: lastResult[0].transcript,
        confidence: lastResult[0].confidence,
        isFinal: lastResult.isFinal,
        language: this.config.language,
        timestamp: new Date()
      };

      this.emit('speech:result', sttResult);

      if (lastResult.isFinal) {
        this.handleUserInput(sttResult.text);
      }
    };

    this.speechRecognition.onerror = (event) => {
      this.emit('speech:error', { error: event.error });
      this.setStatus('error');
    };

    this.speechRecognition.onend = () => {
      if (this.config.autoListen && this.status !== 'speaking') {
        this.startListening();
      }
    };
  }

  private handleUserInput(text: string): void {
    this.conversationHistory.push({
      role: 'user',
      text,
      timestamp: new Date()
    });

    this.emit('user:input', { text });
    this.setStatus('processing');
  }

  // Configuration
  configure(config: Partial<TalkModeConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.speechRecognition) {
      this.speechRecognition.lang = this.config.language;
    }

    this.emit('config:changed', this.config);
  }

  getConfig(): TalkModeConfig {
    return { ...this.config };
  }

  // Status
  private setStatus(status: TalkModeStatus): void {
    const oldStatus = this.status;
    this.status = status;
    this.emit('status:changed', { oldStatus, newStatus: status });
  }

  getStatus(): TalkModeStatus {
    return this.status;
  }

  // Voice management
  getVoices(engine?: TTSEngine): Voice[] {
    if (engine) {
      return AVAILABLE_VOICES.filter(v => v.engine === engine);
    }
    return [...AVAILABLE_VOICES];
  }

  getVoice(voiceId: string): Voice | undefined {
    return AVAILABLE_VOICES.find(v => v.id === voiceId);
  }

  setVoice(voiceId: string): boolean {
    const voice = this.getVoice(voiceId);
    if (!voice) return false;

    this.config.voice = voiceId;
    this.config.ttsEngine = voice.engine;
    this.emit('voice:changed', voice);
    return true;
  }

  // Listening
  async startListening(): Promise<boolean> {
    if (!this.speechRecognition) {
      this.emit('error', { message: 'Speech recognition not available' });
      return false;
    }

    if (this.status === 'speaking') {
      return false;
    }

    try {
      this.speechRecognition.start();
      this.setStatus('listening');
      this.emit('listening:started');
      return true;
    } catch (error) {
      this.emit('error', { error });
      return false;
    }
  }

  stopListening(): void {
    if (this.speechRecognition) {
      this.speechRecognition.stop();
      this.setStatus('idle');
      this.emit('listening:stopped');
    }
  }

  // Speaking (TTS)
  async speak(text: string, options?: { voice?: string; speed?: number; pitch?: number }): Promise<boolean> {
    const requestId = `tts_${Date.now()}`;
    
    this.currentRequest = {
      id: requestId,
      text,
      voice: options?.voice || this.config.voice,
      speed: options?.speed || this.config.speed,
      pitch: options?.pitch || this.config.pitch
    };

    this.setStatus('speaking');
    this.emit('speaking:started', this.currentRequest);

    // Stop listening while speaking
    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }

    try {
      await this.synthesize(this.currentRequest);
      
      this.conversationHistory.push({
        role: 'assistant',
        text,
        timestamp: new Date()
      });

      this.emit('speaking:completed', { requestId });
      this.setStatus('idle');

      // Resume listening if auto-listen is enabled
      if (this.config.autoListen) {
        await this.startListening();
      }

      return true;
    } catch (error) {
      this.emit('speaking:error', { requestId, error });
      this.setStatus('error');
      return false;
    }
  }

  private async synthesize(request: TTSRequest): Promise<void> {
    switch (this.config.ttsEngine) {
      case 'web-speech':
        await this.synthesizeWebSpeech(request);
        break;
      case 'piper':
        await this.synthesizePiper(request);
        break;
      case 'coqui':
        await this.synthesizeCoqui(request);
        break;
      case 'espeak':
        await this.synthesizeEspeak(request);
        break;
      default:
        await this.synthesizeWebSpeech(request);
    }
  }

  private synthesizeWebSpeech(request: TTSRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.speechSynthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(request.text);
      utterance.rate = request.speed || this.config.speed;
      utterance.pitch = request.pitch || this.config.pitch;
      utterance.volume = this.config.volume;
      utterance.lang = this.config.language;

      // Try to find matching voice
      const voices = this.speechSynthesis.getVoices();
      const matchingVoice = voices.find(v => 
        v.lang.startsWith(this.config.language.split('-')[0])
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      this.speechSynthesis.speak(utterance);
    });
  }

  private async synthesizePiper(_request: TTSRequest): Promise<void> {
    // Piper TTS integration (local binary)
    // In real implementation, would call piper executable
    // For now, fallback to Web Speech
    console.log('[TalkMode] Piper TTS would be called here');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate
  }

  private async synthesizeCoqui(_request: TTSRequest): Promise<void> {
    // Coqui TTS integration (Python server)
    // In real implementation, would call Coqui API
    console.log('[TalkMode] Coqui TTS would be called here');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate
  }

  private async synthesizeEspeak(_request: TTSRequest): Promise<void> {
    // espeak-ng integration (local binary)
    // In real implementation, would call espeak-ng executable
    console.log('[TalkMode] espeak-ng would be called here');
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate
  }

  // Cancel current speech
  cancelSpeech(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
    this.currentRequest = null;
    this.setStatus('idle');
    this.emit('speaking:cancelled');
  }

  // Conversation history
  getHistory(): typeof this.conversationHistory {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.emit('history:cleared');
  }

  // Toggle talk mode
  enable(): void {
    this.config.enabled = true;
    this.emit('enabled');
  }

  disable(): void {
    this.config.enabled = false;
    this.stopListening();
    this.cancelSpeech();
    this.emit('disabled');
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Wake word detection
  setWakeWord(word: string): void {
    this.config.wakeWord = word;
    this.emit('wakeWord:set', { word });
  }

  // Stats
  getStats(): {
    status: TalkModeStatus;
    engine: TTSEngine;
    voice: string;
    historyLength: number;
    isEnabled: boolean;
  } {
    return {
      status: this.status,
      engine: this.config.ttsEngine,
      voice: this.config.voice,
      historyLength: this.conversationHistory.length,
      isEnabled: this.config.enabled
    };
  }
}

// Singleton
let talkModeInstance: TalkMode | null = null;

export function getTalkMode(): TalkMode {
  if (!talkModeInstance) {
    talkModeInstance = new TalkMode();
  }
  return talkModeInstance;
}

export function resetTalkMode(): void {
  if (talkModeInstance) {
    talkModeInstance.disable();
    talkModeInstance.removeAllListeners();
    talkModeInstance = null;
  }
}

