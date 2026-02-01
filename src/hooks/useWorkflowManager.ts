import { useEffect } from 'react';
import { agentRegistry } from '../features/agents/core/registry';
import { useAppStore } from '../store/appStore';
import type { PlannerAgent } from '../agents/PlannerAgent';

/**
 * A hook to synchronize the PlannerAgent's templates and checkpoints with the global store.
 */
export const useWorkflowManager = () => {
  useEffect(() => {
    const loadPlanner = async () => {
      const planner = await agentRegistry.getAgentAsync('PlannerAgent') as PlannerAgent | undefined;

      if (planner) {
        const templates = planner.getTemplates();
        const checkpoints = planner.getCheckpoints();
        
        // Accéder directement au store sans dépendances
        useAppStore.getState().setTemplates(templates);
        useAppStore.getState().setCheckpoints(checkpoints);
      }
    };
    
    loadPlanner();
  }, []); // Exécuter une seule fois au montage
};
