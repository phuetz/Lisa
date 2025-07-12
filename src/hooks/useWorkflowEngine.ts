/**
 * useWorkflowEngine.ts
 * 
 * React hook for interacting with the WorkflowEngine
 * Provides state management and UI bindings for workflows
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import workflowEngine, { 
  Workflow, 
  WorkflowStep, 
  WorkflowTemplate, 
  WorkflowHistoryItem 
} from '../utils/WorkflowEngine';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { agentRegistry } from '../agents/registry';

export const useWorkflowEngine = () => {
  // State for workflows, templates, history
  const [activeWorkflows, setActiveWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [history, setHistory] = useState<WorkflowHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  // Get all available agents for workflow step creation
  const availableAgents = useMemo(() => {
    return agentRegistry.getAllAgents().map(agent => ({
      name: agent.name,
      description: agent.description
    }));
  }, []);

  // Store reference
  const updateWorkflowState = useVisionAudioStore(state => state.setWorkflowState);

  // Load initial data
  useEffect(() => {
    setTemplates(workflowEngine.getTemplates());
    setHistory(workflowEngine.getHistory());
    
    // Set up event listeners
    const unsubscribe = workflowEngine.addEventListener('*', (event) => {
      // Refresh data when workflows change
      if (event.type.startsWith('workflow-')) {
        setActiveWorkflows(prev => {
          const existing = [...prev];
          const workflowIndex = existing.findIndex(w => w.id === event.workflowId);
          
          // Get the workflow from the engine (it will have the latest state)
          const updatedWorkflow = workflowEngine.getActiveWorkflows()
            .find(w => w.id === event.workflowId);
            
          if (updatedWorkflow) {
            if (workflowIndex >= 0) {
              existing[workflowIndex] = updatedWorkflow;
            } else {
              existing.push(updatedWorkflow);
            }
          } else if (workflowIndex >= 0 && 
                    (event.type === 'workflow-completed' || 
                     event.type === 'workflow-failed')) {
            // Remove completed or failed workflows after a delay
            setTimeout(() => {
              setActiveWorkflows(prev => 
                prev.filter(w => w.id !== event.workflowId)
              );
            }, 5000); // Keep in UI briefly so user can see completion
          }
          
          return existing;
        });
        
        // Update loading state
        if (event.type === 'workflow-started') {
          setIsLoading(prev => ({ ...prev, [event.workflowId]: true }));
        } 
        else if (
          event.type === 'workflow-completed' || 
          event.type === 'workflow-failed' ||
          event.type === 'workflow-paused'
        ) {
          setIsLoading(prev => ({ ...prev, [event.workflowId]: false }));
        }
        
        // Update templates and history
        if (event.type === 'workflow-completed' || event.type === 'workflow-failed') {
          setTemplates(workflowEngine.getTemplates());
          setHistory(workflowEngine.getHistory());
        }
        
        // Update global store state for other components
        const updatedWorkflows = workflowEngine.getActiveWorkflows();
        updateWorkflowState(updatedWorkflows);
      }
    });
    
    return () => unsubscribe();
  }, [updateWorkflowState]);

  /**
   * Create a new workflow
   */
  const createWorkflow = useCallback((params: {
    name: string,
    description: string,
    templateId?: string,
    steps?: Omit<WorkflowStep, 'status' | 'result' | 'startTime' | 'endTime' | 'duration' | 'retryCount'>[]
  }): Workflow => {
    const workflow = workflowEngine.createWorkflow(params);
    setActiveWorkflows(prev => [...prev, workflow]);
    return workflow;
  }, []);

  /**
   * Execute a workflow
   */
  const executeWorkflow = useCallback(async (workflowId: string): Promise<Workflow> => {
    setIsLoading(prev => ({ ...prev, [workflowId]: true }));
    try {
      const result = await workflowEngine.executeWorkflow(workflowId);
      return result;
    } finally {
      setIsLoading(prev => ({ ...prev, [workflowId]: false }));
    }
  }, []);

  /**
   * Pause a running workflow
   */
  const pauseWorkflow = useCallback((workflowId: string): void => {
    workflowEngine.pauseWorkflow(workflowId);
  }, []);

  /**
   * Resume a paused workflow
   */
  const resumeWorkflow = useCallback(async (workflowId: string): Promise<Workflow> => {
    setIsLoading(prev => ({ ...prev, [workflowId]: true }));
    try {
      const result = await workflowEngine.resumeWorkflow(workflowId);
      return result;
    } finally {
      setIsLoading(prev => ({ ...prev, [workflowId]: false }));
    }
  }, []);

  /**
   * Cancel a workflow
   */
  const cancelWorkflow = useCallback((workflowId: string): void => {
    workflowEngine.cancelWorkflow(workflowId);
  }, []);

  /**
   * Save a workflow as a template
   */
  const saveAsTemplate = useCallback((
    workflowId: string, 
    name: string, 
    description: string, 
    tags: string[] = []
  ): WorkflowTemplate => {
    const template = workflowEngine.saveAsTemplate(workflowId, name, description, tags);
    setTemplates(workflowEngine.getTemplates());
    return template;
  }, []);

  /**
   * Create a workflow from natural language using PlannerAgent
   */
  const createWorkflowFromNL = useCallback(async (
    request: string,
    name: string,
    description: string
  ): Promise<Workflow> => {
    setIsLoading(prev => ({ ...prev, [request]: true }));
    
    try {
      // Find PlannerAgent
      const plannerAgent = agentRegistry.getAgent('PlannerAgent');
      if (!plannerAgent) {
        throw new Error('PlannerAgent not found in registry');
      }
      
      // Call PlannerAgent to generate workflow steps
      const result = await plannerAgent.execute({ 
        request,
        generatePlanOnly: true // Only generate the plan, don't execute it
      });
      
      if (!result.success || !result.output || !Array.isArray(result.output)) {
        throw new Error(`Failed to generate workflow: ${result.error || 'Unknown error'}`);
      }
      
      // Create workflow from generated steps
      const workflow = createWorkflow({
        name,
        description,
        steps: result.output
      });
      
      return workflow;
    } finally {
      setIsLoading(prev => ({ ...prev, [request]: false }));
    }
  }, [createWorkflow]);

  return {
    // Data
    activeWorkflows,
    templates,
    history,
    availableAgents,
    isLoading,
    
    // Methods
    createWorkflow,
    executeWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    saveAsTemplate,
    createWorkflowFromNL,
  };
};

// Add method to get active workflows
workflowEngine.getActiveWorkflows = function() {
  return Array.from(this.activeWorkflows.values());
};
