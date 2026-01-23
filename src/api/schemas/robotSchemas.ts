/**
 * Schémas de validation Zod pour les routes robot
 */

import { z } from 'zod';

export const moveRobotSchema = z.object({
  linear: z.object({
    x: z.number().min(-2).max(2),
    y: z.number().min(-2).max(2).optional().default(0),
    z: z.number().min(-2).max(2).optional().default(0)
  }),
  angular: z.object({
    x: z.number().min(-3.14).max(3.14).optional().default(0),
    y: z.number().min(-3.14).max(3.14).optional().default(0),
    z: z.number().min(-3.14).max(3.14)
  })
});

export const sayTextSchema = z.object({
  text: z.string().min(1).max(500),
  language: z.enum(['fr', 'en', 'es']).optional().default('fr')
});

export const setGoalSchema = z.object({
  x: z.number().min(-100).max(100),
  y: z.number().min(-100).max(100),
  theta: z.number().min(-3.14159).max(3.14159).optional().default(0)
});

export type MoveRobotRequest = z.infer<typeof moveRobotSchema>;
export type SayTextRequest = z.infer<typeof sayTextSchema>;
export type SetGoalRequest = z.infer<typeof setGoalSchema>;
