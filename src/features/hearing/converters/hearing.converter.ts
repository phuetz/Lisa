import type { LegacyHearingPerceptPayload, SdkAudioPercept } from '../types';

/**
 * Adapts the new SDK standard Audio Percept to the Legacy HearingPerceptPayload format.
 * Pure function: No side effects.
 */
export function adapterAudioSdkToLegacy(sdkPercept: SdkAudioPercept): LegacyHearingPerceptPayload {
  return {
    text: sdkPercept.payload.transcription,
    emotion: sdkPercept.payload.metadata?.emotion,
    sentiment: sdkPercept.payload.metadata?.sentiment,
    intent: sdkPercept.payload.metadata?.intent
  };
}
