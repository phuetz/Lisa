/**
 * Gateway Voice - Voice/Audio related modules
 *
 * This module exports voice-focused components:
 * - VoiceWake: Basic wake word detection
 * - VoiceWakePro: Advanced wake word with Porcupine
 * - EdgeTTS: Microsoft Edge text-to-speech
 * - TalkMode: Integrated TTS/STT conversation mode
 *
 * Migration Guide:
 *   // Old import (still works)
 *   import { VoiceWake } from '@/gateway';
 *
 *   // New import (recommended for voice components)
 *   import { VoiceWake } from '@/gateway/voice';
 */

// Voice Wake (basic)
export { VoiceWake, getVoiceWake, resetVoiceWake } from '../VoiceWake';
export type {
  VoiceWakeConfig,
  WakeEvent,
  VoiceWakeState
} from '../VoiceWake';

// Voice Wake Pro (Porcupine)
export { VoiceWakePro, VoiceWakeFallback, getVoiceWakePro, resetVoiceWakePro } from '../VoiceWakePro';
export type {
  VoiceWakeProConfig,
  WakeWordEvent,
  VoiceWakeProState
} from '../VoiceWakePro';

// Edge TTS
export { EdgeTTS, getEdgeTTS, resetEdgeTTS, LISA_VOICES } from '../EdgeTTS';
export type {
  EdgeTTSConfig,
  TTSVoice,
  TTSState
} from '../EdgeTTS';

// Talk Mode
export { TalkMode, getTalkMode, resetTalkMode } from '../TalkMode';
export type {
  TalkModeConfig,
  TTSEngine,
  STTEngine,
  Voice,
  TTSRequest,
  STTResult
} from '../TalkMode';
