/**
 * Build System Prompt with Gateway Skills
 * Integrates OpenClaw-inspired tools into the AI system prompt
 */

import { getSkillsManager, type SkillTool } from './SkillsManager';

export interface SystemPromptConfig {
  enableWebSearch?: boolean;
  enableCodeInterpreter?: boolean;
  enableFileManager?: boolean;
  enableBrowserControl?: boolean;
  enableMemory?: boolean;
  customInstructions?: string;
  language?: 'fr' | 'en';
}

const DEFAULT_CONFIG: SystemPromptConfig = {
  enableWebSearch: true,
  enableCodeInterpreter: true,
  enableFileManager: true,
  enableBrowserControl: false,
  enableMemory: true,
  language: 'fr'
};

/**
 * Build the system prompt with enabled tools
 */
export function buildSystemPrompt(config: Partial<SystemPromptConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const skillsManager = getSkillsManager();
  const enabledTools = skillsManager.getToolsFromEnabledSkills();

  const isFrench = cfg.language === 'fr';

  const basePrompt = isFrench
    ? `Tu es Lisa, une assistante IA intelligente et polyvalente. Tu as accès à plusieurs outils pour aider l'utilisateur.`
    : `You are Lisa, an intelligent and versatile AI assistant. You have access to several tools to help the user.`;

  const toolsDescription = buildToolsDescription(enabledTools, isFrench);

  const instructions = isFrench
    ? `
## Instructions
- Réponds toujours de manière claire et concise
- Utilise les outils disponibles quand c'est pertinent
- Si tu dois faire une recherche web, utilise l'outil search_web
- Si tu dois exécuter du code, utilise l'outil execute_code
- Si tu dois mémoriser quelque chose, utilise l'outil memory_store
- Sois proactif et propose des solutions
`
    : `
## Instructions
- Always respond clearly and concisely
- Use available tools when relevant
- If you need to search the web, use the search_web tool
- If you need to execute code, use the execute_code tool
- If you need to remember something, use the memory_store tool
- Be proactive and suggest solutions
`;

  const customSection = cfg.customInstructions
    ? `\n## Custom Instructions\n${cfg.customInstructions}\n`
    : '';

  return `${basePrompt}

${toolsDescription}

${instructions}
${customSection}`.trim();
}

/**
 * Build tools description for the system prompt
 */
function buildToolsDescription(tools: SkillTool[], isFrench: boolean): string {
  if (tools.length === 0) {
    return isFrench
      ? '## Outils\nAucun outil disponible.'
      : '## Tools\nNo tools available.';
  }

  const header = isFrench ? '## Outils disponibles' : '## Available Tools';

  const toolsList = tools.map(tool => {
    const params = tool.parameters
      .map(p => `  - ${p.name} (${p.type}${p.required ? ', required' : ''}): ${p.description}`)
      .join('\n');

    return `### ${tool.name}
${tool.description}
Parameters:
${params}`;
  }).join('\n\n');

  return `${header}\n\n${toolsList}`;
}

/**
 * Build tools definitions for OpenAI function calling format
 */
export function buildToolDefinitions(): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}> {
  const skillsManager = getSkillsManager();
  const enabledTools = skillsManager.getToolsFromEnabledSkills();

  return enabledTools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.id,
      description: tool.description,
      parameters: {
        type: 'object' as const,
        properties: Object.fromEntries(
          tool.parameters.map(p => [
            p.name,
            {
              type: p.type === 'array' ? 'array' : p.type,
              description: p.description
            }
          ])
        ),
        required: tool.parameters
          .filter(p => p.required)
          .map(p => p.name)
      }
    }
  }));
}

/**
 * Get a simplified list of available tools for display
 */
export function getAvailableToolsList(): Array<{
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}> {
  const skillsManager = getSkillsManager();
  const allSkills = skillsManager.listSkills();

  const tools: Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
  }> = [];

  allSkills.forEach(skill => {
    const isEnabled = skillsManager.isSkillEnabled(skill.id);
    if (skill.manifest.tools) {
      skill.manifest.tools.forEach(tool => {
        tools.push({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          enabled: isEnabled
        });
      });
    }
  });

  return tools;
}

export default buildSystemPrompt;
