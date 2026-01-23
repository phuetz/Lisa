/**
 * 🌟 Initialize Lisa Vivante
 * Point d'entrée pour l'incarnation de Lisa
 */

import { initManifestoValidation } from './validation';
import { initToneGuide } from '../prompts/toneGuide';
import { auditService, auditActions } from '../services/AuditService';

/**
 * Configuration d'initialisation
 */
export interface LisaConfig {
  enableSensors: boolean;
  enableAudit: boolean;
  enableMemory: boolean;
  debugMode: boolean;
  autoValidate: boolean;
  validationInterval: number; // ms
}

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG: LisaConfig = {
  enableSensors: true,
  enableAudit: true,
  enableMemory: true,
  debugMode: process.env.NODE_ENV === 'development',
  autoValidate: true,
  validationInterval: 30000 // 30 secondes
};

/**
 * État global de Lisa
 */
export interface LisaState {
  initialized: boolean;
  config: LisaConfig;
  startTime: Date;
  sessionId: string;
}

let lisaState: LisaState | null = null;

/**
 * Initialiser Lisa Vivante
 */
export async function initLisaVivante(customConfig: Partial<LisaConfig> = {}): Promise<LisaState> {
  console.log('🌟 Initialisation de Lisa Vivante...');

  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const sessionId = auditService.getSessionId();

  try {
    // 1. Initialiser le Tone Guide
    console.log('💖 Initialisation du Tone Guide...');
    initToneGuide();
    auditActions.memoryCreated('tone_guide', 'Tone guide initialized');

    // 2. Initialiser la Validation du Manifeste
    console.log('🎯 Initialisation de la Validation du Manifeste...');
    await initManifestoValidation();
    auditActions.securityEvent('Manifesto validation initialized', { sessionId });

    // 3. Initialiser les Capteurs (si activés)
    if (config.enableSensors) {
      console.log('👁️ Initialisation des Capteurs...');
      initSensors();
      auditActions.sensorActivated('initialization');
    }

    // 4. Initialiser la Mémoire (si activée)
    if (config.enableMemory) {
      console.log('💭 Initialisation de la Mémoire...');
      initMemory();
      auditActions.memoryCreated('memory_service', 'Memory service initialized');
    }

    // 5. Initialiser l'Audit (si activé)
    if (config.enableAudit) {
      console.log('📋 Initialisation de l\'Audit...');
      auditActions.securityEvent('Audit service initialized', {
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

    // 6. Validation automatique (si activée)
    if (config.autoValidate) {
      console.log('🔄 Activation de la Validation Automatique...');
      setupAutoValidation(config.validationInterval);
    }

    // État d'initialisation
    lisaState = {
      initialized: true,
      config,
      startTime: new Date(),
      sessionId
    };

    // Sauvegarder l'état
    localStorage.setItem('lisa:state', JSON.stringify(lisaState));

    console.log('✨ Lisa Vivante initialisée avec succès!');
    console.log('🎯 Configuration:', config);
    console.log('📊 Session ID:', sessionId);

    // Notification
    if (window.lisaShowNotification) {
      window.lisaShowNotification({
        type: 'success',
        title: 'Lisa Vivante Initialisée',
        message: 'Tous les systèmes sont opérationnels'
      });
    }

    return lisaState;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Lisa:', error);
    auditActions.errorOccurred('Lisa initialization failed', {
      error: error instanceof Error ? error.message : String(error),
      sessionId
    });

    if (window.lisaShowNotification) {
      window.lisaShowNotification({
        type: 'error',
        title: 'Erreur d\'Initialisation',
        message: 'Lisa n\'a pas pu être initialisée correctement'
      });
    }

    throw error;
  }
}

/**
 * Initialiser les Capteurs
 */
function initSensors(): void {
  // Initialiser les permissions par défaut
  const defaultPermissions = {
    camera: { granted: false, scope: 'session' as const, activationCount: 0 },
    microphone: { granted: false, scope: 'session' as const, activationCount: 0 },
    geolocation: { granted: false, scope: 'session' as const }
  };

  const existing = localStorage.getItem('lisa:sensor:permissions');
  if (!existing) {
    localStorage.setItem('lisa:sensor:permissions', JSON.stringify(defaultPermissions));
  }

  // Initialiser l'audit log
  if (!localStorage.getItem('lisa:sensor:audit')) {
    localStorage.setItem('lisa:sensor:audit', JSON.stringify([]));
  }
}

/**
 * Initialiser la Mémoire
 */
function initMemory(): void {
  // Initialiser les structures de mémoire
  if (!localStorage.getItem('lisa:memory:index')) {
    localStorage.setItem('lisa:memory:index', JSON.stringify([]));
  }

  // Initialiser les embeddings (si disponible)
  if (!localStorage.getItem('lisa:memory:embeddings')) {
    localStorage.setItem('lisa:memory:embeddings', JSON.stringify({}));
  }
}

/**
 * Configurer la Validation Automatique
 */
function setupAutoValidation(interval: number): void {
  setInterval(async () => {
    const { validateLisaIsAlive } = await import('./validation');
    const status = await validateLisaIsAlive();

    if (status.isAlive) {
      // Lisa est vivante - tout va bien
      localStorage.setItem('lisa:last_validation', new Date().toISOString());
    } else {
      // Lisa est en mode réduction
      console.warn('⚠️ Lisa en mode réduction:', status.degradedMode?.message);
      auditActions.securityEvent('Lisa entered degraded mode', {
        degradedMode: status.degradedMode
      });
    }
  }, interval);
}

/**
 * Obtenir l'état de Lisa
 */
export function getLisaState(): LisaState | null {
  if (!lisaState) {
    const saved = localStorage.getItem('lisa:state');
    if (saved) {
      try {
        lisaState = JSON.parse(saved);
      } catch (e) {
        console.error('Erreur parsing lisa state:', e);
      }
    }
  }
  return lisaState;
}

/**
 * Vérifier si Lisa est initialisée
 */
export function isLisaInitialized(): boolean {
  return getLisaState()?.initialized ?? false;
}

/**
 * Obtenir la configuration actuelle
 */
export function getLisaConfig(): LisaConfig {
  return getLisaState()?.config ?? DEFAULT_CONFIG;
}

/**
 * Réinitialiser Lisa
 */
export async function resetLisaVivante(): Promise<void> {
  console.log('🔄 Réinitialisation de Lisa Vivante...');

  // Nettoyer les données
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('lisa:')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
  lisaState = null;

  auditActions.securityEvent('Lisa Vivante reset', {
    timestamp: new Date().toISOString()
  });

  console.log('✅ Lisa Vivante réinitialisée');

  // Réinitialiser
  await initLisaVivante();
}

/**
 * Obtenir les statistiques de Lisa
 */
export function getLisaStats() {
  const state = getLisaState();
  if (!state) return null;

  const uptime = Date.now() - state.startTime.getTime();
  const auditStats = auditService.getStats();

  return {
    initialized: state.initialized,
    sessionId: state.sessionId,
    uptime,
    uptimeFormatted: formatUptime(uptime),
    startTime: state.startTime,
    audit: auditStats,
    config: state.config
  };
}

/**
 * Formater le temps d'activité
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}j ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Exporter les actions d'audit pour utilisation globale
export { auditService, auditActions };
