/**
 * hooks/useSystemIntegration.ts
 * 
 * Hook React pour gérer les intégrations système
 * Permet de créer, exécuter et gérer des intégrations avec des systèmes externes
 */

import { useState, useCallback, useEffect } from 'react';
import { agentRegistry } from '../features/agents/core/registry';
import { toast } from 'sonner';
import type { 
  SystemIntegrationConfig, 
  SystemIntegrationType 
} from '../agents/SystemIntegrationAgent';

// Interface pour les résultats des opérations d'intégration
export interface IntegrationResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

// Interface du hook d'intégration système
export interface SystemIntegrationHook {
  // État
  isLoading: boolean;
  error: string | null;
  integrations: SystemIntegrationConfig[];
  
  // Actions
  registerIntegration: (config: SystemIntegrationConfig) => Promise<IntegrationResult>;
  executeIntegration: (integrationId: string, params: Record<string, unknown>) => Promise<IntegrationResult>;
  listIntegrations: (type?: SystemIntegrationType) => Promise<SystemIntegrationConfig[]>;
  updateIntegration: (integrationId: string, updates: Partial<SystemIntegrationConfig>) => Promise<IntegrationResult>;
  deleteIntegration: (integrationId: string) => Promise<IntegrationResult>;
  testIntegration: (integrationId: string) => Promise<IntegrationResult>;
}

/**
 * Hook pour gérer les intégrations système
 */
export const useSystemIntegration = (): SystemIntegrationHook => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<SystemIntegrationConfig[]>([]);

  /**
   * Obtenir l'agent d'intégration système
   */
  const getSystemIntegrationAgent = useCallback(async () => {
    const agent = await agentRegistry.getAgentAsync('System Integration Agent');
    if (!agent) {
      throw new Error("Agent d'intégration système non disponible");
    }
    return agent;
  }, []);

  /**
   * Enregistrer une nouvelle intégration
   */
  const registerIntegration = useCallback(async (
    config: SystemIntegrationConfig
  ): Promise<IntegrationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const agent = await getSystemIntegrationAgent();

      const result = await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de l'enregistrement de l'intégration");
      }

      // Rafraîchir la liste des intégrations
      void listIntegrations();

      toast.success(`Intégration "${config.name}" enregistrée avec succès!`);

      return {
        success: true,
        message: result.output?.message || `Intégration "${config.name}" enregistrée avec succès`,
        data: result.output
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      toast.error(`Erreur: ${errMsg}`);
      
      return {
        success: false,
        error: errMsg
      };
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSystemIntegrationAgent]);

  /**
   * Exécuter une intégration
   */
  const executeIntegration = useCallback(async (
    integrationId: string,
    params: Record<string, unknown>
  ): Promise<IntegrationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const agent = await getSystemIntegrationAgent();

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: { integrationId, params }
      });

      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de l'exécution de l'intégration");
      }

      toast.success(`Intégration exécutée avec succès!`);

      return {
        success: true,
        message: result.output?.message || "Intégration exécutée avec succès",
        data: result.output?.result
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      toast.error(`Erreur: ${errMsg}`);
      
      return {
        success: false,
        error: errMsg
      };
    } finally {
      setIsLoading(false);
    }
  }, [getSystemIntegrationAgent]);

  /**
   * Lister les intégrations
   */
  const listIntegrations = useCallback(async (
    type?: SystemIntegrationType
  ): Promise<SystemIntegrationConfig[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const agent = await getSystemIntegrationAgent();

      const result = await agent.execute({
        intent: 'list_integrations',
        parameters: type ? { type } : {}
      });

      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la récupération des intégrations");
      }

      const integrationsList = result.output?.integrations || [];
      setIntegrations(integrationsList);

      return integrationsList;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      console.error(`Erreur lors de la récupération des intégrations: ${errMsg}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getSystemIntegrationAgent]);

  /**
   * Mettre à jour une intégration
   */
  const updateIntegration = useCallback(async (
    integrationId: string,
    updates: Partial<SystemIntegrationConfig>
  ): Promise<IntegrationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const agent = getSystemIntegrationAgent();

      const result = await agent.execute({
        intent: 'update_integration',
        parameters: { integrationId, updates }
      });

      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la mise à jour de l'intégration");
      }

      // Rafraîchir la liste des intégrations
      void listIntegrations();

      toast.success(`Intégration mise à jour avec succès!`);

      return {
        success: true,
        message: result.output?.message || "Intégration mise à jour avec succès",
        data: result.output
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      toast.error(`Erreur: ${errMsg}`);
      
      return {
        success: false,
        error: errMsg
      };
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSystemIntegrationAgent]);

  /**
   * Supprimer une intégration
   */
  const deleteIntegration = useCallback(async (
    integrationId: string
  ): Promise<IntegrationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const agent = getSystemIntegrationAgent();

      const result = await agent.execute({
        intent: 'delete_integration',
        parameters: { integrationId }
      });

      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la suppression de l'intégration");
      }

      // Rafraîchir la liste des intégrations
      void listIntegrations();

      toast.success(`Intégration supprimée avec succès!`);

      return {
        success: true,
        message: result.output?.message || "Intégration supprimée avec succès",
        data: result.output
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      toast.error(`Erreur: ${errMsg}`);
      
      return {
        success: false,
        error: errMsg
      };
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSystemIntegrationAgent]);

  /**
   * Tester une intégration
   */
  const testIntegration = useCallback(async (
    integrationId: string
  ): Promise<IntegrationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const agent = getSystemIntegrationAgent();

      const result = await agent.execute({
        intent: 'test_integration',
        parameters: { integrationId }
      });

      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec du test de l'intégration");
      }

      toast.success(`Test d'intégration réussi!`);

      return {
        success: true,
        message: result.output?.message || "Test d'intégration réussi",
        data: result.output?.testResult
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      toast.error(`Erreur de test: ${errMsg}`);
      
      return {
        success: false,
        error: errMsg
      };
    } finally {
      setIsLoading(false);
    }
  }, [getSystemIntegrationAgent]);

  // Initialisation: charger les intégrations existantes
  useEffect(() => {
    void listIntegrations();
  }, [listIntegrations]);

  return {
    // État
    isLoading,
    error,
    integrations,
    
    // Actions
    registerIntegration,
    executeIntegration,
    listIntegrations,
    updateIntegration,
    deleteIntegration,
    testIntegration
  };
};
