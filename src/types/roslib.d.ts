/**
 * Type declarations for roslib
 * ROS (Robot Operating System) JavaScript library
 */

declare module 'roslib' {
  export interface RosOptions {
    url: string;
    transportLibrary?: string;
    transportOptions?: Record<string, unknown>;
  }

  export interface TopicOptions {
    ros: Ros;
    name: string;
    messageType: string;
    compression?: string;
    throttle_rate?: number;
    queue_size?: number;
    latch?: boolean;
    queue_length?: number;
  }

  export interface ServiceOptions {
    ros: Ros;
    name: string;
    serviceType: string;
  }

  export interface ServiceRequest {
    [key: string]: unknown;
  }

  export interface ServiceResponse {
    [key: string]: unknown;
  }

  export interface Message {
    [key: string]: unknown;
  }

  export class Ros {
    constructor(options: RosOptions);
    connect(url: string): void;
    close(): void;
    on(eventName: string, callback: (event?: unknown) => void): void;
    off(eventName: string, callback?: (event?: unknown) => void): void;
    authenticate(
      mac: string,
      client: string,
      dest: string,
      rand: string,
      t: number,
      level: string,
      end: string
    ): void;
    callOnConnection(callback: () => void): void;
    getTopics(callback: (topics: string[]) => void, failedCallback?: (error: Error) => void): void;
    getServices(callback: (services: string[]) => void, failedCallback?: (error: Error) => void): void;
    getNodes(callback: (nodes: string[]) => void, failedCallback?: (error: Error) => void): void;
  }

  export class Topic {
    constructor(options: TopicOptions);
    subscribe(callback: (message: Message) => void): void;
    unsubscribe(callback?: (message: Message) => void): void;
    advertise(): void;
    unadvertise(): void;
    publish(message: Message): void;
  }

  export class Service {
    constructor(options: ServiceOptions);
    callService(
      request: ServiceRequest,
      callback: (response: ServiceResponse) => void,
      failedCallback?: (error: Error) => void
    ): void;
    advertiseService(callback: (request: ServiceRequest, response: ServiceResponse) => void): void;
    unadvertiseService(): void;
  }

  export class Param {
    constructor(options: { ros: Ros; name: string });
    get(callback: (value: unknown) => void, failedCallback?: (error: Error) => void): void;
    set(value: unknown, callback?: () => void, failedCallback?: (error: Error) => void): void;
    delete(callback?: () => void, failedCallback?: (error: Error) => void): void;
  }

  const ROSLIB: {
    Ros: typeof Ros;
    Topic: typeof Topic;
    Service: typeof Service;
    Param: typeof Param;
  };

  export default ROSLIB;
}
