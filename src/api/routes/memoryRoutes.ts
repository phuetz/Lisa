/**
 * Routes API pour gérer la mémoire de Lisa
 */
import express, { type Request, type Response } from 'express';
import type { ApiResponse } from '../config.js';
import { agentRegistry } from '../../features/agents/core/registry.js';

const router = express.Router();

// Récupérer toutes les mémoires
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Récupérer le MemoryAgent
    const memoryAgent = agentRegistry.getAgent('MemoryAgent');
    
    if (!memoryAgent) {
      return res.status(500).json({
        success: false,
        error: 'MemoryAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le MemoryAgent pour récupérer les mémoires
    const result = await memoryAgent.execute({
      action: 'getAllMemories',
      source: 'api'
    });
    
    res.status(200).json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la récupération des mémoires: ${error}`
    } as ApiResponse);
  }
});

// Rechercher dans les mémoires
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre de recherche "q" est requis'
      } as ApiResponse);
    }
    
    // Récupérer le MemoryAgent
    const memoryAgent = agentRegistry.getAgent('MemoryAgent');
    
    if (!memoryAgent) {
      return res.status(500).json({
        success: false,
        error: 'MemoryAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le MemoryAgent pour rechercher dans les mémoires
    const result = await memoryAgent.execute({
      action: 'searchMemories',
      query,
      source: 'api'
    });
    
    res.status(200).json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la recherche dans les mémoires: ${error}`
    } as ApiResponse);
  }
});

// Créer une nouvelle mémoire
router.post('/', async (req: Request, res: Response) => {
  try {
    const { content, tags } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Le contenu de la mémoire est requis'
      } as ApiResponse);
    }
    
    // Récupérer le MemoryAgent
    const memoryAgent = agentRegistry.getAgent('MemoryAgent');
    
    if (!memoryAgent) {
      return res.status(500).json({
        success: false,
        error: 'MemoryAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le MemoryAgent pour créer une mémoire
    const result = await memoryAgent.execute({
      action: 'createMemory',
      content,
      tags: tags || [],
      source: 'api'
    });
    
    res.status(201).json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la création de la mémoire: ${error}`
    } as ApiResponse);
  }
});

// Récupérer une mémoire spécifique
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    // Récupérer le MemoryAgent
    const memoryAgent = agentRegistry.getAgent('MemoryAgent');
    
    if (!memoryAgent) {
      return res.status(500).json({
        success: false,
        error: 'MemoryAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le MemoryAgent pour récupérer une mémoire spécifique
    const result = await memoryAgent.execute({
      action: 'getMemory',
      id,
      source: 'api'
    });
    
    res.status(200).json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la récupération de la mémoire: ${error}`
    } as ApiResponse);
  }
});

// Supprimer une mémoire
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    // Récupérer le MemoryAgent
    const memoryAgent = agentRegistry.getAgent('MemoryAgent');
    
    if (!memoryAgent) {
      return res.status(500).json({
        success: false,
        error: 'MemoryAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le MemoryAgent pour supprimer une mémoire
    const result = await memoryAgent.execute({
      action: 'deleteMemory',
      id,
      source: 'api'
    });
    
    res.status(200).json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la suppression de la mémoire: ${error}`
    } as ApiResponse);
  }
});

export const memoryRoutes = router;
