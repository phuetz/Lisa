/**
 * AI Bridge Service - Pont unifié Lisa ↔ ChatGPT ↔ Claude AI
 * 
 * Ce service permet la communication bidirectionnelle entre Lisa
 * et les services d'IA externes (OpenAI/ChatGPT et Anthropic/Claude).
 */

import { aiService, type AIMessage, type AIProvider, type AIStreamChunk } from '../services/aiService';
import { lisaMcpServer, type LisaTool } from './LisaMcpServer';
import { 
  nativeToolCallingService, 
  type ConversationMessage,
  type NativeToolCallResponse,
  type ToolScope
} from '../services/NativeToolCallingService';
import { registerAllNativeTools, grantPreset, SCOPE_PRESETS } from './NativeToolDefinitions';

// Types pour le bridge
export interface BridgeMessage {
  id: string;
  source: 'lisa' | 'chatgpt' | 'claude' | 'user';
  target: 'lisa' | 'chatgpt' | 'claude' | 'user';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface BridgeSession {
  id: string;
  participants: Array<'lisa' | 'chatgpt' | 'claude'>;
  messages: BridgeMessage[];
  context: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BridgeConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultProvider: AIProvider;
  enableToolCalling: boolean;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}

// Prompts système pour les différents modes
const LISA_SYSTEM_PROMPTS = {
  default: `Tu es Lisa, une assistante IA avancée et bienveillante. Tu peux utiliser les outils disponibles pour aider l'utilisateur.
Tu as accès aux capacités suivantes via les outils:
- Chat et conversation contextuelle
- Analyse d'images (vision)
- Gestion de calendrier
- Contrôle domotique
- Mémoire persistante
- Exécution de workflows
- Invocation d'agents spécialisés

Réponds de manière claire, précise et amicale en français.`,

  collaborative: `Tu es dans une session collaborative avec d'autres IA (ChatGPT et/ou Claude).
Ton rôle est de:
1. Partager tes capacités uniques (vision, mémoire, domotique, etc.)
2. Collaborer pour résoudre les problèmes complexes
3. Déléguer aux autres IA quand leurs compétences sont plus adaptées
4. Maintenir la cohérence de la conversation

Utilise les outils disponibles pour maximiser l'efficacité de la collaboration.`,

  gpt_integration: `Tu reçois des requêtes depuis un GPT personnalisé de ChatGPT.
Ces requêtes peuvent inclure des appels d'outils (function calls).
Réponds en JSON structuré quand approprié pour faciliter l'intégration.
Exécute les outils demandés et retourne les résultats de manière claire.`
};

class AIBridgeService {
  private config: BridgeConfig;
  private sessions: Map<string, BridgeSession>;
  private toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  constructor() {
    this.config = {
      defaultProvider: 'openai',
      enableToolCalling: true,
      maxTokens: 4096,
      temperature: 0.7,
      systemPrompt: LISA_SYSTEM_PROMPTS.default
    };
    this.sessions = new Map();
    this.toolHandlers = new Map();
    this.initializeToolHandlers();
    this.initializeNativeToolCalling();
  }

  /**
   * Initialiser le tool calling natif avec les outils et permissions
   */
  private initializeNativeToolCalling(): void {
    // Enregistrer tous les outils natifs
    registerAllNativeTools();
    // Accorder les permissions standard par défaut
    grantPreset('standard');
  }

  /**
   * Envoyer un message avec tool calling NATIF (OpenAI)
   * C'est la méthode recommandée - pas de parsing de texte
   */
  async sendMessageNative(
    sessionId: string,
    content: string,
    options?: {
      scopes?: keyof typeof SCOPE_PRESETS;
      model?: string;
      temperature?: number;
    }
  ): Promise<NativeToolCallResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session non trouvée: ${sessionId}`);
    }

    // Appliquer les scopes si spécifiés
    if (options?.scopes) {
      nativeToolCallingService.revokeScopes(SCOPE_PRESETS.admin);
      grantPreset(options.scopes);
    }

    // Construire les messages de conversation
    const messages: ConversationMessage[] = [
      { role: 'system', content: this.config.systemPrompt }
    ];

    // Ajouter l'historique
    for (const msg of session.messages.slice(-10)) {
      messages.push({
        role: msg.source === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }

    // Ajouter le message actuel
    messages.push({ role: 'user', content });

    // Exécuter avec tool calling natif
    const response = await nativeToolCallingService.executeWithToolsOpenAI(messages, {
      model: options?.model || 'gpt-4o-mini',
      temperature: options?.temperature || this.config.temperature,
      maxTokens: this.config.maxTokens
    });

    // Sauvegarder dans la session
    session.messages.push({
      id: crypto.randomUUID(),
      source: 'user',
      target: 'lisa',
      content,
      timestamp: new Date().toISOString()
    });

    if (response.finalResponse) {
      session.messages.push({
        id: crypto.randomUUID(),
        source: 'lisa',
        target: 'user',
        content: response.finalResponse,
        toolCalls: response.toolCalls.map(tc => ({
          id: tc.toolCallId,
          name: tc.name,
          arguments: {}
        })),
        toolResults: response.toolCalls.map(tc => ({
          toolCallId: tc.toolCallId,
          result: tc.result.data
        })),
        metadata: { 
          traceId: response.traceId,
          durationMs: response.totalDurationMs,
          native: true
        },
        timestamp: new Date().toISOString()
      });
    }

    session.updatedAt = new Date().toISOString();

    return response;
  }

  /**
   * Envoyer un message avec tool calling NATIF (Anthropic/Claude)
   */
  async sendMessageNativeAnthropic(
    sessionId: string,
    content: string,
    options?: {
      scopes?: keyof typeof SCOPE_PRESETS;
      model?: string;
      temperature?: number;
    }
  ): Promise<NativeToolCallResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session non trouvée: ${sessionId}`);
    }

    if (options?.scopes) {
      nativeToolCallingService.revokeScopes(SCOPE_PRESETS.admin);
      grantPreset(options.scopes);
    }

    const messages: ConversationMessage[] = [];

    for (const msg of session.messages.slice(-10)) {
      messages.push({
        role: msg.source === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }

    messages.push({ role: 'user', content });

    const response = await nativeToolCallingService.executeWithToolsAnthropic(
      messages,
      this.config.systemPrompt,
      {
        model: options?.model || 'claude-3-5-sonnet-20241022',
        temperature: options?.temperature || this.config.temperature,
        maxTokens: this.config.maxTokens
      }
    );

    // Sauvegarder dans la session
    session.messages.push({
      id: crypto.randomUUID(),
      source: 'user',
      target: 'claude',
      content,
      timestamp: new Date().toISOString()
    });

    if (response.finalResponse) {
      session.messages.push({
        id: crypto.randomUUID(),
        source: 'claude',
        target: 'user',
        content: response.finalResponse,
        metadata: { 
          traceId: response.traceId,
          durationMs: response.totalDurationMs,
          native: true
        },
        timestamp: new Date().toISOString()
      });
    }

    session.updatedAt = new Date().toISOString();

    return response;
  }

  /**
   * Configurer les scopes/permissions pour les outils
   */
  setToolScopes(scopes: ToolScope[]): void {
    nativeToolCallingService.revokeScopes(SCOPE_PRESETS.admin);
    nativeToolCallingService.grantScopes(scopes);
  }

  /**
   * Obtenir les scopes actuellement accordés
   */
  getGrantedScopes(): ToolScope[] {
    return nativeToolCallingService.getRegistry().getGrantedScopes();
  }

  private initializeToolHandlers(): void {
    // Récupérer les outils du MCP Server
    const tools = lisaMcpServer.getToolsAsOpenAIFunctions();
    tools.forEach(tool => {
      // Les handlers sont déjà définis dans LisaMcpServer
      this.toolHandlers.set(tool.function.name, async (args) => {
        // Appel direct au MCP Server
        return this.executeLisaTool(tool.function.name, args);
      });
    });
  }

  /**
   * Créer une nouvelle session de bridge
   */
  createSession(participants: Array<'lisa' | 'chatgpt' | 'claude'> = ['lisa']): BridgeSession {
    const session: BridgeSession = {
      id: crypto.randomUUID(),
      participants,
      messages: [],
      context: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Obtenir une session existante
   */
  getSession(sessionId: string): BridgeSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Envoyer un message via le bridge
   */
  async sendMessage(
    sessionId: string,
    content: string,
    source: BridgeMessage['source'] = 'user',
    target: BridgeMessage['target'] = 'lisa'
  ): Promise<BridgeMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session non trouvée: ${sessionId}`);
    }

    const message: BridgeMessage = {
      id: crypto.randomUUID(),
      source,
      target,
      content,
      timestamp: new Date().toISOString()
    };

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    // Router le message vers la cible appropriée
    let response: BridgeMessage;

    switch (target) {
      case 'chatgpt':
        response = await this.routeToChatGPT(session, message);
        break;
      case 'claude':
        response = await this.routeToClaude(session, message);
        break;
      case 'lisa':
      default:
        response = await this.routeToLisa(session, message);
        break;
    }

    session.messages.push(response);
    session.updatedAt = new Date().toISOString();

    return response;
  }

  /**
   * Streaming de réponse via le bridge
   */
  async *streamMessage(
    sessionId: string,
    content: string,
    _source: BridgeMessage['source'] = 'user',
    target: BridgeMessage['target'] = 'lisa'
  ): AsyncGenerator<AIStreamChunk> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      yield { content: '', done: true, error: 'Session non trouvée' };
      return;
    }

    const targetProvider = target === 'user' ? 'lisa' : target;
    const messages = this.buildMessagesForProvider(session, content, targetProvider);

    if (target === 'chatgpt') {
      aiService.updateConfig({ provider: 'openai' });
    } else if (target === 'claude') {
      aiService.updateConfig({ provider: 'anthropic' });
    }

    yield* aiService.streamMessage(messages);
  }

  /**
   * Router vers ChatGPT
   */
  private async routeToChatGPT(session: BridgeSession, message: BridgeMessage): Promise<BridgeMessage> {
    aiService.updateConfig({ provider: 'openai' });
    const messages = this.buildMessagesForProvider(session, message.content, 'chatgpt' as const);
    
    const response = await this.sendWithTools(messages, 'openai');

    return {
      id: crypto.randomUUID(),
      source: 'chatgpt',
      target: message.source,
      content: response.content,
      toolCalls: response.toolCalls,
      toolResults: response.toolResults,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Router vers Claude
   */
  private async routeToClaude(session: BridgeSession, message: BridgeMessage): Promise<BridgeMessage> {
    aiService.updateConfig({ provider: 'anthropic' });
    const messages = this.buildMessagesForProvider(session, message.content, 'claude' as const);
    
    const response = await this.sendWithTools(messages, 'anthropic');

    return {
      id: crypto.randomUUID(),
      source: 'claude',
      target: message.source,
      content: response.content,
      toolCalls: response.toolCalls,
      toolResults: response.toolResults,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Router vers Lisa (traitement local)
   */
  private async routeToLisa(session: BridgeSession, message: BridgeMessage): Promise<BridgeMessage> {
    // Déterminer le provider par défaut
    aiService.updateConfig({ provider: this.config.defaultProvider });
    const messages = this.buildMessagesForProvider(session, message.content, 'lisa' as const);
    
    const response = await this.sendWithTools(messages, this.config.defaultProvider);

    return {
      id: crypto.randomUUID(),
      source: 'lisa',
      target: message.source,
      content: response.content,
      toolCalls: response.toolCalls,
      toolResults: response.toolResults,
      metadata: { provider: this.config.defaultProvider },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Envoyer avec support des tool calls
   */
  private async sendWithTools(
    messages: AIMessage[],
    _provider: AIProvider
  ): Promise<{ content: string; toolCalls?: ToolCall[]; toolResults?: ToolResult[] }> {
    // Pour l'instant, on utilise le service AI simple
    // TODO: Implémenter le support complet des tool calls avec OpenAI/Anthropic native APIs
    const content = await aiService.sendMessage(messages);
    
    // Parser les tool calls potentiels dans la réponse
    const toolCalls = this.parseToolCalls(content);
    let toolResults: ToolResult[] | undefined;

    if (toolCalls && toolCalls.length > 0) {
      toolResults = await this.executeToolCalls(toolCalls);
    }

    return { content, toolCalls, toolResults };
  }

  /**
   * Parser les appels d'outils dans une réponse
   */
  private parseToolCalls(content: string): ToolCall[] | undefined {
    // Pattern pour détecter les appels d'outils au format JSON
    const toolCallPattern = /```tool_call\s*\n?([\s\S]*?)\n?```/g;
    const calls: ToolCall[] = [];

    let match;
    while ((match = toolCallPattern.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        calls.push({
          id: crypto.randomUUID(),
          name: parsed.name || parsed.tool,
          arguments: parsed.arguments || parsed.args || {}
        });
      } catch {
        // Ignorer les erreurs de parsing
      }
    }

    return calls.length > 0 ? calls : undefined;
  }

  /**
   * Exécuter les appels d'outils
   */
  private async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      try {
        const result = await this.executeLisaTool(call.name, call.arguments);
        results.push({
          toolCallId: call.id,
          result
        });
      } catch (error) {
        results.push({
          toolCallId: call.id,
          result: null,
          error: (error as Error).message
        });
      }
    }

    return results;
  }

  /**
   * Exécuter un outil Lisa
   */
  private async executeLisaTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const handler = this.toolHandlers.get(name);
    if (!handler) {
      throw new Error(`Outil non trouvé: ${name}`);
    }
    return handler(args);
  }

  /**
   * Construire les messages pour un provider
   */
  private buildMessagesForProvider(
    session: BridgeSession,
    currentMessage: string,
    target: 'lisa' | 'chatgpt' | 'claude'
  ): AIMessage[] {
    const systemPrompt = session.participants.length > 1
      ? LISA_SYSTEM_PROMPTS.collaborative
      : target === 'lisa'
        ? LISA_SYSTEM_PROMPTS.gpt_integration
        : LISA_SYSTEM_PROMPTS.default;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Ajouter l'historique de la session
    for (const msg of session.messages.slice(-10)) { // Limiter à 10 derniers messages
      messages.push({
        role: msg.source === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }

    // Ajouter le message actuel
    messages.push({ role: 'user', content: currentMessage });

    return messages;
  }

  /**
   * Obtenir les outils disponibles au format OpenAI Functions
   */
  getOpenAIFunctions() {
    return lisaMcpServer.getToolsAsOpenAIFunctions();
  }

  /**
   * Obtenir les outils disponibles au format Anthropic Tools
   */
  getAnthropicTools() {
    return lisaMcpServer.getToolsAsAnthropicTools();
  }

  /**
   * Obtenir le schéma OpenAPI pour GPT Actions
   */
  getOpenAPISchema(): object {
    const tools = lisaMcpServer.getToolsAsOpenAIFunctions();
    
    return {
      openapi: '3.1.0',
      info: {
        title: 'Lisa AI Bridge API',
        description: 'API pour intégrer Lisa avec ChatGPT GPTs et Claude AI',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'https://lisa.local/api/bridge',
          description: 'Lisa Local Server'
        }
      ],
      paths: this.generateOpenAPIPaths(tools),
      components: {
        schemas: this.generateOpenAPISchemas(tools),
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer'
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Lisa-API-Key'
          }
        }
      },
      security: [
        { bearerAuth: [] },
        { apiKey: [] }
      ]
    };
  }

  private generateOpenAPIPaths(tools: ReturnType<typeof lisaMcpServer.getToolsAsOpenAIFunctions>): Record<string, object> {
    const paths: Record<string, object> = {};

    // Endpoint principal pour invoquer les outils
    paths['/invoke'] = {
      post: {
        operationId: 'invokeTool',
        summary: 'Invoquer un outil Lisa',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tool: { type: 'string', description: 'Nom de l\'outil' },
                  arguments: { type: 'object', description: 'Arguments de l\'outil' }
                },
                required: ['tool']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Résultat de l\'outil',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      }
    };

    // Endpoints individuels pour chaque outil
    for (const tool of tools) {
      const path = `/${tool.function.name.replace('lisa_', '')}`;
      paths[path] = {
        post: {
          operationId: tool.function.name,
          summary: tool.function.description,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${tool.function.name}_input`
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Succès',
              content: {
                'application/json': {
                  schema: {
                    $ref: `#/components/schemas/${tool.function.name}_output`
                  }
                }
              }
            }
          }
        }
      };
    }

    // Chat endpoint
    paths['/chat'] = {
      post: {
        operationId: 'chat',
        summary: 'Conversation avec Lisa',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  sessionId: { type: 'string' },
                  context: { type: 'object' }
                },
                required: ['message']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Réponse de Lisa',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    response: { type: 'string' },
                    sessionId: { type: 'string' },
                    toolsUsed: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      }
    };

    return paths;
  }

  private generateOpenAPISchemas(tools: ReturnType<typeof lisaMcpServer.getToolsAsOpenAIFunctions>): Record<string, object> {
    const schemas: Record<string, object> = {};

    for (const tool of tools) {
      schemas[`${tool.function.name}_input`] = tool.function.parameters;
      schemas[`${tool.function.name}_output`] = {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          error: { type: 'string' }
        }
      };
    }

    return schemas;
  }

  /**
   * Configurer le service
   */
  updateConfig(config: Partial<BridgeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): BridgeConfig {
    return { ...this.config };
  }

  /**
   * Ajouter un outil personnalisé
   */
  addCustomTool(tool: LisaTool): void {
    lisaMcpServer.addTool(tool);
    this.toolHandlers.set(tool.name, tool.handler);
  }
}

// Export singleton
export const aiBridgeService = new AIBridgeService();

export default AIBridgeService;
