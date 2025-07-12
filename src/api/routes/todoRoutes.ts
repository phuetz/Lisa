/**
 * Routes API pour gérer les todos de Lisa
 */
import express from 'express';
import type { ApiResponse } from '../config.js';
import { agentRegistry } from '../../agents/registry.js';

const router = express.Router();

// Récupérer toutes les tâches
router.get('/', async (_req, res) => {
  try {
    // Récupérer le TodoAgent
    const todoAgent = agentRegistry.getAgent('TodoAgent');
    
    if (!todoAgent) {
      return res.status(500).json({
        success: false,
        error: 'TodoAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le TodoAgent pour lister les tâches
    const result = await todoAgent.execute({
      action: 'listTodos',
      source: 'api'
    });
    
    res.status(200).json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la récupération des tâches: ${error}`
    } as ApiResponse);
  }
});

// Ajouter une nouvelle tâche
router.post('/', async (req, res) => {
  try {
    const { title, dueDate, priority, category } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Le titre de la tâche est requis'
      } as ApiResponse);
    }
    
    // Récupérer le TodoAgent
    const todoAgent = agentRegistry.getAgent('TodoAgent');
    
    if (!todoAgent) {
      return res.status(500).json({
        success: false,
        error: 'TodoAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le TodoAgent pour ajouter une tâche
    const result = await todoAgent.execute({
      action: 'addTodo',
      title,
      dueDate,
      priority,
      category,
      source: 'api'
    });
    
    res.status(201).json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de l'ajout de la tâche: ${error}`
    } as ApiResponse);
  }
});

// Mettre à jour une tâche
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { title, completed, dueDate, priority, category } = req.body;
    
    // Récupérer le TodoAgent
    const todoAgent = agentRegistry.getAgent('TodoAgent');
    
    if (!todoAgent) {
      return res.status(500).json({
        success: false,
        error: 'TodoAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le TodoAgent pour mettre à jour une tâche
    const result = await todoAgent.execute({
      action: 'updateTodo',
      id,
      title,
      completed,
      dueDate,
      priority,
      category,
      source: 'api'
    });
    
    res.status(200).json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la mise à jour de la tâche: ${error}`
    } as ApiResponse);
  }
});

// Supprimer une tâche
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    // Récupérer le TodoAgent
    const todoAgent = agentRegistry.getAgent('TodoAgent');
    
    if (!todoAgent) {
      return res.status(500).json({
        success: false,
        error: 'TodoAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le TodoAgent pour supprimer une tâche
    const result = await todoAgent.execute({
      action: 'removeTodo',
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
      error: `Erreur lors de la suppression de la tâche: ${error}`
    } as ApiResponse);
  }
});

// Marquer une tâche comme terminée
router.patch('/:id/complete', async (req, res) => {
  try {
    const id = req.params.id;
    
    // Récupérer le TodoAgent
    const todoAgent = agentRegistry.getAgent('TodoAgent');
    
    if (!todoAgent) {
      return res.status(500).json({
        success: false,
        error: 'TodoAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le TodoAgent pour marquer une tâche comme terminée
    const result = await todoAgent.execute({
      action: 'completeTodo',
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
      error: `Erreur lors du marquage de la tâche comme terminée: ${error}`
    } as ApiResponse);
  }
});

export const todoRoutes = router;
