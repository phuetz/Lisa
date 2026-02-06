/**
 * Routes API pour accéder aux fonctionnalités météo de Lisa
 */
import express from 'express';
import { agentRegistry } from '../adapters/agents.js';
import { sendJson, sendError } from '../utils/responses.js';

const router = express.Router();

// Récupérer les données météo pour une localisation
router.get('/', async (req, res) => {
  try {
    const location = req.query.location as string;

    if (!location) {
      sendError(res, 'VALIDATION', 'Le paramètre "location" est requis');
      return;
    }

    const weatherAgent = await agentRegistry.getAgentAsync('WeatherAgent');
    if (!weatherAgent) {
      sendError(res, 'UNAVAILABLE', 'WeatherAgent non disponible');
      return;
    }

    const result = await weatherAgent.execute({
      action: 'getWeather',
      location,
      source: 'api'
    });

    sendJson(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la récupération des données météo: ${error}`);
  }
});

// Récupérer les prévisions météo pour une localisation
router.get('/forecast', async (req, res) => {
  try {
    const location = req.query.location as string;
    const days = parseInt(req.query.days as string) || 5;

    if (!location) {
      sendError(res, 'VALIDATION', 'Le paramètre "location" est requis');
      return;
    }

    const weatherAgent = await agentRegistry.getAgentAsync('WeatherAgent');
    if (!weatherAgent) {
      sendError(res, 'UNAVAILABLE', 'WeatherAgent non disponible');
      return;
    }

    const result = await weatherAgent.execute({
      action: 'getForecast',
      location,
      days,
      source: 'api'
    });

    sendJson(res, result);
  } catch (error) {
    sendError(res, 'INTERNAL', `Erreur lors de la récupération des prévisions météo: ${error}`);
  }
});

export const weatherRoutes = router;
