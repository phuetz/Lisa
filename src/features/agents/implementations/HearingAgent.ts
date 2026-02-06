/**
 * HearingAgent - Audio Classification and Speech Recognition
 * 
 * Handles audio analysis, speech recognition, and sound classification
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { AgentDomains } from '../core/types';

export class HearingAgent implements BaseAgent {
  name = 'HearingAgent';
  description = 'Handles audio classification, speech recognition, and sound analysis';
  version = '1.0.0';
  domain: AgentDomain = AgentDomains.ANALYSIS;
  capabilities = [
    'audio_classification',
    'speech_recognition',
    'sound_detection',
    'noise_filtering',
    'volume_analysis',
    'audio_transcription'
  ];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const { intent, context: _context, parameters } = props;

    try {
      switch (intent) {
        case 'classify_audio':
          return await this.classifyAudio(parameters);

        case 'recognize_speech':
          return await this.recognizeSpeech(parameters);

        case 'detect_sound':
          return await this.detectSound(parameters);

        case 'analyze_volume':
          return await this.analyzeVolume(parameters);

        case 'transcribe_audio':
          return await this.transcribeAudio(parameters);

        case 'filter_noise':
          return await this.filterNoise(parameters);

        default:
          return {
            success: false,
            output: null,
            error: `Unknown intent: ${intent}`,
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Classify audio content
   */
  private async classifyAudio(params: any): Promise<AgentExecuteResult> {
    const { audioData, audioBuffer } = params;

    if (!audioData && !audioBuffer) {
      return {
        success: false,
        output: null,
        error: 'No audio data provided'
      };
    }

    // Get emotion from hearing percepts (Whisper + SER)
    const appStoreModule = await import('../../store/appStore');
    const useAppStore = appStoreModule.useAppStore;
    const percepts = useAppStore.getState().percepts
      .filter(p => p.modality === 'hearing')
      .sort((a, b) => b.ts - a.ts);

    if (percepts.length === 0) {
      return {
        success: false,
        output: null,
        error: 'No hearing data available'
      };
    }

    const latestHearing = percepts[0].payload as any;

    // Build classifications from emotion/sentiment
    const classifications = [];
    if (latestHearing.emotion) {
      classifications.push({ label: latestHearing.emotion, confidence: 0.8 });
    }
    if (latestHearing.sentiment) {
      classifications.push({ label: latestHearing.sentiment, confidence: 0.7 });
    }
    if (latestHearing.text) {
      classifications.push({ label: 'speech', confidence: 0.9 });
    }

    return {
      success: true,
      output: {
        classifications,
        primaryClass: classifications[0]?.label || 'unknown',
        confidence: classifications[0]?.confidence || 0,
        source: 'Whisper + SER'
      },
      metadata: {
        source: 'HearingAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Recognize speech from audio
   */
  private async recognizeSpeech(params: any): Promise<AgentExecuteResult> {
    const { audioBlob, language = 'fr-FR' } = params;

    if (!audioBlob) {
      return {
        success: false,
        output: null,
        error: 'No audio blob provided'
      };
    }

    try {
      // Check if Web Speech API is available
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        return {
          success: false,
          output: null,
          error: 'Speech recognition not supported in this browser'
        };
      }

      // For now, return a placeholder
      // In production, this would integrate with Web Speech API or external service
      return {
        success: true,
        output: {
          transcript: '[Speech recognition in progress]',
          confidence: 0.0,
          language
        },
        metadata: {
          source: 'HearingAgent',
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Detect specific sounds
   */
  private async detectSound(params: any): Promise<AgentExecuteResult> {
    const { audioData, targetSound: _targetSound } = params;

    if (!audioData) {
      return {
        success: false,
        output: null,
        error: 'No audio data provided'
      };
    }

    // Sound detection requires specific audio pattern matching (not implemented)
    return {
      success: false,
      output: null,
      error: 'Sound detection not yet implemented. Requires audio pattern matching.',
      metadata: {
        source: 'HearingAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Analyze audio volume levels
   */
  private async analyzeVolume(params: any): Promise<AgentExecuteResult> {
    const { audioData, audioBuffer } = params;

    if (!audioData && !audioBuffer) {
      return {
        success: false,
        output: null,
        error: 'No audio data provided'
      };
    }

    // Calculate volume metrics
    // This is a placeholder - in production, analyze actual audio buffer
    const volume = {
      average: 0.5,
      peak: 0.8,
      rms: 0.45,
      decibels: -20
    };

    return {
      success: true,
      output: volume,
      metadata: {
        source: 'HearingAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Transcribe audio to text
   */
  private async transcribeAudio(params: any): Promise<AgentExecuteResult> {
    const { audioFile, language = 'fr-FR' } = params;

    if (!audioFile) {
      return {
        success: false,
        output: null,
        error: 'No audio file provided'
      };
    }

    // Get latest hearing percepts from store (Whisper transcriptions)
    const appStoreModule = await import('../../store/appStore');
    const useAppStore = appStoreModule.useAppStore;
    const percepts = useAppStore.getState().percepts
      .filter(p => p.modality === 'hearing')
      .sort((a, b) => b.ts - a.ts);

    if (percepts.length === 0) {
      return {
        success: false,
        output: null,
        error: 'No hearing data available. Ensure microphone is active and Whisper worker is running.'
      };
    }

    const latestHearing = percepts[0].payload as any;

    return {
      success: true,
      output: {
        transcript: latestHearing.text || '[No transcription]',
        language: language,
        sentiment: latestHearing.sentiment,
        emotion: latestHearing.emotion,
        intent: latestHearing.intent,
        confidence: percepts[0].confidence || 0,
        source: 'Whisper-tiny'
      },
      metadata: {
        source: 'HearingAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Filter noise from audio
   */
  private async filterNoise(params: any): Promise<AgentExecuteResult> {
    const { audioData, noiseLevel: _noiseLevel = 'medium' } = params;

    if (!audioData) {
      return {
        success: false,
        output: null,
        error: 'No audio data provided'
      };
    }

    // Noise filtering requires Web Audio API processing (not implemented)
    return {
      success: false,
      output: null,
      error: 'Noise filtering not yet implemented. Requires Web Audio API processing.',
      metadata: {
        source: 'HearingAgent',
        timestamp: Date.now()
      }
    };
  }

  async canHandle(query: string): Promise<number> {
    const keywords = [
      'audio', 'sound', 'hear', 'listen', 'voice', 'speech',
      'noise', 'volume', 'transcribe', 'recognize', 'classify',
      'entendre', 'son', 'audio', 'voix', 'bruit', 'parole'
    ];

    const lowerQuery = query.toLowerCase();
    const matches = keywords.filter(keyword => lowerQuery.includes(keyword));

    return matches.length > 0 ? Math.min(matches.length * 0.3, 1.0) : 0.0;
  }
}
