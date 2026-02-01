/**
 * LLM Proxy Routes - Secure Server-Side API Key Management
 *
 * Provides secure proxy endpoints for all LLM providers.
 * API keys are stored server-side and NEVER exposed to clients.
 *
 * Supported providers:
 * - OpenAI (GPT-4, GPT-4o, GPT-4o-mini)
 * - Google Gemini (gemini-2.0-flash, gemini-1.5-pro)
 * - Anthropic Claude (claude-3-5-sonnet, claude-3-haiku)
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production';

// ============================================================================
// Types
// ============================================================================

type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'lmstudio';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface LLMRequestBody {
  messages: ChatMessage[];
  model?: string;
  provider?: AIProvider;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

interface ProviderConfig {
  baseUrl: string;
  apiKeyEnv: string;
  formatRequest: (body: LLMRequestBody, apiKey: string) => { url: string; headers: HeadersInit; body: string };
  parseResponse: (data: unknown) => { content: string; tool_calls?: ToolCall[] };
}

// ============================================================================
// Provider Configurations
// ============================================================================

const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    formatRequest: (body, apiKey) => ({
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: body.model || 'gpt-4o-mini',
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 2000,
        stream: body.stream ?? false,
        tools: body.tools,
        tool_choice: body.tool_choice
      })
    }),
    parseResponse: (data) => {
      const resp = data as { choices: Array<{ message: { content: string; tool_calls?: ToolCall[] } }> };
      return {
        content: resp.choices[0]?.message?.content || '',
        tool_calls: resp.choices[0]?.message?.tool_calls
      };
    }
  },

  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GEMINI_API_KEY',
    formatRequest: (body, apiKey) => {
      const model = body.model || 'gemini-2.0-flash-exp';

      // Convert messages to Gemini format
      const contents = body.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      // Extract system instruction
      const systemMessage = body.messages.find(m => m.role === 'system');
      const systemInstruction = systemMessage
        ? { parts: [{ text: systemMessage.content }] }
        : undefined;

      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            temperature: body.temperature ?? 0.7,
            maxOutputTokens: body.max_tokens ?? 2000
          }
        })
      };
    },
    parseResponse: (data) => {
      const resp = data as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
      return {
        content: resp.candidates?.[0]?.content?.parts?.[0]?.text || ''
      };
    }
  },

  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    formatRequest: (body, apiKey) => {
      // Extract system message
      const systemMessage = body.messages.find(m => m.role === 'system');
      const messages = body.messages.filter(m => m.role !== 'system');

      // Convert tools to Claude format
      const tools = body.tools?.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));

      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: body.model || 'claude-3-5-sonnet-20241022',
          max_tokens: body.max_tokens ?? 2000,
          system: systemMessage?.content,
          messages: messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
          tools
        })
      };
    },
    parseResponse: (data) => {
      const resp = data as {
        content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>
      };

      const textBlock = resp.content?.find(c => c.type === 'text');
      const toolBlocks = resp.content?.filter(c => c.type === 'tool_use');

      const tool_calls = toolBlocks?.map(t => ({
        id: t.id || '',
        type: 'function' as const,
        function: {
          name: t.name || '',
          arguments: JSON.stringify(t.input || {})
        }
      }));

      return {
        content: textBlock?.text || '',
        tool_calls: tool_calls?.length ? tool_calls : undefined
      };
    }
  },

  lmstudio: {
    baseUrl: 'http://localhost:1234/v1',
    apiKeyEnv: '', // No API key needed for local
    formatRequest: (body) => ({
      url: 'http://localhost:1234/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: body.model || 'local-model',
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 2000,
        stream: body.stream ?? false
      })
    }),
    parseResponse: (data) => {
      const resp = data as { choices: Array<{ message: { content: string } }> };
      return {
        content: resp.choices[0]?.message?.content || ''
      };
    }
  }
};

// ============================================================================
// Model to Provider Mapping
// ============================================================================

function getProviderForModel(model: string): AIProvider {
  if (model.startsWith('gpt-')) return 'openai';
  if (model.startsWith('gemini-')) return 'gemini';
  if (model.startsWith('claude-')) return 'anthropic';
  if (model === 'local' || model.startsWith('local-')) return 'lmstudio';
  return 'gemini'; // Default
}

// ============================================================================
// Middleware
// ============================================================================

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (isProduction) {
    return authenticateToken(req as AuthenticatedRequest, res, next);
  }
  next();
};

const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const body = req.body as LLMRequestBody;

  if (!body.messages || !Array.isArray(body.messages)) {
    res.status(400).json({ error: 'Invalid messages format' });
    return;
  }

  if (body.messages.length === 0) {
    res.status(400).json({ error: 'Messages array cannot be empty' });
    return;
  }

  // Validate each message
  for (const msg of body.messages) {
    if (!msg.role || !['system', 'user', 'assistant', 'tool'].includes(msg.role)) {
      res.status(400).json({ error: `Invalid role: ${msg.role}` });
      return;
    }
    if (typeof msg.content !== 'string') {
      res.status(400).json({ error: 'Message content must be a string' });
      return;
    }
  }

  next();
};

// ============================================================================
// Routes
// ============================================================================

/**
 * Main chat completions endpoint
 * Automatically routes to the correct provider based on model
 */
router.post('/v1/chat/completions', requireAuth, validateRequest, async (req: Request, res: Response) => {
  const body = req.body as LLMRequestBody;

  // Determine provider
  const provider = body.provider || getProviderForModel(body.model || 'gemini-2.0-flash-exp');
  const config = PROVIDER_CONFIGS[provider];

  if (!config) {
    res.status(400).json({ error: `Unknown provider: ${provider}` });
    return;
  }

  // Get API key (skip for LM Studio)
  const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] : '';
  if (config.apiKeyEnv && !apiKey) {
    res.status(500).json({
      error: `${provider} API key not configured`,
      hint: `Set ${config.apiKeyEnv} environment variable`
    });
    return;
  }

  try {
    const { url, headers, body: requestBody } = config.formatRequest(body, apiKey);

    console.log(`[LLM Proxy] ${provider} request to ${body.model || 'default'}`);

    // Handle streaming
    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: requestBody
      });

      if (!response.ok) {
        const error = await response.text();
        res.write(`data: ${JSON.stringify({ error })}\n\n`);
        res.end();
        return;
      }

      if (!response.body) {
        res.write(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`);
        res.end();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } finally {
        res.end();
      }

      return;
    }

    // Non-streaming request
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: requestBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error(`[LLM Proxy] ${provider} error:`, errorData);

      res.status(response.status).json({
        error: errorData.error?.message || errorData.message || `${provider} API error`,
        provider,
        model: body.model
      });
      return;
    }

    const data = await response.json();
    const parsed = config.parseResponse(data);

    // Return in OpenAI-compatible format
    res.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model || 'unknown',
      provider,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: parsed.content,
          tool_calls: parsed.tool_calls
        },
        finish_reason: parsed.tool_calls ? 'tool_calls' : 'stop'
      }],
      usage: {
        prompt_tokens: -1, // Not always available
        completion_tokens: -1,
        total_tokens: -1
      }
    });

  } catch (error) {
    console.error(`[LLM Proxy] ${provider} error:`, error);

    res.status(500).json({
      error: 'Proxy request failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      provider
    });
  }
});

/**
 * Provider-specific endpoints for direct access
 */
router.post('/v1/openai/chat', requireAuth, validateRequest, async (req: Request, res: Response) => {
  req.body.provider = 'openai';
  // Forward to main endpoint
  const handler = router.stack.find(r => r.route?.path === '/v1/chat/completions');
  if (handler?.route) {
    return handler.route.stack[2].handle(req, res, () => {});
  }
});

router.post('/v1/gemini/chat', requireAuth, validateRequest, async (req: Request, res: Response) => {
  req.body.provider = 'gemini';
  const handler = router.stack.find(r => r.route?.path === '/v1/chat/completions');
  if (handler?.route) {
    return handler.route.stack[2].handle(req, res, () => {});
  }
});

router.post('/v1/anthropic/chat', requireAuth, validateRequest, async (req: Request, res: Response) => {
  req.body.provider = 'anthropic';
  const handler = router.stack.find(r => r.route?.path === '/v1/chat/completions');
  if (handler?.route) {
    return handler.route.stack[2].handle(req, res, () => {});
  }
});

/**
 * List available models
 */
router.get('/v1/models', requireAuth, (_req: Request, res: Response) => {
  const models: Array<{ id: string; provider: AIProvider; available: boolean }> = [];

  // OpenAI models
  if (process.env.OPENAI_API_KEY) {
    models.push(
      { id: 'gpt-4o', provider: 'openai', available: true },
      { id: 'gpt-4o-mini', provider: 'openai', available: true },
      { id: 'gpt-4-turbo', provider: 'openai', available: true }
    );
  }

  // Gemini models
  if (process.env.GEMINI_API_KEY) {
    models.push(
      { id: 'gemini-2.0-flash-exp', provider: 'gemini', available: true },
      { id: 'gemini-1.5-pro', provider: 'gemini', available: true },
      { id: 'gemini-1.5-flash', provider: 'gemini', available: true }
    );
  }

  // Anthropic models
  if (process.env.ANTHROPIC_API_KEY) {
    models.push(
      { id: 'claude-3-5-sonnet-20241022', provider: 'anthropic', available: true },
      { id: 'claude-3-haiku-20240307', provider: 'anthropic', available: true },
      { id: 'claude-3-opus-20240229', provider: 'anthropic', available: true }
    );
  }

  // LM Studio (always available locally)
  models.push(
    { id: 'local', provider: 'lmstudio', available: true }
  );

  res.json({
    object: 'list',
    data: models
  });
});

/**
 * Health check
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      lmstudio: true // Always available locally
    }
  });
});

export default router;
