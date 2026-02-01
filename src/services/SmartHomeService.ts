/**
 * 🏠 Smart Home Service - Automatisation Maison Intelligente
 * Intégration SmartHomeAgent + MQTTAgent + VisionAgent
 */

import { agentRegistry } from '../features/agents/core/registry';

export interface SmartDevice {
  id: string;
  name: string;
  type: 'light' | 'thermostat' | 'switch' | 'sensor' | 'camera' | 'lock' | 'speaker';
  room: string;
  status: 'online' | 'offline' | 'unknown';
  state: Record<string, unknown>;
  lastUpdate: Date;
  capabilities: string[];
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AutomationTrigger {
  type: 'time' | 'device_state' | 'presence' | 'voice' | 'schedule';
  config: Record<string, unknown>;
}

export interface AutomationCondition {
  type: 'time_range' | 'device_state' | 'day_of_week';
  config: Record<string, unknown>;
}

export interface AutomationAction {
  type: 'device_control' | 'notification' | 'scene' | 'delay';
  deviceId?: string;
  config: Record<string, unknown>;
}

export interface Scene {
  id: string;
  name: string;
  icon: string;
  devices: { deviceId: string; state: Record<string, unknown> }[];
}

class SmartHomeServiceImpl {
  private devices: Map<string, SmartDevice> = new Map();
  private rules: Map<string, AutomationRule> = new Map();
  private scenes: Map<string, Scene> = new Map();
  private listeners: Set<(devices: SmartDevice[]) => void> = new Set();
  private presenceDetectionEnabled = false;

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultScenes();
  }

  /**
   * Initialiser les scènes par défaut
   */
  private initializeDefaultScenes(): void {
    const defaultScenes: Scene[] = [
      {
        id: 'scene_morning',
        name: 'Réveil',
        icon: '🌅',
        devices: [],
      },
      {
        id: 'scene_away',
        name: 'Absent',
        icon: '🚪',
        devices: [],
      },
      {
        id: 'scene_night',
        name: 'Nuit',
        icon: '🌙',
        devices: [],
      },
      {
        id: 'scene_movie',
        name: 'Film',
        icon: '🎬',
        devices: [],
      },
    ];

    defaultScenes.forEach(scene => {
      if (!this.scenes.has(scene.id)) {
        this.scenes.set(scene.id, scene);
      }
    });
  }

  /**
   * Découvrir les appareils via MQTT
   */
  async discoverDevices(): Promise<SmartDevice[]> {
    const mqttAgent = await agentRegistry.getAgentAsync('MQTTAgent');
    if (!mqttAgent) {
      console.warn('MQTTAgent non disponible');
      return [];
    }

    const result = await mqttAgent.execute({
      intent: 'discover_devices',
    });

    if (result.success && Array.isArray(result.output?.devices)) {
      result.output.devices.forEach((device: SmartDevice) => {
        this.devices.set(device.id, {
          ...device,
          lastUpdate: new Date(),
        });
      });
      this.saveToStorage();
      this.notifyListeners();
    }

    return this.getAllDevices();
  }

  /**
   * Contrôler un appareil
   */
  async controlDevice(
    deviceId: string,
    command: string,
    value?: unknown
  ): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      console.error(`Appareil ${deviceId} non trouvé`);
      return false;
    }

    const smartHomeAgent = await agentRegistry.getAgentAsync('SmartHomeAgent');
    if (!smartHomeAgent) {
      console.warn('SmartHomeAgent non disponible');
      return false;
    }

    const result = await smartHomeAgent.execute({
      intent: 'control_device',
      deviceId,
      command,
      value,
    });

    if (result.success) {
      // Mettre à jour l'état local
      device.state = { ...device.state, [command]: value };
      device.lastUpdate = new Date();
      this.devices.set(deviceId, device);
      this.saveToStorage();
      this.notifyListeners();
    }

    return result.success;
  }

  /**
   * Activer une scène
   */
  async activateScene(sceneId: string): Promise<boolean> {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      console.error(`Scène ${sceneId} non trouvée`);
      return false;
    }

    const results = await Promise.all(
      scene.devices.map(async ({ deviceId, state }) => {
        const commands = Object.entries(state);
        for (const [command, value] of commands) {
          await this.controlDevice(deviceId, command, value);
        }
        return true;
      })
    );

    return results.every(r => r);
  }

  /**
   * Activer la détection de présence via Vision
   */
  async enablePresenceDetection(): Promise<void> {
    if (this.presenceDetectionEnabled) return;

    const visionAgent = await agentRegistry.getAgentAsync('VisionAgent');
    if (!visionAgent) {
      console.warn('VisionAgent non disponible pour la détection de présence');
      return;
    }

    this.presenceDetectionEnabled = true;
  }

  /**
   * Désactiver la détection de présence
   */
  disablePresenceDetection(): void {
    this.presenceDetectionEnabled = false;
  }

  /**
   * Ajouter une règle d'automatisation
   */
  addRule(rule: Omit<AutomationRule, 'id' | 'triggerCount'>): AutomationRule {
    const newRule: AutomationRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      triggerCount: 0,
    };

    this.rules.set(newRule.id, newRule);
    this.saveToStorage();

    return newRule;
  }

  /**
   * Supprimer une règle
   */
  deleteRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.saveToStorage();
  }

  /**
   * Activer/désactiver une règle
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.rules.set(ruleId, rule);
      this.saveToStorage();
    }
  }

  /**
   * Évaluer et exécuter les règles
   */
  async evaluateRules(): Promise<void> {
    const now = new Date();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const shouldTrigger = await this.evaluateTrigger(rule.trigger, now);
      if (!shouldTrigger) continue;

      const conditionsMet = await this.evaluateConditions(rule.conditions || [], now);
      if (!conditionsMet) continue;

      // Exécuter les actions
      for (const action of rule.actions) {
        await this.executeAction(action);
      }

      rule.lastTriggered = now;
      rule.triggerCount++;
      this.rules.set(rule.id, rule);
    }

    this.saveToStorage();
  }

  /**
   * Évaluer un trigger
   */
  private async evaluateTrigger(trigger: AutomationTrigger, now: Date): Promise<boolean> {
    switch (trigger.type) {
      case 'time': {
        const targetHour = trigger.config.hour as number;
        const targetMinute = trigger.config.minute as number;
        return now.getHours() === targetHour && now.getMinutes() === targetMinute;
      }
      case 'schedule': {
        const schedule = trigger.config.cron as string;
        // Simplified cron check - would need a proper cron parser
        return schedule !== undefined;
      }
      default:
        return false;
    }
  }

  /**
   * Évaluer les conditions
   */
  private async evaluateConditions(
    conditions: AutomationCondition[],
    now: Date
  ): Promise<boolean> {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'time_range': {
          const startHour = condition.config.startHour as number;
          const endHour = condition.config.endHour as number;
          const currentHour = now.getHours();
          if (currentHour < startHour || currentHour >= endHour) {
            return false;
          }
          break;
        }
        case 'day_of_week': {
          const days = condition.config.days as number[];
          if (!days.includes(now.getDay())) {
            return false;
          }
          break;
        }
      }
    }
    return true;
  }

  /**
   * Exécuter une action
   */
  private async executeAction(action: AutomationAction): Promise<void> {
    switch (action.type) {
      case 'device_control': {
        if (action.deviceId) {
          const command = action.config.command as string;
          const value = action.config.value;
          await this.controlDevice(action.deviceId, command, value);
        }
        break;
      }
      case 'scene': {
        const sceneId = action.config.sceneId as string;
        await this.activateScene(sceneId);
        break;
      }
      case 'delay': {
        const ms = action.config.milliseconds as number;
        await new Promise(resolve => setTimeout(resolve, ms));
        break;
      }
      case 'notification': {
        // Notification action handled by notification service
        break;
      }
    }
  }

  /**
   * Obtenir tous les appareils
   */
  getAllDevices(): SmartDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Obtenir un appareil par ID
   */
  getDevice(id: string): SmartDevice | undefined {
    return this.devices.get(id);
  }

  /**
   * Obtenir les appareils par pièce
   */
  getDevicesByRoom(room: string): SmartDevice[] {
    return this.getAllDevices().filter(d => d.room === room);
  }

  /**
   * Obtenir toutes les règles
   */
  getAllRules(): AutomationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Obtenir toutes les scènes
   */
  getAllScenes(): Scene[] {
    return Array.from(this.scenes.values());
  }

  /**
   * S'abonner aux changements
   */
  subscribe(callback: (devices: SmartDevice[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifier les listeners
   */
  private notifyListeners(): void {
    const devices = this.getAllDevices();
    this.listeners.forEach(callback => callback(devices));
  }

  /**
   * Sauvegarder dans localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('lisa:smarthome:devices', JSON.stringify(Array.from(this.devices.entries())));
      localStorage.setItem('lisa:smarthome:rules', JSON.stringify(Array.from(this.rules.entries())));
      localStorage.setItem('lisa:smarthome:scenes', JSON.stringify(Array.from(this.scenes.entries())));
    } catch (e) {
      console.error('Erreur sauvegarde SmartHome:', e);
    }
  }

  /**
   * Charger depuis localStorage
   */
  private loadFromStorage(): void {
    try {
      const devices = localStorage.getItem('lisa:smarthome:devices');
      const rules = localStorage.getItem('lisa:smarthome:rules');
      const scenes = localStorage.getItem('lisa:smarthome:scenes');

      if (devices) {
        const entries = JSON.parse(devices) as [string, SmartDevice][];
        this.devices = new Map(
          entries.map(([key, value]) => [key, { ...value, lastUpdate: new Date(value.lastUpdate) }])
        );
      }
      if (rules) {
        const entries = JSON.parse(rules) as [string, AutomationRule][];
        this.rules = new Map(
          entries.map(([key, value]) => [
            key,
            { ...value, lastTriggered: value.lastTriggered ? new Date(value.lastTriggered) : undefined },
          ])
        );
      }
      if (scenes) {
        this.scenes = new Map(JSON.parse(scenes));
      }
    } catch (e) {
      console.error('Erreur chargement SmartHome:', e);
    }
  }
}

// Export singleton
export const smartHomeService = new SmartHomeServiceImpl();
