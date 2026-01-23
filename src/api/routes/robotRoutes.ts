/**
 * Routes API pour le contrôle robotique
 */

import { Router, type Request, type Response } from 'express';
import { rosBridgeService, type RobotCommand } from '../services/rosBridgeService.js';
import { authenticateToken } from '../middleware/auth.js';
import { type ApiResponse } from '../config.js';
import { validateBody } from '../middleware/validation.js';
import { moveRobotSchema, sayTextSchema, setGoalSchema } from '../schemas/robotSchemas.js';

const router = Router();

// Middleware d'authentification pour toutes les routes robot
router.use(authenticateToken);

/**
 * POST /api/robot/move
 * Déplace le robot avec les vitesses spécifiées
 */
router.post('/move', validateBody(moveRobotSchema), async (req: Request, res: Response) => {
  try {
    const { linear, angular } = req.body;

    // Validation des paramètres
    if (!linear || !angular) {
      const response: ApiResponse = {
        success: false,
        error: 'Paramètres linear et angular requis'
      };
      return res.status(400).json(response);
    }

    // Validation des types
    if (typeof linear.x !== 'number' || typeof angular.z !== 'number') {
      const response: ApiResponse = {
        success: false,
        error: 'linear.x et angular.z doivent être des nombres'
      };
      return res.status(400).json(response);
    }

    const command: RobotCommand = {
      linear: {
        x: linear.x || 0,
        y: linear.y || 0,
        z: linear.z || 0
      },
      angular: {
        x: angular.x || 0,
        y: angular.y || 0,
        z: angular.z || 0
      }
    };

    const success = await rosBridgeService.moveRobot(command);

    if (success) {
      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Commande de mouvement envoyée',
          command
        }
      };
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: 'Échec de l\'envoi de la commande de mouvement'
      };
      res.status(500).json(response);
    }

  } catch (error) {
    console.error('Erreur route /robot/move:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Erreur interne du serveur'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/robot/say
 * Fait parler le robot via TTS
 */
router.post('/say', validateBody(sayTextSchema), async (req: Request, res: Response) => {
  try {
    const { text, language = 'fr' } = req.body;

    // Validation des paramètres
    if (!text || typeof text !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'Paramètre text (string) requis'
      };
      return res.status(400).json(response);
    }

    if (text.length > 500) {
      const response: ApiResponse = {
        success: false,
        error: 'Le texte ne peut pas dépasser 500 caractères'
      };
      return res.status(400).json(response);
    }

    const success = await rosBridgeService.sayText(text, language);

    if (success) {
      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Commande TTS envoyée',
          text,
          language
        }
      };
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: 'Échec de l\'envoi de la commande TTS'
      };
      res.status(500).json(response);
    }

  } catch (error) {
    console.error('Erreur route /robot/say:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Erreur interne du serveur'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/robot/status
 * Récupère l'état actuel du robot
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await rosBridgeService.getRobotStatus();

    const response: ApiResponse = {
      success: true,
      data: {
        robot: status,
        rosBridge: {
          connected: rosBridgeService.isConnected(),
          lastCheck: new Date()
        }
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Erreur route /robot/status:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Erreur lors de la récupération du statut'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/robot/stop
 * Arrêt d'urgence du robot
 */
router.post('/stop', async (_req: Request, res: Response) => {
  try {
    const success = await rosBridgeService.emergencyStop();

    if (success) {
      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Arrêt d\'urgence activé'
        }
      };
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: 'Échec de l\'arrêt d\'urgence'
      };
      res.status(500).json(response);
    }

  } catch (error) {
    console.error('Erreur route /robot/stop:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Erreur interne du serveur'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/robot/goal
 * Envoie un objectif de navigation au robot
 */
router.post('/goal', validateBody(setGoalSchema), async (req: Request, res: Response) => {
  try {
    const { x, y, theta } = req.body;

    // Validation des paramètres
    if (typeof x !== 'number' || typeof y !== 'number') {
      const response: ApiResponse = {
        success: false,
        error: 'Paramètres x et y (nombres) requis'
      };
      return res.status(400).json(response);
    }

    const goal = {
      position: {
        x,
        y,
        z: 0
      },
      orientation: {
        x: 0,
        y: 0,
        z: Math.sin((theta || 0) / 2),
        w: Math.cos((theta || 0) / 2)
      }
    };

    // Publier l'objectif de navigation
    rosBridgeService.publish('/motion/goal', 'geometry_msgs/PoseStamped', {
      header: {
        stamp: { sec: Math.floor(Date.now() / 1000), nanosec: 0 },
        frame_id: 'map'
      },
      pose: goal
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Objectif de navigation envoyé',
        goal
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Erreur route /robot/goal:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Erreur interne du serveur'
    };
    res.status(500).json(response);
  }
});

export default router;
