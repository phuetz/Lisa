import type { Percept } from '@lisa-sdk/core';

export interface HearingConfig {
  features: {
    enableWhisper: boolean;
    enableSentiment: boolean;
    enableEmotion: boolean;
  };
}

export interface HearingPayload {
  text?: string;
  sentiment?: string;
  emotion?: string;
  intent?: string;
  buffer?: Float32Array;
}

export type HearingPercept = Percept<HearingPayload>;