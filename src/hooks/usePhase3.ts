/**
 * 🚀 usePhase3 - Hook d'Intégration Phase 3
 * Combine Workflows et Intégrations
 */

import { useState, useCallback } from 'react';
import { workflowService, type WorkflowDefinition, type WorkflowExecution, type WorkflowStep } from '../services/WorkflowService';
import { integrationService, type IntegrationConfig, type IntegrationStatus } from '../services/IntegrationService';
import type { ValidationResult } from '../agents/CriticAgentV2';

export interface Phase3State {
  isExecutingWorkflow: boolean;
  isConnectingIntegration: boolean;
  isSendingMessage: boolean;
  lastExecution: WorkflowExecution | null;
  lastIntegrationEvent: string | null;
}

export function usePhase3() {
  const [state, setState] = useState<Phase3State>({
    isExecutingWorkflow: false,
    isConnectingIntegration: false,
    isSendingMessage: false,
    lastExecution: null,
    lastIntegrationEvent: null
  });

  /**
   * Créer un workflow
   */
  const createWorkflow = useCallback(
    (
      name: string,
      description: string,
      steps: WorkflowStep[],
      parallel?: boolean
    ): WorkflowDefinition => {
      return workflowService.createWorkflow(name, description, steps, parallel);
    },
    []
  );

  /**
   * Exécuter un workflow
   */
  const executeWorkflow = useCallback(
    async (
      workflowId: string,
      onApprovalRequired?: (result: ValidationResult) => Promise<boolean>
    ): Promise<WorkflowExecution | null> => {
      setState(prev => ({ ...prev, isExecutingWorkflow: true }));
      try {
        const execution = await workflowService.executeWorkflow(workflowId, onApprovalRequired);
        setState(prev => ({ ...prev, lastExecution: execution }));
        return execution;
      } finally {
        setState(prev => ({ ...prev, isExecutingWorkflow: false }));
      }
    },
    []
  );

  /**
   * Lister les workflows
   */
  const listWorkflows = useCallback(() => {
    return workflowService.listWorkflows();
  }, []);

  /**
   * Lister les exécutions
   */
  const listExecutions = useCallback((limit?: number) => {
    return workflowService.listExecutions(limit);
  }, []);

  /**
   * Enregistrer une intégration
   */
  const registerIntegration = useCallback((config: IntegrationConfig): void => {
    integrationService.registerIntegration(config);
  }, []);

  /**
   * Connecter une intégration
   */
  const connectIntegration = useCallback(
    async (integrationName: string): Promise<boolean> => {
      setState(prev => ({ ...prev, isConnectingIntegration: true }));
      try {
        const connected = await integrationService.connect(integrationName);
        if (connected) {
          setState(prev => ({ ...prev, lastIntegrationEvent: `Connected: ${integrationName}` }));
        }
        return connected;
      } finally {
        setState(prev => ({ ...prev, isConnectingIntegration: false }));
      }
    },
    []
  );

  /**
   * Déconnecter une intégration
   */
  const disconnectIntegration = useCallback(
    async (integrationName: string): Promise<boolean> => {
      const disconnected = await integrationService.disconnect(integrationName);
      if (disconnected) {
        setState(prev => ({ ...prev, lastIntegrationEvent: `Disconnected: ${integrationName}` }));
      }
      return disconnected;
    },
    []
  );

  /**
   * Envoyer un message via une intégration
   */
  const sendMessage = useCallback(
    async (integrationName: string, message: unknown): Promise<boolean> => {
      setState(prev => ({ ...prev, isSendingMessage: true }));
      try {
        const sent = await integrationService.sendMessage(integrationName, message);
        if (sent) {
          setState(prev => ({ ...prev, lastIntegrationEvent: `Message sent via ${integrationName}` }));
        }
        return sent;
      } finally {
        setState(prev => ({ ...prev, isSendingMessage: false }));
      }
    },
    []
  );

  /**
   * Lister les intégrations
   */
  const listIntegrations = useCallback(() => {
    return integrationService.listIntegrations();
  }, []);

  /**
   * Obtenir le statut d'une intégration
   */
  const getIntegrationStatus = useCallback((integrationName: string): IntegrationStatus | undefined => {
    return integrationService.getStatus(integrationName);
  }, []);

  /**
   * Obtenir les statistiques
   */
  const getStats = useCallback(() => {
    return {
      workflows: workflowService.getStats(),
      integrations: integrationService.getStats()
    };
  }, []);

  /**
   * Workflow complet: créer, valider et exécuter
   */
  const executeFullWorkflow = useCallback(
    async (
      name: string,
      description: string,
      steps: WorkflowStep[],
      parallel?: boolean,
      onApprovalRequired?: (result: ValidationResult) => Promise<boolean>
    ): Promise<WorkflowExecution | null> => {
      // 1. Créer le workflow
      const workflow = createWorkflow(name, description, steps, parallel);

      // 2. Exécuter le workflow
      const execution = await executeWorkflow(workflow.id, onApprovalRequired);

      return execution;
    },
    [createWorkflow, executeWorkflow]
  );

  /**
   * Workflow d'intégration: connecter, envoyer, déconnecter
   */
  const executeIntegrationWorkflow = useCallback(
    async (
      integrationName: string,
      message: unknown,
      autoDisconnect: boolean = true
    ): Promise<boolean> => {
      try {
        // 1. Connecter
        const connected = await connectIntegration(integrationName);
        if (!connected) return false;

        // 2. Envoyer le message
        const sent = await sendMessage(integrationName, message);

        // 3. Déconnecter si demandé
        if (autoDisconnect) {
          await disconnectIntegration(integrationName);
        }

        return sent;
      } catch (error) {
        console.error('Integration workflow error:', error);
        return false;
      }
    },
    [connectIntegration, sendMessage, disconnectIntegration]
  );

  return {
    // État
    state,

    // Workflows
    createWorkflow,
    executeWorkflow,
    listWorkflows,
    listExecutions,

    // Intégrations
    registerIntegration,
    connectIntegration,
    disconnectIntegration,
    sendMessage,
    listIntegrations,
    getIntegrationStatus,

    // Statistiques
    getStats,

    // Workflows complets
    executeFullWorkflow,
    executeIntegrationWorkflow
  };
}
