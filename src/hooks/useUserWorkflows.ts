/**
 * hooks/useUserWorkflows.ts
 * 
 * Hook React pour gérer les workflows définis par l'utilisateur
 * Permet de créer, exécuter et gérer des workflows personnalisés.
 */

import { useState, useCallback, useEffect } from 'react';
import { agentRegistry } from '../features/agents/core/registry';
import type { UserWorkflowAgent, WorkflowDefinition } from '../agents/UserWorkflowAgent';
import { toast } from 'sonner';

// Interface pour les workflows gérés
export interface ManagedWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  stepCount: number;
}

// Interface de retour du hook
export interface UserWorkflowsHook {
  // État
  isLoading: boolean;
  error: string | null;
  workflows: ManagedWorkflow[];
  
  // Actions
  createWorkflow: (definition: WorkflowDefinition) => Promise<string | null>;
  deleteWorkflow: (workflowId: string) => Promise<boolean>;
  executeWorkflow: (workflowId: string, args?: Record<string, any>) => Promise<boolean>;
  getAllWorkflows: () => Promise<ManagedWorkflow[]>;
  parseNaturalLanguage: (instruction: string) => Promise<WorkflowDefinition | null>;
  checkTriggerPhrase: (phrase: string) => Promise<{
    matched: boolean;
    workflowId?: string;
    confidence?: number;
  }>;
}

/**
 * Hook pour gérer les workflows définis par l'utilisateur
 */
export const useUserWorkflows = (): UserWorkflowsHook => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<ManagedWorkflow[]>([]);
  
  // Note: lastSpokenText n'existe pas dans le store actuel
  // const lastSpokenText = useVisionAudioStore(s => s.lastSpokenText);
  
  /**
   * Obtenir l'agent de workflows
   */
  const getUserWorkflowAgent = useCallback(async (): Promise<UserWorkflowAgent> => {
    const agent = await agentRegistry.getAgentAsync('User Workflow Agent');
    if (!agent) {
      throw new Error("Agent de workflows utilisateur non disponible");
    }
    return agent as unknown as UserWorkflowAgent;
  }, []);
  
  /**
   * Créer un nouveau workflow à partir d'une définition
   */
  const createWorkflow = useCallback(async (definition: WorkflowDefinition): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const agent = await getUserWorkflowAgent();
      
      const result = await agent.execute({
        intent: 'create_workflow',
        parameters: { definition }
      });
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la création du workflow");
      }
      
      // Rafraîchir la liste des workflows
      void getAllWorkflows();
      
      toast.success(`Workflow "${definition.name}" créé avec succès!`);
      
      return result.output?.workflowId || null;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      toast.error(`Erreur: ${errMsg}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getUserWorkflowAgent]);
  
  /**
   * Supprimer un workflow existant
   */
  const deleteWorkflow = useCallback(async (workflowId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const agent = await getUserWorkflowAgent();
      
      const result = await agent.execute({
        intent: 'delete_workflow',
        parameters: { workflowId }
      });
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la suppression du workflow");
      }
      
      // Rafraîchir la liste des workflows
      void getAllWorkflows();
      
      toast.success("Workflow supprimé avec succès!");
      
      return true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      toast.error(`Erreur: ${errMsg}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getUserWorkflowAgent]);
  
  /**
   * Exécuter un workflow existant
   */
  const executeWorkflow = useCallback(async (workflowId: string, args?: Record<string, unknown>): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const agent = await getUserWorkflowAgent();
      
      const result = await agent.execute({
        intent: 'execute_workflow',
        parameters: { workflowId, args }
      });
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de l'exécution du workflow");
      }
      
      toast.success("Workflow exécuté avec succès!");
      
      return true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      toast.error(`Erreur: ${errMsg}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getUserWorkflowAgent]);
  
  /**
   * Récupérer tous les workflows définis par l'utilisateur
   */
  const getAllWorkflows = useCallback(async (): Promise<ManagedWorkflow[]> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const agent = await getUserWorkflowAgent();
      
      const result = await agent.execute({
        intent: 'get_workflows'
      });
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la récupération des workflows");
      }
      
      const workflowsList = result.output?.workflows || [];
      setWorkflows(workflowsList);
      
      return workflowsList;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getUserWorkflowAgent]);
  
  /**
   * Parser une instruction en langage naturel pour créer un workflow
   */
  const parseNaturalLanguage = useCallback(async (instruction: string): Promise<WorkflowDefinition | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const agent = await getUserWorkflowAgent();
      
      const result = await agent.execute({
        intent: 'parse_natural_language_workflow',
        parameters: { instruction }
      });
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de l'analyse de l'instruction");
      }
      
      return result.output?.definition || null;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      toast.error(`Erreur: ${errMsg}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getUserWorkflowAgent]);
  
  /**
   * Vérifier si une phrase correspond à un déclencheur de workflow
   */
  const checkTriggerPhrase = useCallback(async (phrase: string): Promise<{
    matched: boolean;
    workflowId?: string;
    confidence?: number;
  }> => {
    try {
      const agent = await getUserWorkflowAgent();
      
      const result = await agent.execute({
        intent: 'check_trigger_match',
        parameters: { phrase }
      });
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la vérification du déclencheur");
      }
      
      const matched = result.output?.matched || false;
      
      if (matched) {
        const workflowId = result.output?.workflowId;
        const confidence = result.output?.confidence;
        
        if (workflowId) {
          // Si correspondance exacte ou confidence élevée, exécuter automatiquement
          if (!result.output?.partialMatch || (confidence && confidence > 0.9)) {
            void executeWorkflow(workflowId);
          }
        }
        
        return {
          matched,
          workflowId,
          confidence
        };
      }
      
      return { matched: false };
    } catch (err) {
      console.error("Erreur lors de la vérification du déclencheur:", err);
      return { matched: false };
    }
  }, [getUserWorkflowAgent, executeWorkflow]);
  
  // Initialisation: charger les workflows existants
  useEffect(() => {
    void getAllWorkflows();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Détecter les phrases de déclenchement dans le texte parlé
  // Note: Désactivé car lastSpokenText n'existe pas dans le store
  // useEffect(() => {
  //   if (lastSpokenText) {
  //     void checkTriggerPhrase(lastSpokenText);
  //   }
  // }, [lastSpokenText, checkTriggerPhrase]);
  
  return {
    // État
    isLoading,
    error,
    workflows,
    
    // Actions
    createWorkflow,
    deleteWorkflow,
    executeWorkflow,
    getAllWorkflows,
    parseNaturalLanguage,
    checkTriggerPhrase
  };
};
