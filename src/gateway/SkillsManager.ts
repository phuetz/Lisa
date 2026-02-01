/**
 * Lisa Skills Manager
 * Platform for managing installable skills (inspired by OpenClaw's ClawHub)
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

// Skill types
export interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: SkillCategory;
  status: SkillStatus;
  config: SkillConfig;
  manifest: SkillManifest;
  installedAt?: Date;
}

export type SkillCategory = 
  | 'productivity'
  | 'development'
  | 'communication'
  | 'automation'
  | 'integration'
  | 'utility'
  | 'custom';

export type SkillStatus = 'available' | 'installed' | 'enabled' | 'disabled' | 'error';

export interface SkillConfig {
  autoEnable?: boolean;
  permissions?: SkillPermission[];
  settings?: Record<string, unknown>;
}

export type SkillPermission = 
  | 'read_files'
  | 'write_files'
  | 'execute_code'
  | 'network_access'
  | 'system_info'
  | 'notifications'
  | 'browser_control'
  | 'calendar_access'
  | 'email_access';

export interface SkillManifest {
  tools?: SkillTool[];
  prompts?: SkillPrompt[];
  triggers?: SkillTrigger[];
  dependencies?: string[];
}

export interface SkillTool {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  handler: string; // Path to handler function
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: unknown;
}

export interface SkillPrompt {
  id: string;
  name: string;
  content: string;
  variables?: string[];
}

export interface SkillTrigger {
  id: string;
  type: 'cron' | 'webhook' | 'event';
  config: Record<string, unknown>;
  handler: string;
}

// Built-in skills
const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    version: '1.0.0',
    description: 'Search the web using various search engines',
    author: 'Lisa Team',
    category: 'utility',
    status: 'installed',
    config: { autoEnable: true, permissions: ['network_access'] },
    manifest: {
      tools: [{
        id: 'search_web',
        name: 'Search Web',
        description: 'Search the web for information',
        parameters: [
          { name: 'query', type: 'string', description: 'Search query', required: true },
          { name: 'engine', type: 'string', description: 'Search engine (google, bing, duckduckgo)', default: 'google' }
        ],
        handler: 'tools/WebSearchTool'
      }]
    }
  },
  {
    id: 'code-interpreter',
    name: 'Code Interpreter',
    version: '1.0.0',
    description: 'Execute and analyze code in multiple languages',
    author: 'Lisa Team',
    category: 'development',
    status: 'installed',
    config: { autoEnable: true, permissions: ['execute_code', 'read_files', 'write_files'] },
    manifest: {
      tools: [{
        id: 'execute_code',
        name: 'Execute Code',
        description: 'Execute code in a sandboxed environment',
        parameters: [
          { name: 'code', type: 'string', description: 'Code to execute', required: true },
          { name: 'language', type: 'string', description: 'Programming language', required: true }
        ],
        handler: 'tools/CodeInterpreterTool'
      }]
    }
  },
  {
    id: 'file-manager',
    name: 'File Manager',
    version: '1.0.0',
    description: 'Read, write, and manage files',
    author: 'Lisa Team',
    category: 'utility',
    status: 'installed',
    config: { autoEnable: true, permissions: ['read_files', 'write_files'] },
    manifest: {
      tools: [
        {
          id: 'read_file',
          name: 'Read File',
          description: 'Read contents of a file',
          parameters: [
            { name: 'path', type: 'string', description: 'File path', required: true }
          ],
          handler: 'tools/FileReadTool'
        },
        {
          id: 'write_file',
          name: 'Write File',
          description: 'Write content to a file',
          parameters: [
            { name: 'path', type: 'string', description: 'File path', required: true },
            { name: 'content', type: 'string', description: 'Content to write', required: true }
          ],
          handler: 'tools/FileWriteTool'
        }
      ]
    }
  },
  {
    id: 'browser-control',
    name: 'Browser Control',
    version: '1.0.0',
    description: 'Control and automate web browsers',
    author: 'Lisa Team',
    category: 'automation',
    status: 'installed',
    config: { autoEnable: false, permissions: ['browser_control', 'network_access'] },
    manifest: {
      tools: [{
        id: 'browser_navigate',
        name: 'Navigate Browser',
        description: 'Navigate to a URL and interact with the page',
        parameters: [
          { name: 'url', type: 'string', description: 'URL to navigate to', required: true },
          { name: 'action', type: 'string', description: 'Action to perform (navigate, click, type, screenshot)' }
        ],
        handler: 'tools/BrowserTool'
      }]
    }
  },
  {
    id: 'memory',
    name: 'Memory & RAG',
    version: '1.0.0',
    description: 'Long-term memory and document retrieval',
    author: 'Lisa Team',
    category: 'utility',
    status: 'installed',
    config: { autoEnable: true, permissions: ['read_files'] },
    manifest: {
      tools: [
        {
          id: 'memory_store',
          name: 'Store Memory',
          description: 'Store information in long-term memory',
          parameters: [
            { name: 'content', type: 'string', description: 'Content to remember', required: true },
            { name: 'tags', type: 'array', description: 'Tags for categorization' }
          ],
          handler: 'tools/MemoryStoreTool'
        },
        {
          id: 'memory_search',
          name: 'Search Memory',
          description: 'Search through stored memories',
          parameters: [
            { name: 'query', type: 'string', description: 'Search query', required: true }
          ],
          handler: 'tools/MemorySearchTool'
        }
      ]
    }
  }
];

export class SkillsManager extends BrowserEventEmitter {
  private skills: Map<string, Skill> = new Map();
  private enabledSkills: Set<string> = new Set();
  private skillsDirectory: string;

  constructor(skillsDirectory: string = '~/.lisa/skills') {
    super();
    this.skillsDirectory = skillsDirectory;
    this.loadBuiltinSkills();
  }

  private loadBuiltinSkills(): void {
    BUILTIN_SKILLS.forEach(skill => {
      this.skills.set(skill.id, { ...skill, installedAt: new Date() });
      if (skill.config.autoEnable) {
        this.enabledSkills.add(skill.id);
      }
    });
  }

  // Skill Management
  async installSkill(skillId: string, source?: string): Promise<Skill> {
    // Check if already installed
    if (this.skills.has(skillId)) {
      const existing = this.skills.get(skillId)!;
      if (existing.status === 'installed' || existing.status === 'enabled') {
        throw new Error(`Skill ${skillId} is already installed`);
      }
    }

    // In a real implementation, this would fetch from a registry like ClawHub
    // For now, create a placeholder skill
    const skill: Skill = {
      id: skillId,
      name: skillId,
      version: '1.0.0',
      description: `Custom skill: ${skillId}`,
      author: 'User',
      category: 'custom',
      status: 'installed',
      config: { autoEnable: false, permissions: [] },
      manifest: { tools: [], prompts: [], triggers: [] },
      installedAt: new Date()
    };

    if (source) {
      // Load skill from source (URL, path, etc.)
      await this.loadSkillFromSource(skill, source);
    }

    this.skills.set(skillId, skill);
    this.emit('skill:installed', skill);
    
    return skill;
  }

  private async loadSkillFromSource(skill: Skill, source: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Fetch SKILL.md from source
    // 2. Parse manifest
    // 3. Download dependencies
    // 4. Register tools/prompts/triggers
    console.log(`Loading skill ${skill.id} from ${source}`);
  }

  async uninstallSkill(skillId: string): Promise<boolean> {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    // Can't uninstall builtin skills
    if (BUILTIN_SKILLS.some(s => s.id === skillId)) {
      throw new Error(`Cannot uninstall builtin skill: ${skillId}`);
    }

    this.enabledSkills.delete(skillId);
    this.skills.delete(skillId);
    this.emit('skill:uninstalled', { skillId });
    
    return true;
  }

  enableSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    skill.status = 'enabled';
    this.enabledSkills.add(skillId);
    this.emit('skill:enabled', skill);
    
    return true;
  }

  disableSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    skill.status = 'disabled';
    this.enabledSkills.delete(skillId);
    this.emit('skill:disabled', skill);
    
    return true;
  }

  // Skill Queries
  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  listSkills(filter?: { category?: SkillCategory; status?: SkillStatus }): Skill[] {
    let skills = Array.from(this.skills.values());
    
    if (filter?.category) {
      skills = skills.filter(s => s.category === filter.category);
    }
    if (filter?.status) {
      skills = skills.filter(s => s.status === filter.status);
    }
    
    return skills;
  }

  listEnabledSkills(): Skill[] {
    return Array.from(this.enabledSkills)
      .map(id => this.skills.get(id))
      .filter((s): s is Skill => s !== undefined);
  }

  isSkillEnabled(skillId: string): boolean {
    return this.enabledSkills.has(skillId);
  }

  // Tool Access
  getToolsFromEnabledSkills(): SkillTool[] {
    const tools: SkillTool[] = [];
    
    this.listEnabledSkills().forEach(skill => {
      if (skill.manifest.tools) {
        tools.push(...skill.manifest.tools);
      }
    });
    
    return tools;
  }

  getPromptsFromEnabledSkills(): SkillPrompt[] {
    const prompts: SkillPrompt[] = [];
    
    this.listEnabledSkills().forEach(skill => {
      if (skill.manifest.prompts) {
        prompts.push(...skill.manifest.prompts);
      }
    });
    
    return prompts;
  }

  // Configuration
  updateSkillConfig(skillId: string, config: Partial<SkillConfig>): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    skill.config = { ...skill.config, ...config };
    this.emit('skill:configured', skill);
    
    return true;
  }

  // Permissions
  checkPermission(skillId: string, permission: SkillPermission): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    
    return skill.config.permissions?.includes(permission) ?? false;
  }

  requestPermission(skillId: string, permission: SkillPermission): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    if (!skill.config.permissions) {
      skill.config.permissions = [];
    }
    
    if (!skill.config.permissions.includes(permission)) {
      skill.config.permissions.push(permission);
      this.emit('skill:permission_granted', { skillId, permission });
    }
    
    return true;
  }

  revokePermission(skillId: string, permission: SkillPermission): boolean {
    const skill = this.skills.get(skillId);
    if (!skill || !skill.config.permissions) return false;

    const index = skill.config.permissions.indexOf(permission);
    if (index > -1) {
      skill.config.permissions.splice(index, 1);
      this.emit('skill:permission_revoked', { skillId, permission });
      return true;
    }
    
    return false;
  }

  // Stats
  getStats(): {
    total: number;
    installed: number;
    enabled: number;
    byCategory: Record<SkillCategory, number>;
  } {
    const skills = Array.from(this.skills.values());
    const byCategory: Record<SkillCategory, number> = {
      productivity: 0,
      development: 0,
      communication: 0,
      automation: 0,
      integration: 0,
      utility: 0,
      custom: 0
    };

    skills.forEach(s => {
      byCategory[s.category]++;
    });

    return {
      total: skills.length,
      installed: skills.filter(s => s.status !== 'available').length,
      enabled: this.enabledSkills.size,
      byCategory
    };
  }

  getSkillsDirectory(): string {
    return this.skillsDirectory;
  }
}

// Singleton instance
let skillsManagerInstance: SkillsManager | null = null;

export function getSkillsManager(skillsDirectory?: string): SkillsManager {
  if (!skillsManagerInstance) {
    skillsManagerInstance = new SkillsManager(skillsDirectory);
  }
  return skillsManagerInstance;
}

export function resetSkillsManager(): void {
  if (skillsManagerInstance) {
    skillsManagerInstance.removeAllListeners();
    skillsManagerInstance = null;
  }
}

