/**
 * 🔒 AI Proxy Routes
 * Proxy sécurisé pour les APIs externes (OpenAI, Google, etc.)
 * Les clés API ne sont jamais exposées au client
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Middleware d'authentification - requis en production, optionnel en développement
 */
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (isProduction) {
    return authenticateToken(req as AuthenticatedRequest, res, next);
  }
  // En développement, on permet les requêtes sans auth mais on log un warning
  if (!req.headers['authorization']) {
    console.warn('[AI Proxy] ⚠️ Request without auth in development mode');
  }
  next();
};

interface ProxyRequestBody {
  messages?: Array<{ role: string; content: string }>;
  model?: string;
  image?: string;
  features?: Array<{ type: string }>;
  query?: string;
  maxResults?: number;
}

/**
 * Proxy OpenAI - Chat Completions
 */
router.post('/openai/chat', requireAuth, async (req: Request, res: Response) => {
  try {
    const { messages, model = 'gpt-4o-mini' } = req.body as ProxyRequestBody;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Invalid messages format' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'OpenAI API key not configured' });
      return;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        model,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      res.status(response.status).json({ error: error.error?.message || 'OpenAI API error' });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('OpenAI proxy error:', error);
    res.status(500).json({ error: 'Proxy failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * Proxy Google Vision API
 */
router.post('/google/vision', requireAuth, async (req: Request, res: Response) => {
  try {
    const { image, features } = req.body as ProxyRequestBody;

    if (!image || !features) {
      res.status(400).json({ error: 'Missing image or features' });
      return;
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Google API key not configured' });
      return;
    }

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image },
            features
          }]
        })
      }
    );

    if (!response.ok) {
      res.status(response.status).json({ error: 'Google Vision API error' });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Google Vision proxy error:', error);
    res.status(500).json({ error: 'Proxy failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * Proxy Google Search API
 */
router.post('/google/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const { query, maxResults = 10 } = req.body as ProxyRequestBody;

    if (!query) {
      res.status(400).json({ error: 'Missing query parameter' });
      return;
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !engineId) {
      res.status(500).json({ error: 'Google Search API not configured' });
      return;
    }

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', engineId);
    url.searchParams.set('q', query);
    url.searchParams.set('num', maxResults.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      res.status(response.status).json({ error: 'Google Search API error' });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Google Search proxy error:', error);
    res.status(500).json({ error: 'Proxy failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      googleVision: !!process.env.GOOGLE_API_KEY,
      googleSearch: !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID)
    }
  });
});

export default router;
