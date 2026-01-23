/**
 * useScheduler - Hook for interacting with SchedulerAgent
 */

import { useState, useCallback } from 'react';
import { agentRegistry } from '../features/agents/core/registry';

export const useScheduler = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findAvailability = useCallback(async (startDate: Date, endDate: Date, duration: number = 60) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('SchedulerAgent');
      if (!agent) throw new Error('SchedulerAgent not found');
      
      const result = await agent.execute({
        intent: 'find_availability',
        parameters: { startDate, endDate, duration }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Availability check failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const suggestTime = useCallback(async (purpose: string, duration: number = 60, preferredTimeOfDay?: string) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('SchedulerAgent');
      if (!agent) throw new Error('SchedulerAgent not found');
      
      const result = await agent.execute({
        intent: 'suggest_time',
        parameters: { purpose, duration, preferredTimeOfDay }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Time suggestion failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const detectConflicts = useCallback(async (events: any[], newEvent: any) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('SchedulerAgent');
      if (!agent) throw new Error('SchedulerAgent not found');
      
      const result = await agent.execute({
        intent: 'detect_conflicts',
        parameters: { events, newEvent }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Conflict detection failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const optimizeSchedule = useCallback(async (events: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('SchedulerAgent');
      if (!agent) throw new Error('SchedulerAgent not found');
      
      const result = await agent.execute({
        intent: 'optimize_schedule',
        parameters: { events }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Schedule optimization failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  return {
    loading,
    error,
    findAvailability,
    suggestTime,
    detectConflicts,
    optimizeSchedule
  };
};
