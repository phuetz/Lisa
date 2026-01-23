/**
 * 🛡️ CriticAgent - Gardien de la Sécurité
 * Valide toute action potentiellement dangereuse avant exécution
 */

import type { AgentExecuteProps, AgentExecuteResult, AgentDomains } from '../core/types';
import { BaseAgent } from '../core/BaseAgent';

export interface CriticValidation {
  approved: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  concerns: string[];
  recommendations: string[];
  requiresUserApproval: boolean;
}

export interface ToolCall {
  id: string;
  tool: string;
  parameters: Record<string, unknown>;
  sandbox: 'fs' | 'network' | 'safe';
  reversible: boolean;
}

export class CriticAgent extends BaseAgent {
  name = 'CriticAgent';
  description = 'Valide la sécurité et la pertinence des actions avant exécution';
  version = '1.0.0';
  domain = 'safety' as AgentDomains;
  capabilities = [
    'validate_tool_calls',
    'assess_risk',
    'check_reversibility',
    'verify_permissions',
    'suggest_alternatives'
  ];

  /**
   * Patterns d'actions dangereuses à surveiller
   */
  private dangerousPatterns = {
    filesystem: [
      /delete|remove|rm|unlink/i,
      /format|wipe|clean/i,
      /chmod|chown/i,
      /\/etc\//i,
      /system32/i,
      /registry/i
    ],
    network: [
      /password|pwd|secret|key|token/i,
      /credit.?card|cc|cvv/i,
      /ssn|social.?security/i,
      /localhost|127\.0\.0\.1/i,
      /admin|root|sudo/i
    ],
    commands: [
      /shutdown|reboot|restart/i,
      /kill|terminate/i,
      /fork.?bomb/i,
      /:(){ :|:& };:/  // Fork bomb pattern
    ]
  };

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, parameters } = props;

    try {
      switch (intent) {
        case 'validate_tool_call':
          return await this.validateToolCall(parameters.toolCall as ToolCall);
        
        case 'assess_risk':
          return await this.assessRisk(parameters);
        
        case 'check_reversibility':
          return await this.checkReversibility(parameters);
        
        default:
          return {
            success: false,
            output: `Intent non reconnu: ${intent}`,
            error: 'UNKNOWN_INTENT'
          };
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'CRITIC_ERROR'
      };
    }
  }

  /**
   * Valide un appel d'outil avant exécution
   */
  async validateToolCall(toolCall: ToolCall): Promise<AgentExecuteResult> {
    const validation: CriticValidation = {
      approved: true,
      riskLevel: 'low',
      concerns: [],
      recommendations: [],
      requiresUserApproval: false
    };

    // Vérifier les paramètres dangereux
    const paramStr = JSON.stringify(toolCall.parameters);
    
    // Vérifier les patterns filesystem dangereux
    if (toolCall.sandbox === 'fs') {
      for (const pattern of this.dangerousPatterns.filesystem) {
        if (pattern.test(paramStr) || pattern.test(toolCall.tool)) {
          validation.concerns.push(`⚠️ Opération filesystem potentiellement dangereuse détectée: ${pattern}`);
          validation.riskLevel = 'high';
          validation.requiresUserApproval = true;
        }
      }
    }

    // Vérifier les patterns network dangereux
    if (toolCall.sandbox === 'network') {
      for (const pattern of this.dangerousPatterns.network) {
        if (pattern.test(paramStr)) {
          validation.concerns.push(`🔒 Données sensibles détectées: ${pattern}`);
          validation.riskLevel = 'critical';
          validation.approved = false;
          validation.recommendations.push('Utiliser des variables d\'environnement pour les secrets');
        }
      }
    }

    // Vérifier les commandes dangereuses
    for (const pattern of this.dangerousPatterns.commands) {
      if (pattern.test(paramStr) || pattern.test(toolCall.tool)) {
        validation.concerns.push(`🚫 Commande système dangereuse détectée`);
        validation.riskLevel = 'critical';
        validation.approved = false;
      }
    }

    // Vérifier la réversibilité
    if (!toolCall.reversible && validation.riskLevel !== 'low') {
      validation.concerns.push('⚠️ Action non réversible');
      validation.requiresUserApproval = true;
    }

    // Ajouter des recommendations
    if (validation.riskLevel === 'high' || validation.riskLevel === 'critical') {
      validation.recommendations.push('Créer une sauvegarde avant l\'exécution');
      validation.recommendations.push('Tester dans un environnement sandbox d\'abord');
      validation.recommendations.push('Documenter l\'action dans le journal d\'audit');
    }

    // Logger la validation
    this.logValidation(toolCall, validation);

    return {
      success: true,
      output: validation,
      metadata: {
        toolCall,
        timestamp: new Date().toISOString(),
        validatedBy: this.name
      }
    };
  }

  /**
   * Évalue le niveau de risque d'une action
   */
  async assessRisk(parameters: Record<string, unknown>): Promise<AgentExecuteResult> {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // Facteurs de risque
    if (parameters.irreversible) {
      riskScore += 30;
      riskFactors.push('Action irréversible');
    }

    if (parameters.affectsMultipleResources) {
      riskScore += 20;
      riskFactors.push('Affecte plusieurs ressources');
    }

    if (parameters.requiresElevatedPermissions) {
      riskScore += 25;
      riskFactors.push('Nécessite des permissions élevées');
    }

    if (parameters.modifiesSystemFiles) {
      riskScore += 40;
      riskFactors.push('Modifie des fichiers système');
    }

    if (parameters.exposesSecrets) {
      riskScore += 50;
      riskFactors.push('Peut exposer des secrets');
    }

    // Déterminer le niveau de risque
    let riskLevel: CriticValidation['riskLevel'];
    if (riskScore >= 70) {
      riskLevel = 'critical';
    } else if (riskScore >= 50) {
      riskLevel = 'high';
    } else if (riskScore >= 30) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      success: true,
      output: {
        riskScore,
        riskLevel,
        riskFactors,
        recommendation: this.getRiskRecommendation(riskLevel)
      }
    };
  }

  /**
   * Vérifie si une action est réversible
   */
  async checkReversibility(parameters: Record<string, unknown>): Promise<AgentExecuteResult> {
    const { action, target: _target } = parameters;
    
    const reversibleActions = [
      'create', 'add', 'enable', 'start', 'open',
      'copy', 'backup', 'save', 'export'
    ];

    const irreversibleActions = [
      'delete', 'remove', 'destroy', 'wipe', 'format',
      'truncate', 'drop', 'purge', 'shred'
    ];

    let isReversible = false;
    let method = '';

    if (typeof action === 'string') {
      const actionLower = action.toLowerCase();
      
      if (reversibleActions.some(a => actionLower.includes(a))) {
        isReversible = true;
        method = 'Peut être annulé via l\'action inverse';
      } else if (irreversibleActions.some(a => actionLower.includes(a))) {
        isReversible = false;
        method = 'Action destructive non réversible';
      } else {
        // Indéterminé - nécessite une analyse plus approfondie
        isReversible = false;
        method = 'Réversibilité inconnue - prudence recommandée';
      }
    }

    // Si on a une sauvegarde, l'action devient réversible
    if (parameters.hasBackup) {
      isReversible = true;
      method = 'Restauration depuis sauvegarde possible';
    }

    return {
      success: true,
      output: {
        isReversible,
        method,
        requiresBackup: !isReversible,
        recommendation: isReversible 
          ? 'Action sûre, peut être annulée'
          : '⚠️ Créer une sauvegarde avant l\'exécution'
      }
    };
  }

  /**
   * Obtient une recommandation basée sur le niveau de risque
   */
  private getRiskRecommendation(riskLevel: CriticValidation['riskLevel']): string {
    switch (riskLevel) {
      case 'low':
        return '✅ Action sûre, peut être exécutée automatiquement';
      case 'medium':
        return '⚠️ Vérifier les paramètres avant exécution';
      case 'high':
        return '🔴 Demander confirmation utilisateur obligatoire';
      case 'critical':
        return '🚫 Action bloquée - nécessite une révision manuelle approfondie';
    }
  }

  /**
   * Enregistre la validation dans le journal d'audit
   */
  private logValidation(toolCall: ToolCall, validation: CriticValidation): void {
    const auditLog = JSON.parse(localStorage.getItem('lisa:critic:audit') || '[]');
    
    auditLog.push({
      timestamp: new Date().toISOString(),
      toolCall: {
        id: toolCall.id,
        tool: toolCall.tool,
        sandbox: toolCall.sandbox
      },
      validation: {
        approved: validation.approved,
        riskLevel: validation.riskLevel,
        concernsCount: validation.concerns.length,
        requiresUserApproval: validation.requiresUserApproval
      }
    });

    // Garder seulement les 100 dernières validations
    if (auditLog.length > 100) {
      auditLog.shift();
    }

    localStorage.setItem('lisa:critic:audit', JSON.stringify(auditLog));
    
    // Si l'action est critique, logger aussi dans la console
    if (validation.riskLevel === 'critical' || !validation.approved) {
      console.warn('🛡️ CRITIC AGENT - Validation:', {
        toolCall,
        validation
      });
    }
  }

  /**
   * Interface pour demander l'approbation utilisateur
   */
  async requestUserApproval(
    toolCall: ToolCall,
    validation: CriticValidation
  ): Promise<boolean> {
    // Cette méthode devrait être connectée à une UI de confirmation
    console.log('🔔 Approbation utilisateur requise:', {
      tool: toolCall.tool,
      riskLevel: validation.riskLevel,
      concerns: validation.concerns,
      recommendations: validation.recommendations
    });

    // Pour l'instant, simuler une confirmation via window.confirm
    const message = `
⚠️ Action à Risque ${validation.riskLevel.toUpperCase()}

Outil: ${toolCall.tool}
Réversible: ${toolCall.reversible ? 'Oui' : 'Non'}

Préoccupations:
${validation.concerns.join('\n')}

Recommandations:
${validation.recommendations.join('\n')}

Autoriser cette action?
    `.trim();

    return window.confirm(message);
  }
}

// Exporter une instance singleton
export const criticAgent = new CriticAgent();
