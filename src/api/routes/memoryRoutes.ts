/**
 * Routes API pour gérer la mémoire de Lisa
 */
import express, { type Request, type Response } from 'express';
import { agentRegistry } from '../adapters/agents.js';
import { sendJson, sendError, sendCreated } from '../utils/responses.js';

const router = express.Router();

// Récupérer toutes les mémoires
router.get('/', async (_req: Request, res: Response) => {
  try {
    const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
    if (!memoryAgent) { sendError(res, 'UNAVAILABLE', 'MemoryAgent non disponible'); return; }

    const result = await memoryAgent.execute({ action: 'getAllMemories', source: 'api' });
    sendJson(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la récupération des mémoires: ${error}`);
  }
});

// Rechercher dans les mémoires
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) { sendError(res, 'VALIDATION', 'Le paramètre de recherche "q" est requis'); return; }

    const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
    if (!memoryAgent) { sendError(res, 'UNAVAILABLE', 'MemoryAgent non disponible'); return; }

    const result = await memoryAgent.execute({ action: 'searchMemories', query, source: 'api' });
    sendJson(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la recherche dans les mémoires: ${error}`);
  }
});

// Créer une nouvelle mémoire
router.post('/', async (req: Request, res: Response) => {
  try {
    const { content, tags } = req.body;
    if (!content) { sendError(res, 'VALIDATION', 'Le contenu de la mémoire est requis'); return; }

    const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
    if (!memoryAgent) { sendError(res, 'UNAVAILABLE', 'MemoryAgent non disponible'); return; }

    const result = await memoryAgent.execute({
      action: 'createMemory', content, tags: tags || [], source: 'api'
    });
    sendCreated(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la création de la mémoire: ${error}`);
  }
});

// Récupérer une mémoire spécifique
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
    if (!memoryAgent) { sendError(res, 'UNAVAILABLE', 'MemoryAgent non disponible'); return; }

    const result = await memoryAgent.execute({ action: 'getMemory', id, source: 'api' });
    sendJson(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la récupération de la mémoire: ${error}`);
  }
});

// Supprimer une mémoire
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
    if (!memoryAgent) { sendError(res, 'UNAVAILABLE', 'MemoryAgent non disponible'); return; }

    const result = await memoryAgent.execute({ action: 'deleteMemory', id, source: 'api' });
    sendJson(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la suppression de la mémoire: ${error}`);
  }
});

export const memoryRoutes = router;
