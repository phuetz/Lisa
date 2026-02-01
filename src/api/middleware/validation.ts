/**
 * Middleware de validation Zod pour les routes API
 */

import { type Request, type Response, type NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { type ApiResponse } from '../config.js';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const response: ApiResponse = {
          success: false,
          error: `Validation error: ${error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        };
        return res.status(400).json(response);
      }
      
      const response: ApiResponse = {
        success: false,
        error: 'Invalid request data'
      };
      res.status(400).json(response);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const response: ApiResponse = {
          success: false,
          error: `Query validation error: ${error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        };
        return res.status(400).json(response);
      }
      
      const response: ApiResponse = {
        success: false,
        error: 'Invalid query parameters'
      };
      res.status(400).json(response);
    }
  };
};
