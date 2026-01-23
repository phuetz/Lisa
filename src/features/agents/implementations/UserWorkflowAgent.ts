/**
 * agents/UserWorkflowAgent.ts
 * 
 * Agent spécialisé pour la gestion des workflows définis par l'utilisateur.
 * Permet aux utilisateurs de créer, exécuter et gérer des workflows personnalisés
 * via des commandes en langage naturel.
 */

import type { BaseAgent, AgentDomain, AgentExecuteResult } from '../core/types';
import { AgentDomains } from '../core/types';
import { workflowEngine, type WorkflowTemplate } from '../../../utils/WorkflowEngine';
import { agentRegistry } from '../core/registry';
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowDefinition {
  name: string;
  description: string;
  trigger: string;
  steps: Array<{
    agent: string;
    command: string;
    args: Record<string, any>;
    description: string;
    dependencies?: number[];
  }>;
}

export interface UserWorkflowAction {
  intent: string;
  parameters?: Record<string, any>;
}

export class UserWorkflowAgent implements BaseAgent {
  id: string;
  name: string;
  description: string;
  version: string;
  domain: AgentDomain;
  capabilities: string[];
  userWorkflows: Map<string, WorkflowDefinition>;
  triggerMap: Map<string, string>; // Map trigger phrases to workflow IDs

  constructor() {
    this.id = 'user-workflow-agent';
    this.name = 'User Workflow Agent';
    this.description = 'Agent pour la gestion des workflows personnalisés définis par l\'utilisateur';
    this.version = '1.0.0';
    this.domain = AgentDomains.PRODUCTIVITY;
    this.capabilities = [
      'workflow-creation', 
      'workflow-execution', 
      'workflow-management'
    ];
    this.userWorkflows = new Map();
    this.triggerMap = new Map();

    // Charger les workflows existants depuis le stockage
    this.loadUserWorkflows();
  }

  /**
   * Exécute une action demandée en fonction de l'intention
   */
  async execute(props: UserWorkflowAction): Promise<AgentExecuteResult> {
    const { intent, parameters = {} } = props;

    try {
      switch (intent) {
        case 'create_workflow':
          return await this.createWorkflow(parameters as { definition: WorkflowDefinition });
        
        case 'execute_workflow':
          return await this.executeWorkflow(parameters as { workflowId: string, args?: Record<string, any> });

        case 'get_workflows':
          return await this.getWorkflows();

        case 'delete_workflow':
          return await this.deleteWorkflow(parameters as { workflowId: string });

        case 'update_workflow':
          return await this.updateWorkflow(parameters as { workflowId: string, updates: Partial<WorkflowDefinition> });

        case 'parse_natural_language_workflow':
          return await this.parseNaturalLanguageWorkflow(parameters as { instruction: string });
          
        case 'check_trigger_match':
          return await this.checkTriggerMatch(parameters as { phrase: string });

        default:
          return {
            success: false,
            error: `Intent "${intent}" non pris en charge par l'UserWorkflowAgent`
          };
      }
    } catch (error) {
      console.error('Erreur dans UserWorkflowAgent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Crée un nouveau workflow défini par l'utilisateur
   */
  private async createWorkflow(params: {
    definition: WorkflowDefinition
  }): Promise<AgentExecuteResult> {
    try {
      const { definition } = params;
      
      // Valider la définition
      this.validateWorkflowDefinition(definition);
      
      // Créer un ID unique pour ce workflow
      const workflowId = uuidv4();
      
      // Enregistrer dans la map locale
      this.userWorkflows.set(workflowId, definition);
      
      // Mapper le déclencheur au workflow
      this.triggerMap.set(definition.trigger.toLowerCase(), workflowId);

      // Sauvegarder dans le stockage
      this.saveUserWorkflows();
      
      // Créer un template correspondant dans le WorkflowEngine
      const template = this.convertToTemplate(workflowId, definition);
      
      return {
        success: true,
        message: `Workflow "${definition.name}" créé avec succès`,
        output: {
          workflowId,
          definition,
          template
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Convertit une définition de workflow en template pour le WorkflowEngine
   */
  private convertToTemplate(workflowId: string, definition: WorkflowDefinition): WorkflowTemplate {
    const steps = definition.steps.map((step, index) => {
      return {
        id: index + 1,
        description: step.description,
        agent: step.agent,
        command: step.command,
        args: step.args || {},
        dependencies: step.dependencies || []
      };
    });

    const template: WorkflowTemplate = {
      id: workflowId,
      name: definition.name,
      description: definition.description,
      steps,
      tags: ['user-defined'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Enregistrer le template dans le WorkflowEngine
    workflowEngine.saveAsTemplate(workflowId, definition.name, definition.description, ['user-defined']);
    
    return template;
  }

  /**
   * Exécute un workflow existant
   */
  private async executeWorkflow(params: {
    workflowId: string,
    args?: Record<string, any>
  }): Promise<AgentExecuteResult> {
    try {
      const { workflowId, args = {} } = params;
      
      // Vérifier si le workflow existe
      if (!this.userWorkflows.has(workflowId)) {
        return {
          success: false,
          error: `Workflow avec ID ${workflowId} non trouvé`
        };
      }
      
      // Récupérer la définition
      const definition = this.userWorkflows.get(workflowId)!;
      
      // Créer un workflow à partir du template et l'exécuter
      const workflow = workflowEngine.createWorkflow({
        name: definition.name,
        description: definition.description,
        templateId: workflowId
      });
      
      // Mettre à jour les arguments avec ceux fournis
      workflow.steps.forEach(step => {
        if (args[step.id]) {
          step.args = { ...step.args, ...args[step.id] };
        }
      });
      
      // Exécuter le workflow
      const result = await workflowEngine.executeWorkflow(workflow.id);
      
      return {
        success: true,
        message: `Workflow "${definition.name}" exécuté avec succès`,
        output: { result }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Récupère la liste des workflows définis par l'utilisateur
   */
  private async getWorkflows(): Promise<IntentResult> {
    try {
      const workflows = Array.from(this.userWorkflows.entries()).map(([id, def]) => ({
        id,
        name: def.name,
        description: def.description,
        trigger: def.trigger,
        stepCount: def.steps.length
      }));
      
      return {
        success: true,
        output: { workflows }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Supprime un workflow existant
   */
  private async deleteWorkflow(params: { workflowId: string }): Promise<IntentResult> {
    try {
      const { workflowId } = params;
      
      if (!this.userWorkflows.has(workflowId)) {
        return {
          success: false,
          error: `Workflow avec ID ${workflowId} non trouvé`
        };
      }
      
      const definition = this.userWorkflows.get(workflowId)!;
      
      // Supprimer le mapping du trigger
      this.triggerMap.delete(definition.trigger.toLowerCase());
      
      // Supprimer le workflow
      this.userWorkflows.delete(workflowId);
      
      // Sauvegarder les changements
      this.saveUserWorkflows();
      
      return {
        success: true,
        message: `Workflow "${definition.name}" supprimé avec succès`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Met à jour un workflow existant
   */
  private async updateWorkflow(params: {
    workflowId: string,
    updates: Partial<WorkflowDefinition>
  }): Promise<AgentExecuteResult> {
    try {
      const { workflowId, updates } = params;
      
      if (!this.userWorkflows.has(workflowId)) {
        return {
          success: false,
          error: `Workflow avec ID ${workflowId} non trouvé`
        };
      }
      
      const definition = this.userWorkflows.get(workflowId)!;
      
      // Si le déclencheur change, mettre à jour le mapping
      if (updates.trigger && updates.trigger !== definition.trigger) {
        this.triggerMap.delete(definition.trigger.toLowerCase());
        this.triggerMap.set(updates.trigger.toLowerCase(), workflowId);
      }
      
      // Mettre à jour la définition
      const updatedDefinition: WorkflowDefinition = {
        ...definition,
        ...updates,
        steps: updates.steps || definition.steps
      };
      
      // Valider la définition mise à jour
      this.validateWorkflowDefinition(updatedDefinition);
      
      // Mettre à jour le workflow
      this.userWorkflows.set(workflowId, updatedDefinition);
      
      // Sauvegarder les changements
      this.saveUserWorkflows();
      
      // Mettre à jour le template dans WorkflowEngine
      this.convertToTemplate(workflowId, updatedDefinition);
      
      return {
        success: true,
        message: `Workflow "${updatedDefinition.name}" mis à jour avec succès`,
        output: { updatedDefinition }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Analyse une instruction en langage naturel pour créer un workflow
   */
  private async parseNaturalLanguageWorkflow(params: {
    instruction: string
  }): Promise<AgentExecuteResult> {
    try {
      const { instruction } = params;
      
      // Analyser l'instruction pour extraire:
      // 1. Le déclencheur (phrase qui activera le workflow)
      // 2. Les étapes à exécuter
      
      // Exemple: "Lisa, quand je dis 'commencer ma journée de travail', je veux que tu ouvres VS Code, lances mon serveur et joues ma playlist"
      
      // Cette fonction serait normalement implémentée avec un LLM pour interpréter le langage naturel
      // Simulation d'analyse simple (à remplacer par appel à un modèle LLM)
      const triggerMatch = instruction.match(/quand je dis ['"]([^'"]+)['"]/i);
      const trigger = triggerMatch ? triggerMatch[1] : '';
      
      if (!trigger) {
        return {
          success: false,
          error: "Impossible de déterminer la phrase déclencheur dans l'instruction"
        };
      }

      // Trouver les actions à effectuer (après "je veux que tu")
      const actionsMatch = instruction.match(/je veux que tu ([^.]+)/i);
      const actionsText = actionsMatch ? actionsMatch[1] : '';
      
      if (!actionsText) {
        return {
          success: false,
          error: "Impossible de déterminer les actions à effectuer dans l'instruction"
        };
      }
      
      // Diviser les actions (séparées par "et" ou des virgules)
      const actionsList = actionsText
        .split(/,|\set\s/)
        .map(a => a.trim())
        .filter(a => a.length > 0);
      
      // Créer un nom pour le workflow basé sur le trigger
      const name = `Workflow: ${trigger}`;
      
      // Simuler la génération de steps (dans une implémentation réelle, on utiliserait un LLM pour déterminer
      // quels agents et commandes utiliser pour chaque action)
      const steps = actionsList.map((action, index) => {
        // Version très simplifiée - dans une implémentation réelle,
        // on analyserait chaque action pour déterminer l'agent et la commande appropriés
        return {
          agent: 'PlannerAgent', // Par défaut, on utilise le PlannerAgent
          command: 'execute_plan',
          args: { instruction: action },
          description: `Exécuter: ${action}`,
          dependencies: index > 0 ? [index] : [] // Chaque étape dépend de la précédente
        };
      });
      
      // Créer une définition de workflow
      const definition: WorkflowDefinition = {
        name,
        description: `Workflow créé à partir de l'instruction: "${instruction}"`,
        trigger,
        steps
      };
      
      return {
        success: true,
        message: `Workflow analysé avec succès à partir de l'instruction`,
        output: { definition }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Vérifie si une phrase correspond à un déclencheur de workflow
   */
  private async checkTriggerMatch(params: { phrase: string }): Promise<IntentResult> {
    try {
      const { phrase } = params;
      const lowercasePhrase = phrase.toLowerCase();
      
      // Chercher une correspondance exacte
      if (this.triggerMap.has(lowercasePhrase)) {
        const workflowId = this.triggerMap.get(lowercasePhrase)!;
        const workflow = this.userWorkflows.get(workflowId)!;
        
        return {
          success: true,
          output: {
            matched: true,
            workflowId,
            workflow
          }
        };
      }
      
      // Chercher une correspondance partielle
      let bestMatch: { workflowId: string; workflow: WorkflowDefinition; score: number } | null = null;
      
      for (const [trigger, workflowId] of this.triggerMap.entries()) {
        // Calculer un score de similarité simple
        // (une implémentation plus avancée utiliserait des algorithmes comme Levenshtein)
        const words = trigger.split(' ');
        const phraseWords = lowercasePhrase.split(' ');
        
        let matchingWords = 0;
        for (const word of words) {
          if (phraseWords.includes(word)) {
            matchingWords++;
          }
        }
        
        const score = matchingWords / words.length;
        
        // Si le score est supérieur à un seuil et meilleur que le précédent
        if (score > 0.7 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = {
            workflowId,
            workflow: this.userWorkflows.get(workflowId)!,
            score
          };
        }
      }
      
      if (bestMatch) {
        return {
          success: true,
          output: {
            matched: true,
            partialMatch: true,
            confidence: bestMatch.score,
            workflowId: bestMatch.workflowId,
            workflow: bestMatch.workflow
          }
        };
      }
      
      return {
        success: true,
        output: {
          matched: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Valide la structure d'une définition de workflow
   */
  private validateWorkflowDefinition(definition: WorkflowDefinition): void {
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Le workflow doit avoir un nom');
    }
    
    if (!definition.trigger || definition.trigger.trim() === '') {
      throw new Error('Le workflow doit avoir une phrase déclencheur');
    }
    
    if (!definition.steps || definition.steps.length === 0) {
      throw new Error('Le workflow doit avoir au moins une étape');
    }
    
    // Vérifier que chaque étape a un agent et une commande
    definition.steps.forEach((step, index) => {
      if (!step.agent) {
        throw new Error(`L'étape ${index + 1} doit spécifier un agent`);
      }
      
      if (!step.command) {
        throw new Error(`L'étape ${index + 1} doit spécifier une commande`);
      }
      
      // Vérifier que les dépendances font référence à des étapes valides
      if (step.dependencies) {
        step.dependencies.forEach(depId => {
          if (depId < 1 || depId > definition.steps.length) {
            throw new Error(`L'étape ${index + 1} a une dépendance invalide: ${depId}`);
          }
        });
      }
    });
  }

  /**
   * Sauvegarde les workflows dans le stockage local
   */
  private saveUserWorkflows(): void {
    try {
      // Convertir la Map en objet pour le stockage
      const workflowsObj = Object.fromEntries(this.userWorkflows.entries());
      const triggerMapObj = Object.fromEntries(this.triggerMap.entries());
      
      localStorage.setItem('lisa_user_workflows', JSON.stringify(workflowsObj));
      localStorage.setItem('lisa_workflow_triggers', JSON.stringify(triggerMapObj));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des workflows utilisateur:', error);
    }
  }

  /**
   * Charge les workflows depuis le stockage local
   */
  private loadUserWorkflows(): void {
    try {
      const workflowsJson = localStorage.getItem('lisa_user_workflows');
      const triggersJson = localStorage.getItem('lisa_workflow_triggers');
      
      if (workflowsJson) {
        const workflowsObj = JSON.parse(workflowsJson);
        this.userWorkflows = new Map(Object.entries(workflowsObj));
      }
      
      if (triggersJson) {
        const triggerMapObj = JSON.parse(triggersJson);
        this.triggerMap = new Map(Object.entries(triggerMapObj));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des workflows utilisateur:', error);
    }
  }
}

// Enregistrer l'agent dans le registry
agentRegistry.register(new UserWorkflowAgent() as BaseAgent);
