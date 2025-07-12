import type { Request, Response } from 'express';
import * as authService from '../services/authService.js';

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await authService.registerUser(email, password, name);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
        return res.status(409).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await authService.loginUser(email, password);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid credentials')) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
