import { Ros, Topic, Message, Service, ServiceRequest } from 'roslib';

export class RosService {
  private ros: Ros;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void>;
  private resolveConnection: () => void;
  private rejectConnection: (error: Error) => void;

  constructor(url: string) {
    this.ros = new Ros({ url });

    this.connectionPromise = new Promise((resolve, reject) => {
      this.resolveConnection = resolve;
      this.rejectConnection = reject;
    });

    this.ros.on('connection', () => {
      console.log('Connected to ROS Bridge.');
      this.isConnected = true;
      this.resolveConnection();
    });

    this.ros.on('error', (error) => {
      console.error('Error connecting to ROS Bridge:', error);
      this.isConnected = false;
      this.rejectConnection(new Error(`ROS connection error: ${error.message || error}`));
    });

    this.ros.on('close', () => {
      console.log('Disconnected from ROS Bridge.');
      this.isConnected = false;
      // Optionally, try to reconnect here
    });
  }

  public async ensureConnection(): Promise<void> {
    if (this.isConnected) {
      return Promise.resolve();
    }
    return this.connectionPromise;
  }

  public isCurrentlyConnected(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    this.ros.close();
  }

  public publish(topicName: string, messageType: string, message: Message): void {
    this.ensureConnection().then(() => {
      const topic = new Topic({
        ros: this.ros,
        name: topicName,
        messageType: messageType
      });
      topic.publish(message);
      console.log(`Published to ${topicName}:`, message);
    }).catch(error => {
      console.error(`Failed to publish to ${topicName}:`, error);
    });
  }

  public subscribe(topicName: string, messageType: string, callback: (message: Message) => void): Topic {
    const topic = new Topic({
      ros: this.ros,
      name: topicName,
      messageType: messageType
    });

    topic.subscribe(callback);
    console.log(`Subscribed to ${topicName}`);
    return topic;
  }

  public unsubscribe(topic: Topic): void {
    topic.unsubscribe();
    console.log(`Unsubscribed from ${topic.name}`);
  }

  public async callService(serviceName: string, serviceType: string, request: ServiceRequest): Promise<any> {
    await this.ensureConnection();

    const service = new Service({
      ros: this.ros,
      name: serviceName,
      serviceType: serviceType
    });

    return new Promise((resolve, reject) => {
      service.callService(request, (result) => {
        console.log(`Service ${serviceName} call successful:`, result);
        resolve(result);
      }, (error) => {
        console.error(`Service ${serviceName} call failed:`, error);
        reject(new Error(`ROS service call failed: ${error}`));
      });
    });
  }
}
