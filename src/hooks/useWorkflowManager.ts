import { useEffect } from 'react';
import { agentRegistry } from '../features/agents/core/registry';
import { useVisionAudioStore } from '../store/visionAudioStore';
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
        useVisionAudioStore.getState().setTemplates(templates);
        useVisionAudioStore.getState().setCheckpoints(checkpoints);
      }
    };
    
    loadPlanner();
  }, []); // Exécuter une seule fois au montage
};
