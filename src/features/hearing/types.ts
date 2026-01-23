
export interface LegacyHearingPerceptPayload {
  text?: string;
  emotion?: string;
  sentiment?: string;
  intent?: string;
}

export interface SdkAudioPayload {
  transcription: string;
  language?: string;
  confidence: number;
  timestamp: number;
  metadata?: Record<string, any>;
}
