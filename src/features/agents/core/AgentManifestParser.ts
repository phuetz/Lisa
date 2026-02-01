/**
 * Agent Manifest Parser - OpenClaw-Inspired AGENT.md Format
 *
 * Parses agent manifests in YAML frontmatter + Markdown format.
 * Supports eligibility checking based on requirements.
 *
 * Example format:
 * ```markdown
 * ---
 * name: MyAgent
 * version: 1.0.0
 * domain: integration
 * priority: high
 * description: Does amazing things
 * permissions:
 *   - network_access
 *   - read_files
 * requirements:
 *   env:
 *     - VITE_API_KEY
 *   os:
 *     - win32
 *     - darwin
 * capabilities:
 *   - feature_a
 *   - feature_b
 * ---
 *
 * # My Agent
 *
 * Instructions for using this agent...
 * ```
 */

import type { PermissionOrGroup } from './permissions';

// ============================================================================
// Types
// ============================================================================

export type AgentDomain =
  | 'core'
  | 'communication'
  | 'analysis'
  | 'workflow'
  | 'integration'
  | 'media'
  | 'utility';

export type AgentPriority = 'critical' | 'high' | 'normal' | 'low';

export interface AgentInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface AgentOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface AgentRequirements {
  /** Required environment variables */
  env?: string[];
  /** Required binaries on PATH */
  bins?: string[];
  /** Supported operating systems */
  os?: Array<'win32' | 'darwin' | 'linux'>;
  /** Minimum version of Lisa */
  minVersion?: string;
  /** Required agent dependencies */
  agents?: string[];
}

export interface AgentManifest {
  /** Agent name (identifier) */
  name: string;
  /** Semantic version */
  version: string;
  /** Agent domain/category */
  domain: AgentDomain;
  /** Loading priority */
  priority: AgentPriority;
  /** Human-readable description */
  description: string;
  /** Author information */
  author?: string;
  /** Homepage or documentation URL */
  homepage?: string;
  /** Required permissions */
  permissions?: PermissionOrGroup[];
  /** Eligibility requirements */
  requirements?: AgentRequirements;
  /** Agent capabilities/features */
  capabilities?: string[];
  /** Input parameters */
  inputs?: AgentInput[];
  /** Output structure */
  outputs?: AgentOutput[];
  /** Tags for categorization */
  tags?: string[];
  /** Whether agent is enabled by default */
  enabled?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Markdown instructions (content after frontmatter) */
  instructions?: string;
}

export interface ParseResult {
  success: boolean;
  manifest?: AgentManifest;
  error?: string;
  warnings?: string[];
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

// ============================================================================
// YAML Parser (Simple Implementation)
// ============================================================================

/**
 * Simple YAML parser for frontmatter
 * Handles basic YAML structures (scalars, lists, nested objects)
 */
function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  const stack: { indent: number; obj: Record<string, unknown>; key?: string }[] = [
    { indent: -1, obj: result }
  ];

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Calculate indentation
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Handle list items
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim();
      const parent = stack[stack.length - 1];

      if (parent.key) {
        const arr = parent.obj[parent.key];
        if (Array.isArray(arr)) {
          arr.push(parseValue(value));
        }
      }
      continue;
    }

    // Handle key-value pairs
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();

    // Pop stack until we find the right parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];

    if (rawValue === '' || rawValue === '|' || rawValue === '>') {
      // Nested object or array start
      const newObj: Record<string, unknown> | unknown[] = rawValue === '' ? {} : [];
      parent.obj[key] = newObj;

      if (Array.isArray(newObj)) {
        stack.push({ indent, obj: parent.obj, key });
      } else {
        stack.push({ indent, obj: newObj as Record<string, unknown> });
      }
    } else {
      // Simple value
      parent.obj[key] = parseValue(rawValue);
    }
  }

  return result;
}

/**
 * Parse a YAML value to its proper type
 */
function parseValue(value: string): unknown {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Null
  if (value === 'null' || value === '~') return null;

  // Number
  const num = Number(value);
  if (!isNaN(num) && value !== '') return num;

  // Array inline
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(v => parseValue(v.trim()));
  }

  // String
  return value;
}

// ============================================================================
// Manifest Parser
// ============================================================================

/**
 * Parse an AGENT.md manifest file
 */
export function parseAgentManifest(content: string): ParseResult {
  const warnings: string[] = [];

  try {
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!frontmatterMatch) {
      return {
        success: false,
        error: 'No YAML frontmatter found. Manifest must start with ---'
      };
    }

    const yamlContent = frontmatterMatch[1];
    const markdownContent = content.slice(frontmatterMatch[0].length).trim();

    // Parse YAML
    const parsed = parseYaml(yamlContent);

    // Validate required fields
    if (!parsed.name || typeof parsed.name !== 'string') {
      return { success: false, error: 'Missing required field: name' };
    }

    if (!parsed.version || typeof parsed.version !== 'string') {
      warnings.push('Missing version, defaulting to 1.0.0');
      parsed.version = '1.0.0';
    }

    if (!parsed.domain || typeof parsed.domain !== 'string') {
      warnings.push('Missing domain, defaulting to utility');
      parsed.domain = 'utility';
    }

    if (!parsed.priority || typeof parsed.priority !== 'string') {
      warnings.push('Missing priority, defaulting to normal');
      parsed.priority = 'normal';
    }

    if (!parsed.description || typeof parsed.description !== 'string') {
      warnings.push('Missing description');
      parsed.description = '';
    }

    // Build manifest object
    const manifest: AgentManifest = {
      name: parsed.name as string,
      version: parsed.version as string,
      domain: parsed.domain as AgentDomain,
      priority: parsed.priority as AgentPriority,
      description: parsed.description as string,
      author: parsed.author as string | undefined,
      homepage: parsed.homepage as string | undefined,
      permissions: parsed.permissions as PermissionOrGroup[] | undefined,
      requirements: parsed.requirements as AgentRequirements | undefined,
      capabilities: parsed.capabilities as string[] | undefined,
      inputs: parsed.inputs as AgentInput[] | undefined,
      outputs: parsed.outputs as AgentOutput[] | undefined,
      tags: parsed.tags as string[] | undefined,
      enabled: parsed.enabled !== false, // Default to true
      metadata: parsed.metadata as Record<string, unknown> | undefined,
      instructions: markdownContent || undefined
    };

    return {
      success: true,
      manifest,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    return {
      success: false,
      error: `Parse error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================================================
// Eligibility Checking
// ============================================================================

/**
 * Check if an agent's requirements are satisfied
 */
export function checkEligibility(manifest: AgentManifest): EligibilityResult {
  const reasons: string[] = [];

  if (!manifest.requirements) {
    return { eligible: true, reasons: [] };
  }

  const { env, bins, os, minVersion, agents } = manifest.requirements;

  // Check environment variables
  if (env && env.length > 0) {
    for (const envVar of env) {
      // Check both import.meta.env and window
      const hasEnv = typeof import.meta !== 'undefined' &&
                     (import.meta as { env?: Record<string, string> }).env?.[envVar];

      if (!hasEnv) {
        reasons.push(`Missing environment variable: ${envVar}`);
      }
    }
  }

  // Check OS (browser can't reliably detect, so we skip or use navigator)
  if (os && os.length > 0) {
    const platform = detectPlatform();
    if (platform && !os.includes(platform as 'win32' | 'darwin' | 'linux')) {
      reasons.push(`Unsupported platform: ${platform} (requires: ${os.join(', ')})`);
    }
  }

  // Check min version (would need Lisa version to be available)
  if (minVersion) {
    // TODO: Compare with actual Lisa version
    // For now, just log warning
    console.log(`[AgentManifest] ${manifest.name} requires Lisa >= ${minVersion}`);
  }

  // Check agent dependencies
  if (agents && agents.length > 0) {
    // TODO: Check if required agents are registered
    // This would need access to the registry
    console.log(`[AgentManifest] ${manifest.name} depends on agents: ${agents.join(', ')}`);
  }

  // Note: bins check is not possible in browser environment
  if (bins && bins.length > 0) {
    reasons.push(`Binary requirements cannot be verified in browser: ${bins.join(', ')}`);
  }

  return {
    eligible: reasons.length === 0,
    reasons
  };
}

/**
 * Detect platform from browser
 */
function detectPlatform(): string | null {
  if (typeof navigator === 'undefined') return null;

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('win')) return 'win32';
  if (ua.includes('mac')) return 'darwin';
  if (ua.includes('linux')) return 'linux';

  return null;
}

// ============================================================================
// Manifest Builder (for programmatic creation)
// ============================================================================

/**
 * Build a manifest string from an object
 */
export function buildManifest(manifest: AgentManifest): string {
  const lines: string[] = ['---'];

  // Required fields
  lines.push(`name: ${manifest.name}`);
  lines.push(`version: ${manifest.version}`);
  lines.push(`domain: ${manifest.domain}`);
  lines.push(`priority: ${manifest.priority}`);
  lines.push(`description: ${manifest.description}`);

  // Optional fields
  if (manifest.author) {
    lines.push(`author: ${manifest.author}`);
  }

  if (manifest.homepage) {
    lines.push(`homepage: ${manifest.homepage}`);
  }

  if (manifest.permissions && manifest.permissions.length > 0) {
    lines.push('permissions:');
    for (const perm of manifest.permissions) {
      lines.push(`  - ${perm}`);
    }
  }

  if (manifest.requirements) {
    lines.push('requirements:');
    if (manifest.requirements.env) {
      lines.push('  env:');
      for (const e of manifest.requirements.env) {
        lines.push(`    - ${e}`);
      }
    }
    if (manifest.requirements.os) {
      lines.push('  os:');
      for (const o of manifest.requirements.os) {
        lines.push(`    - ${o}`);
      }
    }
  }

  if (manifest.capabilities && manifest.capabilities.length > 0) {
    lines.push('capabilities:');
    for (const cap of manifest.capabilities) {
      lines.push(`  - ${cap}`);
    }
  }

  if (manifest.tags && manifest.tags.length > 0) {
    lines.push('tags:');
    for (const tag of manifest.tags) {
      lines.push(`  - ${tag}`);
    }
  }

  if (manifest.enabled === false) {
    lines.push('enabled: false');
  }

  lines.push('---');

  // Add instructions if present
  if (manifest.instructions) {
    lines.push('');
    lines.push(manifest.instructions);
  }

  return lines.join('\n');
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a manifest for completeness and correctness
 */
export function validateManifest(manifest: AgentManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check name format
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(manifest.name)) {
    errors.push('Name must start with a letter and contain only letters, numbers, underscores, and hyphens');
  }

  // Check version format (semver)
  if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(manifest.version)) {
    errors.push('Version must be in semver format (e.g., 1.0.0)');
  }

  // Check domain
  const validDomains: AgentDomain[] = ['core', 'communication', 'analysis', 'workflow', 'integration', 'media', 'utility'];
  if (!validDomains.includes(manifest.domain)) {
    errors.push(`Invalid domain: ${manifest.domain}. Must be one of: ${validDomains.join(', ')}`);
  }

  // Check priority
  const validPriorities: AgentPriority[] = ['critical', 'high', 'normal', 'low'];
  if (!validPriorities.includes(manifest.priority)) {
    errors.push(`Invalid priority: ${manifest.priority}. Must be one of: ${validPriorities.join(', ')}`);
  }

  // Check inputs
  if (manifest.inputs) {
    for (const input of manifest.inputs) {
      if (!input.name) {
        errors.push('Input missing name');
      }
      if (!['string', 'number', 'boolean', 'object', 'array'].includes(input.type)) {
        errors.push(`Invalid input type for ${input.name}: ${input.type}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default parseAgentManifest;
