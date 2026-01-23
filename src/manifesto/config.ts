/**
 * ⚙️ Lisa Vivante Configuration
 * Configuration centralisée pour le Manifeste Vivant
 */

export const LISA_CONFIG = {
  // =========================================================================
  // PHASE 1 - PRÉSENCE
  // =========================================================================
  phase1: {
    permissions: {
      // Capteurs
      camera: {
        enabled: true,
        granularity: 'session' as const, // 'session' | 'project' | 'task'
        requiresConsent: true
      },
      microphone: {
        enabled: true,
        granularity: 'session' as const,
        requiresConsent: true
      },
      geolocation: {
        enabled: true,
        granularity: 'session' as const,
        requiresConsent: true
      }
    },
    audit: {
      enabled: true,
      maxLogs: 1000,
      categories: ['sensor', 'tool', 'memory', 'privacy', 'error', 'security'],
      severities: ['info', 'warning', 'error', 'critical']
    },
    privacy: {
      enabled: true,
      dataRetention: 90, // jours
      allowExport: true,
      allowDelete: true,
      gdprCompliant: true
    },
    accessibility: {
      wcagLevel: 'AA' as const,
      keyboardNav: true,
      ariaLabels: true,
      reducedMotion: true,
      highContrast: true,
      largeText: true
    }
  },

  // =========================================================================
  // PHASE 2 - AGENTIVITÉ
  // =========================================================================
  phase2: {
    critic: {
      enabled: true,
      maxHistory: 500,
      riskCategories: ['security', 'reversibility', 'impact', 'permission', 'resource'],
      requireApprovalThreshold: 60 // score 0-100
    },
    memory: {
      enabled: true,
      shortTermCapacity: 100,
      longTermCapacity: 1000,
      promotionThreshold: 50, // pertinence 0-100
      cleanupInterval: 86400000, // 24h en ms
      cleanupAge: 30 // jours
    },
    rag: {
      enabled: true,
      embeddingDimension: 384,
      maxEmbeddings: 10000,
      similarityThreshold: 0.5,
      contextLimit: 5 // souvenirs à retourner
    },
    forget: {
      enabled: true,
      maxHistory: 500,
      allowGranular: true,
      allowComplete: true,
      auditTrail: true
    }
  },

  // =========================================================================
  // PHASE 3 - AUTONOMIE
  // =========================================================================
  phase3: {
    workflows: {
      enabled: true,
      maxWorkflows: 1000,
      maxExecutions: 500,
      parallelSupport: true,
      defaultTimeout: 30000, // 30s en ms
      defaultRetries: 3
    },
    integrations: {
      enabled: true,
      supportedTypes: ['mqtt', 'ros', 'api', 'webhook', 'database'],
      maxIntegrations: 100,
      connectionTimeout: 5000, // 5s en ms
      messageTimeout: 10000, // 10s en ms
      maxEvents: 1000
    },
    supervision: {
      enabled: true,
      monitoringInterval: 5000, // 5s en ms
      alertThreshold: 0.8, // 80%
      logRetention: 7 // jours
    }
  },

  // =========================================================================
  // LES 5 PILIERS
  // =========================================================================
  pillars: {
    perceive: {
      name: 'PERÇOIT & EXPLIQUE',
      emoji: '👁️',
      status: 'active' as const,
      components: ['permissions', 'audit', 'sensors']
    },
    reason: {
      name: 'RAISONNE',
      emoji: '🧠',
      status: 'active' as const,
      components: ['critic', 'tone', 'emotions']
    },
    remember: {
      name: 'SE SOUVIENT & OUBLIE',
      emoji: '💭',
      status: 'active' as const,
      components: ['memory', 'rag', 'forget']
    },
    act: {
      name: 'AGIT SÛREMENT',
      emoji: '🛡️',
      status: 'active' as const,
      components: ['validation', 'audit', 'workflows']
    },
    soothe: {
      name: 'APAISE',
      emoji: '✨',
      status: 'active' as const,
      components: ['tone', 'accessibility', 'emotions']
    }
  },

  // =========================================================================
  // VALIDATION
  // =========================================================================
  validation: {
    enabled: true,
    interval: 30000, // 30s en ms
    checkAllPillars: true,
    degradedModeThreshold: 0.7, // 70% des piliers actifs
    criticalThreshold: 0.5 // 50% des piliers actifs
  },

  // =========================================================================
  // LOGGING & MONITORING
  // =========================================================================
  logging: {
    enabled: true,
    level: 'info' as const, // 'debug' | 'info' | 'warn' | 'error'
    console: true,
    storage: true,
    maxLogs: 10000
  },

  // =========================================================================
  // PERFORMANCE
  // =========================================================================
  performance: {
    enableCaching: true,
    cacheExpiry: 300000, // 5 min en ms
    batchSize: 100,
    debounceInterval: 1000 // 1s en ms
  }
};

/**
 * Obtenir la configuration pour une phase
 */
export function getPhaseConfig(phase: 1 | 2 | 3) {
  switch (phase) {
    case 1:
      return LISA_CONFIG.phase1;
    case 2:
      return LISA_CONFIG.phase2;
    case 3:
      return LISA_CONFIG.phase3;
    default:
      throw new Error(`Invalid phase: ${phase}`);
  }
}

/**
 * Obtenir la configuration d'un pilier
 */
export function getPillarConfig(pillarName: keyof typeof LISA_CONFIG.pillars) {
  return LISA_CONFIG.pillars[pillarName];
}

/**
 * Vérifier si une phase est activée
 */
export function isPhaseEnabled(phase: 1 | 2 | 3): boolean {
  const config = getPhaseConfig(phase);
  // Vérifier si au moins un composant est activé
  return Object.values(config).some(value => 
    typeof value === 'object' && value !== null && 'enabled' in value && value.enabled
  );
}

/**
 * Vérifier si un pilier est actif
 */
export function isPillarActive(pillarName: keyof typeof LISA_CONFIG.pillars): boolean {
  const pillar = getPillarConfig(pillarName);
  return pillar.status === 'active';
}

/**
 * Obtenir le statut global du Manifeste Vivant
 */
export function getManifestoStatus() {
  const pillars = Object.entries(LISA_CONFIG.pillars);
  const activePillars = pillars.filter(([_, pillar]) => pillar.status === 'active').length;
  const totalPillars = pillars.length;

  return {
    totalPillars,
    activePillars,
    percentage: Math.round((activePillars / totalPillars) * 100),
    isAlive: activePillars === totalPillars,
    isDegraded: activePillars >= Math.ceil(totalPillars * LISA_CONFIG.validation.degradedModeThreshold),
    isCritical: activePillars < Math.ceil(totalPillars * LISA_CONFIG.validation.criticalThreshold)
  };
}
