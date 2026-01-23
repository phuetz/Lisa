import { Ros, Topic, Service } from 'roslib';
import { AgentDomains } from '../core/types';
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../core/types';
import { z } from 'zod';

// Message type is not exported by roslib, use any for now
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Message = any;

export const RosAgentConfigSchema = z.object({
  url: z.string().url('URL must be a valid URL').describe('URL du rosbridge WebSocket (ex: ws://localhost:9090)'),
  topic: z.string().min(1, 'Topic name is required').describe('Nom du topic ou service ROS'),
  messageType: z.string().min(1, 'Message type is required').describe('Type du message ou service ROS (ex: std_msgs/String, geometry_msgs/Twist)'),
  mode: z.enum(['publish', 'subscribe', 'service']).describe('Mode d\'opération ROS'),
  payload: z.record(z.string(), z.any()).optional().describe('Contenu du message ou de la requête en JSON (pour Publish/Service)'),
  timeout: z.number().int().positive('Timeout must be a positive number').default(5000).optional().describe('Délai d\'attente en ms (défaut: 5000)'),
});

export type RosAgentParams = {
  url: string;
  topic: string;
  messageType: string;
  mode: 'publish' | 'subscribe' | 'service';
  payload?: { [key: string]: any };
  timeout?: number;
};

export class RosAgent implements BaseAgent {
  name = 'RosAgent';
  description = 'Interacts with ROS topics and services via rosbridge_suite.';
  version = '1.0.0';
  domain = AgentDomains.INTEGRATION;
  capabilities = ['publish', 'subscribe', 'service'];

  private ros: Ros | null = null;
  private currentTopic: Topic | null = null;
  private subscriptionCallback: ((message: Message) => void) | null = null;

  private async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ros) {
        resolve();
        return;
      }

      this.ros = new Ros({
        url: url
      });

      this.ros.on('connection', () => {
        resolve();
      });

      this.ros.on('error', (error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      });

      this.ros.on('close', () => {
        this.ros = null;
      });
    });
  }

  private disconnect(): void {
    if (this.ros) {
      if (this.currentTopic && this.subscriptionCallback) {
        this.currentTopic.unsubscribe(this.subscriptionCallback);
        this.subscriptionCallback = null;
      }
      this.ros.close();
      this.ros = null;
    }
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { url, topic: topicName, messageType, mode, payload, timeout = 5000 } = props.parameters as RosAgentParams;

    if (!url || !topicName || !messageType || !mode) {
      return { success: false, output: null, error: 'Missing required ROS agent parameters: url, topic, messageType, mode.' };
    }

    try {
      await this.connect(url);

      if (!this.ros) {
        throw new Error('ROS connection not established.');
      }

      switch (mode) {
        case 'publish': {
          if (!payload) {
            throw new Error('Payload is required for publish mode.');
          }
          const publishTopic = new Topic({
            ros: this.ros,
            name: topicName,
            messageType: messageType
          });
          // Create a simple object as message since Message constructor is not available
          publishTopic.publish(payload);
          return { success: true, output: { ok: true, message: 'Published successfully.' } };
        }
        case 'subscribe': {
          return new Promise((resolve, reject) => {
            const subscribeTopic = new Topic({
              ros: this.ros as Ros,
              name: topicName,
              messageType: messageType
            });

            const subscriptionCallback = (message: Message) => {
              console.log(`Received message on ${topicName}:`, message);
              subscribeTopic.unsubscribe(subscriptionCallback);
              this.disconnect();
              resolve({ success: true, output: message });
            };

            subscribeTopic.subscribe(subscriptionCallback);

            setTimeout(() => {
              subscribeTopic.unsubscribe(subscriptionCallback);
              this.disconnect();
              reject(new Error(`Subscription to ${topicName} timed out after ${timeout}ms.`));
            }, timeout);
          });
        }
        case 'service': {
          if (!payload) {
            throw new Error('Payload is required for service mode.');
          }
          const rosService = new Service({
            ros: this.ros,
            name: topicName,
            serviceType: messageType
          });

          return new Promise((resolve, reject) => {
            rosService.callService(payload, (response: Message) => {
              this.disconnect();
              resolve({ success: true, output: response });
            }, (error: Message) => {
              this.disconnect();
              reject(new Error(`Service call to ${topicName} failed: ${error}`));
            });

            setTimeout(() => {
              this.disconnect();
              reject(new Error(`Service call to ${topicName} timed out after ${timeout}ms.`));
            }, timeout);
          });
        }
        default:
          throw new Error(`Unsupported ROS mode: ${mode}`);
      }
    } catch (error: unknown) {
      this.disconnect();
      const errorMessage = error instanceof Error ? error.message : 'Unknown ROS agent error';
      return { success: false, output: null, error: errorMessage };
    }
  }
}
