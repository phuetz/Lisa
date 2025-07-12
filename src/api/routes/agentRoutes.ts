/**
 * Routes API pour accéder aux agents de Lisa
 */
import express, { type Request, type Response } from 'express';
import type { ApiResponse } from '../config.js';
import { agentRegistry } from '../../agents/registry.js';

const router = express.Router();

// Liste tous les agents disponibles
router.get('/', async (_req: Request, res: Response) => {
  try {
    const agents = agentRegistry.getAllAgents().map(agent => ({
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities || [],
      version: agent.version || '1.0.0'
    }));
    
    res.status(200).json({
      success: true,
      data: agents
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la récupération des agents: ${error}`
    } as ApiResponse);
  }
});

// Accéder à un agent spécifique par son nom
router.get('/:name', async (req: Request, res: Response) => {
  try {
    const agentName = req.params.name;
    const agent = agentRegistry.getAgent(agentName);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent '${agentName}' non trouvé`
      } as ApiResponse);
    }
    
    res.status(200).json({
      success: true,
      data: {
        name: agent.name,
        description: agent.description,
        capabilities: agent.capabilities || [],
        version: agent.version || '1.0.0'
      }
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la récupération de l'agent: ${error}`
    } as ApiResponse);
  }
});

// Exécuter une action avec un agent spécifique
router.post('/:name/execute', async (req: Request, res: Response) => {
  try {
    const agentName = req.params.name;
    const { action, params } = req.body;
    
    const agent = agentRegistry.getAgent(agentName);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent '${agentName}' non trouvé`
      } as ApiResponse);
    }
    
    if (!agent.execute) {
      return res.status(400).json({
        success: false,
        error: `L'agent '${agentName}' ne supporte pas l'exécution d'actions`
      } as ApiResponse);
    }
    
    const result = await agent.execute({
      ...params,
      action,
      source: 'api'
    });
    
    res.status(200).json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de l'exécution de l'agent: ${error}`
    } as ApiResponse);
  }
});

export const agentRoutes = router;
