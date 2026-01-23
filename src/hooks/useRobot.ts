/**
 * Hook React pour l'interaction avec l'API robot
 */

import { useState, useCallback, useEffect } from 'react';
import { type RobotCommand, type RobotStatus } from '../api/services/rosBridgeService.js';

interface UseRobotReturn {
  // État
  status: RobotStatus | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  moveRobot: (command: RobotCommand) => Promise<boolean>;
  sayText: (text: string, language?: string) => Promise<boolean>;
  setGoal: (x: number, y: number, theta?: number) => Promise<boolean>;
  emergencyStop: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

export const useRobot = (): UseRobotReturn => {
  const [status, setStatus] = useState<RobotStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async (endpoint: string, method: string = 'GET', body?: any) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Token d\'authentification manquant');
    }

    const response = await fetch(`/api/robot${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
    }

    return response.json();
  }, []);

  const moveRobot = useCallback(async (command: RobotCommand): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await apiCall('/move', 'POST', command);
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur moveRobot:', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const sayText = useCallback(async (text: string, language: string = 'fr'): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await apiCall('/say', 'POST', { text, language });
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur sayText:', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const setGoal = useCallback(async (x: number, y: number, theta: number = 0): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await apiCall('/goal', 'POST', { x, y, theta });
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur setGoal:', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const emergencyStop = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await apiCall('/stop', 'POST');
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur emergencyStop:', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await apiCall('/status');
      if (result.success) {
        setStatus(result.data.robot);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur refreshStatus:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Rafraîchir le statut périodiquement
  useEffect(() => {
    refreshStatus();
    
    const interval = setInterval(refreshStatus, 5000); // Toutes les 5 secondes
    
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return {
    status,
    isConnected: status?.connected || false,
    isLoading,
    error,
    moveRobot,
    sayText,
    setGoal,
    emergencyStop,
    refreshStatus
  };
};
