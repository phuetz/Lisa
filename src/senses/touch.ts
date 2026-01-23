import { mqttAdapter } from '../services/MqttAdapter';
import type { TouchPercept, TouchPayload } from '../types';

let onPerceptCallback: ((percept: TouchPercept) => void) | null = null;

/**
 * Touch Sense
 * Manages physical and virtual touch inputs.
 */
export const touchSense = {
  initialize: async (brokerUrl?: string) => {
    console.log('[Touch] Initializing IoT Touch Sense...');
    await mqttAdapter.initialize(brokerUrl);
  },

  start: () => {
    // Already handled by adapter subscription
  },

  stop: () => {
    mqttAdapter.terminate();
  },

  terminate: () => {
    mqttAdapter.terminate();
    onPerceptCallback = null;
    console.log('[Touch] Terminated.');
  },

  setOnPerceptCallback: (cb: ((percept: TouchPercept) => void) | null) => {
    onPerceptCallback = cb;
  }
};

export type { TouchPercept, TouchPayload };
