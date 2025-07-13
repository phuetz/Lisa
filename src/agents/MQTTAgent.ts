import { AgentDomains } from './types';
import type {
  AgentCapability,
  AgentExecuteProps,
  AgentExecuteResult,
  AgentParameter,
  BaseAgent
} from './types';
import * as mqtt from 'mqtt';

export type MQTTAction = 'connect' | 'publish' | 'subscribe' | 'unsubscribe' | 'disconnect';

export class MQTTAgent implements BaseAgent {
  name = 'MQTTAgent';
  description = 'Manages MQTT connections, subscriptions, and publications for IoT integration.';
  version = '1.0.0';
  domain = AgentDomains.INTEGRATION;
  capabilities = ['mqtt_connect', 'mqtt_publish', 'mqtt_subscribe', 'mqtt_disconnect'];

  private client: mqtt.MqttClient | null = null;
  private subscriptions: Map<string, (message: Buffer) => void> = new Map();

  constructor() {
    // No-op constructor, connection is handled via execute method
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const action = props.action as MQTTAction;
    const parameters = props.parameters || {};

    try {
      let resultOutput: any;

      switch (action) {
        case 'connect':
          if (!parameters.brokerUrl) {
            throw new Error('Broker URL is required for connection.');
          }
          resultOutput = await this.connect(parameters.brokerUrl, parameters.options);
          break;

        case 'publish':
          if (!this.client || !this.client.connected) {
            throw new Error('Not connected to MQTT broker.');
          }
          if (!parameters.topic || !parameters.message) {
            throw new Error('Topic and message are required for publishing.');
          }
          resultOutput = await this.publish(parameters.topic, parameters.message, parameters.options);
          break;

        case 'subscribe':
          if (!this.client || !this.client.connected) {
            throw new Error('Not connected to MQTT broker.');
          }
          if (!parameters.topic) {
            throw new Error('Topic is required for subscription.');
          }
          resultOutput = await this.subscribe(parameters.topic, parameters.options);
          break;

        case 'unsubscribe':
          if (!this.client || !this.client.connected) {
            throw new Error('Not connected to MQTT broker.');
          }
          if (!parameters.topic) {
            throw new Error('Topic is required for unsubscription.');
          }
          resultOutput = await this.unsubscribe(parameters.topic);
          break;

        case 'disconnect':
          resultOutput = await this.disconnect();
          break;

        default:
          return { success: false, error: `Unknown MQTT action: ${action}`, output: null };
      }

      return {
        success: true,
        output: resultOutput,
        metadata: {
          executionTime: Date.now() - startTime,
          action: action,
        },
      };
    } catch (error: any) {
      console.error(`${this.name} execution error for action ${action}:`, error);
      return {
        success: false,
        error: error.message || 'An unknown error occurred during MQTT action.',
        output: null,
        metadata: {
          executionTime: Date.now() - startTime,
          action: action,
        },
      };
    }
  }

  private async connect(brokerUrl: string, options?: mqtt.IClientOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(brokerUrl, options);

      this.client.on('connect', () => {
        console.log('MQTT Agent: Connected to broker.');
        resolve({ connected: true, brokerUrl });
      });

      this.client.on('error', (error) => {
        console.error('MQTT Agent: Connection error:', error);
        this.client?.end();
        this.client = null;
        reject(new Error(`MQTT connection failed: ${error.message}`));
      });

      this.client.on('message', (topic, message) => {
        const callback = this.subscriptions.get(topic);
        if (callback) {
          callback(message);
        } else {
          console.log(`MQTT Agent: Received message on unsubscribed topic ${topic}: ${message.toString()}`);
        }
      });
    });
  }

  private async publish(topic: string, message: string | Buffer, options?: mqtt.IClientPublishOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client?.publish(topic, message, options, (error) => {
        if (error) {
          console.error('MQTT Agent: Publish error:', error);
          reject(new Error(`MQTT publish failed: ${error.message}`));
        } else {
          resolve({ published: true, topic, message: message.toString() });
        }
      });
    });
  }

  private async subscribe(topic: string, options?: mqtt.IClientSubscribeOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client?.subscribe(topic, options, (error, granted) => {
        if (error) {
          console.error('MQTT Agent: Subscribe error:', error);
          reject(new Error(`MQTT subscribe failed: ${error.message}`));
        } else {
          // Store a generic callback for the topic, actual handling will be external
          this.subscriptions.set(topic, (msg) => console.log(`MQTT Agent: Default handler for ${topic}: ${msg.toString()}`));
          resolve({ subscribed: true, topic, granted });
        }
      });
    });
  }

  private async unsubscribe(topic: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client?.unsubscribe(topic, (error) => {
        if (error) {
          console.error('MQTT Agent: Unsubscribe error:', error);
          reject(new Error(`MQTT unsubscribe failed: ${error.message}`));
        } else {
          this.subscriptions.delete(topic);
          resolve({ unsubscribed: true, topic });
        }
      });
    });
  }

  private async disconnect(): Promise<any> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, () => {
          console.log('MQTT Agent: Disconnected from broker.');
          this.client = null;
          this.subscriptions.clear();
          resolve({ disconnected: true });
        });
      } else {
        resolve({ disconnected: false, message: 'Not connected.' });
      }
    });
  }

  async canHandle(query: string): Promise<number> {
    const lowerQuery = query.toLowerCase();
    const keywords = ['mqtt', 'iot', 'broker', 'publish', 'subscribe', 'connect', 'sensor'];
    const matchCount = keywords.filter(keyword => lowerQuery.includes(keyword)).length;
    return matchCount > 0 ? 0.7 : 0;
  }

  async getRequiredParameters(action: string): Promise<AgentParameter[]> {
    switch (action) {
      case 'connect':
        return [{ name: 'brokerUrl', type: 'string', required: true, description: 'URL of the MQTT broker (e.g., mqtt://broker.hivemq.com)' }];
      case 'publish':
        return [
          { name: 'topic', type: 'string', required: true, description: 'MQTT topic to publish to.' },
          { name: 'message', type: 'string', required: true, description: 'Message content to publish.' },
        ];
      case 'subscribe':
        return [{ name: 'topic', type: 'string', required: true, description: 'MQTT topic to subscribe to.' }];
      case 'unsubscribe':
        return [{ name: 'topic', type: 'string', required: true, description: 'MQTT topic to unsubscribe from.' }];
      default:
        return [];
    }
  }

  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: 'mqtt_connect',
        description: 'Connects to an MQTT broker.',
        requiredParameters: await this.getRequiredParameters('connect'),
      },
      {
        name: 'mqtt_publish',
        description: 'Publishes a message to a specified MQTT topic.',
        requiredParameters: await this.getRequiredParameters('publish'),
      },
      {
        name: 'mqtt_subscribe',
        description: 'Subscribes to a specified MQTT topic to receive messages.',
        requiredParameters: await this.getRequiredParameters('subscribe'),
      },
      {
        name: 'mqtt_unsubscribe',
        description: 'Unsubscribes from a specified MQTT topic.',
        requiredParameters: await this.getRequiredParameters('unsubscribe'),
      },
      {
        name: 'mqtt_disconnect',
        description: 'Disconnects from the MQTT broker.',
        requiredParameters: [],
      },
    ];
  }
}
