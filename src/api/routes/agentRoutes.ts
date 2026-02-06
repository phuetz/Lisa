/**
 * Routes API pour accéder aux agents de Lisa
 */
import express, { type Request, type Response } from 'express';
import { agentRegistry } from '../adapters/agents.js';
import { sendJson, sendError } from '../utils/responses.js';

const router = express.Router();

// Liste tous les agents disponibles
router.get('/', async (_req: Request, res: Response) => {
  try {
    const agents = agentRegistry.getAllAgentsWithStats().map((agent: { name: string; description?: string; capabilities?: string[]; version?: string }) => ({
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities || [],
      version: agent.version || '1.0.0'
    }));

    sendJson(res, agents);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la récupération des agents: ${error}`);
  }
});

// Accéder à un agent spécifique par son nom
router.get('/:name', async (req: Request, res: Response) => {
  try {
    const agentName = req.params.name;
    const agent = await agentRegistry.getAgentAsync(agentName);

    if (!agent) {
      sendError(res, 'AGENT_NOT_FOUND', `Agent '${agentName}' non trouvé`);
      return;
    }

    sendJson(res, {
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities || [],
      version: agent.version || '1.0.0'
    });
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la récupération de l'agent: ${error}`);
  }
});

// Exécuter une action avec un agent spécifique
router.post('/:name/execute', async (req: Request, res: Response) => {
  try {
    const agentName = req.params.name;
    const { action, params } = req.body;
    
    const agent = await agentRegistry.getAgentAsync(agentName);

    if (!agent) {
      sendError(res, 'AGENT_NOT_FOUND', `Agent '${agentName}' non trouvé`);
      return;
    }

    if (!agent.execute) {
      sendError(res, 'VALIDATION', `L'agent '${agentName}' ne supporte pas l'exécution d'actions`);
      return;
    }

    const result = await agent.execute({
      ...params,
      action,
      source: 'api'
    });

    sendJson(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de l'exécution de l'agent: ${error}`);
  }
});

export const agentRoutes = router;
