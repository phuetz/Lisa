/**
 * 🔍 CriticAgent V2 - Validation Intelligente des Actions
 * Valide la sécurité, évalue les risques, vérifie la réversibilité
 */

import { auditActions } from '../../../services/AuditService';

export interface ActionProposal {
  id: string;
  type: 'tool' | 'workflow' | 'memory' | 'sensor' | 'system';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  timestamp: string;
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  factors: RiskFactor[];
  recommendation: 'approve' | 'review' | 'deny';
  reasoning: string;
}

export interface RiskFactor {
  category: 'security' | 'reversibility' | 'impact' | 'permission' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

export interface ValidationResult {
  approved: boolean;
  riskAssessment: RiskAssessment;
  requiresUserApproval: boolean;
  approvalReason?: string;
  conditions?: string[];
  timestamp: string;
}

class CriticAgentV2 {
  private validationHistory: ValidationResult[] = [];
  private maxHistory = 500;

  /**
   * Valider une action proposée
   */
  async validateAction(proposal: ActionProposal): Promise<ValidationResult> {
    const timestamp = new Date().toISOString();

    try {
      // 1. Évaluer les risques
      const riskAssessment = await this.assessRisks(proposal);

      // 2. Vérifier les permissions
      const hasPermission = await this.checkPermissions(proposal);

      // 3. Vérifier la réversibilité
      const isReversible = await this.checkReversibility(proposal);

      // 4. Déterminer l'approbation
      const requiresApproval = 
        riskAssessment.recommendation === 'review' ||
        riskAssessment.recommendation === 'deny' ||
        !hasPermission;

      const approved = 
        riskAssessment.recommendation === 'approve' &&
        hasPermission &&
        (isReversible || riskAssessment.riskLevel !== 'critical');

      // 5. Construire le résultat
      const result: ValidationResult = {
        approved,
        riskAssessment,
        requiresUserApproval: requiresApproval,
        approvalReason: this.getApprovalReason(riskAssessment, hasPermission, isReversible),
        conditions: this.getConditions(proposal, riskAssessment),
        timestamp
      };

      // 6. Enregistrer dans l'historique
      this.recordValidation(result);

      // 7. Logger l'action
      if (approved) {
        auditActions.toolExecuted(proposal.name, {
          ...proposal,
          validation: result
        });
      } else {
        auditActions.toolBlocked(proposal.name, result.approvalReason || 'Validation failed');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      auditActions.errorOccurred(`CriticAgent validation error: ${proposal.name}`, {
        error: errorMsg,
        proposal
      });

      return {
        approved: false,
        riskAssessment: {
          riskLevel: 'critical',
          score: 100,
          factors: [{
            category: 'security',
            severity: 'critical',
            description: `Validation error: ${errorMsg}`
          }],
          recommendation: 'deny',
          reasoning: 'Erreur lors de la validation'
        },
        requiresUserApproval: true,
        approvalReason: `Erreur de validation: ${errorMsg}`,
        timestamp
      };
    }
  }

  /**
   * Évaluer les risques d'une action
   */
  private async assessRisks(proposal: ActionProposal): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];
    let score = 0;

    // Risques de sécurité
    const securityRisks = this.assessSecurityRisks(proposal);
    factors.push(...securityRisks.factors);
    score += securityRisks.score;

    // Risques de réversibilité
    const reversibilityRisks = this.assessReversibilityRisks(proposal);
    factors.push(...reversibilityRisks.factors);
    score += reversibilityRisks.score;

    // Risques d'impact
    const impactRisks = this.assessImpactRisks(proposal);
    factors.push(...impactRisks.factors);
    score += impactRisks.score;

    // Normaliser le score
    score = Math.min(100, Math.round(score / Math.max(1, factors.length)));

    // Déterminer le niveau de risque
    const riskLevel = this.getRiskLevel(score);
    const recommendation = this.getRecommendation(riskLevel, factors);

    return {
      riskLevel,
      score,
      factors,
      recommendation,
      reasoning: this.generateReasoning(riskLevel, factors)
    };
  }

  /**
   * Évaluer les risques de sécurité
   */
  private assessSecurityRisks(proposal: ActionProposal) {
    const factors: RiskFactor[] = [];
    let score = 0;

    // Vérifier les paramètres dangereux
    const dangerousParams = ['delete', 'drop', 'truncate', 'exec', 'eval', 'shell'];
    const hasRiskyParams = dangerousParams.some(param =>
      JSON.stringify(proposal.parameters).toLowerCase().includes(param)
    );

    if (hasRiskyParams) {
      factors.push({
        category: 'security',
        severity: 'high',
        description: 'Paramètres potentiellement dangereux détectés',
        mitigation: 'Vérifier les paramètres avant exécution'
      });
      score += 30;
    }

    // Vérifier les accès système
    if (proposal.type === 'system') {
      factors.push({
        category: 'security',
        severity: 'medium',
        description: 'Accès système détecté',
        mitigation: 'Vérifier les permissions système'
      });
      score += 20;
    }

    return { factors, score };
  }

  /**
   * Évaluer les risques de réversibilité
   */
  private assessReversibilityRisks(proposal: ActionProposal) {
    const factors: RiskFactor[] = [];
    let score = 0;

    // Actions irréversibles
    const irreversibleActions = ['delete', 'drop', 'clear', 'reset', 'truncate'];
    const isIrreversible = irreversibleActions.some(action =>
      proposal.name.toLowerCase().includes(action)
    );

    if (isIrreversible) {
      factors.push({
        category: 'reversibility',
        severity: 'high',
        description: 'Action potentiellement irréversible',
        mitigation: 'Créer une sauvegarde avant exécution'
      });
      score += 40;
    }

    return { factors, score };
  }

  /**
   * Évaluer les risques d'impact
   */
  private assessImpactRisks(proposal: ActionProposal) {
    const factors: RiskFactor[] = [];
    let score = 0;

    // Vérifier l'impact sur les données
    if (proposal.type === 'memory' || proposal.type === 'workflow') {
      factors.push({
        category: 'impact',
        severity: 'medium',
        description: 'Impact potentiel sur les données',
        mitigation: 'Vérifier les données affectées'
      });
      score += 15;
    }

    // Vérifier l'impact sur les ressources
    if (proposal.type === 'sensor' || proposal.type === 'system') {
      factors.push({
        category: 'resource',
        severity: 'low',
        description: 'Utilisation de ressources système',
        mitigation: 'Monitorer l\'utilisation des ressources'
      });
      score += 10;
    }

    return { factors, score };
  }

  /**
   * Vérifier les permissions
   */
  private async checkPermissions(proposal: ActionProposal): Promise<boolean> {
    // Vérifier les permissions dans localStorage
    const permissions = localStorage.getItem('lisa:sensor:permissions');
    if (!permissions) return true; // Pas de restrictions

    try {
      const perms = JSON.parse(permissions);

      // Vérifier selon le type d'action
      if (proposal.type === 'sensor') {
        const sensorName = proposal.name.toLowerCase();
        if (sensorName.includes('camera')) return perms.camera?.granted ?? false;
        if (sensorName.includes('microphone')) return perms.microphone?.granted ?? false;
        if (sensorName.includes('geolocation')) return perms.geolocation?.granted ?? false;
      }

      return true;
    } catch (e) {
      console.error('Erreur vérification permissions:', e);
      return false;
    }
  }

  /**
   * Vérifier la réversibilité
   */
  private async checkReversibility(proposal: ActionProposal): Promise<boolean> {
    // Actions réversibles
    const reversibleActions = ['create', 'update', 'read', 'list', 'search', 'analyze'];
    return reversibleActions.some(action =>
      proposal.name.toLowerCase().includes(action)
    );
  }

  /**
   * Déterminer le niveau de risque
   */
  private getRiskLevel(score: number): RiskAssessment['riskLevel'] {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Obtenir la recommandation
   */
  private getRecommendation(
    riskLevel: RiskAssessment['riskLevel'],
    factors: RiskFactor[]
  ): RiskAssessment['recommendation'] {
    if (riskLevel === 'critical') return 'deny';
    if (riskLevel === 'high') {
      const hasMitigation = factors.some(f => f.mitigation);
      return hasMitigation ? 'review' : 'deny';
    }
    if (riskLevel === 'medium') return 'review';
    return 'approve';
  }

  /**
   * Générer le raisonnement
   */
  private generateReasoning(riskLevel: RiskAssessment['riskLevel'], factors: RiskFactor[]): string {
    const factorDescriptions = factors.map(f => f.description).join(', ');
    return `Niveau de risque ${riskLevel}: ${factorDescriptions}`;
  }

  /**
   * Obtenir la raison d'approbation/rejet
   */
  private getApprovalReason(
    riskAssessment: RiskAssessment,
    hasPermission: boolean,
    isReversible: boolean
  ): string {
    if (!hasPermission) return 'Permission refusée';
    if (riskAssessment.recommendation === 'deny') return `Risque trop élevé (${riskAssessment.riskLevel})`;
    if (riskAssessment.recommendation === 'review') return `Révision nécessaire (${riskAssessment.riskLevel})`;
    if (!isReversible && riskAssessment.riskLevel === 'critical') return 'Action irréversible et critique';
    return 'Approbation accordée';
  }

  /**
   * Obtenir les conditions d'exécution
   */
  private getConditions(proposal: ActionProposal, riskAssessment: RiskAssessment): string[] {
    const conditions: string[] = [];

    // Conditions de sécurité
    if (riskAssessment.riskLevel === 'high' || riskAssessment.riskLevel === 'critical') {
      conditions.push('Approbation utilisateur requise');
    }

    // Conditions de réversibilité
    const irreversibleActions = ['delete', 'drop', 'clear', 'reset', 'truncate'];
    if (irreversibleActions.some(action => proposal.name.toLowerCase().includes(action))) {
      conditions.push('Sauvegarde créée avant exécution');
      conditions.push('Confirmation utilisateur requise');
    }

    // Conditions d'audit
    conditions.push('Action enregistrée dans l\'audit log');

    return conditions;
  }

  /**
   * Enregistrer la validation
   */
  private recordValidation(result: ValidationResult): void {
    this.validationHistory.push(result);
    if (this.validationHistory.length > this.maxHistory) {
      this.validationHistory.shift();
    }
    localStorage.setItem('lisa:critic:history', JSON.stringify(this.validationHistory));
  }

  /**
   * Obtenir l'historique des validations
   */
  getValidationHistory(limit: number = 50): ValidationResult[] {
    return this.validationHistory.slice(-limit).reverse();
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    const approved = this.validationHistory.filter(v => v.approved).length;
    const rejected = this.validationHistory.filter(v => !v.approved).length;
    const avgRiskScore = Math.round(
      this.validationHistory.reduce((sum, v) => sum + v.riskAssessment.score, 0) /
      Math.max(1, this.validationHistory.length)
    );

    return {
      totalValidations: this.validationHistory.length,
      approved,
      rejected,
      approvalRate: Math.round((approved / Math.max(1, this.validationHistory.length)) * 100),
      averageRiskScore: avgRiskScore
    };
  }
}

// Exporter une instance singleton
export const criticAgentV2 = new CriticAgentV2();
