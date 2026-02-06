/**
 * Service de pont ROS Bridge pour communication avec les robots ROS2
 */

import WebSocket from 'ws';
import { API_CONFIG } from '../config.js';

export interface RosMessage {
  op: 'publish' | 'subscribe' | 'unsubscribe' | 'call_service' | 'advertise' | 'unadvertise';
  topic?: string;
  type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  msg?: any;
  service?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any;
  id?: string;
}

export interface RobotCommand {
  linear: { x: number; y: number; z: number };
  angular: { x: number; y: number; z: number };
}

export interface RobotStatus {
  connected: boolean;
  position?: { x: number; y: number; z: number };
  orientation?: { x: number; y: number; z: number; w: number };
  battery?: number;
  lastUpdate: Date;
}

class RosBridgeService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private messageQueue: RosMessage[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private subscribers = new Map<string, (data: any) => void>();

  constructor() {
    this.connect();
  }

  private async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      console.log(`Tentative de connexion à ROS Bridge: ${API_CONFIG.robot.rosBridgeUrl}`);
      
      this.ws = new WebSocket(API_CONFIG.robot.rosBridgeUrl);

      this.ws.on('open', () => {
        console.log('Connexion ROS Bridge établie');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Traiter la queue de messages en attente
        this.processMessageQueue();
        
        // S'abonner aux topics de base
        this.subscribeToBasicTopics();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleIncomingMessage(message);
        } catch (error) {
          console.error('Erreur parsing message ROS:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('Connexion ROS Bridge fermée');
        this.ws = null;
        this.isConnecting = false;
        this.scheduleReconnect();
      });

      this.ws.on('error', (error: Error) => {
        console.error('Erreur ROS Bridge:', error);
        this.isConnecting = false;
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('Erreur connexion ROS Bridge:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Reconnexion ROS Bridge dans ${delay}ms (tentative ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Nombre maximum de tentatives de reconnexion atteint');
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private subscribeToBasicTopics(): void {
    // S'abonner aux topics de base du robot
    this.subscribe('/robot_state', 'lisa_msgs/RobotState');
    this.subscribe('/odom', 'nav_msgs/Odometry');
    this.subscribe('/battery_state', 'sensor_msgs/BatteryState');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleIncomingMessage(message: any): void {
    if (message.topic && this.subscribers.has(message.topic)) {
      const callback = this.subscribers.get(message.topic);
      if (callback) {
        callback(message.msg);
      }
    }
  }

  public sendMessage(message: RosMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Ajouter à la queue si pas connecté
      this.messageQueue.push(message);
      if (!this.isConnecting) {
        this.connect();
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public subscribe(topic: string, messageType: string, callback?: (data: any) => void): void {
    const message: RosMessage = {
      op: 'subscribe',
      topic,
      type: messageType
    };

    if (callback) {
      this.subscribers.set(topic, callback);
    }

    this.sendMessage(message);
  }

  public unsubscribe(topic: string): void {
    const message: RosMessage = {
      op: 'unsubscribe',
      topic
    };

    this.subscribers.delete(topic);
    this.sendMessage(message);
  }

  public publish(topic: string, messageType: string, data: any): void {
    const message: RosMessage = {
      op: 'publish',
      topic,
      type: messageType,
      msg: data
    };

    this.sendMessage(message);
  }

  public async moveRobot(command: RobotCommand): Promise<boolean> {
    try {
      // Valider les limites de vitesse
      const linear = {
        x: Math.max(-API_CONFIG.robot.maxLinearVelocity, 
            Math.min(API_CONFIG.robot.maxLinearVelocity, command.linear.x)),
        y: Math.max(-API_CONFIG.robot.maxLinearVelocity, 
            Math.min(API_CONFIG.robot.maxLinearVelocity, command.linear.y)),
        z: 0
      };

      const angular = {
        x: 0,
        y: 0,
        z: Math.max(-API_CONFIG.robot.maxAngularVelocity, 
            Math.min(API_CONFIG.robot.maxAngularVelocity, command.angular.z))
      };

      const cmdVel = {
        linear,
        angular
      };

      this.publish('/cmd_vel', 'geometry_msgs/Twist', cmdVel);
      return true;
    } catch (error) {
      console.error('Erreur envoi commande mouvement:', error);
      return false;
    }
  }

  public async sayText(text: string, language: string = 'fr'): Promise<boolean> {
    try {
      const ttsMessage = {
        text,
        language,
        voice: 'default'
      };

      this.publish('/tts/say', 'lisa_msgs/TTSRequest', ttsMessage);
      return true;
    } catch (error) {
      console.error('Erreur envoi commande TTS:', error);
      return false;
    }
  }

  public async getRobotStatus(): Promise<RobotStatus> {
    return new Promise((resolve) => {
      const status: RobotStatus = {
        connected: this.ws?.readyState === WebSocket.OPEN,
        lastUpdate: new Date()
      };

      // Timeout pour éviter d'attendre indéfiniment
      const timeout = setTimeout(() => {
        resolve(status);
      }, 1000);

      // Écouter temporairement le status du robot
      const statusCallback = (data: any) => {
        clearTimeout(timeout);
        this.subscribers.delete('/robot_state');
        
        resolve({
          connected: true,
          position: data.position,
          orientation: data.orientation,
          battery: data.battery_percentage,
          lastUpdate: new Date()
        });
      };

      this.subscribe('/robot_state', 'lisa_msgs/RobotState', statusCallback);
    });
  }

  public async emergencyStop(): Promise<boolean> {
    try {
      // Arrêt d'urgence - vitesse zéro
      const stopCommand: RobotCommand = {
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      };

      await this.moveRobot(stopCommand);
      
      // Publier aussi sur le topic d'arrêt d'urgence
      this.publish('/safety/estop', 'std_msgs/Bool', { data: true });
      
      return true;
    } catch (error) {
      console.error('Erreur arrêt d\'urgence:', error);
      return false;
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || false;
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.messageQueue.length = 0;
  }
}

// Instance singleton
export const rosBridgeService = new RosBridgeService();
