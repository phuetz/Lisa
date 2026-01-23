/**
 * Native Tool Definitions
 * 
 * Définitions des outils Lisa avec scopes, validation Zod et handlers.
 */

import { z } from 'zod';
import { 
  type ToolDefinition, 
  type ToolScope,
  nativeToolCallingService 
} from '../services/NativeToolCallingService';
import { mcpToolHandlers } from './McpToolHandlers';

// ============================================================================
// Tool Metadata (Gouvernance)
// ============================================================================

export type ToolCategory = 'communication' | 'vision' | 'memory' | 'calendar' | 'smarthome' | 'workflow' | 'agent' | 'system';
export type ToolRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ToolMeta {
  category: ToolCategory;
  risk: ToolRisk;
  requiresConsent: boolean;
  descriptionForUI: string;
  icon: string;  // Emoji ou nom d'icône
  estimatedDurationMs?: number;
  reversible: boolean;
}

export interface EnrichedToolDefinition extends ToolDefinition {
  meta: ToolMeta;
}

// Métadonnées pour chaque outil
export const TOOL_METADATA: Record<string, ToolMeta> = {
  lisa_chat: {
    category: 'communication',
    risk: 'low',
    requiresConsent: false,
    descriptionForUI: 'Conversation avec Lisa',
    icon: '💬',
    reversible: true
  },
  lisa_vision_analyze: {
    category: 'vision',
    risk: 'medium',
    requiresConsent: true,
    descriptionForUI: 'Analyse visuelle (caméra)',
    icon: '👁️',
    estimatedDurationMs: 2000,
    reversible: true
  },
  lisa_calendar_query: {
    category: 'calendar',
    risk: 'low',
    requiresConsent: false,
    descriptionForUI: 'Consultation du calendrier',
    icon: '📅',
    reversible: true
  },
  lisa_smart_home: {
    category: 'smarthome',
    risk: 'medium',
    requiresConsent: false,
    descriptionForUI: 'Contrôle domotique',
    icon: '🏠',
    reversible: true
  },
  lisa_memory_store: {
    category: 'memory',
    risk: 'low',
    requiresConsent: false,
    descriptionForUI: 'Mémorisation d\'information',
    icon: '🧠',
    reversible: true
  },
  lisa_memory_recall: {
    category: 'memory',
    risk: 'low',
    requiresConsent: false,
    descriptionForUI: 'Rappel de mémoire',
    icon: '💭',
    reversible: true
  },
  lisa_workflow_execute: {
    category: 'workflow',
    risk: 'high',
    requiresConsent: true,
    descriptionForUI: 'Exécution de workflow automatisé',
    icon: '⚡',
    reversible: false
  },
  lisa_agent_invoke: {
    category: 'agent',
    risk: 'medium',
    requiresConsent: false,
    descriptionForUI: 'Invocation d\'agent spécialisé',
    icon: '🤖',
    reversible: true
  },
  lisa_system_status: {
    category: 'system',
    risk: 'low',
    requiresConsent: false,
    descriptionForUI: 'Statut système Lisa',
    icon: '📊',
    reversible: true
  }
};

// ============================================================================
// Tool Input Schemas (Zod)
// ============================================================================

const ChatInputSchema = z.object({
  message: z.string().min(1).describe('Le message à envoyer à Lisa'),
  context: z.string().optional().describe('Contexte additionnel'),
  language: z.string().optional().describe('Langue de réponse (fr, en, etc.)')
});

const VisionAnalyzeInputSchema = z.object({
  image: z.string().min(1).describe('Image en base64 ou URL'),
  prompt: z.string().optional().describe('Question ou instruction pour l\'analyse')
});

const CalendarQueryInputSchema = z.object({
  action: z.enum(['list', 'create', 'update', 'delete']).describe('Action à effectuer'),
  date: z.string().optional().describe('Date au format ISO'),
  title: z.string().optional().describe('Titre de l\'événement'),
  description: z.string().optional().describe('Description de l\'événement'),
  eventId: z.string().optional().describe('ID de l\'événement (pour update/delete)')
});

const SmartHomeInputSchema = z.object({
  device: z.string().min(1).describe('Nom ou ID de l\'appareil'),
  action: z.enum(['on', 'off', 'toggle', 'set', 'status']).describe('Action à effectuer'),
  value: z.number().optional().describe('Valeur (pour set)')
});

const MemoryStoreInputSchema = z.object({
  key: z.string().min(1).describe('Clé de stockage'),
  value: z.string().min(1).describe('Valeur à stocker'),
  category: z.enum(['preference', 'fact', 'context']).optional().describe('Catégorie')
});

const MemoryRecallInputSchema = z.object({
  key: z.string().optional().describe('Clé à rechercher'),
  category: z.string().optional().describe('Catégorie à filtrer'),
  semantic_query: z.string().optional().describe('Recherche sémantique')
});

const WorkflowExecuteInputSchema = z.object({
  workflow_id: z.string().optional().describe('ID du workflow'),
  workflow_name: z.string().optional().describe('Nom du workflow'),
  parameters: z.record(z.string(), z.unknown()).optional().describe('Paramètres du workflow')
});

const AgentInvokeInputSchema = z.object({
  agent: z.string().min(1).describe('Nom de l\'agent'),
  input: z.string().min(1).describe('Entrée pour l\'agent'),
  options: z.record(z.string(), z.unknown()).optional().describe('Options supplémentaires')
});

const SystemStatusInputSchema = z.object({
  components: z.array(z.string()).optional().describe('Composants à vérifier')
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const NATIVE_TOOLS: ToolDefinition[] = [
  {
    name: 'lisa_chat',
    description: 'Envoyer un message à Lisa et recevoir une réponse intelligente',
    scopes: ['read:memory'] as ToolScope[],
    inputSchema: ChatInputSchema,
    handler: async (args) => {
      const validated = ChatInputSchema.parse(args);
      return mcpToolHandlers.lisa_chat(validated);
    }
  },
  {
    name: 'lisa_vision_analyze',
    description: 'Analyser une image avec la vision de Lisa (détection objets, texte, visages)',
    scopes: ['sensors:camera'] as ToolScope[],
    inputSchema: VisionAnalyzeInputSchema,
    handler: async (args) => {
      const validated = VisionAnalyzeInputSchema.parse(args);
      return mcpToolHandlers.lisa_vision_analyze(validated);
    }
  },
  {
    name: 'lisa_calendar_query',
    description: 'Interroger ou modifier le calendrier de Lisa',
    scopes: ['read:calendar'] as ToolScope[],
    inputSchema: CalendarQueryInputSchema,
    handler: async (args) => {
      const validated = CalendarQueryInputSchema.parse(args);
      // Ajouter write:calendar pour les actions de modification
      if (['create', 'update', 'delete'].includes(validated.action)) {
        if (!nativeToolCallingService.getRegistry().hasScope('write:calendar')) {
          return {
            success: false,
            error: 'Permission denied: write:calendar scope required',
            timestamp: new Date().toISOString()
          };
        }
      }
      return mcpToolHandlers.lisa_calendar_query(validated);
    }
  },
  {
    name: 'lisa_smart_home',
    description: 'Contrôler les appareils domotiques (lumières, thermostats, etc.)',
    scopes: ['read:device'] as ToolScope[],
    inputSchema: SmartHomeInputSchema,
    handler: async (args) => {
      const validated = SmartHomeInputSchema.parse(args);
      // Ajouter write:device pour les actions de contrôle
      if (['on', 'off', 'toggle', 'set'].includes(validated.action)) {
        if (!nativeToolCallingService.getRegistry().hasScope('write:device')) {
          return {
            success: false,
            error: 'Permission denied: write:device scope required',
            timestamp: new Date().toISOString()
          };
        }
      }
      return mcpToolHandlers.lisa_smart_home(validated);
    }
  },
  {
    name: 'lisa_memory_store',
    description: 'Stocker une information dans la mémoire persistante de Lisa',
    scopes: ['write:memory'] as ToolScope[],
    inputSchema: MemoryStoreInputSchema,
    handler: async (args) => {
      const validated = MemoryStoreInputSchema.parse(args);
      return mcpToolHandlers.lisa_memory_store(validated);
    }
  },
  {
    name: 'lisa_memory_recall',
    description: 'Rappeler une information de la mémoire de Lisa (recherche par clé ou sémantique)',
    scopes: ['read:memory'] as ToolScope[],
    inputSchema: MemoryRecallInputSchema,
    handler: async (args) => {
      const validated = MemoryRecallInputSchema.parse(args);
      return mcpToolHandlers.lisa_memory_recall(validated);
    }
  },
  {
    name: 'lisa_workflow_execute',
    description: 'Exécuter un workflow automatisé (séquence d\'actions)',
    scopes: ['workflow:execute'] as ToolScope[],
    inputSchema: WorkflowExecuteInputSchema,
    handler: async (args) => {
      const validated = WorkflowExecuteInputSchema.parse(args);
      return mcpToolHandlers.lisa_workflow_execute(validated);
    }
  },
  {
    name: 'lisa_agent_invoke',
    description: 'Invoquer un agent spécifique de Lisa (46 agents disponibles)',
    scopes: ['agent:invoke'] as ToolScope[],
    inputSchema: AgentInvokeInputSchema,
    handler: async (args) => {
      const validated = AgentInvokeInputSchema.parse(args);
      return mcpToolHandlers.lisa_agent_invoke(validated);
    }
  },
  {
    name: 'lisa_system_status',
    description: 'Obtenir le statut système de Lisa (agents, mémoire, services)',
    scopes: ['system:status'] as ToolScope[],
    inputSchema: SystemStatusInputSchema,
    handler: async (args) => {
      const validated = SystemStatusInputSchema.parse(args);
      return mcpToolHandlers.lisa_system_status(validated);
    }
  }
];

// ============================================================================
// Scope Presets (pour simplifier l'attribution des permissions)
// ============================================================================

export const SCOPE_PRESETS = {
  // Lecture seule - très safe
  readonly: [
    'read:memory',
    'read:calendar', 
    'read:device',
    'system:status'
  ] as ToolScope[],

  // Standard - lecture + écriture mémoire
  standard: [
    'read:memory',
    'write:memory',
    'read:calendar',
    'read:device',
    'system:status'
  ] as ToolScope[],

  // Full - tout sauf capteurs et workflows dangereux
  full: [
    'read:memory',
    'write:memory',
    'read:calendar',
    'write:calendar',
    'read:device',
    'write:device',
    'agent:invoke',
    'system:status'
  ] as ToolScope[],

  // Admin - tous les scopes
  admin: [
    'read:memory',
    'write:memory',
    'read:calendar',
    'write:calendar',
    'read:device',
    'write:device',
    'sensors:camera',
    'sensors:microphone',
    'workflow:execute',
    'agent:invoke',
    'system:status'
  ] as ToolScope[]
};

// ============================================================================
// Register all tools
// ============================================================================

export function registerAllNativeTools(): void {
  NATIVE_TOOLS.forEach(tool => {
    nativeToolCallingService.registerTool(tool);
  });
}

// ============================================================================
// Helper functions
// ============================================================================

export function grantPreset(preset: keyof typeof SCOPE_PRESETS): void {
  nativeToolCallingService.grantScopes(SCOPE_PRESETS[preset]);
}

export function getToolsByScope(scope: ToolScope): ToolDefinition[] {
  return NATIVE_TOOLS.filter(tool => tool.scopes.includes(scope));
}

export function getSafeTools(): ToolDefinition[] {
  const safeScopes: ToolScope[] = ['read:memory', 'read:calendar', 'read:device', 'system:status'];
  return NATIVE_TOOLS.filter(tool => 
    tool.scopes.every(scope => safeScopes.includes(scope))
  );
}

export function getSensitiveTools(): ToolDefinition[] {
  const sensitiveScopes: ToolScope[] = [
    'write:device', 
    'sensors:camera', 
    'sensors:microphone', 
    'workflow:execute'
  ];
  return NATIVE_TOOLS.filter(tool => 
    tool.scopes.some(scope => sensitiveScopes.includes(scope))
  );
}

// ============================================================================
// Metadata Helpers
// ============================================================================

export function getToolMeta(toolName: string): ToolMeta | undefined {
  return TOOL_METADATA[toolName];
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return NATIVE_TOOLS.filter(tool => 
    TOOL_METADATA[tool.name]?.category === category
  );
}

export function getToolsByRisk(risk: ToolRisk): ToolDefinition[] {
  return NATIVE_TOOLS.filter(tool => 
    TOOL_METADATA[tool.name]?.risk === risk
  );
}

export function getToolsRequiringConsent(): ToolDefinition[] {
  return NATIVE_TOOLS.filter(tool => 
    TOOL_METADATA[tool.name]?.requiresConsent === true
  );
}

export function getEnrichedTools(): EnrichedToolDefinition[] {
  return NATIVE_TOOLS.map(tool => ({
    ...tool,
    meta: TOOL_METADATA[tool.name] || {
      category: 'system' as ToolCategory,
      risk: 'low' as ToolRisk,
      requiresConsent: false,
      descriptionForUI: tool.description,
      icon: '🔧',
      reversible: true
    }
  }));
}

export function isToolAllowedByRisk(toolName: string, maxRisk: ToolRisk): boolean {
  const riskLevels: Record<ToolRisk, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };
  
  const meta = TOOL_METADATA[toolName];
  if (!meta) return true;
  
  return riskLevels[meta.risk] <= riskLevels[maxRisk];
}
