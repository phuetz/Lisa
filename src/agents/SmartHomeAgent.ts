/**
 * SmartHomeAgent - Controls and manages smart home devices
 * 
 * This agent handles interactions with smart home devices and systems,
 * allowing control of lights, heating, and other connected devices.
 */

import { AgentDomains } from './types';
import type { 
  AgentCapability, 
  AgentExecuteProps,
  AgentExecuteResult, 
  AgentParameter, 
  BaseAgent 
} from './types';

/**
 * Supported device types for smart home control
 */
export type SmartDeviceType = 'light' | 'thermostat' | 'speaker' | 'tv' | 'blinds' | 'lock' | 'camera' | 'outlet';

/**
 * Device control actions
 */
export type DeviceAction = 'toggle' | 'on' | 'off' | 'increase' | 'decrease' | 'set';

/**
 * Smart home scene definition
 */
export interface SmartHomeScene {
  id: string;
  name: string;
  description: string;
  deviceStates: Record<string, any>;
}

/**
 * Supported intents for SmartHomeAgent
 */
export type SmartHomeIntent = 
  | 'toggle_device'
  | 'get_device_status'
  | 'set_device_value'
  | 'run_scene'
  | 'list_devices'
  | 'list_scenes';

/**
 * Agent for controlling and managing smart home devices
 */
export class SmartHomeAgent implements BaseAgent {
  name = 'SmartHomeAgent';
  description = 'Contrôle les appareils connectés et gère les scénarios domotiques';
  version = '1.0.0';
  domain = AgentDomains.INTEGRATION;
  capabilities = [
    'device_control',
    'scene_management',
    'status_monitoring',
    'device_discovery'
  ];

  // Mock data for demo purposes
  private devices: Record<string, {type: SmartDeviceType, status: any}> = {
    'salon_lumiere': { type: 'light', status: { on: false, brightness: 80, color: 'warm' } },
    'salon_thermostat': { type: 'thermostat', status: { on: true, temperature: 21, mode: 'heat' } },
    'cuisine_lumiere': { type: 'light', status: { on: true, brightness: 100, color: 'cool' } },
    'chambre_lumiere': { type: 'light', status: { on: false, brightness: 50, color: 'warm' } },
    'entree_lock': { type: 'lock', status: { locked: true } }
  };

  private scenes: SmartHomeScene[] = [
    {
      id: 'film',
      name: 'Mode Film',
      description: 'Configure les lumières et le thermostat pour regarder un film',
      deviceStates: {
        'salon_lumiere': { on: true, brightness: 30, color: 'warm' },
        'salon_thermostat': { on: true, temperature: 22, mode: 'heat' }
      }
    },
    {
      id: 'nuit',
      name: 'Mode Nuit',
      description: 'Éteint les lumières principales et laisse des veilleuses',
      deviceStates: {
        'salon_lumiere': { on: false },
        'cuisine_lumiere': { on: false },
        'chambre_lumiere': { on: true, brightness: 10, color: 'warm' },
        'entree_lock': { locked: true }
      }
    }
  ];

  /**
   * Main execution method for the agent
   */
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const intent = props.intent as SmartHomeIntent;
    const parameters = props.parameters || {};

    try {
      let result;
      switch (intent) {
        case 'toggle_device':
          result = await this.toggleDevice(
            parameters.deviceId,
            parameters.action || 'toggle'
          );
          break;
        case 'get_device_status':
          result = await this.getDeviceStatus(parameters.deviceId);
          break;
        case 'set_device_value':
          result = await this.setDeviceValue(
            parameters.deviceId, 
            parameters.property, 
            parameters.value
          );
          break;
        case 'run_scene':
          result = await this.activateScene(parameters.sceneId);
          break;
        case 'list_devices':
          result = await this.listDevices(parameters.type);
          break;
        case 'list_scenes':
          result = await this.listScenes();
          break;
        default:
          return {
            success: false,
            output: `Intent non supporté: ${intent}`,
            error: new Error('UNSUPPORTED_INTENT'),
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
      }

      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Determines if this agent can handle a specific query
   */
  async canHandle(query: string, _context?: any): Promise<number> {
    const normalizedQuery = query.toLowerCase();
    
    // Keywords related to smart home control
    const deviceKeywords = ['lumière', 'lumiere', 'thermostat', 'chauffage', 'température', 
      'porte', 'serrure', 'volet', 'télé', 'télévision', 'tv', 'prise'];
    
    const actionKeywords = ['allumer', 'éteindre', 'augmenter', 'diminuer', 'ouvrir', 'fermer',
      'verrouiller', 'déverrouiller', 'régler', 'mettre', 'activer', 'configurer'];
    
    const sceneKeywords = ['mode', 'scène', 'scene', 'ambiance', 'scénario'];
    
    // Check for device keywords
    const hasDeviceKeyword = deviceKeywords.some(keyword => 
      normalizedQuery.includes(keyword));
    
    // Check for action keywords
    const hasActionKeyword = actionKeywords.some(keyword => 
      normalizedQuery.includes(keyword));
      
    // Check for scene keywords
    const hasSceneKeyword = sceneKeywords.some(keyword => 
      normalizedQuery.includes(keyword));
    
    // Calculate score
    let score = 0;
    if (hasDeviceKeyword) score += 0.4;
    if (hasActionKeyword) score += 0.3;
    if (hasSceneKeyword) score += 0.3;
    
    // Additional bonus for specific device mentions
    Object.keys(this.devices).forEach(deviceId => {
      const deviceName = deviceId.replace('_', ' ');
      if (normalizedQuery.includes(deviceName)) {
        score += 0.2;
      }
    });
    
    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Returns required parameters for a specific task
   */
  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    const normalizedTask = task.toLowerCase();
    
    if (normalizedTask.includes('allumer') || normalizedTask.includes('éteindre') || 
        normalizedTask.includes('augmenter') || normalizedTask.includes('diminuer')) {
      return [
        {
          name: 'deviceId',
          type: 'string',
          required: true,
          description: 'Identifiant de l\'appareil à contrôler'
        },
        {
          name: 'action',
          type: 'string',
          required: false,
          description: 'Action à effectuer (toggle, on, off, increase, decrease)',
          defaultValue: 'toggle'
        }
      ];
    }
    
    if (normalizedTask.includes('statut') || normalizedTask.includes('état')) {
      return [
        {
          name: 'deviceId',
          type: 'string',
          required: true,
          description: 'Identifiant de l\'appareil'
        }
      ];
    }
    
    if (normalizedTask.includes('scène') || normalizedTask.includes('scene') || 
        normalizedTask.includes('mode') || normalizedTask.includes('scénario')) {
      return [
        {
          name: 'sceneId',
          type: 'string',
          required: true,
          description: 'Identifiant de la scène à activer'
        }
      ];
    }
    
    return [];
  }

  /**
   * Returns detailed capability information
   */
  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: 'device_control',
        description: 'Contrôle des appareils domotiques (allumer/éteindre)',
        requiredParameters: [
          {
            name: 'deviceId',
            type: 'string',
            required: true,
            description: 'Identifiant de l\'appareil'
          },
          {
            name: 'action',
            type: 'string',
            required: false,
            description: 'Action à effectuer'
          }
        ]
      },
      {
        name: 'scene_management',
        description: 'Gestion des scénarios domotiques',
        requiredParameters: [
          {
            name: 'sceneId',
            type: 'string',
            required: true,
            description: 'Identifiant de la scène'
          }
        ]
      }
    ];
  }

  /**
   * Validates input parameters
   */
  async validateInput(props: AgentExecuteProps): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const intent = props.intent as SmartHomeIntent;
    const parameters = props.parameters || {};
    
    switch (intent) {
      case 'toggle_device':
      case 'get_device_status':
      case 'set_device_value':
        if (!parameters.deviceId) {
          errors.push('deviceId est requis');
        } else if (!this.devices[parameters.deviceId]) {
          errors.push(`L'appareil ${parameters.deviceId} n'existe pas`);
        }
        
        if (intent === 'set_device_value' && !parameters.property) {
          errors.push('property est requis pour set_device_value');
        }
        break;
        
      case 'run_scene':
        if (!parameters.sceneId) {
          errors.push('sceneId est requis');
        } else if (!this.scenes.find(s => s.id === parameters.sceneId)) {
          errors.push(`La scène ${parameters.sceneId} n'existe pas`);
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Toggle or control a specific device
   */
  private async toggleDevice(deviceId: string, action: DeviceAction): Promise<any> {
    if (!this.devices[deviceId]) {
      throw new Error(`Appareil non trouvé: ${deviceId}`);
    }
    
    const device = this.devices[deviceId];
    
    switch (action) {
      case 'toggle':
        device.status.on = !device.status.on;
        break;
      case 'on':
        device.status.on = true;
        break;
      case 'off':
        device.status.on = false;
        break;
      case 'increase':
        if ('brightness' in device.status) {
          device.status.brightness = Math.min(100, device.status.brightness + 10);
        } else if ('temperature' in device.status) {
          device.status.temperature++;
        }
        break;
      case 'decrease':
        if ('brightness' in device.status) {
          device.status.brightness = Math.max(0, device.status.brightness - 10);
        } else if ('temperature' in device.status) {
          device.status.temperature--;
        }
        break;
      default:
        throw new Error(`Action non supportée: ${action}`);
    }
    
    return {
      deviceId,
      type: device.type,
      status: device.status,
      action
    };
  }

  /**
   * Get the status of a specific device
   */
  private async getDeviceStatus(deviceId: string): Promise<any> {
    if (!deviceId) {
      return Object.entries(this.devices).map(([id, data]) => ({
        deviceId: id,
        type: data.type,
        status: data.status
      }));
    }
    
    if (!this.devices[deviceId]) {
      throw new Error(`Appareil non trouvé: ${deviceId}`);
    }
    
    const device = this.devices[deviceId];
    return {
      deviceId,
      type: device.type,
      status: device.status
    };
  }

  /**
   * Set a specific value for a device property
   */
  private async setDeviceValue(deviceId: string, property: string, value: any): Promise<any> {
    if (!this.devices[deviceId]) {
      throw new Error(`Appareil non trouvé: ${deviceId}`);
    }
    
    const device = this.devices[deviceId];
    
    if (!(property in device.status)) {
      throw new Error(`Propriété non trouvée: ${property}`);
    }
    
    device.status[property] = value;
    
    return {
      deviceId,
      type: device.type,
      status: device.status
    };
  }

  /**
   * Activate a scene (applies multiple device settings at once)
   */
  private async activateScene(sceneId: string): Promise<any> {
    const scene = this.scenes.find(s => s.id === sceneId);
    
    if (!scene) {
      throw new Error(`Scène non trouvée: ${sceneId}`);
    }
    
    const results: Record<string, any> = {};
    
    // Apply all device states defined in the scene
    for (const [deviceId, state] of Object.entries(scene.deviceStates)) {
      if (this.devices[deviceId]) {
        // Update device state
        this.devices[deviceId].status = {
          ...this.devices[deviceId].status,
          ...state
        };
        
        results[deviceId] = {
          type: this.devices[deviceId].type,
          status: this.devices[deviceId].status
        };
      }
    }
    
    return {
      sceneId,
      sceneName: scene.name,
      deviceResults: results
    };
  }

  /**
   * List available devices, optionally filtered by type
   */
  private async listDevices(type?: SmartDeviceType): Promise<any> {
    const deviceList = Object.entries(this.devices)
      .filter(([_, data]) => !type || data.type === type)
      .map(([id, data]) => ({
        deviceId: id,
        type: data.type,
        status: data.status
      }));
    
    return {
      count: deviceList.length,
      devices: deviceList
    };
  }

  /**
   * List available scenes
   */
  private async listScenes(): Promise<any> {
    return {
      count: this.scenes.length,
      scenes: this.scenes.map(scene => ({
        id: scene.id,
        name: scene.name,
        description: scene.description
      }))
    };
  }
}
