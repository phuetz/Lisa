/**
 * Routes API pour gérer les intents de Lisa
 */
import express, { type Request, type Response } from 'express';
import type { ApiResponse } from '../config.js';
import { agentRegistry } from '../../agents/registry.js';
import type { AgentExecuteResult } from '../../agents/types.js';
import type { PlannerResult } from '../../types/Planner.js';

const router = express.Router();

// Type guard to check if the result is a PlannerResult
function isPlannerResult(result: AgentExecuteResult): result is PlannerResult {
  return 'plan' in result;
}

// Traiter une intention utilisateur
router.post('/process', async (req: Request, res: Response) => {
  try {
    const { text, language = 'fr', context } = req.body;

    const plannerAgent = agentRegistry.getAgent('PlannerAgent');

    if (!plannerAgent) {
      return res.status(500).json({
        success: false,
        error: 'PlannerAgent non disponible',
      } as ApiResponse);
    }

    const result = await plannerAgent.execute({
      request: text,
      language,
      context,
      source: 'api',
    });

    // The result from PlannerAgent is now safely typed as PlannerResult,
    // which extends AgentExecuteResult. We can directly access all properties.
    const responseData = {
      success: result.success,
      response: result.output,
      plan: isPlannerResult(result) ? result.plan : undefined,
      explanation: isPlannerResult(result) ? result.explanation : undefined,
      traceId: isPlannerResult(result) ? result.traceId : undefined,
    };

    res.status(200).json({
      success: true,
      data: responseData,
    } as ApiResponse);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors du traitement de l'intention: ${error instanceof Error ? error.message : String(error)}`,
    } as ApiResponse);
  }
});

export const intentRoutes = router;

