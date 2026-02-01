import { Agent, AgentContext } from '../core/types';
import { Ros, Topic, Message, Service, ServiceRequest } from 'roslib';

interface RosAgentParams {
  url: string;
  topic: string;
  messageType: string;
  mode: 'publish' | 'subscribe' | 'service';
  payload?: Record<string, any>;
  timeout?: number; // ms, default 5000
}

class RosAgent implements Agent<RosAgentParams, any> {
  private ros: Ros | null = null;
  private currentTopic: Topic | null = null;
  private currentService: Service | null = null;
  private subscriptionCallback: ((message: Message) => void) | null = null;

  readonly id = 'RosAgent';
  readonly name = 'ROS Agent';
  readonly description = 'Interacts with ROS topics and services via rosbridge_suite.';

  private async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ros && this.ros.isConnected) {
        if (this.ros.url === url) {
          resolve();
          return;
        } else {
          this.ros.close();
          this.ros = null;
        }
      }

      this.ros = new Ros({ url });

      this.ros.on('connection', () => {
        console.log('Connected to rosbridge_suite.');
        resolve();
      });

      this.ros.on('error', (error) => {
        console.error('Error connecting to rosbridge_suite:', error);
        reject(new Error(`Failed to connect to ROS: ${error.message || error}`));
      });

      this.ros.on('close', () => {
        console.log('Disconnected from rosbridge_suite.');
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

  async execute(
    params: RosAgentParams,
    context: AgentContext
  ): Promise<any> {
    const { url, topic, messageType, mode, payload, timeout = 5000 } = params;

    if (!url || !topic || !messageType || !mode) {
      throw new Error('Missing required ROS agent parameters: url, topic, messageType, mode.');
    }

    try {
      await this.connect(url);

      if (!this.ros || !this.ros.isConnected) {
        throw new Error('ROS connection not established.');
      }

      switch (mode) {
        case 'publish': {
          if (!payload) {
            throw new Error('Payload is required for publish mode.');
          }
          this.currentTopic = new Topic({
            ros: this.ros,
            name: topic,
            messageType: messageType,
          });
          const message = new Message(payload);
          this.currentTopic.publish(message);
          return { ok: true, message: 'Published successfully.' };
        }
        case 'subscribe': {
          return new Promise((resolve, reject) => {
            this.currentTopic = new Topic({
              ros: this.ros!,
              name: topic,
              messageType: messageType,
            });

            this.subscriptionCallback = (message: Message) => {
              console.log(`Received message on ${topic}:`, message);
              this.currentTopic?.unsubscribe(this.subscriptionCallback!);
              this.subscriptionCallback = null;
              this.disconnect(); // Disconnect after receiving one message
              resolve(message);
            };

            this.currentTopic.subscribe(this.subscriptionCallback);

            const timer = setTimeout(() => {
              this.currentTopic?.unsubscribe(this.subscriptionCallback!);
              this.subscriptionCallback = null;
              this.disconnect();
              reject(new Error(`Subscription to ${topic} timed out after ${timeout}ms.`));
            }, timeout);

            // Ensure the timer is cleared if message is received before timeout
            if (this.subscriptionCallback) {
              const originalCallback = this.subscriptionCallback;
              this.subscriptionCallback = (message: Message) => {
                clearTimeout(timer);
                originalCallback(message);
              };
            }
          });
        }
        case 'service': {
          if (!payload) {
            throw new Error('Payload is required for service mode.');
          }
          this.currentService = new Service({
            ros: this.ros,
            name: topic, // For services, topic is the service name
            serviceType: messageType, // For services, messageType is the service type
          });
          const request = new ServiceRequest(payload);

          return new Promise((resolve, reject) => {
            this.currentService!.callService(request, (result) => {
              this.disconnect();
              resolve(result);
            }, (error) => {
              this.disconnect();
              reject(new Error(`Service call to ${topic} failed: ${error}`));
            });

            const timer = setTimeout(() => {
              this.disconnect();
              reject(new Error(`Service call to ${topic} timed out after ${timeout}ms.`));
            }, timeout);
          });
        }
        default:
          throw new Error(`Unsupported ROS mode: ${mode}`);
      }
    } catch (error: any) {
      this.disconnect();
      throw error;
    }
  }
}

export { RosAgent, RosAgentParams };
