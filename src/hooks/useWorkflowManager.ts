import { useEffect } from 'react';
import { agentRegistry } from '../agents/registry';
import { useVisionAudioStore } from '../store/visionAudioStore';
import type { PlannerAgent } from '../agents/PlannerAgent';

/**
 * A hook to synchronize the PlannerAgent's templates and checkpoints with the global store.
 */
export const useWorkflowManager = () => {
  const { setTemplates, setCheckpoints } = useVisionAudioStore();

  useEffect(() => {
    const planner = agentRegistry.getAgent('PlannerAgent') as PlannerAgent | undefined;

    if (planner) {
      const templates = planner.getTemplates();
      const checkpoints = planner.getCheckpoints();
      
      setTemplates(templates);
      setCheckpoints(checkpoints);
    }
  }, [setTemplates, setCheckpoints]);
};
