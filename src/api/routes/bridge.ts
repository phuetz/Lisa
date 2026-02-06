/**
 * Bridge API Routes - Endpoints pour l'intégration ChatGPT/Claude
 * 
 * Ces routes permettent aux GPTs de ChatGPT et à Claude AI
 * d'interagir avec Lisa via une API REST.
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getBridgeService, getMcpServer } from '../adapters/bridge.js';
import { timingSafeCompare } from '../utils/crypto.js';
import { sendError } from '../utils/responses.js';

const router = Router();

// Schemas de validation Zod
const chatSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  target: z.enum(['lisa', 'chatgpt', 'claude']).optional().default('lisa')
});

const invokeToolSchema = z.object({
  tool: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).optional().default({})
});

const sessionSchema = z.object({
  participants: z.array(z.enum(['lisa', 'chatgpt', 'claude'])).optional().default(['lisa'])
});

// Middleware d'authentification pour le bridge (timing-safe)
const authenticateBridge = (req: Request, res: Response, next: () => void) => {
  const apiKey = (req.headers['x-lisa-api-key'] as string) || req.headers.authorization?.replace('Bearer ', '');
  const validKey = process.env.LISA_BRIDGE_API_KEY || process.env.LISA_API_KEY;

  if (validKey && apiKey && timingSafeCompare(apiKey, validKey)) {
    next();
  } else if (!validKey && process.env.NODE_ENV !== 'production') {
    // En dev sans clé configurée, on laisse passer avec un warning
    next();
  } else {
    sendError(res, 'UNAUTHORIZED', 'Invalid API key');
  }
};

router.use(authenticateBridge);

/**
 * POST /api/bridge/chat
 * Conversation avec Lisa - endpoint principal pour les GPTs
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, sessionId, context, target } = chatSchema.parse(req.body);

    // Créer ou récupérer la session
    let session = sessionId ? (await getBridgeService()).getSession(sessionId) : null;
    if (!session) {
      session = (await getBridgeService()).createSession([target]);
    }

    // Ajouter le contexte si fourni
    if (context) {
      Object.assign(session.context, context);
    }

    // Envoyer le message
    const response = await (await getBridgeService()).sendMessage(
      session.id,
      message,
      'user',
      target
    );

    res.json({
      success: true,
      response: response.content,
      sessionId: session.id,
      toolsUsed: response.toolCalls?.map((t: { name: string }) => t.name) || [],
      toolResults: response.toolResults,
      metadata: {
        source: response.source,
        timestamp: response.timestamp
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Bridge chat error:', error);
      res.status(500).json({ error: 'Internal error', message: (error as Error).message });
    }
  }
});

/**
 * POST /api/bridge/chat/stream
 * Streaming de conversation avec Lisa
 */
router.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const { message, sessionId, target } = chatSchema.parse(req.body);

    // Créer ou récupérer la session
    let session = sessionId ? (await getBridgeService()).getSession(sessionId) : null;
    if (!session) {
      session = (await getBridgeService()).createSession([target]);
    }

    // Configuration SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Session-Id', session.id);

    // Stream la réponse
    for await (const chunk of (await getBridgeService()).streamMessage(session.id, message, 'user', target)) {
      if (chunk.error) {
        res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`);
        break;
      }
      res.write(`data: ${JSON.stringify({ content: chunk.content, done: chunk.done })}\n\n`);
      if (chunk.done) break;
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Bridge stream error:', error);
      res.status(500).json({ error: 'Internal error', message: (error as Error).message });
    }
  }
});

/**
 * POST /api/bridge/invoke
 * Invoquer un outil Lisa directement
 */
router.post('/invoke', async (req: Request, res: Response) => {
  try {
    const { tool, arguments: args } = invokeToolSchema.parse(req.body);

    // Créer une session temporaire pour l'invocation
    const session = (await getBridgeService()).createSession(['lisa']);
    
    // Formater le message comme un appel d'outil
    const toolCallMessage = `Exécute l'outil ${tool} avec les arguments: ${JSON.stringify(args)}`;
    
    const response = await (await getBridgeService()).sendMessage(
      session.id,
      toolCallMessage,
      'user',
      'lisa'
    );

    res.json({
      success: true,
      tool,
      result: response.toolResults?.[0]?.result || response.content,
      metadata: {
        sessionId: session.id,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Bridge invoke error:', error);
      res.status(500).json({ error: 'Internal error', message: (error as Error).message });
    }
  }
});

/**
 * GET /api/bridge/tools
 * Liste des outils disponibles (pour GPT Actions discovery)
 */
router.get('/tools', async (_req: Request, res: Response) => {
  try {
    const openaiTools = (await getMcpServer()).getToolsAsOpenAIFunctions();
    const anthropicTools = (await getMcpServer()).getToolsAsAnthropicTools();

    res.json({
      openai: openaiTools,
      anthropic: anthropicTools,
      count: openaiTools.length
    });
  } catch (error) {
    console.error('Bridge tools error:', error);
    res.status(500).json({ error: 'Internal error', message: (error as Error).message });
  }
});

/**
 * GET /api/bridge/openapi.json
 * Schema OpenAPI pour GPT Actions
 */
router.get('/openapi.json', async (_req: Request, res: Response) => {
  try {
    const schema = (await getBridgeService()).getOpenAPISchema();
    res.json(schema);
  } catch (error) {
    console.error('Bridge OpenAPI error:', error);
    res.status(500).json({ error: 'Internal error', message: (error as Error).message });
  }
});

/**
 * POST /api/bridge/session
 * Créer une nouvelle session
 */
router.post('/session', async (req: Request, res: Response) => {
  try {
    const { participants } = sessionSchema.parse(req.body);
    const session = (await getBridgeService()).createSession(participants);

    res.json({
      success: true,
      session: {
        id: session.id,
        participants: session.participants,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      console.error('Bridge session error:', error);
      res.status(500).json({ error: 'Internal error', message: (error as Error).message });
    }
  }
});

/**
 * GET /api/bridge/session/:id
 * Récupérer une session
 */
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const session = (await getBridgeService()).getSession(req.params.id);
    
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        participants: session.participants,
        messageCount: session.messages.length,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    });
  } catch (error) {
    console.error('Bridge get session error:', error);
    res.status(500).json({ error: 'Internal error', message: (error as Error).message });
  }
});

/**
 * GET /api/bridge/session/:id/messages
 * Récupérer les messages d'une session
 */
router.get('/session/:id/messages', async (req: Request, res: Response) => {
  try {
    const session = (await getBridgeService()).getSession(req.params.id);
    
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    res.json({
      success: true,
      messages: session.messages.slice(offset, offset + limit),
      total: session.messages.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Bridge get messages error:', error);
    res.status(500).json({ error: 'Internal error', message: (error as Error).message });
  }
});

/**
 * GET /api/bridge/health
 * Health check du bridge
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'lisa-ai-bridge',
    version: '1.0.0',
    capabilities: {
      chatgpt: true,
      claude: true,
      mcp: true,
      streaming: true,
      toolCalling: true
    },
    timestamp: new Date().toISOString()
  });
});

// Routes individuelles pour chaque outil (compatibilité GPT Actions)
const toolRoutes = [
  { path: '/vision/analyze', tool: 'lisa_vision_analyze' },
  { path: '/calendar', tool: 'lisa_calendar_query' },
  { path: '/smarthome', tool: 'lisa_smart_home' },
  { path: '/memory/store', tool: 'lisa_memory_store' },
  { path: '/memory/recall', tool: 'lisa_memory_recall' },
  { path: '/workflow/execute', tool: 'lisa_workflow_execute' },
  { path: '/agent/invoke', tool: 'lisa_agent_invoke' },
  { path: '/system/status', tool: 'lisa_system_status' }
];

for (const route of toolRoutes) {
  router.post(route.path, async (req: Request, res: Response) => {
    try {
      const session = (await getBridgeService()).createSession(['lisa']);
      const toolCallMessage = `Exécute l'outil ${route.tool} avec les arguments: ${JSON.stringify(req.body)}`;
      
      const response = await (await getBridgeService()).sendMessage(
        session.id,
        toolCallMessage,
        'user',
        'lisa'
      );

      res.json({
        success: true,
        result: response.toolResults?.[0]?.result || response.content,
        metadata: { tool: route.tool, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error(`Bridge ${route.tool} error:`, error);
      res.status(500).json({ error: 'Internal error', message: (error as Error).message });
    }
  });
}

export default router;
