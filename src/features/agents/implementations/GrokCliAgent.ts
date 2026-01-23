/**
 * GrokCliAgent
 * 
 * Agent Lisa intégrant Grok-CLI comme backend spécialisé "code + terminal + repo".
 * Permet de piloter Grok-CLI via l'architecture d'agents de Lisa.
 * 
 * Responsabilités:
 * - Créer et soumettre des tâches à GrokCliService
 * - Interpréter les résultats et les formater pour Lisa
 * - Gérer les modes de sécurité et de raisonnement
 */

import { z } from 'zod';
import { agentRegistry } from '../core/registry';
import { grokCliService, type CreateTaskOptions } from '../../../services/GrokCliService';
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import type {
  GrokCliTaskKind,
  GrokCliReasoningMode,
  GrokCliSecurityMode,
  GrokCliResult,
  GrokPipeline,
} from '../types/grokCli';

// ============================================
// Schema de validation des entrées
// ============================================

const GrokCliInputSchema = z.object({
  // Intent principal
  intent: z.enum([
    'task',      // Créer et exécuter une tâche
    'explain',   // Raccourci: expliquer du code
    'review',    // Raccourci: code review
    'fix',       // Raccourci: corriger un bug
    'refactor',  // Raccourci: refactoriser
    'test',      // Raccourci: générer des tests
    'search',    // Raccourci: rechercher dans le code
    'pipeline',  // Lancer un pipeline
    'session',   // Gestion des sessions
    'config',    // Configuration
    'status',    // Statut et coûts
  ]).default('task'),

  // Pour task/explain/review/fix/refactor/test/search
  description: z.string().optional(),
  repoPath: z.string().optional(),
  filePattern: z.string().optional(),
  
  // Mode de raisonnement
  reasoningMode: z.enum(['shallow', 'medium', 'deep', 'exhaustive']).optional(),
  
  // Mode de sécurité
  securityMode: z.enum(['read_only', 'auto', 'full_access']).optional(),
  
  // Limites
  maxRounds: z.number().optional(),
  budgetUsd: z.number().optional(),

  // Pour pipeline
  pipeline: z.enum(['code-review', 'bug-fix', 'security-audit', 'documentation', 'refactoring']).optional(),
  target: z.string().optional(),

  // Pour session
  sessionAction: z.enum(['create', 'switch', 'list', 'delete']).optional(),
  sessionId: z.string().optional(),
  sessionName: z.string().optional(),

  // Pour config
  model: z.enum(['grok-4', 'grok-3', 'grok-3-mini', 'grok-2', 'gemini-2.0-flash', 'claude-3.5-sonnet']).optional(),
});

type GrokCliInput = z.infer<typeof GrokCliInputSchema>;

// ============================================
// Agent Principal
// ============================================

export class GrokCliAgent implements BaseAgent {
  name = 'GrokCliAgent';
  description = `Agent spécialisé "code + terminal + repo" propulsé par Grok-CLI.
Capacités: analyse de code, code review, bug fix (APR), refactoring, génération de tests, recherche sémantique (RAG).
Modes de raisonnement: shallow, medium (megathink), deep, exhaustive (ultrathink).
Modes de sécurité: read_only, auto, full_access.`;
  
  version = '2.0.0';
  domain: AgentDomain = 'productivity';
  
  capabilities = [
    'explain-code',
    'code-review',
    'bug-fix',
    'refactoring',
    'test-generation',
    'code-search',
    'security-audit',
    'documentation',
    'multi-agent-reasoning',
    'tree-of-thought',
    'apr-engine',
  ];

  inputs = [
    { id: 'description', type: 'string', label: 'Description', description: 'Description de la tâche', required: true },
    { id: 'intent', type: 'string', label: 'Intent', description: 'Type d\'action (task, explain, review, fix, etc.)' },
    { id: 'filePattern', type: 'string', label: 'Fichiers', description: 'Pattern glob des fichiers ciblés' },
    { id: 'reasoningMode', type: 'string', label: 'Raisonnement', description: 'Mode de raisonnement (shallow, medium, deep, exhaustive)' },
    { id: 'securityMode', type: 'string', label: 'Sécurité', description: 'Mode de sécurité (read_only, auto, full_access)' },
  ];

  outputs = [
    { id: 'result', type: 'object', label: 'Résultat', description: 'Résultat complet de la tâche' },
    { id: 'summary', type: 'string', label: 'Résumé', description: 'Résumé humain du résultat' },
    { id: 'diffs', type: 'array', label: 'Diffs', description: 'Modifications de fichiers' },
    { id: 'cost', type: 'object', label: 'Coût', description: 'Coût de la tâche' },
  ];

  configSchema = GrokCliInputSchema;

  // ============================================
  // Exécution principale
  // ============================================

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();

    try {
      const input = GrokCliInputSchema.parse(props);
      let result: AgentExecuteResult;

      switch (input.intent) {
        case 'explain':
        case 'review':
        case 'fix':
        case 'refactor':
        case 'test':
        case 'search':
          result = await this.handleTaskShortcut(input.intent, input);
          break;
        case 'task':
          result = await this.handleTask(input);
          break;
        case 'pipeline':
          result = await this.handlePipeline(input);
          break;
        case 'session':
          result = await this.handleSession(input);
          break;
        case 'config':
          result = await this.handleConfig(input);
          break;
        case 'status':
          result = await this.handleStatus();
          break;
        default:
          result = await this.handleTask(input);
      }

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: Date.now() - startTime,
          source: `${this.name}@${this.version}`,
        },
      };

    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        metadata: {
          executionTime: Date.now() - startTime,
          source: this.name,
        },
      };
    }
  }

  // ============================================
  // Évaluation de pertinence
  // ============================================

  async canHandle(query: string): Promise<number> {
    const lowerQuery = query.toLowerCase();
    
    // Mots-clés forts (0.9)
    const strongKeywords = [
      'grok', 'code review', 'bug fix', 'refactor', 'explain code',
      'security audit', 'generate test', 'search code', 'apr', 'megathink', 'ultrathink'
    ];
    if (strongKeywords.some(kw => lowerQuery.includes(kw))) {
      return 0.9;
    }

    // Mots-clés moyens (0.6)
    const mediumKeywords = [
      'analyse', 'analyze', 'review', 'debug', 'fix', 'test',
      'refactor', 'explain', 'search', 'find'
    ];
    if (mediumKeywords.some(kw => lowerQuery.includes(kw))) {
      return 0.6;
    }

    // Mots-clés faibles (0.3)
    const weakKeywords = ['code', 'fichier', 'file', 'function', 'class', 'bug'];
    if (weakKeywords.some(kw => lowerQuery.includes(kw))) {
      return 0.3;
    }

    return 0.1;
  }

  // ============================================
  // Handlers
  // ============================================

  private async handleTaskShortcut(
    kind: GrokCliTaskKind,
    input: GrokCliInput
  ): Promise<AgentExecuteResult> {
    if (!input.description) {
      return { success: false, output: null, error: 'Description requise' };
    }

    return this.executeGrokTask({
      kind,
      description: input.description,
      repoPath: input.repoPath,
      filePattern: input.filePattern,
      reasoningMode: input.reasoningMode as GrokCliReasoningMode,
      securityMode: input.securityMode as GrokCliSecurityMode,
      maxRounds: input.maxRounds,
      budgetUsd: input.budgetUsd,
    });
  }

  private async handleTask(input: GrokCliInput): Promise<AgentExecuteResult> {
    if (!input.description) {
      return { success: false, output: null, error: 'Description requise' };
    }

    // Détecter le type de tâche depuis la description
    const kind = this.detectTaskKind(input.description);

    return this.executeGrokTask({
      kind,
      description: input.description,
      repoPath: input.repoPath,
      filePattern: input.filePattern,
      reasoningMode: input.reasoningMode as GrokCliReasoningMode,
      securityMode: input.securityMode as GrokCliSecurityMode,
      maxRounds: input.maxRounds,
      budgetUsd: input.budgetUsd,
    });
  }

  private async executeGrokTask(options: CreateTaskOptions): Promise<AgentExecuteResult> {
    const result = await grokCliService.runTask(options, {
      onStatusChange: (status) => {
        console.log(`[GrokCliAgent] Status: ${status}`);
      },
      onLog: (log) => {
        console.log(`[GrokCliAgent] ${log.level}: ${log.message}`);
      },
    });

    return this.formatTaskResult(result);
  }

  private async handlePipeline(input: GrokCliInput): Promise<AgentExecuteResult> {
    if (!input.pipeline) {
      return { success: false, output: null, error: 'Pipeline requis' };
    }

    const result = await grokCliService.runPipeline(
      input.pipeline as GrokPipeline,
      input.target
    );

    return {
      success: result.success,
      output: {
        pipeline: result.pipeline,
        steps: result.steps,
        summary: result.summary,
        duration: result.duration,
      },
      metadata: { source: 'grok-cli-pipeline' },
    };
  }

  private async handleSession(input: GrokCliInput): Promise<AgentExecuteResult> {
    const action = input.sessionAction || 'list';

    switch (action) {
      case 'create': {
        const session = grokCliService.createSession(input.sessionName);
        return {
          success: true,
          output: { message: 'Session créée', session },
        };
      }
      case 'switch': {
        if (!input.sessionId) {
          return { success: false, output: null, error: 'ID de session requis' };
        }
        const session = grokCliService.switchSession(input.sessionId);
        return {
          success: !!session,
          output: session ? { message: 'Session changée', session } : null,
          error: session ? undefined : 'Session non trouvée',
        };
      }
      case 'delete': {
        if (!input.sessionId) {
          return { success: false, output: null, error: 'ID de session requis' };
        }
        const deleted = grokCliService.deleteSession(input.sessionId);
        return {
          success: deleted,
          output: { message: deleted ? 'Session supprimée' : 'Session non trouvée' },
        };
      }
      case 'list':
      default:
        return {
          success: true,
          output: {
            sessions: grokCliService.listSessions(),
            currentSession: grokCliService.getCurrentSession(),
          },
        };
    }
  }

  private async handleConfig(input: GrokCliInput): Promise<AgentExecuteResult> {
    const updates: Record<string, unknown> = {};

    if (input.model) {
      grokCliService.setModel(input.model);
      updates.model = input.model;
    }
    if (input.securityMode) {
      grokCliService.setSecurityMode(input.securityMode as GrokCliSecurityMode);
      updates.securityMode = input.securityMode;
    }
    if (input.reasoningMode) {
      grokCliService.setReasoningMode(input.reasoningMode as GrokCliReasoningMode);
      updates.reasoningMode = input.reasoningMode;
    }

    return {
      success: true,
      output: {
        message: Object.keys(updates).length > 0 ? 'Configuration mise à jour' : 'Aucun changement',
        updates,
        config: grokCliService.getConfig(),
      },
    };
  }

  private async handleStatus(): Promise<AgentExecuteResult> {
    const report = grokCliService.getCostReport();
    const config = grokCliService.getConfig();
    const session = grokCliService.getCurrentSession();
    const tasks = grokCliService.listTasks();

    return {
      success: true,
      output: {
        config: {
          model: config.model,
          securityMode: config.securityMode,
          reasoningMode: config.reasoningMode,
        },
        session: session ? {
          id: session.id,
          name: session.name,
          taskCount: session.tasks.length,
        } : null,
        costs: report,
        recentTasks: tasks.slice(-5),
        logs: grokCliService.getLogs(10),
      },
    };
  }

  // ============================================
  // Helpers
  // ============================================

  private detectTaskKind(description: string): GrokCliTaskKind {
    const lower = description.toLowerCase();

    if (lower.includes('explain') || lower.includes('expliqu')) return 'explain';
    if (lower.includes('review') || lower.includes('revue')) return 'review';
    if (lower.includes('fix') || lower.includes('bug') || lower.includes('corrig')) return 'fix';
    if (lower.includes('refactor')) return 'refactor';
    if (lower.includes('test')) return 'test';
    if (lower.includes('search') || lower.includes('cherch') || lower.includes('trouv')) return 'search';

    return 'custom';
  }

  private formatTaskResult(result: GrokCliResult): AgentExecuteResult {
    const success = result.status === 'succeeded';

    return {
      success,
      output: {
        taskId: result.taskId,
        status: result.status,
        summary: result.summary,
        diffs: result.diffs,
        cost: result.cost,
        duration: result.finishedAt && result.startedAt
          ? new Date(result.finishedAt).getTime() - new Date(result.startedAt).getTime()
          : undefined,
      },
      error: success ? undefined : result.summary,
      metadata: {
        source: 'grok-cli',
      },
    };
  }
}

// Enregistrer l'agent
agentRegistry.register(new GrokCliAgent());
