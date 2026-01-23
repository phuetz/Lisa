/**
 * GrokCliService
 * 
 * Service pour piloter Grok-CLI comme backend spécialisé "code + terminal + repo".
 * Grok-CLI n'est PAS ré-implémenté dans Lisa, mais exposé via ce service.
 * 
 * Responsabilités:
 * - Créer et envoyer des tâches à Grok-CLI
 * - Recevoir des résultats structurés (diffs, logs, coûts)
 * - Gérer les sessions et leur historique
 * - Respecter les modes de sécurité
 */

import { v4 as uuidv4 } from 'uuid';
import {
  DEFAULT_GROK_CONFIG,
  DEFAULT_LOCAL_LLM_CONFIG,
  GROK_MODEL_COSTS,
  type GrokCliConfig,
  type GrokCliTask,
  type GrokCliTaskKind,
  type GrokCliResult,
  type GrokCliRunStatus,
  type GrokCliDiff,
  type GrokCliCost,
  type GrokCliLogEntry,
  type GrokCliReasoningMode,
  type GrokCliSecurityMode,
  type GrokSession,
  type GrokMemory,
  type GrokBranch,
  type GrokModel,
  type GrokSkill,
  type GrokCostReport,
  type GrokPipeline,
  type GrokPipelineResult,
  type GrokPipelineStep,
  type LocalLLMConfig,
} from '../types/grokCli';

// ============================================
// Grok-CLI Backend Integration
// ============================================

/**
 * Interface for the actual Grok-CLI backend
 * This allows swapping between real CLI and simulation
 */
interface GrokCliBackend {
  isAvailable(): Promise<boolean>;
  execute(task: GrokCliTask, onOutput?: (chunk: string) => void): Promise<GrokCliResult>;
  abort(): void;
}

/**
 * Real Grok-CLI backend using the CLI package
 * 
 * Uses @phuetz/grok-cli from GitHub source.
 * 
 * GrokAgent API (from grok-cli source):
 * - constructor(apiKey, baseURL?, model?, maxToolRounds?, useRAGToolSelection?)
 * - processUserMessage(message): Promise<ChatEntry[]>
 * - processUserMessageStream(message): AsyncGenerator<StreamingChunk>
 * - executeBashCommand(command): Promise<ToolResult>
 * - setSelfHealing(enabled): void
 * - abort(): void
 * - dispose(): void
 * 
 * ChatEntry types: 'user' | 'assistant' | 'tool_call' | 'tool_result'
 * StreamingChunk types: 'content' | 'tool_calls' | 'tool_result' | 'token_count' | 'done'
 */
class RealGrokCliBackend implements GrokCliBackend {
  private aborted = false;
  private grokAgent: unknown = null;

  async isAvailable(): Promise<boolean> {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined') {
        return false; // CLI not available in browser
      }

      // Check for API key
      const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
      if (!apiKey) {
        return false;
      }

      // Try to check if grok-cli is available
      // Note: In test/browser environment, this will always return false
      // The real backend only works in Node.js with the package installed
      return false; // TODO: Enable when grok-cli is properly installed
    } catch {
      return false;
    }
  }

  async execute(task: GrokCliTask, onOutput?: (chunk: string) => void): Promise<GrokCliResult> {
    this.aborted = false;
    const logs: GrokCliLogEntry[] = [];
    const diffs: GrokCliDiff[] = [];
    const startedAt = new Date().toISOString();

    try {
      // Dynamic import of grok-cli (only works in Node.js with package installed)
      // Using string concatenation to prevent Vite from resolving at build time
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let GrokAgent: any;
      try {
        // Use dynamic import with variable to prevent static analysis
        const moduleName = ['@phuetz', 'grok-cli'].join('/');
        const grokCliModule = await new Function('m', 'return import(m)')(moduleName);
        GrokAgent = grokCliModule.GrokAgent;
      } catch {
        throw new Error('grok-cli package not available. Install with: npm install github:phuetz/grok-cli');
      }

      const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
      if (!apiKey) {
        throw new Error('GROK_API_KEY or XAI_API_KEY environment variable required');
      }

      // Map reasoning mode to grok-cli settings
      const maxRounds = this.getMaxRoundsForMode(task.reasoningMode);
      
      // Create GrokAgent instance
      this.grokAgent = new GrokAgent(
        apiKey,
        process.env.GROK_BASE_URL,
        process.env.GROK_MODEL || 'grok-3',
        maxRounds,
        true // useRAGToolSelection
      );

      // Build prompt based on task kind
      const prompt = this.buildPromptForTask(task);

      logs.push({
        ts: new Date().toISOString(),
        level: 'info',
        source: 'grok-cli',
        message: `Exécution: ${task.kind} - ${prompt.slice(0, 100)}...`,
      });
      onOutput?.(`[info] Exécution: ${task.kind}\n`);

      // Use streaming for real-time feedback
      const agent = this.grokAgent as { 
        processUserMessageStream: (msg: string) => AsyncGenerator<{
          type: string;
          content?: string;
          toolCalls?: unknown[];
          tokenCount?: number;
        }>;
        dispose?: () => void;
      };

      let fullContent = '';
      
      for await (const chunk of agent.processUserMessageStream(prompt)) {
        if (this.aborted) {
          throw new Error('Tâche annulée');
        }

        switch (chunk.type) {
          case 'content':
            if (chunk.content) {
              fullContent += chunk.content;
              onOutput?.(chunk.content);
            }
            break;
          case 'tool_calls':
            logs.push({
              ts: new Date().toISOString(),
              level: 'info',
              source: 'grok-cli',
              message: `Outils appelés: ${JSON.stringify(chunk.toolCalls)}`,
            });
            break;
          case 'tool_result':
            logs.push({
              ts: new Date().toISOString(),
              level: 'info',
              source: 'grok-cli',
              message: `Résultat outil: ${chunk.content?.slice(0, 200)}...`,
            });
            break;
          case 'token_count':
            logs.push({
              ts: new Date().toISOString(),
              level: 'debug',
              source: 'grok-cli',
              message: `Tokens: ${chunk.tokenCount}`,
            });
            break;
          case 'done':
            logs.push({
              ts: new Date().toISOString(),
              level: 'info',
              source: 'grok-cli',
              message: 'Traitement terminé',
            });
            break;
        }
      }

      // Extract diffs from content if present (for fix/refactor tasks)
      if (['fix', 'refactor', 'test'].includes(task.kind)) {
        const extractedDiffs = this.extractDiffsFromContent(fullContent, task);
        diffs.push(...extractedDiffs);
      }

      // Clean up
      if (agent.dispose) {
        agent.dispose();
      }

      // Estimate cost based on response
      const cost = this.estimateCostFromContent(fullContent);

      return {
        taskId: task.id,
        status: 'succeeded',
        summary: this.generateSummaryFromContent(task, fullContent, diffs),
        diffs,
        logs,
        cost,
        rawOutput: fullContent,
        startedAt,
        finishedAt: new Date().toISOString(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      logs.push({
        ts: new Date().toISOString(),
        level: 'error',
        source: 'grok-cli',
        message: errorMessage,
      });

      return {
        taskId: task.id,
        status: this.aborted ? 'cancelled' : 'failed',
        summary: errorMessage,
        diffs: [],
        logs,
        startedAt,
        finishedAt: new Date().toISOString(),
      };
    }
  }

  abort(): void {
    this.aborted = true;
    if (this.grokAgent) {
      const agent = this.grokAgent as { abort?: () => void };
      if (agent.abort) {
        agent.abort();
      }
    }
  }

  private getMaxRoundsForMode(mode: GrokCliReasoningMode): number {
    const rounds: Record<GrokCliReasoningMode, number> = {
      shallow: 10,
      medium: 50,
      deep: 100,
      exhaustive: 400,
    };
    return rounds[mode];
  }

  private buildPromptForTask(task: GrokCliTask): string {
    const prefixes: Record<GrokCliTaskKind, string> = {
      explain: 'Explain in detail:',
      review: 'Review this code and provide feedback:',
      fix: 'Fix this bug:',
      refactor: 'Refactor this code:',
      test: 'Generate tests for:',
      search: 'Search the codebase for:',
      custom: '',
    };

    let prompt = prefixes[task.kind] ? `${prefixes[task.kind]} ` : '';
    prompt += task.description;

    if (task.filePattern) {
      prompt += `\n\nFiles: ${task.filePattern}`;
    }

    // Add reasoning mode hint
    if (task.reasoningMode === 'deep') {
      prompt = `megathink: ${prompt}`;
    } else if (task.reasoningMode === 'exhaustive') {
      prompt = `ultrathink: ${prompt}`;
    }

    return prompt;
  }

  private extractDiffsFromContent(content: string, task: GrokCliTask): GrokCliDiff[] {
    const diffs: GrokCliDiff[] = [];
    
    // Look for code blocks with file paths
    const codeBlockRegex = /```(?:diff|patch)?\n?([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const block = match[1];
      if (block.includes('@@') || block.includes('---') || block.includes('+++')) {
        diffs.push({
          filePath: task.filePattern || 'unknown',
          patch: block,
        });
      }
    }

    return diffs;
  }

  private estimateCostFromContent(content: string): GrokCliCost {
    // Rough estimation: ~4 chars per token
    const outputTokens = Math.ceil(content.length / 4);
    const inputTokens = Math.ceil(outputTokens * 0.3);
    
    // grok-3 pricing
    const totalUsd = (inputTokens * 5 + outputTokens * 15) / 1_000_000;
    
    return { totalUsd, inputTokens, outputTokens };
  }

  private generateSummaryFromContent(
    task: GrokCliTask, 
    content: string, 
    diffs: GrokCliDiff[]
  ): string {
    // Extract first paragraph or sentence as summary
    const firstParagraph = content.split('\n\n')[0] || '';
    const summary = firstParagraph.slice(0, 200);
    
    const prefix = {
      explain: '📖 Explication:',
      review: '🔍 Review:',
      fix: `🔧 Fix (${diffs.length} fichier(s)):`,
      refactor: `♻️ Refactor (${diffs.length} fichier(s)):`,
      test: '🧪 Tests générés:',
      search: '🔎 Résultats:',
      custom: '✅ Terminé:',
    }[task.kind];

    return `${prefix} ${summary}${summary.length >= 200 ? '...' : ''}`;
  }
}

/**
 * LM Studio backend - Uses local LLM via OpenAI-compatible API
 * Works in browser environment by calling localhost:1234
 */
class LMStudioBackend implements GrokCliBackend {
  private aborted = false;
  private abortController: AbortController | null = null;
  private config: LocalLLMConfig;
  private toolsSupported = false;

  constructor(config?: Partial<LocalLLMConfig>) {
    this.config = { 
      ...DEFAULT_LOCAL_LLM_CONFIG, 
      forceTools: true,  // Enable tools by default for better code tasks
      ...config 
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.enabled) return false;
    
    try {
      // Test connection to LM Studio
      const response = await fetch(`${this.config.endpoint}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        // Probe for tools support if configured
        if (this.config.probeTools) {
          this.toolsSupported = await this.probeToolsSupport();
        } else {
          this.toolsSupported = this.config.forceTools ?? false;
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Probe if the model supports function calling
   */
  private async probeToolsSupport(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: 'test' }],
          tools: [{ type: 'function', function: { name: 'test', parameters: {} } }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async execute(task: GrokCliTask, onOutput?: (chunk: string) => void): Promise<GrokCliResult> {
    this.aborted = false;
    this.abortController = new AbortController();
    
    const logs: GrokCliLogEntry[] = [];
    const diffs: GrokCliDiff[] = [];
    const startedAt = new Date().toISOString();

    try {
      // Build the prompt
      const prompt = this.buildPrompt(task);
      
      logs.push({
        ts: new Date().toISOString(),
        level: 'info',
        source: 'lisa',
        message: `🖥️ LM Studio: ${task.kind} - ${task.description.slice(0, 50)}...`,
      });
      onOutput?.(`[info] LM Studio: Exécution ${task.kind}\n`);

      // Call LM Studio API (OpenAI-compatible)
      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: this.getSystemPrompt(task) },
            { role: 'user', content: prompt },
          ],
          stream: true,
          temperature: task.reasoningMode === 'exhaustive' ? 0.2 : 0.7,
          max_tokens: this.getMaxTokens(task.reasoningMode),
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`LM Studio error: ${response.status} ${response.statusText}`);
      }

      // Stream the response
      let fullContent = '';
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          if (this.aborted) {
            reader.cancel();
            throw new Error('Tâche annulée');
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                onOutput?.(content);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      logs.push({
        ts: new Date().toISOString(),
        level: 'info',
        source: 'grok-cli',
        message: '✅ Traitement terminé',
      });

      // Extract diffs if applicable
      if (['fix', 'refactor', 'test'].includes(task.kind)) {
        const extractedDiffs = this.extractDiffs(fullContent, task);
        diffs.push(...extractedDiffs);
      }

      return {
        taskId: task.id,
        status: 'succeeded',
        summary: this.generateSummary(task, fullContent, diffs),
        diffs,
        logs,
        cost: { totalUsd: 0, inputTokens: 0, outputTokens: fullContent.length / 4 },
        rawOutput: fullContent,
        startedAt,
        finishedAt: new Date().toISOString(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      logs.push({
        ts: new Date().toISOString(),
        level: 'error',
        source: 'grok-cli',
        message: errorMessage,
      });

      return {
        taskId: task.id,
        status: this.aborted ? 'cancelled' : 'failed',
        summary: errorMessage,
        diffs: [],
        logs,
        startedAt,
        finishedAt: new Date().toISOString(),
      };
    }
  }

  abort(): void {
    this.aborted = true;
    this.abortController?.abort();
  }

  private getSystemPrompt(task: GrokCliTask): string {
    const prompts: Record<GrokCliTaskKind, string> = {
      explain: 'Tu es un expert en programmation. Explique le code de manière claire et détaillée.',
      review: 'Tu es un reviewer de code expérimenté. Analyse le code et fournis des retours constructifs.',
      fix: 'Tu es un debugger expert. Identifie et corrige les bugs. Fournis le code corrigé dans un bloc ```diff.',
      refactor: 'Tu es un architecte logiciel. Améliore la structure du code. Fournis les changements dans un bloc ```diff.',
      test: 'Tu es un expert en tests. Génère des tests unitaires complets.',
      search: 'Tu es un assistant de recherche. Aide à trouver des patterns dans le code.',
      custom: 'Tu es un assistant de développement polyvalent.',
    };
    return prompts[task.kind];
  }

  private buildPrompt(task: GrokCliTask): string {
    let prompt = task.description;
    if (task.filePattern) {
      prompt += `\n\nFichiers concernés: ${task.filePattern}`;
    }
    return prompt;
  }

  private getMaxTokens(mode: GrokCliReasoningMode): number {
    const tokens: Record<GrokCliReasoningMode, number> = {
      shallow: 1000,
      medium: 2000,
      deep: 4000,
      exhaustive: 8000,
    };
    return tokens[mode];
  }

  private extractDiffs(content: string, task: GrokCliTask): GrokCliDiff[] {
    const diffs: GrokCliDiff[] = [];
    const codeBlockRegex = /```(?:diff|patch)?\n?([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const block = match[1];
      if (block.includes('@@') || block.includes('---') || block.includes('+++') || block.includes('-') || block.includes('+')) {
        diffs.push({
          filePath: task.filePattern || 'unknown',
          patch: block,
        });
      }
    }
    return diffs;
  }

  private generateSummary(task: GrokCliTask, content: string, diffs: GrokCliDiff[]): string {
    const firstLine = content.split('\n')[0] || '';
    const summary = firstLine.slice(0, 150);
    
    const prefix = {
      explain: '📖',
      review: '🔍',
      fix: `🔧 (${diffs.length} fichier(s))`,
      refactor: `♻️ (${diffs.length} fichier(s))`,
      test: '🧪',
      search: '🔎',
      custom: '✅',
    }[task.kind];

    return `${prefix} ${summary}${summary.length >= 150 ? '...' : ''}`;
  }
}

/**
 * Simulated Grok-CLI backend for development/testing
 */
class SimulatedGrokCliBackend implements GrokCliBackend {
  private aborted = false;

  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  async execute(task: GrokCliTask, onOutput?: (chunk: string) => void): Promise<GrokCliResult> {
    this.aborted = false;
    const logs: GrokCliLogEntry[] = [];
    const diffs: GrokCliDiff[] = [];

    // Simulate processing based on reasoning mode
    const delays: Record<GrokCliReasoningMode, number> = {
      shallow: 300,
      medium: 800,
      deep: 1500,
      exhaustive: 3000,
    };

    const steps = this.getTaskSteps(task.kind);
    const stepDelay = delays[task.reasoningMode] / steps.length;

    for (const step of steps) {
      if (this.aborted) {
        throw new Error('Tâche annulée');
      }

      const log: GrokCliLogEntry = {
        ts: new Date().toISOString(),
        level: 'info',
        source: 'grok-cli',
        message: step,
      };
      logs.push(log);
      onOutput?.(`[${log.level}] ${log.message}\n`);

      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }

    // Generate diffs for write operations
    if (['fix', 'refactor', 'test'].includes(task.kind) && task.securityMode !== 'read_only') {
      const diff: GrokCliDiff = {
        filePath: task.filePattern || 'src/example.ts',
        patch: this.generateMockPatch(task),
      };
      diffs.push(diff);
    }

    // Estimate cost
    const cost = this.estimateCost(task);

    return {
      taskId: task.id,
      status: 'succeeded',
      summary: this.generateSummary(task, diffs),
      diffs,
      logs,
      cost,
      startedAt: task.createdAt,
      finishedAt: new Date().toISOString(),
    };
  }

  abort(): void {
    this.aborted = true;
  }

  private getTaskSteps(kind: GrokCliTaskKind): string[] {
    const stepMap: Record<GrokCliTaskKind, string[]> = {
      explain: ['📖 Analyse du code source...', '🧠 Génération de l\'explication...', '✅ Explication terminée'],
      review: ['🔍 Analyse statique...', '📋 Vérification des patterns...', '📊 Génération du rapport...'],
      fix: ['🐛 Localisation du bug...', '🔬 Analyse de la cause racine...', '🔧 Génération du patch...', '✅ Validation...'],
      refactor: ['📐 Analyse de la structure...', '💡 Identification des améliorations...', '🔄 Application des changements...'],
      test: ['📝 Analyse du code...', '🧪 Génération des cas de test...', '✍️ Écriture des tests...'],
      search: ['📚 Indexation du code...', '🔎 Recherche sémantique...', '📊 Ranking des résultats...'],
      custom: ['⚙️ Analyse...', '🔄 Traitement...', '✅ Finalisation...'],
    };
    return stepMap[kind];
  }

  private generateMockPatch(task: GrokCliTask): string {
    const patchTemplates: Record<GrokCliTaskKind, string> = {
      fix: `@@ -10,7 +10,7 @@
 function processData(data: unknown) {
-  // Bug: missing null check
-  return data.value;
+  // Fixed: added null check
+  return data?.value ?? null;
 }`,
      refactor: `@@ -1,5 +1,8 @@
-function oldFunction() {
-  // Old implementation
+/**
+ * Refactored function with improved structure
+ */
+function newFunction(): void {
+  // Improved implementation
 }`,
      test: `@@ -0,0 +1,15 @@
+import { describe, it, expect } from 'vitest';
+import { targetFunction } from './target';
+
+describe('targetFunction', () => {
+  it('should handle normal input', () => {
+    expect(targetFunction('test')).toBeDefined();
+  });
+
+  it('should handle edge cases', () => {
+    expect(targetFunction(null)).toBeNull();
+  });
+});`,
      explain: '',
      review: '',
      search: '',
      custom: '',
    };
    return patchTemplates[task.kind] || '';
  }

  private estimateCost(task: GrokCliTask): GrokCliCost {
    const tokenMultiplier: Record<GrokCliReasoningMode, number> = {
      shallow: 1,
      medium: 2,
      deep: 4,
      exhaustive: 8,
    };
    
    const baseTokens = 1500;
    const multiplier = tokenMultiplier[task.reasoningMode];
    const inputTokens = baseTokens * multiplier;
    const outputTokens = Math.floor(inputTokens * 0.6);
    
    // Use grok-3 costs as default
    const modelCosts = GROK_MODEL_COSTS['grok-3'];
    const totalUsd = (inputTokens * modelCosts.input + outputTokens * modelCosts.output) / 1_000_000;

    return { totalUsd, inputTokens, outputTokens };
  }

  private generateSummary(task: GrokCliTask, diffs: GrokCliDiff[]): string {
    const summaries: Record<GrokCliTaskKind, string> = {
      explain: '✅ Explication générée avec succès.',
      review: `✅ Code review terminée. ${diffs.length > 0 ? `${diffs.length} suggestion(s).` : 'Aucun problème détecté.'}`,
      fix: `✅ Bug corrigé. ${diffs.length} fichier(s) modifié(s).`,
      refactor: `✅ Refactoring terminé. ${diffs.length} fichier(s) modifié(s).`,
      test: `✅ Tests générés. ${diffs.length} fichier(s) créé(s).`,
      search: '✅ Recherche terminée.',
      custom: '✅ Tâche terminée.',
    };
    return summaries[task.kind];
  }
}

// ============================================
// Types internes
// ============================================

/** Options pour créer une tâche */
export interface CreateTaskOptions {
  kind: GrokCliTaskKind;
  title?: string;
  description: string;
  repoPath?: string;
  filePattern?: string;
  reasoningMode?: GrokCliReasoningMode;
  securityMode?: GrokCliSecurityMode;
  maxRounds?: number;
  budgetUsd?: number;
}

/** Callbacks pour le suivi d'exécution */
export interface TaskExecutionCallbacks {
  onStatusChange?: (status: GrokCliRunStatus) => void;
  onLog?: (log: GrokCliLogEntry) => void;
  onDiff?: (diff: GrokCliDiff) => void;
  onStream?: (chunk: string) => void;
  onConfirmationRequired?: (action: string) => Promise<boolean>;
}

// ============================================
// Service Principal
// ============================================

export class GrokCliService {
  private config: GrokCliConfig;
  private sessions: Map<string, GrokSession> = new Map();
  private tasks: Map<string, GrokCliTask> = new Map();
  private results: Map<string, GrokCliResult> = new Map();
  private memories: Map<string, GrokMemory> = new Map();
  private currentSessionId: string | null = null;
  private abortController: AbortController | null = null;
  
  // Backend (real CLI, LM Studio, or simulation)
  private backend: GrokCliBackend;
  private realBackend: RealGrokCliBackend;
  private lmStudioBackend: LMStudioBackend;
  private simulatedBackend: SimulatedGrokCliBackend;
  
  // Tracking des coûts
  private totalCost = 0;
  private dailyCost = 0;
  private lastCostResetDate: string = new Date().toDateString();
  
  // Logs
  private logs: GrokCliLogEntry[] = [];

  constructor(config?: Partial<GrokCliConfig>) {
    this.config = {
      ...DEFAULT_GROK_CONFIG,
      ...config,
    };
    
    // Initialize backends
    this.realBackend = new RealGrokCliBackend();
    this.lmStudioBackend = new LMStudioBackend(config?.localLLM);
    this.simulatedBackend = new SimulatedGrokCliBackend();
    this.backend = this.simulatedBackend; // Default to simulation
    
    this.loadFromStorage();
    this.initializeBackend();
  }

  /**
   * Initialize the appropriate backend
   * Priority: 1. Real grok-cli, 2. LM Studio, 3. Simulation
   */
  private async initializeBackend(): Promise<void> {
    try {
      // Try real grok-cli first
      if (await this.realBackend.isAvailable()) {
        this.backend = this.realBackend;
        this.log('info', '🚀 GrokCliService initialisé avec backend grok-cli');
        return;
      }
      
      // Try LM Studio
      if (await this.lmStudioBackend.isAvailable()) {
        this.backend = this.lmStudioBackend;
        this.log('info', '🖥️ GrokCliService initialisé avec LM Studio');
        return;
      }
      
      // Fall back to simulation
      this.backend = this.simulatedBackend;
      this.log('info', '🎭 GrokCliService initialisé avec backend simulé');
    } catch {
      this.backend = this.simulatedBackend;
      this.log('warning', 'Backends non disponibles, utilisation du simulateur');
    }
  }

  /**
   * Check if using real backend (grok-cli or LM Studio)
   */
  isUsingRealBackend(): boolean {
    return this.backend === this.realBackend || this.backend === this.lmStudioBackend;
  }

  /**
   * Check if using LM Studio backend
   */
  isUsingLMStudio(): boolean {
    return this.backend === this.lmStudioBackend;
  }

  /**
   * Get the current backend type
   */
  getBackendType(): 'grok-cli' | 'lm-studio' | 'simulation' {
    if (this.backend === this.realBackend) return 'grok-cli';
    if (this.backend === this.lmStudioBackend) return 'lm-studio';
    return 'simulation';
  }

  /**
   * Force switch to LM Studio backend
   */
  async useLMStudio(): Promise<boolean> {
    if (await this.lmStudioBackend.isAvailable()) {
      this.backend = this.lmStudioBackend;
      this.log('info', '🖥️ Basculé sur LM Studio');
      return true;
    }
    this.log('warning', 'LM Studio non disponible');
    return false;
  }

  // ============================================
  // SECTION 1: Configuration
  // ============================================

  setConfig(config: Partial<GrokCliConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('info', `Configuration mise à jour: ${Object.keys(config).join(', ')}`);
  }

  getConfig(): GrokCliConfig {
    return { ...this.config };
  }

  setModel(model: GrokModel): void {
    this.config.model = model;
    this.log('info', `Modèle changé: ${model}`);
  }

  setSecurityMode(mode: GrokCliSecurityMode): void {
    this.config.securityMode = mode;
    this.log('info', `Mode sécurité: ${mode}`);
  }

  setReasoningMode(mode: GrokCliReasoningMode): void {
    this.config.reasoningMode = mode;
    this.log('info', `Mode raisonnement: ${mode}`);
  }

  // ============================================
  // SECTION 2: Gestion des Tâches
  // ============================================

  /**
   * Crée une nouvelle tâche Grok-CLI
   */
  createTask(options: CreateTaskOptions): GrokCliTask {
    const task: GrokCliTask = {
      id: uuidv4(),
      kind: options.kind,
      title: options.title,
      description: options.description,
      repoPath: options.repoPath || this.config.defaultRepoPath || process.cwd(),
      filePattern: options.filePattern,
      reasoningMode: options.reasoningMode || this.config.reasoningMode,
      securityMode: options.securityMode || this.config.securityMode,
      maxRounds: options.maxRounds || this.config.maxRounds,
      budgetUsd: options.budgetUsd || this.config.budgetUsd,
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    
    // Ajouter à la session courante
    const session = this.getCurrentSession();
    if (session) {
      session.tasks.push(task);
      session.updatedAt = new Date();
    }

    this.log('info', `Tâche créée: ${task.kind} - ${task.id}`);
    return task;
  }

  /**
   * Exécute une tâche
   */
  async executeTask(
    taskId: string,
    callbacks?: TaskExecutionCallbacks
  ): Promise<GrokCliResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Tâche non trouvée: ${taskId}`);
    }

    // Vérifier le mode de sécurité
    if (task.securityMode === 'read_only' && ['fix', 'refactor'].includes(task.kind)) {
      throw new Error(`Mode read_only: les tâches de type ${task.kind} sont interdites`);
    }

    this.abortController = new AbortController();
    const startedAt = new Date().toISOString();

    // Initialiser le résultat
    let result: GrokCliResult = {
      taskId,
      status: 'running',
      summary: '',
      diffs: [],
      logs: [],
      startedAt,
    };

    callbacks?.onStatusChange?.('running');
    this.log('info', `Exécution tâche: ${task.kind} - ${taskId}`);

    try {
      // Appeler Grok-CLI (simulation pour l'instant)
      result = await this.callGrokCli(task, callbacks);
      result.status = 'succeeded';
      callbacks?.onStatusChange?.('succeeded');
      
    } catch (error) {
      result.status = this.abortController.signal.aborted ? 'cancelled' : 'failed';
      result.summary = error instanceof Error ? error.message : 'Erreur inconnue';
      this.log('error', `Tâche échouée: ${result.summary}`);
      callbacks?.onStatusChange?.(result.status);
    } finally {
      result.finishedAt = new Date().toISOString();
      this.results.set(taskId, result);
      
      // Ajouter à la session
      const session = this.getCurrentSession();
      if (session) {
        session.results.push(result);
        session.updatedAt = new Date();
      }

      // Mettre à jour les coûts
      if (result.cost) {
        this.updateCosts(result.cost.totalUsd);
      }

      this.abortController = null;
    }

    return result;
  }

  /**
   * Crée et exécute une tâche en une seule opération
   */
  async runTask(
    options: CreateTaskOptions,
    callbacks?: TaskExecutionCallbacks
  ): Promise<GrokCliResult> {
    const task = this.createTask(options);
    return this.executeTask(task.id, callbacks);
  }

  /**
   * Annule la tâche en cours
   */
  cancelTask(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.backend.abort();
      this.log('info', 'Tâche annulée');
    }
  }

  /**
   * Récupère une tâche par ID
   */
  getTask(taskId: string): GrokCliTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Récupère le résultat d'une tâche
   */
  getResult(taskId: string): GrokCliResult | undefined {
    return this.results.get(taskId);
  }

  /**
   * Liste toutes les tâches
   */
  listTasks(): GrokCliTask[] {
    return Array.from(this.tasks.values());
  }

  // ============================================
  // SECTION 3: Appel à Grok-CLI
  // ============================================

  /**
   * Appelle Grok-CLI pour exécuter une tâche
   * Utilise le backend approprié (réel ou simulé)
   */
  private async callGrokCli(
    task: GrokCliTask,
    callbacks?: TaskExecutionCallbacks
  ): Promise<GrokCliResult> {
    // Log de début
    const startLog: GrokCliLogEntry = {
      ts: new Date().toISOString(),
      level: 'info',
      source: 'lisa',
      message: `Démarrage tâche ${task.kind}: ${task.description.slice(0, 100)}...`,
    };
    callbacks?.onLog?.(startLog);

    // Utiliser le backend pour exécuter la tâche
    const result = await this.backend.execute(task, (chunk) => {
      callbacks?.onStream?.(chunk);
      // Parse log entries from stream if possible
      if (chunk.startsWith('[')) {
        const match = chunk.match(/^\[(\w+)\] (.+)$/);
        if (match) {
          const log: GrokCliLogEntry = {
            ts: new Date().toISOString(),
            level: match[1] as 'info' | 'warning' | 'error' | 'debug',
            source: 'grok-cli',
            message: match[2],
          };
          callbacks?.onLog?.(log);
        }
      }
    });

    // Notify diffs
    for (const diff of result.diffs) {
      callbacks?.onDiff?.(diff);
    }

    return result;
  }

  // ============================================
  // SECTION 4: Sessions
  // ============================================

  createSession(name?: string): GrokSession {
    const id = uuidv4();
    const session: GrokSession = {
      id,
      name: name || `Session ${this.sessions.size + 1}`,
      messages: [],
      tasks: [],
      results: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      config: { ...this.config },
      stats: {
        totalTokens: 0,
        totalCost: 0,
        toolCallsCount: 0,
        roundsUsed: 0,
        startTime: new Date(),
      },
      branches: [{
        id: 'main',
        name: 'main',
        messageStartIndex: 0,
        createdAt: new Date(),
      }],
      currentBranchId: 'main',
    };

    this.sessions.set(id, session);
    this.currentSessionId = id;
    this.log('info', `Session créée: ${session.name}`);
    return session;
  }

  getCurrentSession(): GrokSession | null {
    if (!this.currentSessionId) return null;
    return this.sessions.get(this.currentSessionId) || null;
  }

  switchSession(sessionId: string): GrokSession | null {
    if (this.sessions.has(sessionId)) {
      this.currentSessionId = sessionId;
      this.log('info', `Session changée: ${sessionId}`);
      return this.sessions.get(sessionId) || null;
    }
    return null;
  }

  listSessions(): GrokSession[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(sessionId: string): boolean {
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
    return this.sessions.delete(sessionId);
  }

  // ============================================
  // SECTION 5: Pipelines (raccourcis)
  // ============================================

  async runPipeline(pipeline: GrokPipeline, target?: string): Promise<GrokPipelineResult> {
    const pipelineToTask: Record<GrokPipeline, GrokCliTaskKind> = {
      'code-review': 'review',
      'bug-fix': 'fix',
      'security-audit': 'review',
      'documentation': 'explain',
      'refactoring': 'refactor',
    };

    const startTime = Date.now();
    const steps: GrokPipelineStep[] = [];

    const result = await this.runTask({
      kind: pipelineToTask[pipeline],
      title: `Pipeline: ${pipeline}`,
      description: `Exécuter le pipeline ${pipeline}${target ? ` sur ${target}` : ''}`,
      filePattern: target,
    });

    steps.push({
      name: pipeline,
      status: result.status === 'succeeded' ? 'completed' : 'failed',
      output: result.summary,
      duration: Date.now() - startTime,
    });

    return {
      pipeline,
      success: result.status === 'succeeded',
      steps,
      summary: result.summary,
      duration: Date.now() - startTime,
    };
  }

  // ============================================
  // SECTION 6: Mémoire Persistante
  // ============================================

  remember(key: string, value: string): void {
    const memory: GrokMemory = {
      key,
      value,
      createdAt: this.memories.has(key) ? this.memories.get(key)!.createdAt : new Date(),
      updatedAt: new Date(),
    };
    this.memories.set(key, memory);
    this.saveToStorage();
  }

  recall(key: string): string | undefined {
    return this.memories.get(key)?.value;
  }

  forgetMemory(key: string): boolean {
    const deleted = this.memories.delete(key);
    if (deleted) this.saveToStorage();
    return deleted;
  }

  listMemories(): GrokMemory[] {
    return Array.from(this.memories.values());
  }

  // ============================================
  // SECTION 7: Branches
  // ============================================

  forkBranch(name: string): GrokBranch | null {
    const session = this.getCurrentSession();
    if (!session) return null;

    const branch: GrokBranch = {
      id: uuidv4(),
      name,
      parentBranchId: session.currentBranchId,
      messageStartIndex: session.messages.length,
      createdAt: new Date(),
    };

    session.branches.push(branch);
    session.currentBranchId = branch.id;
    return branch;
  }

  checkoutBranch(branchId: string): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;

    const branch = session.branches.find(b => b.id === branchId);
    if (!branch) return false;

    session.currentBranchId = branchId;
    return true;
  }

  listBranches(): GrokBranch[] {
    return this.getCurrentSession()?.branches || [];
  }

  // ============================================
  // SECTION 8: Skills
  // ============================================

  activateSkill(skill: GrokSkill): void {
    if (!this.config.activeSkills.includes(skill)) {
      this.config.activeSkills.push(skill);
    }
  }

  deactivateSkill(skill: GrokSkill): void {
    this.config.activeSkills = this.config.activeSkills.filter(s => s !== skill);
  }

  getActiveSkills(): GrokSkill[] {
    return [...this.config.activeSkills];
  }

  // ============================================
  // SECTION 9: Coûts
  // ============================================

  getCostReport(): GrokCostReport {
    const session = this.getCurrentSession();
    return {
      sessionCost: session?.stats.totalCost || 0,
      dailyCost: this.dailyCost,
      totalCost: this.totalCost,
      tokensUsed: { input: 0, output: 0 },
      isOverBudget: this.config.budgetUsd ? this.totalCost >= this.config.budgetUsd : false,
    };
  }

  private updateCosts(cost: number): void {
    const today = new Date().toDateString();
    if (today !== this.lastCostResetDate) {
      this.dailyCost = 0;
      this.lastCostResetDate = today;
    }
    this.dailyCost += cost;
    this.totalCost += cost;

    const session = this.getCurrentSession();
    if (session) {
      session.stats.totalCost += cost;
    }
  }

  resetSessionCosts(): void {
    const session = this.getCurrentSession();
    if (session) {
      session.stats.totalCost = 0;
      session.stats.totalTokens = 0;
    }
  }

  // ============================================
  // SECTION 10: Logs
  // ============================================

  private log(level: GrokCliLogEntry['level'], message: string): void {
    const entry: GrokCliLogEntry = {
      ts: new Date().toISOString(),
      level,
      source: 'lisa',
      message,
    };
    this.logs.push(entry);
    
    // Garder seulement les 1000 derniers logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  getLogs(limit = 100): GrokCliLogEntry[] {
    return this.logs.slice(-limit);
  }

  // ============================================
  // SECTION 11: Persistance
  // ============================================

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('grok-cli-memories');
      if (stored) {
        const data = JSON.parse(stored) as GrokMemory[];
        data.forEach(m => {
          this.memories.set(m.key, {
            ...m,
            createdAt: new Date(m.createdAt),
            updatedAt: new Date(m.updatedAt),
          });
        });
      }
    } catch {
      console.warn('Failed to load grok-cli data from storage');
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.memories.values());
      localStorage.setItem('grok-cli-memories', JSON.stringify(data));
    } catch {
      console.warn('Failed to save grok-cli data to storage');
    }
  }

  // ============================================
  // SECTION 12: Annulation
  // ============================================

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.log('info', 'Exécution annulée');
    }
  }
}

// Instance singleton
export const grokCliService = new GrokCliService();
