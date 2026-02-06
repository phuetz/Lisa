/**
 * Routes API pour gérer les intents de Lisa
 */
import express, { type Request, type Response } from 'express';
import { agentRegistry } from '../adapters/agents.js';
import { sendJson, sendError } from '../utils/responses.js';

const router = express.Router();

interface PlannerResult {
  success: boolean;
  output: unknown;
  plan?: unknown;
  explanation?: string;
  traceId?: string;
}

function isPlannerResult(result: { success: boolean; output: unknown }): result is PlannerResult {
  return 'plan' in result;
}

// Traiter une intention utilisateur
router.post('/process', async (req: Request, res: Response) => {
  try {
    const { text, language = 'fr', context } = req.body;

    const plannerAgent = await agentRegistry.getAgentAsync('PlannerAgent');

    if (!plannerAgent) {
      sendError(res, 'UNAVAILABLE', 'PlannerAgent non disponible');
      return;
    }

    const result = await plannerAgent.execute({
      request: text,
      language,
      context,
      source: 'api',
    });

    const responseData = {
      success: result.success,
      response: result.output,
      plan: isPlannerResult(result) ? result.plan : undefined,
      explanation: isPlannerResult(result) ? result.explanation : undefined,
      traceId: isPlannerResult(result) ? result.traceId : undefined,
    };

    sendJson(res, responseData);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors du traitement de l'intention: ${error instanceof Error ? error.message : String(error)}`);
  }
});

export const intentRoutes = router;
