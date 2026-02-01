/**
 * Agent Permissions System - OpenClaw-Inspired Permission Model
 *
 * Provides a unified permission system for agents with:
 * - Granular permission types
 * - Permission groups for convenience
 * - Permission checking and validation
 * - Permission expansion (groups to individual)
 */

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Individual permission types
 */
export type Permission =
  // File System
  | 'read_files'
  | 'write_files'
  | 'edit_files'
  | 'delete_files'

  // Network
  | 'network_access'
  | 'websocket'
  | 'external_api'

  // Media
  | 'camera_access'
  | 'microphone_access'
  | 'screen_capture'
  | 'audio_playback'

  // Execution
  | 'execute_code'
  | 'system_info'
  | 'process_spawn'

  // Browser
  | 'browser_control'
  | 'clipboard_access'
  | 'notifications'
  | 'local_storage'

  // Data
  | 'database_read'
  | 'database_write'
  | 'memory_access'

  // System
  | 'settings_read'
  | 'settings_write'
  | 'agent_spawn';

/**
 * Permission group identifiers
 */
export type PermissionGroup =
  | 'group:fs'
  | 'group:network'
  | 'group:vision'
  | 'group:hearing'
  | 'group:runtime'
  | 'group:browser'
  | 'group:data'
  | 'group:system'
  | 'group:all';

/**
 * Combined type for permissions (individual or group)
 */
export type PermissionOrGroup = Permission | PermissionGroup;

// ============================================================================
// Permission Groups
// ============================================================================

/**
 * Map of permission groups to their constituent permissions
 */
export const PERMISSION_GROUPS: Record<PermissionGroup, Permission[]> = {
  'group:fs': ['read_files', 'write_files', 'edit_files', 'delete_files'],
  'group:network': ['network_access', 'websocket', 'external_api'],
  'group:vision': ['camera_access', 'screen_capture'],
  'group:hearing': ['microphone_access', 'audio_playback'],
  'group:runtime': ['execute_code', 'system_info', 'process_spawn'],
  'group:browser': ['browser_control', 'clipboard_access', 'notifications', 'local_storage'],
  'group:data': ['database_read', 'database_write', 'memory_access'],
  'group:system': ['settings_read', 'settings_write', 'agent_spawn'],
  'group:all': [
    'read_files', 'write_files', 'edit_files', 'delete_files',
    'network_access', 'websocket', 'external_api',
    'camera_access', 'microphone_access', 'screen_capture', 'audio_playback',
    'execute_code', 'system_info', 'process_spawn',
    'browser_control', 'clipboard_access', 'notifications', 'local_storage',
    'database_read', 'database_write', 'memory_access',
    'settings_read', 'settings_write', 'agent_spawn'
  ]
};

/**
 * Human-readable permission descriptions
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  read_files: 'Read files from the filesystem',
  write_files: 'Create new files on the filesystem',
  edit_files: 'Modify existing files',
  delete_files: 'Delete files from the filesystem',
  network_access: 'Make HTTP/HTTPS requests',
  websocket: 'Establish WebSocket connections',
  external_api: 'Call external APIs',
  camera_access: 'Access the camera for vision',
  microphone_access: 'Access the microphone for audio',
  screen_capture: 'Capture screen content',
  audio_playback: 'Play audio through speakers',
  execute_code: 'Execute arbitrary code',
  system_info: 'Read system information',
  process_spawn: 'Spawn new processes',
  browser_control: 'Control browser automation',
  clipboard_access: 'Read/write clipboard',
  notifications: 'Show system notifications',
  local_storage: 'Access browser local storage',
  database_read: 'Read from databases',
  database_write: 'Write to databases',
  memory_access: 'Access agent memory system',
  settings_read: 'Read application settings',
  settings_write: 'Modify application settings',
  agent_spawn: 'Spawn other agents'
};

/**
 * Permission risk levels
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const PERMISSION_RISK_LEVELS: Record<Permission, RiskLevel> = {
  read_files: 'medium',
  write_files: 'high',
  edit_files: 'high',
  delete_files: 'critical',
  network_access: 'medium',
  websocket: 'medium',
  external_api: 'medium',
  camera_access: 'high',
  microphone_access: 'high',
  screen_capture: 'high',
  audio_playback: 'low',
  execute_code: 'critical',
  system_info: 'low',
  process_spawn: 'critical',
  browser_control: 'high',
  clipboard_access: 'medium',
  notifications: 'low',
  local_storage: 'low',
  database_read: 'medium',
  database_write: 'high',
  memory_access: 'low',
  settings_read: 'low',
  settings_write: 'medium',
  agent_spawn: 'medium'
};

// ============================================================================
// Permission Functions
// ============================================================================

/**
 * Check if a string is a permission group
 */
export function isPermissionGroup(value: string): value is PermissionGroup {
  return value.startsWith('group:');
}

/**
 * Check if a string is a valid permission
 */
export function isValidPermission(value: string): value is Permission {
  return Object.keys(PERMISSION_DESCRIPTIONS).includes(value as Permission);
}

/**
 * Expand permission groups to individual permissions
 */
export function expandPermissions(permissions: PermissionOrGroup[]): Permission[] {
  const expanded = new Set<Permission>();

  for (const perm of permissions) {
    if (isPermissionGroup(perm)) {
      const groupPerms = PERMISSION_GROUPS[perm];
      if (groupPerms) {
        for (const p of groupPerms) {
          expanded.add(p);
        }
      }
    } else if (isValidPermission(perm)) {
      expanded.add(perm);
    }
  }

  return Array.from(expanded);
}

/**
 * Check if required permissions are satisfied by granted permissions
 */
export function checkPermissions(
  required: PermissionOrGroup[],
  granted: PermissionOrGroup[]
): boolean {
  const requiredExpanded = expandPermissions(required);
  const grantedExpanded = new Set(expandPermissions(granted));

  return requiredExpanded.every(perm => grantedExpanded.has(perm));
}

/**
 * Get missing permissions
 */
export function getMissingPermissions(
  required: PermissionOrGroup[],
  granted: PermissionOrGroup[]
): Permission[] {
  const requiredExpanded = expandPermissions(required);
  const grantedExpanded = new Set(expandPermissions(granted));

  return requiredExpanded.filter(perm => !grantedExpanded.has(perm));
}

/**
 * Get the highest risk level among permissions
 */
export function getMaxRiskLevel(permissions: PermissionOrGroup[]): RiskLevel {
  const expanded = expandPermissions(permissions);
  const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

  let maxRisk: RiskLevel = 'low';

  for (const perm of expanded) {
    const risk = PERMISSION_RISK_LEVELS[perm];
    if (riskOrder.indexOf(risk) > riskOrder.indexOf(maxRisk)) {
      maxRisk = risk;
    }
  }

  return maxRisk;
}

/**
 * Group permissions by category
 */
export function groupPermissionsByCategory(permissions: Permission[]): Record<string, Permission[]> {
  const categories: Record<string, Permission[]> = {
    filesystem: [],
    network: [],
    media: [],
    execution: [],
    browser: [],
    data: [],
    system: []
  };

  for (const perm of permissions) {
    if (['read_files', 'write_files', 'edit_files', 'delete_files'].includes(perm)) {
      categories.filesystem.push(perm);
    } else if (['network_access', 'websocket', 'external_api'].includes(perm)) {
      categories.network.push(perm);
    } else if (['camera_access', 'microphone_access', 'screen_capture', 'audio_playback'].includes(perm)) {
      categories.media.push(perm);
    } else if (['execute_code', 'system_info', 'process_spawn'].includes(perm)) {
      categories.execution.push(perm);
    } else if (['browser_control', 'clipboard_access', 'notifications', 'local_storage'].includes(perm)) {
      categories.browser.push(perm);
    } else if (['database_read', 'database_write', 'memory_access'].includes(perm)) {
      categories.data.push(perm);
    } else if (['settings_read', 'settings_write', 'agent_spawn'].includes(perm)) {
      categories.system.push(perm);
    }
  }

  // Remove empty categories
  return Object.fromEntries(
    Object.entries(categories).filter(([, perms]) => perms.length > 0)
  );
}

// ============================================================================
// Permission Manager Class
// ============================================================================

/**
 * Manages permissions for agents at runtime
 */
export class PermissionManager {
  private grantedPermissions: Map<string, Set<Permission>> = new Map();
  private listeners: Set<(agentId: string, permissions: Permission[]) => void> = new Set();

  /**
   * Grant permissions to an agent
   */
  grant(agentId: string, permissions: PermissionOrGroup[]): void {
    const expanded = expandPermissions(permissions);
    const current = this.grantedPermissions.get(agentId) || new Set();

    for (const perm of expanded) {
      current.add(perm);
    }

    this.grantedPermissions.set(agentId, current);
    this.notifyListeners(agentId);
  }

  /**
   * Revoke permissions from an agent
   */
  revoke(agentId: string, permissions: PermissionOrGroup[]): void {
    const expanded = expandPermissions(permissions);
    const current = this.grantedPermissions.get(agentId);

    if (!current) return;

    for (const perm of expanded) {
      current.delete(perm);
    }

    this.notifyListeners(agentId);
  }

  /**
   * Revoke all permissions from an agent
   */
  revokeAll(agentId: string): void {
    this.grantedPermissions.delete(agentId);
    this.notifyListeners(agentId);
  }

  /**
   * Check if agent has required permissions
   */
  check(agentId: string, required: PermissionOrGroup[]): boolean {
    const granted = this.getPermissions(agentId);
    return checkPermissions(required, granted);
  }

  /**
   * Get all permissions for an agent
   */
  getPermissions(agentId: string): Permission[] {
    const perms = this.grantedPermissions.get(agentId);
    return perms ? Array.from(perms) : [];
  }

  /**
   * Get missing permissions for an agent
   */
  getMissing(agentId: string, required: PermissionOrGroup[]): Permission[] {
    const granted = this.getPermissions(agentId);
    return getMissingPermissions(required, granted);
  }

  /**
   * Subscribe to permission changes
   */
  subscribe(listener: (agentId: string, permissions: Permission[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(agentId: string): void {
    const permissions = this.getPermissions(agentId);
    for (const listener of this.listeners) {
      listener(agentId, permissions);
    }
  }

  /**
   * Get all agents with their permissions
   */
  getAllGrants(): Record<string, Permission[]> {
    const result: Record<string, Permission[]> = {};

    for (const [agentId, perms] of this.grantedPermissions) {
      result[agentId] = Array.from(perms);
    }

    return result;
  }

  /**
   * Clear all permissions
   */
  clear(): void {
    this.grantedPermissions.clear();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const permissionManager = new PermissionManager();

export default permissionManager;
