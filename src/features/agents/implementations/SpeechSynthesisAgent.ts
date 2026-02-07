/**
 * SpeechSynthesisAgent - Enables voice output for Lisa
 * 
 * This agent handles text-to-speech conversion, allowing Lisa to communicate
 * verbally with users and other voice-enabled systems like Alexa and Gemini.
 */

import { AgentDomains } from '../core/types';
import type { 
  AgentCapability, 
  AgentExecuteProps, 
  AgentExecuteResult, 
  AgentParameter, 
  BaseAgent 
} from '../core/types';

/**
 * Voice settings for speech synthesis
 */
export interface VoiceSettings {
  voice: string;      // Voice identifier
  rate: number;       // Speech rate (0.1 to 10)
  pitch: number;      // Speech pitch (0 to 2)
  volume: number;     // Speech volume (0 to 1)
  lang: string;       // Language code (e.g., 'fr-FR', 'en-US')
}

/**
 * Speech synthesis formats
 */
export type SpeechFormat = 'ssml' | 'text';

/**
 * Supported intents for SpeechSynthesisAgent
 */
export type SpeechSynthesisIntent = 
  | 'speak'
  | 'get_voices'
  | 'update_settings'
  | 'stop_speaking'
  | 'is_speaking'
  | 'convert_to_audio';

/**
 * Agent for text-to-speech synthesis
 */
export class SpeechSynthesisAgent implements BaseAgent {
  name = 'SpeechSynthesisAgent';
  description = 'Convertit du texte en parole pour communiquer verbalement';
  version = '1.0.0';
  domain = AgentDomains.INTEGRATION;
  capabilities = [
    'text_to_speech',
    'voice_management',
    'audio_export'
  ];

  // Default voice settings
  private defaultSettings: VoiceSettings = {
    voice: '',        // Will be set during initialization
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    lang: 'fr-FR'
  };

  // Current voice settings
  private settings: VoiceSettings;
  
  // Keep track of available voices
  private availableVoices: SpeechSynthesisVoice[] = [];
  
  // Is the agent initialized?
  private initialized = false;
  
  // Is speech synthesis supported?
  private supported = false;

  constructor() {
    this.settings = {...this.defaultSettings};
    this.initSynthesis();
  }

  /**
   * Initialize speech synthesis and load available voices
   */
  private async initSynthesis(): Promise<void> {
    // Check if speech synthesis is supported
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.supported = true;
      
      // Get available voices
      this.loadVoices();
      
      // If voices aren't loaded immediately, wait for the voiceschanged event
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', () => {
          this.loadVoices();
        });
      }
      
      this.initialized = true;
    } else {
      console.warn('Speech synthesis is not supported in this browser');
      this.supported = false;
      this.initialized = false;
    }
  }
  
  /**
   * Load available voices and set default voice
   */
  private loadVoices(): void {
    if (!this.supported) return;
    
    this.availableVoices = window.speechSynthesis.getVoices();
    
    // Try to find a French voice
    const frenchVoice = this.availableVoices.find(voice => 
      voice.lang.startsWith('fr') || voice.name.toLowerCase().includes('french'));
    
    if (frenchVoice) {
      this.settings.voice = frenchVoice.name;
    } else if (this.availableVoices.length > 0) {
      // Default to first available voice if no French voice is found
      this.settings.voice = this.availableVoices[0].name;
    }
  }

  /**
   * Main execution method for the agent
   */
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const intent = props.intent as SpeechSynthesisIntent;
    const parameters = props.parameters || {};
    const _language = props.language || 'fr'; // Prefixed with underscore as it's not used

    try {
      if (!this.supported) {
        throw new Error('La synthèse vocale n\'est pas supportée par ce navigateur');
      }
      
      if (!this.initialized) {
        await this.initSynthesis();
      }

      let result;
      switch (intent) {
        case 'speak':
          result = await this.speakText(
            parameters.text,
            parameters.settings || this.settings,
            parameters.format || 'text'
          );
          break;
        case 'get_voices':
          result = this.getAvailableVoices(parameters.lang);
          break;
        case 'update_settings':
          result = this.updateSettings(parameters.settings);
          break;
        case 'stop_speaking':
          result = this.stopSpeaking();
          break;
        case 'is_speaking':
          result = this.isSpeaking();
          break;
        case 'convert_to_audio':
          result = await this.convertToAudio(
            parameters.text,
            parameters.settings || this.settings,
            parameters.format || 'mp3'
          );
          break;
        default:
          return {
            success: false,
            output: `Intent non supporté: ${intent}`,
            error: new Error('UNSUPPORTED_INTENT'),
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
      }

      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Determines if this agent can handle a specific query
   */
  async canHandle(query: string, context?: any): Promise<number> {
    const normalizedQuery = query.toLowerCase();
    
    // Keywords related to speech synthesis
    const speechKeywords = [
      'parle', 'parler', 'dire', 'dis', 'prononcer', 'lire', 'lis', 'voix',
      'synthèse vocale', 'text-to-speech', 'tts', 'audio',
      'à voix haute', 'alexa', 'gemini'
    ];
    
    // Count matches
    const matches = speechKeywords.filter(keyword => 
      normalizedQuery.includes(keyword)).length;
    
    // Calculate score
    let score = 0;
    if (matches > 0) score += 0.3 + Math.min(matches * 0.2, 0.6);
    
    // Additional boost for direct commands
    if (normalizedQuery.startsWith('dis ') || 
        normalizedQuery.startsWith('parle ') || 
        normalizedQuery.startsWith('lis ')) {
      score += 0.2;
    }
    
    // Context boost if we're expecting a voice response
    if (context?.expectVoiceResponse || context?.lastAction === 'listen') {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Returns required parameters for a specific task
   */
  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    const normalizedTask = task.toLowerCase();
    
    if (normalizedTask.includes('parler') || normalizedTask.includes('dire') || 
        normalizedTask.includes('lire') || normalizedTask.startsWith('dis ')) {
      return [
        {
          name: 'text',
          type: 'string',
          required: true,
          description: 'Texte à lire à voix haute'
        },
        {
          name: 'settings',
          type: 'object',
          required: false,
          description: 'Paramètres de voix (optionnel)'
        },
        {
          name: 'format',
          type: 'string',
          required: false,
          description: 'Format du texte (text ou ssml)',
          defaultValue: 'text'
        }
      ];
    }
    
    if (normalizedTask.includes('voix') && 
       (normalizedTask.includes('liste') || normalizedTask.includes('disponible'))) {
      return [
        {
          name: 'lang',
          type: 'string',
          required: false,
          description: 'Filtrer par langue (optionnel)'
        }
      ];
    }
    
    if (normalizedTask.includes('paramètre') || normalizedTask.includes('configurer')) {
      return [
        {
          name: 'settings',
          type: 'object',
          required: true,
          description: 'Nouveaux paramètres de voix'
        }
      ];
    }
    
    return [];
  }

  /**
   * Returns detailed capability information
   */
  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: 'text_to_speech',
        description: 'Lit du texte à voix haute',
        requiredParameters: [
          {
            name: 'text',
            type: 'string',
            required: true,
            description: 'Texte à lire'
          }
        ]
      },
      {
        name: 'voice_management',
        description: 'Gestion des voix et paramètres',
        requiredParameters: []
      },
      {
        name: 'audio_export',
        description: 'Conversion de texte en fichier audio',
        requiredParameters: [
          {
            name: 'text',
            type: 'string',
            required: true,
            description: 'Texte à convertir'
          },
          {
            name: 'format',
            type: 'string',
            required: false,
            description: 'Format audio (mp3, wav)'
          }
        ]
      }
    ];
  }

  /**
   * Validates input parameters
   */
  async validateInput(props: AgentExecuteProps): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const intent = props.intent as SpeechSynthesisIntent;
    const parameters = props.parameters || {};
    
    switch (intent) {
      case 'speak':
      case 'convert_to_audio':
        if (!parameters.text || parameters.text.trim().length === 0) {
          errors.push('Le texte à prononcer est requis');
        }
        
        if (parameters.format && !['text', 'ssml'].includes(parameters.format)) {
          errors.push('Le format doit être "text" ou "ssml"');
        }
        break;
        
      case 'update_settings':
        if (!parameters.settings || Object.keys(parameters.settings).length === 0) {
          errors.push('Les paramètres de voix sont requis');
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Speaks the provided text using speech synthesis
   */
  private async speakText(text: string, settings?: Partial<VoiceSettings>, format: SpeechFormat = 'text'): Promise<any> {
    if (!this.supported) {
      throw new Error('La synthèse vocale n\'est pas supportée par ce navigateur');
    }
    
    if (!text || text.trim().length === 0) {
      throw new Error('Le texte à prononcer est requis');
    }
    
    return new Promise<any>((resolve, reject) => {
      try {
        // Stop any current speech
        window.speechSynthesis.cancel();
        
        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply settings
        const mergedSettings = { ...this.settings, ...settings };
        
        // Set voice
        if (mergedSettings.voice) {
          const selectedVoice = this.availableVoices.find(v => v.name === mergedSettings.voice);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }
        
        // Apply other settings
        utterance.rate = mergedSettings.rate;
        utterance.pitch = mergedSettings.pitch;
        utterance.volume = mergedSettings.volume;
        utterance.lang = mergedSettings.lang;
        
        // Handle SSML if specified
        if (format === 'ssml') {
          // Simple SSML parsing
          // Note: Web Speech API doesn't natively support SSML,
          // so this is a very basic implementation
          const textWithoutTags = text
            .replace(/<[^>]*>/g, '')  // Remove all XML tags
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .trim();
          
          utterance.text = textWithoutTags;
        }
        
        // Set up event handlers
        utterance.onend = () => {
          resolve({
            completed: true,
            text,
            settings: mergedSettings
          });
        };
        
        utterance.onerror = (event) => {
          reject(new Error(`Erreur de synthèse vocale: ${event.error}`));
        };
        
        // Start speaking
        window.speechSynthesis.speak(utterance);
        
        // Also resolve with information about the speech
        resolve({
          started: true,
          text,
          settings: mergedSettings
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get available voices, optionally filtered by language
   */
  private getAvailableVoices(lang?: string): any {
    if (!this.supported) {
      throw new Error('La synthèse vocale n\'est pas supportée par ce navigateur');
    }
    
    let voices = this.availableVoices;
    
    // Filter by language if specified
    if (lang) {
      voices = voices.filter(voice => voice.lang.startsWith(lang));
    }
    
    return {
      count: voices.length,
      currentVoice: this.settings.voice,
      voices: voices.map(voice => ({
        name: voice.name,
        lang: voice.lang,
        default: voice.default,
        localService: voice.localService
      }))
    };
  }

  /**
   * Update voice settings
   */
  private updateSettings(newSettings: Partial<VoiceSettings>): any {
    if (!newSettings) {
      throw new Error('Les paramètres de voix sont requis');
    }
    
    // Validate voice if provided
    if (newSettings.voice) {
      const voiceExists = this.availableVoices.some(v => v.name === newSettings.voice);
      if (!voiceExists) {
        throw new Error(`La voix "${newSettings.voice}" n'existe pas`);
      }
    }
    
    // Validate rate
    if (newSettings.rate !== undefined) {
      if (newSettings.rate < 0.1 || newSettings.rate > 10) {
        throw new Error('La vitesse doit être entre 0.1 et 10');
      }
    }
    
    // Validate pitch
    if (newSettings.pitch !== undefined) {
      if (newSettings.pitch < 0 || newSettings.pitch > 2) {
        throw new Error('La hauteur doit être entre 0 et 2');
      }
    }
    
    // Validate volume
    if (newSettings.volume !== undefined) {
      if (newSettings.volume < 0 || newSettings.volume > 1) {
        throw new Error('Le volume doit être entre 0 et 1');
      }
    }
    
    // Update settings
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    
    return {
      updated: true,
      settings: this.settings
    };
  }

  /**
   * Stop any ongoing speech
   */
  private stopSpeaking(): any {
    if (!this.supported) {
      throw new Error('La synthèse vocale n\'est pas supportée par ce navigateur');
    }
    
    window.speechSynthesis.cancel();
    
    return {
      stopped: true
    };
  }

  /**
   * Check if speech synthesis is currently active
   */
  private isSpeaking(): any {
    if (!this.supported) {
      throw new Error('La synthèse vocale n\'est pas supportée par ce navigateur');
    }
    
    const speaking = window.speechSynthesis.speaking;
    
    return {
      speaking
    };
  }

  /**
   * Convert text to an audio file (MP3/WAV)
   * Note: Web Speech API doesn't natively support exporting to audio files
   * This is a placeholder for future implementation that would require a server-side API
   */
  private async convertToAudio(text: string, _settings?: Partial<VoiceSettings>, format: string = 'mp3'): Promise<any> {
    // This would require a server-side TTS service with an API
    // Here we'll just return a placeholder response
    
    return {
      message: "La conversion en fichier audio nécessite une API de synthèse vocale externe. Cette fonctionnalité n'est pas encore implémentée.",
      text,
      format,
      supported: false
    };
  }
}
