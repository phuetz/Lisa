/**
 * Lisa Node Manager
 * Device nodes with capabilities (like OpenClaw's iOS/Android/macOS nodes)
 * Allows Lisa to control and interact with various devices
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  platform: NodePlatform;
  capabilities: NodeCapability[];
  status: NodeStatus;
  lastSeen: Date;
  metadata: NodeMetadata;
}

export type NodeType = 'mobile' | 'desktop' | 'tablet' | 'browser' | 'iot' | 'server';
export type NodePlatform = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'web';
export type NodeStatus = 'online' | 'offline' | 'busy' | 'sleep';

export type NodeCapability = 
  | 'camera'
  | 'microphone'
  | 'speaker'
  | 'screen_capture'
  | 'notifications'
  | 'clipboard'
  | 'file_system'
  | 'browser'
  | 'location'
  | 'contacts'
  | 'calendar'
  | 'sms'
  | 'calls'
  | 'biometrics'
  | 'nfc'
  | 'bluetooth'
  | 'wifi'
  | 'shortcuts'
  | 'home_automation';

export interface NodeMetadata {
  version?: string;
  osVersion?: string;
  deviceModel?: string;
  batteryLevel?: number;
  isCharging?: boolean;
  networkType?: 'wifi' | 'cellular' | 'ethernet' | 'offline';
  ipAddress?: string;
  timezone?: string;
  locale?: string;
}

export interface NodeAction {
  type: NodeActionType;
  params: Record<string, unknown>;
  timeout?: number;
}

export type NodeActionType =
  | 'capture_screen'
  | 'capture_photo'
  | 'record_audio'
  | 'play_audio'
  | 'send_notification'
  | 'read_clipboard'
  | 'write_clipboard'
  | 'open_url'
  | 'run_shortcut'
  | 'get_location'
  | 'list_files'
  | 'read_file'
  | 'write_file'
  | 'get_contacts'
  | 'get_calendar'
  | 'send_sms'
  | 'make_call'
  | 'control_home';

export interface NodeActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

export class NodeManager extends BrowserEventEmitter {
  private nodes: Map<string, Node> = new Map();
  private actionHandlers: Map<string, Map<NodeActionType, (params: Record<string, unknown>) => Promise<unknown>>> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
  }

  // Lifecycle
  start(): void {
    // Check node health every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.checkNodeHealth();
    }, 30000);
    
    console.log('[NodeManager] Started');
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    console.log('[NodeManager] Stopped');
  }

  private checkNodeHealth(): void {
    const now = new Date();
    const timeout = 60000; // 1 minute

    this.nodes.forEach((node, id) => {
      if (node.status === 'online' && now.getTime() - node.lastSeen.getTime() > timeout) {
        this.updateNodeStatus(id, 'offline');
      }
    });
  }

  // Node registration
  registerNode(config: Omit<Node, 'id' | 'status' | 'lastSeen'>): Node {
    const id = `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    
    const node: Node = {
      ...config,
      id,
      status: 'online',
      lastSeen: new Date()
    };

    this.nodes.set(id, node);
    this.emit('node:registered', node);
    
    console.log(`[NodeManager] Node registered: ${node.name} (${node.platform})`);
    
    return node;
  }

  unregisterNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    this.nodes.delete(id);
    this.actionHandlers.delete(id);
    this.emit('node:unregistered', { id, node });
    
    return true;
  }

  // Node status
  updateNodeStatus(id: string, status: NodeStatus): void {
    const node = this.nodes.get(id);
    if (!node) return;

    const oldStatus = node.status;
    node.status = status;
    node.lastSeen = new Date();

    if (oldStatus !== status) {
      this.emit('node:status', { id, oldStatus, newStatus: status });
    }
  }

  heartbeat(id: string, metadata?: Partial<NodeMetadata>): void {
    const node = this.nodes.get(id);
    if (!node) return;

    node.lastSeen = new Date();
    
    if (metadata) {
      node.metadata = { ...node.metadata, ...metadata };
    }

    if (node.status === 'offline') {
      this.updateNodeStatus(id, 'online');
    }
  }

  // Node queries
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  listNodes(filter?: {
    type?: NodeType;
    platform?: NodePlatform;
    status?: NodeStatus;
    capability?: NodeCapability;
  }): Node[] {
    let nodes = Array.from(this.nodes.values());

    if (filter?.type) {
      nodes = nodes.filter(n => n.type === filter.type);
    }
    if (filter?.platform) {
      nodes = nodes.filter(n => n.platform === filter.platform);
    }
    if (filter?.status) {
      nodes = nodes.filter(n => n.status === filter.status);
    }
    if (filter?.capability) {
      nodes = nodes.filter(n => n.capabilities.includes(filter.capability!));
    }

    return nodes;
  }

  getOnlineNodes(): Node[] {
    return this.listNodes({ status: 'online' });
  }

  findNodeWithCapability(capability: NodeCapability): Node | undefined {
    return this.listNodes({ status: 'online', capability })[0];
  }

  // Action handlers
  registerActionHandler(
    nodeId: string,
    actionType: NodeActionType,
    handler: (params: Record<string, unknown>) => Promise<unknown>
  ): void {
    if (!this.actionHandlers.has(nodeId)) {
      this.actionHandlers.set(nodeId, new Map());
    }
    this.actionHandlers.get(nodeId)!.set(actionType, handler);
  }

  // Action execution
  async executeAction(nodeId: string, action: NodeAction): Promise<NodeActionResult> {
    const node = this.nodes.get(nodeId);
    
    if (!node) {
      return { success: false, error: 'Node not found', duration: 0 };
    }

    if (node.status !== 'online') {
      return { success: false, error: `Node is ${node.status}`, duration: 0 };
    }

    const handlers = this.actionHandlers.get(nodeId);
    const handler = handlers?.get(action.type);

    if (!handler) {
      return { success: false, error: `Action ${action.type} not supported`, duration: 0 };
    }

    const startTime = Date.now();
    
    try {
      // Execute with timeout
      const timeout = action.timeout || 30000;
      const result = await Promise.race([
        handler(action.params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Action timeout')), timeout)
        )
      ]);

      const duration = Date.now() - startTime;
      
      this.emit('action:completed', { nodeId, action, result, duration });
      
      return { success: true, data: result, duration };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.emit('action:failed', { nodeId, action, error: errorMessage, duration });
      
      return { success: false, error: errorMessage, duration };
    }
  }

  // Convenience methods for common actions
  async captureScreen(nodeId: string): Promise<NodeActionResult> {
    return this.executeAction(nodeId, { type: 'capture_screen', params: {} });
  }

  async sendNotification(nodeId: string, title: string, body: string): Promise<NodeActionResult> {
    return this.executeAction(nodeId, { 
      type: 'send_notification', 
      params: { title, body } 
    });
  }

  async openUrl(nodeId: string, url: string): Promise<NodeActionResult> {
    return this.executeAction(nodeId, { type: 'open_url', params: { url } });
  }

  async getLocation(nodeId: string): Promise<NodeActionResult> {
    return this.executeAction(nodeId, { type: 'get_location', params: {} });
  }

  async readClipboard(nodeId: string): Promise<NodeActionResult> {
    return this.executeAction(nodeId, { type: 'read_clipboard', params: {} });
  }

  async writeClipboard(nodeId: string, text: string): Promise<NodeActionResult> {
    return this.executeAction(nodeId, { type: 'write_clipboard', params: { text } });
  }

  async runShortcut(nodeId: string, shortcutName: string, input?: unknown): Promise<NodeActionResult> {
    return this.executeAction(nodeId, { 
      type: 'run_shortcut', 
      params: { name: shortcutName, input } 
    });
  }

  // Stats
  getStats(): {
    total: number;
    online: number;
    offline: number;
    byPlatform: Record<string, number>;
    byType: Record<string, number>;
  } {
    const nodes = Array.from(this.nodes.values());
    
    const byPlatform: Record<string, number> = {};
    const byType: Record<string, number> = {};
    
    for (const node of nodes) {
      byPlatform[node.platform] = (byPlatform[node.platform] || 0) + 1;
      byType[node.type] = (byType[node.type] || 0) + 1;
    }

    return {
      total: nodes.length,
      online: nodes.filter(n => n.status === 'online').length,
      offline: nodes.filter(n => n.status === 'offline').length,
      byPlatform,
      byType
    };
  }
}

// Singleton
let nodeManagerInstance: NodeManager | null = null;

export function getNodeManager(): NodeManager {
  if (!nodeManagerInstance) {
    nodeManagerInstance = new NodeManager();
  }
  return nodeManagerInstance;
}

export function resetNodeManager(): void {
  if (nodeManagerInstance) {
    nodeManagerInstance.stop();
    nodeManagerInstance.removeAllListeners();
    nodeManagerInstance = null;
  }
}

