/**
 * UnrealEngineService.ts
 * 
 * Service for communicating with Unreal Engine 5.6 MetaHuman instance
 * Handles WebSocket communication, avatar control, and real-time synchronization
 */

export interface MetaHumanCommand {
  type: 'expression' | 'speech' | 'pose' | 'animation' | 'blendshape' | 'camera' | 'lighting' | 'lumen' | 'nanite' | 'chaos' | 'metasound';
  data: any;
  timestamp?: number;
  id?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  ue56Features?: {
    useLumen?: boolean;
    useNanite?: boolean;
    useChaosPhysics?: boolean;
    useMetaSounds?: boolean;
  };
}

export interface MetaHumanExpression {
  name: string;
  intensity: number;
  duration?: number;
  blendMode?: 'replace' | 'additive';
}

export interface MetaHumanSpeech {
  text: string;
  audioUrl?: string;
  visemes?: Array<{ time: number; viseme: string; intensity: number }>;
  duration?: number;
  voice?: string;
}

export interface MetaHumanPose {
  name: string;
  transition?: number;
  loop?: boolean;
}

export interface MetaHumanBlendShape {
  name: string;
  value: number;
  transition?: number;
}

export class UnrealEngineService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: MetaHumanCommand[] = [];
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  // Default Unreal Engine WebSocket endpoint
  private readonly defaultEndpoint = 'ws://localhost:8080/metahuman';
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || this.defaultEndpoint;
    this.setupEventListeners();
  }

  /**
   * Connect to Unreal Engine instance
   */
  async connect(): Promise<boolean> {
    try {
      console.info(`Connecting to Unreal Engine at ${this.endpoint}...`);

      this.ws = new WebSocket(this.endpoint);

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('Failed to create WebSocket'));
          return;
        }

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.processMessageQueue();
          this.emit('connected');
          resolve(true);
        };

        this.ws.onerror = (error) => {
          console.error('Unreal Engine connection error:', error);
          this.isConnected = false;
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.emit('disconnected');
          this.handleReconnection();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Failed to connect to Unreal Engine:', error);
      return false;
    }
  }

  /**
   * Disconnect from Unreal Engine
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Send command to Unreal Engine
   */
  sendCommand(command: MetaHumanCommand): boolean {
    const commandWithId = {
      ...command,
      id: this.generateId(),
      timestamp: Date.now()
    };

    if (!this.isConnected || !this.ws) {
      console.warn('Not connected to Unreal Engine, queuing command:', command.type);
      this.messageQueue.push(commandWithId);
      return false;
    }

    try {
      this.ws.send(JSON.stringify(commandWithId));
      return true;
    } catch (error) {
      console.error('Failed to send command:', error);
      this.messageQueue.push(commandWithId);
      return false;
    }
  }

  /**
   * Set MetaHuman facial expression
   */
  setExpression(expression: MetaHumanExpression): boolean {
    return this.sendCommand({
      type: 'expression',
      data: expression
    });
  }

  /**
   * Make MetaHuman speak with lip sync
   */
  speak(speech: MetaHumanSpeech): boolean {
    return this.sendCommand({
      type: 'speech',
      data: speech
    });
  }

  /**
   * Set MetaHuman pose
   */
  setPose(pose: MetaHumanPose): boolean {
    return this.sendCommand({
      type: 'pose',
      data: pose
    });
  }

  /**
   * Configure Lumen lighting (UE 5.6)
   */
  configureLumen(settings: {
    globalIllumination?: boolean;
    reflections?: boolean;
    quality?: 'low' | 'medium' | 'high' | 'epic';
    updateRate?: number;
  }): boolean {
    return this.sendCommand({
      type: 'lumen',
      data: settings,
      ue56Features: { useLumen: true }
    });
  }

  /**
   * Configure Nanite virtualized geometry (UE 5.6)
   */
  configureNanite(settings: {
    enabled?: boolean;
    clusterCulling?: boolean;
    programmableRaster?: boolean;
    maxTriangles?: number;
  }): boolean {
    return this.sendCommand({
      type: 'nanite',
      data: settings,
      ue56Features: { useNanite: true }
    });
  }

  /**
   * Configure Chaos Physics (UE 5.6)
   */
  configureChaosPhysics(settings: {
    enabled?: boolean;
    clothSimulation?: boolean;
    hairPhysics?: boolean;
    fluidSimulation?: boolean;
  }): boolean {
    return this.sendCommand({
      type: 'chaos',
      data: settings,
      ue56Features: { useChaosPhysics: true }
    });
  }

  /**
   * Play MetaSound (UE 5.6)
   */
  playMetaSound(settings: {
    soundAsset: string;
    volume?: number;
    pitch?: number;
    spatialAudio?: boolean;
    position?: { x: number; y: number; z: number };
  }): boolean {
    return this.sendCommand({
      type: 'metasound',
      data: settings,
      ue56Features: { useMetaSounds: true }
    });
  }

  /**
   * Control individual blend shapes
   */
  setBlendShape(blendShape: MetaHumanBlendShape): boolean {
    return this.sendCommand({
      type: 'blendshape',
      data: blendShape
    });
  }

  /**
   * Control camera in Unreal Engine
   */
  setCamera(position: { x: number; y: number; z: number }, rotation: { x: number; y: number; z: number }): boolean {
    return this.sendCommand({
      type: 'camera',
      data: { position, rotation }
    });
  }

  /**
   * Control lighting
   */
  setLighting(lighting: { intensity: number; color: string; direction?: { x: number; y: number; z: number } }): boolean {
    return this.sendCommand({
      type: 'lighting',
      data: lighting
    });
  }

  /**
   * Check if connected to Unreal Engine
   */
  isConnectedToUnreal(): boolean {
    return this.isConnected;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (...args: any[]) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Handle incoming messages from Unreal Engine
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.emit('message', message);

      // Handle specific message types
      switch (message.type) {
        case 'status':
          this.emit('status', message.data);
          break;
        case 'error':
          this.emit('unrealError', message.data);
          break;
        case 'animation_complete':
          this.emit('animationComplete', message.data);
          break;
        case 'speech_complete':
          this.emit('speechComplete', message.data);
          break;
      }
    } catch (error) {
      console.error('Failed to parse message from Unreal Engine:', error);
    }
  }

  /**
   * Process queued messages when connection is restored
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const command = this.messageQueue.shift();
      if (command && this.ws) {
        try {
          this.ws.send(JSON.stringify(command));
        } catch (error) {
          console.error('Failed to process queued command:', error);
          // Put it back at the front of the queue
          this.messageQueue.unshift(command);
          break;
        }
      }
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  /**
   * Setup default event listeners
   */
  private setupEventListeners(): void {
    this.on('error', (error: any) => {
      console.error('[UnrealEngineService] Error:', error);
    });
  }

  /**
   * Generate unique ID for commands
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}

// Singleton instance
export const unrealEngineService = new UnrealEngineService();

export default unrealEngineService;
