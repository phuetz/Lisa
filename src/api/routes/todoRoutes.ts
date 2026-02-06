/**
 * Routes API pour gérer les todos de Lisa
 */
import express from 'express';
import { agentRegistry } from '../adapters/agents.js';
import { sendJson, sendError, sendCreated } from '../utils/responses.js';

const router = express.Router();

// Récupérer toutes les tâches
router.get('/', async (_req, res) => {
  try {
    const todoAgent = await agentRegistry.getAgentAsync('TodoAgent');
    if (!todoAgent) { sendError(res, 'UNAVAILABLE', 'TodoAgent non disponible'); return; }

    const result = await todoAgent.execute({ action: 'listTodos', source: 'api' });
    sendJson(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la récupération des tâches: ${error}`);
  }
});

// Ajouter une nouvelle tâche
router.post('/', async (req, res) => {
  try {
    const { title, dueDate, priority, category } = req.body;
    if (!title) { sendError(res, 'VALIDATION', 'Le titre de la tâche est requis'); return; }

    const todoAgent = await agentRegistry.getAgentAsync('TodoAgent');
    if (!todoAgent) { sendError(res, 'UNAVAILABLE', 'TodoAgent non disponible'); return; }

    const result = await todoAgent.execute({
      action: 'addTodo', title, dueDate, priority, category, source: 'api'
    });
    sendCreated(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de l'ajout de la tâche: ${error}`);
  }
});

// Mettre à jour une tâche
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { title, completed, dueDate, priority, category } = req.body;

    const todoAgent = await agentRegistry.getAgentAsync('TodoAgent');
    if (!todoAgent) { sendError(res, 'UNAVAILABLE', 'TodoAgent non disponible'); return; }

    const result = await todoAgent.execute({
      action: 'updateTodo', id, title, completed, dueDate, priority, category, source: 'api'
    });
    sendJson(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la mise à jour de la tâche: ${error}`);
  }
});

// Supprimer une tâche
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const todoAgent = await agentRegistry.getAgentAsync('TodoAgent');
    if (!todoAgent) { sendError(res, 'UNAVAILABLE', 'TodoAgent non disponible'); return; }

    const result = await todoAgent.execute({ action: 'removeTodo', id, source: 'api' });
    sendJson(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la suppression de la tâche: ${error}`);
  }
});

// Marquer une tâche comme terminée
router.patch('/:id/complete', async (req, res) => {
  try {
    const id = req.params.id;

    const todoAgent = await agentRegistry.getAgentAsync('TodoAgent');
    if (!todoAgent) { sendError(res, 'UNAVAILABLE', 'TodoAgent non disponible'); return; }

    const result = await todoAgent.execute({ action: 'completeTodo', id, source: 'api' });
    sendJson(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors du marquage de la tâche comme terminée: ${error}`);
  }
});

export const todoRoutes = router;
