import * as mqtt from 'mqtt';
import { useAppStore } from '../store/appStore';
import type { Percept, TouchPayload, EnvironmentPayload } from '../types';

/**
 * MqttAdapter
 * Bridges physical IoT sensors to Lisa's sensory system (Touch & Environment).
 */
class MqttAdapter {
  private client: mqtt.MqttClient | null = null;
  private isInitialized = false;

  /**
   * Topic Configuration Mapping
   * Defines how MQTT topics map to Lisa's senses.
   */
  private readonly TOPIC_MAPPING = {
    'lisa/sensors/touch': 'touch',
    'lisa/sensors/environment': 'environment',
    'lisa/sensors/proximity': 'touch',
  } as const;

  /**
   * Initialize MQTT connection and subscriptions.
   * @param brokerUrl The MQTT broker URL (e.g., 'ws://broker.hivemq.com:8000/mqtt')
   */
  async initialize(brokerUrl: string = 'ws://localhost:9001'): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      console.log(`[MqttAdapter] Connecting to broker: ${brokerUrl}`);
      
      this.client = mqtt.connect(brokerUrl);

      this.client.on('connect', () => {
        console.log('[MqttAdapter] Connected to IoT Broker.');
        this.subscribeToSensors();
        this.isInitialized = true;
        resolve();
      });

      this.client.on('message', (topic, message) => {
        this.handleSensorMessage(topic, message.toString());
      });

      this.client.on('error', (err) => {
        console.error('[MqttAdapter] Connection error:', err);
        reject(err);
      });
    });
  }

  private subscribeToSensors(): void {
    if (!this.client) return;
    
    const topics = Object.keys(this.TOPIC_MAPPING);
    this.client.subscribe(topics, (err) => {
      if (err) {
        console.error('[MqttAdapter] Subscription error:', err);
      } else {
        console.log(`[MqttAdapter] Subscribed to ${topics.length} sensor topics.`);
      }
    });
  }

  /**
   * Process incoming sensor data and convert to Percepts.
   */
  private handleSensorMessage(topic: string, payload: string): void {
    try {
      const data = JSON.parse(payload);
      const modality = this.TOPIC_MAPPING[topic as keyof typeof this.TOPIC_MAPPING];

      if (!modality) return;

      const percept: Percept<any> = {
        modality: modality as any,
        confidence: data.confidence || 1.0,
        ts: Date.now(),
        payload: {
          ...data,
          timestamp: Date.now()
        }
      };

      // Push to global store
      this.emitPercept(percept);

    } catch (e) {
      console.warn(`[MqttAdapter] Failed to parse message from ${topic}:`, payload);
    }
  }

  private emitPercept(percept: Percept<any>): void {
    useAppStore.setState((state) => {
      const currentPercepts = state.percepts || [];
      return {
        percepts: [...currentPercepts, percept].slice(-50)
      };
    });
    
    // Log for debug if it's a high confidence event
    if (percept.confidence > 0.8) {
        console.log(`[MqttAdapter] New Percept [${percept.modality}]:`, percept.payload.type || topic);
    }
  }

  /**
   * Publish a command to a device.
   */
  publish(topic: string, message: any): void {
    if (this.client?.connected) {
      this.client.publish(topic, JSON.stringify(message));
    }
  }

  terminate(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isInitialized = false;
      console.log('[MqttAdapter] Terminated.');
    }
  }
}

export const mqttAdapter = new MqttAdapter();
