/**
 * Routes API pour accéder aux fonctionnalités météo de Lisa
 */
import express from 'express';
import type { ApiResponse } from '../config.js';
import { agentRegistry } from '../../agents/registry.js';

const router = express.Router();

// Récupérer les données météo pour une localisation
router.get('/', async (req, res) => {
  try {
    const location = req.query.location as string;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre "location" est requis'
      } as ApiResponse);
    }
    
    // Récupérer le WeatherAgent
    const weatherAgent = agentRegistry.getAgent('WeatherAgent');
    
    if (!weatherAgent) {
      return res.status(500).json({
        success: false,
        error: 'WeatherAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le WeatherAgent pour obtenir les données météo
    const result = await weatherAgent.execute({
      action: 'getWeather',
      location,
      source: 'api'
    });
    
    res.status(200).json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la récupération des données météo: ${error}`
    } as ApiResponse);
  }
});

// Récupérer les prévisions météo pour une localisation
router.get('/forecast', async (req, res) => {
  try {
    const location = req.query.location as string;
    const days = parseInt(req.query.days as string) || 5;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre "location" est requis'
      } as ApiResponse);
    }
    
    // Récupérer le WeatherAgent
    const weatherAgent = agentRegistry.getAgent('WeatherAgent');
    
    if (!weatherAgent) {
      return res.status(500).json({
        success: false,
        error: 'WeatherAgent non disponible'
      } as ApiResponse);
    }
    
    // Exécuter le WeatherAgent pour obtenir les prévisions
    const result = await weatherAgent.execute({
      action: 'getForecast',
      location,
      days,
      source: 'api'
    });
    
    res.status(200).json({
      success: true,
      data: result
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erreur lors de la récupération des prévisions météo: ${error}`
    } as ApiResponse);
  }
});

export const weatherRoutes = router;
