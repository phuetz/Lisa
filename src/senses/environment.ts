import { mqttAdapter } from '../services/MqttAdapter';
import type { EnvironmentPercept, EnvironmentPayload } from '../types';

let onPerceptCallback: ((percept: EnvironmentPercept) => void) | null = null;

/**
 * Environment Sense
 * Manages environmental data (air quality, temperature, light, etc.).
 */
export const environmentSense = {
  initialize: async (brokerUrl?: string) => {
    console.log('[Environment] Initializing IoT Environment Sense...');
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
    console.log('[Environment] Terminated.');
  },

  setOnPerceptCallback: (cb: ((percept: EnvironmentPercept) => void) | null) => {
    onPerceptCallback = cb;
  }
};

export type { EnvironmentPercept, EnvironmentPayload };
