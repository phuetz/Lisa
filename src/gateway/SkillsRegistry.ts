/**
 * Lisa Skills Registry
 * ClawHub-like skill discovery and management
 * Inspired by OpenClaw's Skills registry
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: SkillCategory;
  tags: string[];
  icon?: string;
  source: SkillSource;
  status: SkillStatus;
  config?: SkillConfig;
  permissions: SkillPermission[];
  dependencies?: string[];
  installedAt?: Date;
  updatedAt?: Date;
  usageCount: number;
  rating?: number;
}

export type SkillCategory = 
  | 'productivity'
  | 'communication'
  | 'development'
  | 'data'
  | 'automation'
  | 'media'
  | 'integration'
  | 'utility'
  | 'custom';

export type SkillSource = 'bundled' | 'managed' | 'workspace' | 'remote';
export type SkillStatus = 'available' | 'installed' | 'enabled' | 'disabled' | 'error' | 'updating';

export interface SkillConfig {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'secret';
    label: string;
    description?: string;
    default?: unknown;
    options?: string[];
    required?: boolean;
  };
}

export type SkillPermission = 
  | 'network'
  | 'filesystem'
  | 'shell'
  | 'browser'
  | 'clipboard'
  | 'notifications'
  | 'location'
  | 'camera'
  | 'microphone'
  | 'screen';

export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  category: SkillCategory;
  tags?: string[];
  icon?: string;
  main: string;
  permissions?: SkillPermission[];
  dependencies?: string[];
  config?: SkillConfig;
}

export interface RegistryConfig {
  remoteUrl?: string;
  autoUpdate: boolean;
  checkInterval: number; // ms
  allowRemote: boolean;
  allowWorkspace: boolean;
}

// Bundled skills
const BUNDLED_SKILLS: Skill[] = [
  {
    id: 'web-search',
    name: 'Recherche Web',
    description: 'Effectue des recherches sur le web',
    version: '1.0.0',
    author: 'Lisa',
    category: 'productivity',
    tags: ['search', 'web', 'google'],
    icon: '🔍',
    source: 'bundled',
    status: 'enabled',
    permissions: ['network'],
    usageCount: 0,
    rating: 4.8
  },
  {
    id: 'code-interpreter',
    name: 'Interpréteur de Code',
    description: 'Exécute du code Python/JavaScript',
    version: '1.0.0',
    author: 'Lisa',
    category: 'development',
    tags: ['code', 'python', 'javascript', 'execute'],
    icon: '💻',
    source: 'bundled',
    status: 'enabled',
    permissions: ['filesystem'],
    usageCount: 0,
    rating: 4.9
  },
  {
    id: 'file-manager',
    name: 'Gestionnaire de Fichiers',
    description: 'Lecture et écriture de fichiers',
    version: '1.0.0',
    author: 'Lisa',
    category: 'utility',
    tags: ['files', 'read', 'write', 'manage'],
    icon: '📁',
    source: 'bundled',
    status: 'enabled',
    permissions: ['filesystem'],
    usageCount: 0,
    rating: 4.7
  },
  {
    id: 'image-generation',
    name: 'Génération d\'Images',
    description: 'Génère des images avec DALL-E/Stable Diffusion',
    version: '1.0.0',
    author: 'Lisa',
    category: 'media',
    tags: ['image', 'ai', 'generation', 'art'],
    icon: '🎨',
    source: 'bundled',
    status: 'enabled',
    permissions: ['network'],
    usageCount: 0,
    rating: 4.6
  },
  {
    id: 'calendar',
    name: 'Calendrier',
    description: 'Gestion des événements et rappels',
    version: '1.0.0',
    author: 'Lisa',
    category: 'productivity',
    tags: ['calendar', 'events', 'reminders', 'schedule'],
    icon: '📅',
    source: 'bundled',
    status: 'enabled',
    permissions: ['notifications'],
    usageCount: 0,
    rating: 4.5
  },
  {
    id: 'translator',
    name: 'Traducteur',
    description: 'Traduction multilingue',
    version: '1.0.0',
    author: 'Lisa',
    category: 'communication',
    tags: ['translate', 'language', 'multilingual'],
    icon: '🌍',
    source: 'bundled',
    status: 'enabled',
    permissions: [],
    usageCount: 0,
    rating: 4.7
  },
  {
    id: 'weather',
    name: 'Météo',
    description: 'Prévisions météorologiques',
    version: '1.0.0',
    author: 'Lisa',
    category: 'utility',
    tags: ['weather', 'forecast', 'temperature'],
    icon: '🌤️',
    source: 'bundled',
    status: 'enabled',
    permissions: ['network', 'location'],
    usageCount: 0,
    rating: 4.4
  },
  {
    id: 'notes',
    name: 'Notes',
    description: 'Prise de notes et organisation',
    version: '1.0.0',
    author: 'Lisa',
    category: 'productivity',
    tags: ['notes', 'organize', 'markdown'],
    icon: '📝',
    source: 'bundled',
    status: 'enabled',
    permissions: ['filesystem'],
    usageCount: 0,
    rating: 4.6
  }
];

const DEFAULT_CONFIG: RegistryConfig = {
  autoUpdate: true,
  checkInterval: 86400000, // 24 hours
  allowRemote: true,
  allowWorkspace: true
};

export class SkillsRegistry extends BrowserEventEmitter {
  private config: RegistryConfig;
  private skills: Map<string, Skill> = new Map();
  private skillConfigs: Map<string, Record<string, unknown>> = new Map();

  constructor(config: Partial<RegistryConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadBundledSkills();
    this.loadFromStorage();
  }

  private loadBundledSkills(): void {
    for (const skill of BUNDLED_SKILLS) {
      this.skills.set(skill.id, { ...skill, installedAt: new Date() });
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('lisa-skills');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Load workspace skills
        if (data.workspaceSkills) {
          for (const skill of data.workspaceSkills) {
            this.skills.set(skill.id, {
              ...skill,
              installedAt: skill.installedAt ? new Date(skill.installedAt) : new Date(),
              updatedAt: skill.updatedAt ? new Date(skill.updatedAt) : undefined
            });
          }
        }

        // Load skill configs
        if (data.configs) {
          for (const [id, config] of Object.entries(data.configs)) {
            this.skillConfigs.set(id, config as Record<string, unknown>);
          }
        }

        // Update bundled skill statuses
        if (data.statuses) {
          for (const [id, status] of Object.entries(data.statuses)) {
            const skill = this.skills.get(id);
            if (skill) {
              skill.status = status as SkillStatus;
            }
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const workspaceSkills = Array.from(this.skills.values())
        .filter(s => s.source === 'workspace');
      
      const statuses: Record<string, SkillStatus> = {};
      for (const skill of this.skills.values()) {
        statuses[skill.id] = skill.status;
      }

      const data = {
        workspaceSkills,
        configs: Object.fromEntries(this.skillConfigs),
        statuses
      };
      localStorage.setItem('lisa-skills', JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  // Configuration
  configure(config: Partial<RegistryConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:changed', this.config);
  }

  getConfig(): RegistryConfig {
    return { ...this.config };
  }

  // Skill discovery
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  listSkills(filter?: {
    category?: SkillCategory;
    source?: SkillSource;
    status?: SkillStatus;
    search?: string;
  }): Skill[] {
    let skills = Array.from(this.skills.values());

    if (filter?.category) {
      skills = skills.filter(s => s.category === filter.category);
    }
    if (filter?.source) {
      skills = skills.filter(s => s.source === filter.source);
    }
    if (filter?.status) {
      skills = skills.filter(s => s.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      skills = skills.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return skills.sort((a, b) => {
      // Enabled first, then by usage count
      if (a.status === 'enabled' && b.status !== 'enabled') return -1;
      if (b.status === 'enabled' && a.status !== 'enabled') return 1;
      return b.usageCount - a.usageCount;
    });
  }

  getCategories(): { category: SkillCategory; count: number }[] {
    const counts = new Map<SkillCategory, number>();
    
    for (const skill of this.skills.values()) {
      counts.set(skill.category, (counts.get(skill.category) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Installation
  async install(manifest: SkillManifest, source: SkillSource = 'workspace'): Promise<Skill | null> {
    const id = `${source}-${manifest.name.toLowerCase().replace(/\s+/g, '-')}`;
    
    if (this.skills.has(id)) {
      this.emit('error', { message: `Skill ${id} already installed` });
      return null;
    }

    const skill: Skill = {
      id,
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      author: manifest.author,
      category: manifest.category,
      tags: manifest.tags || [],
      icon: manifest.icon,
      source,
      status: 'installed',
      config: manifest.config,
      permissions: manifest.permissions || [],
      dependencies: manifest.dependencies,
      installedAt: new Date(),
      usageCount: 0
    };

    this.skills.set(id, skill);
    this.saveToStorage();
    this.emit('skill:installed', skill);

    return skill;
  }

  async uninstall(skillId: string): Promise<boolean> {
    const skill = this.skills.get(skillId);
    
    if (!skill) return false;
    if (skill.source === 'bundled') {
      this.emit('error', { message: 'Cannot uninstall bundled skills' });
      return false;
    }

    this.skills.delete(skillId);
    this.skillConfigs.delete(skillId);
    this.saveToStorage();
    this.emit('skill:uninstalled', { skillId });

    return true;
  }

  // Enable/Disable
  enable(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    skill.status = 'enabled';
    this.saveToStorage();
    this.emit('skill:enabled', skill);
    return true;
  }

  disable(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    skill.status = 'disabled';
    this.saveToStorage();
    this.emit('skill:disabled', skill);
    return true;
  }

  // Configuration
  getSkillConfig(skillId: string): Record<string, unknown> | undefined {
    return this.skillConfigs.get(skillId);
  }

  setSkillConfig(skillId: string, config: Record<string, unknown>): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    this.skillConfigs.set(skillId, config);
    this.saveToStorage();
    this.emit('skill:configured', { skillId, config });
    return true;
  }

  // Usage tracking
  recordUsage(skillId: string): void {
    const skill = this.skills.get(skillId);
    if (skill) {
      skill.usageCount++;
      skill.updatedAt = new Date();
      this.emit('skill:used', { skillId, usageCount: skill.usageCount });
    }
  }

  // Remote registry (ClawHub-like)
  async searchRemote(query: string): Promise<Skill[]> {
    if (!this.config.allowRemote || !this.config.remoteUrl) {
      return [];
    }

    // In real implementation, would fetch from remote registry
    // For now, return empty array
    this.emit('registry:searched', { query, results: 0 });
    return [];
  }

  async installFromRemote(remoteSkillId: string): Promise<Skill | null> {
    if (!this.config.allowRemote) {
      this.emit('error', { message: 'Remote skills disabled' });
      return null;
    }

    // In real implementation, would download and install from remote
    this.emit('registry:install:started', { remoteSkillId });
    return null;
  }

  // Permissions
  checkPermissions(skillId: string): { granted: SkillPermission[]; required: SkillPermission[] } {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return { granted: [], required: [] };
    }

    // In real implementation, would check actual permissions
    return {
      granted: skill.permissions,
      required: skill.permissions
    };
  }

  // Stats
  getStats(): {
    totalSkills: number;
    enabledSkills: number;
    bundledSkills: number;
    workspaceSkills: number;
    totalUsage: number;
  } {
    const skills = Array.from(this.skills.values());
    return {
      totalSkills: skills.length,
      enabledSkills: skills.filter(s => s.status === 'enabled').length,
      bundledSkills: skills.filter(s => s.source === 'bundled').length,
      workspaceSkills: skills.filter(s => s.source === 'workspace').length,
      totalUsage: skills.reduce((sum, s) => sum + s.usageCount, 0)
    };
  }
}

// Singleton
let skillsRegistryInstance: SkillsRegistry | null = null;

export function getSkillsRegistry(): SkillsRegistry {
  if (!skillsRegistryInstance) {
    skillsRegistryInstance = new SkillsRegistry();
  }
  return skillsRegistryInstance;
}

export function resetSkillsRegistry(): void {
  if (skillsRegistryInstance) {
    skillsRegistryInstance.removeAllListeners();
    skillsRegistryInstance = null;
  }
}

