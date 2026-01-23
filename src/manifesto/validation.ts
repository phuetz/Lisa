/**
 * 🎯 MANIFESTE VIVANT - Validation System
 * Vérifie que Lisa satisfait les 5 piliers pour être considérée "Vivante"
 */

export interface ManifestoStatus {
  perceives: boolean;  // Perçoit & Explique
  reasons: boolean;    // Raisonne
  remembers: boolean;  // Se souvient & Oublie
  acts: boolean;       // Agit sûrement
  soothes: boolean;    // Apaise
  isAlive: boolean;    // Tous les piliers sont OK
  degradedMode?: DegradedModeConfig;
}

export interface DegradedModeConfig {
  readOnly: boolean;
  disableSensors: boolean;
  disableTools: boolean;
  enableChatOnly: boolean;
  message: string;
}

/**
 * 1. PERÇOIT & EXPLIQUE
 */
async function checkPerceives(): Promise<boolean> {
  try {
    // Vérifier le consentement pour les capteurs
    const hasConsent = localStorage.getItem('lisa:sensor:consent') === 'granted';
    if (!hasConsent) return false;

    // Vérifier que l'audit log existe et fonctionne
    const auditLog = localStorage.getItem('lisa:sensor:audit');
    if (!auditLog) return false;

    // Vérifier que Lisa peut expliquer ce qu'elle perçoit
    const canExplain = typeof window.lisaExplainPerception === 'function';
    
    return hasConsent && !!auditLog && canExplain;
  } catch {
    return false;
  }
}

/**
 * 2. RAISONNE
 */
async function checkReasons(): Promise<boolean> {
  try {
    // Vérifier que PlannerAgent existe
    const { agentRegistry } = await import('../features/agents/core/registry');
    const hasPlanner = agentRegistry.hasAgent('PlannerAgent');
    
    // Vérifier que CriticAgent existe
    const hasCritic = agentRegistry.hasAgent('CriticAgent');
    
    // Vérifier la capacité de révision
    const canRevise = localStorage.getItem('lisa:can:revise') === 'true';
    
    return hasPlanner && hasCritic && canRevise;
  } catch {
    return false;
  }
}

/**
 * 3. SE SOUVIENT & OUBLIE
 */
async function checkRemembers(): Promise<boolean> {
  try {
    // Vérifier la mémoire court-terme (contexte)
    const hasShortTermMemory = sessionStorage.getItem('lisa:context') !== null;
    
    // Vérifier la mémoire long-terme (IndexedDB)
    const hasLongTermMemory = 'indexedDB' in window;
    
    // Vérifier l'API Forget
    const hasForgetAPI = typeof window.lisaForget === 'function';
    
    return hasShortTermMemory || hasLongTermMemory && hasForgetAPI;
  } catch {
    return false;
  }
}

/**
 * 4. AGIT SÛREMENT
 */
async function checkActs(): Promise<boolean> {
  try {
    // Vérifier la validation des tools (JSON Schema)
    const hasToolValidation = localStorage.getItem('lisa:tools:validation') === 'enabled';
    
    // Vérifier l'audit log des tools
    const hasToolAudit = localStorage.getItem('lisa:tools:audit') !== null;
    
    // Vérifier la réversibilité
    const hasReversibility = localStorage.getItem('lisa:tools:reversible') === 'true';
    
    return hasToolValidation && hasToolAudit && hasReversibility;
  } catch {
    return false;
  }
}

/**
 * 5. APAISE
 */
async function checkSoothes(): Promise<boolean> {
  try {
    // Vérifier le tone guide
    const hasToneGuide = localStorage.getItem('lisa:tone:guide') !== null;
    
    // Vérifier la récupération d'erreur
    const hasErrorRecovery = localStorage.getItem('lisa:error:recovery') === 'enabled';
    
    // Vérifier la clarté des intentions
    const hasClearIntentions = localStorage.getItem('lisa:intentions:clear') === 'true';
    
    return hasToneGuide && hasErrorRecovery && hasClearIntentions;
  } catch {
    return false;
  }
}

/**
 * Validation principale - Lisa est-elle Vivante?
 */
export async function validateLisaIsAlive(): Promise<ManifestoStatus> {
  const checks = {
    perceives: await checkPerceives(),
    reasons: await checkReasons(),
    remembers: await checkRemembers(),
    acts: await checkActs(),
    soothes: await checkSoothes(),
  };

  const isAlive = Object.values(checks).every(check => check === true);

  if (!isAlive) {
    // Mode réduction - Lisa limite ses actions
    const failedPillars = Object.entries(checks)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    return {
      ...checks,
      isAlive: false,
      degradedMode: {
        readOnly: true,
        disableSensors: !checks.perceives,
        disableTools: !checks.acts,
        enableChatOnly: true,
        message: `⚠️ Lisa en mode réduction. Piliers défaillants: ${failedPillars.join(', ')}`
      }
    };
  }

  return {
    ...checks,
    isAlive: true
  };
}

/**
 * Active le mode dégradé
 */
export async function enableDegradedMode(config: DegradedModeConfig): Promise<void> {
  console.warn('⚠️ LISA MODE RÉDUCTION', config.message);
  
  // Désactiver les capteurs si nécessaire
  if (config.disableSensors) {
    if (window.lisaStopCamera) window.lisaStopCamera();
    if (window.lisaStopMicrophone) window.lisaStopMicrophone();
  }
  
  // Désactiver les tools si nécessaire
  if (config.disableTools) {
    localStorage.setItem('lisa:tools:enabled', 'false');
  }
  
  // Mode chat-only
  if (config.enableChatOnly) {
    localStorage.setItem('lisa:mode', 'chat-only');
  }
  
  // Mode lecture seule
  if (config.readOnly) {
    localStorage.setItem('lisa:mode:readonly', 'true');
  }
  
  // Afficher un message à l'utilisateur
  if (window.lisaShowNotification) {
    window.lisaShowNotification({
      type: 'warning',
      title: 'Mode Réduction Activé',
      message: config.message
    });
  }
}

/**
 * Initialise la validation au démarrage
 */
export async function initManifestoValidation(): Promise<void> {
  console.log('🎯 Validation du Manifeste Vivant...');
  
  const status = await validateLisaIsAlive();
  
  if (status.isAlive) {
    console.log('✅ Lisa est VIVANTE!', status);
    localStorage.setItem('lisa:status', 'alive');
  } else {
    console.warn('⚠️ Lisa en mode réduction', status);
    localStorage.setItem('lisa:status', 'degraded');
    
    if (status.degradedMode) {
      await enableDegradedMode(status.degradedMode);
    }
  }
  
  // Sauvegarder le status pour le debug
  localStorage.setItem('lisa:manifesto:status', JSON.stringify(status));
  
  // Vérification périodique (toutes les 30 secondes)
  setInterval(async () => {
    const newStatus = await validateLisaIsAlive();
    const oldStatus = localStorage.getItem('lisa:status');
    
    if (newStatus.isAlive && oldStatus === 'degraded') {
      console.log('🎉 Lisa est revenue à la vie!');
      window.location.reload(); // Recharger pour sortir du mode dégradé
    } else if (!newStatus.isAlive && oldStatus === 'alive') {
      console.warn('⚠️ Lisa entre en mode réduction');
      if (newStatus.degradedMode) {
        await enableDegradedMode(newStatus.degradedMode);
      }
    }
  }, 30000);
}

// Types globaux pour TypeScript
declare global {
  interface Window {
    lisaExplainPerception?: () => string;
    lisaForget?: (scope: 'conversation' | 'document' | 'all') => Promise<void>;
    lisaStopCamera?: () => void;
    lisaStopMicrophone?: () => void;
    lisaShowNotification?: (notification: {
      type: 'info' | 'warning' | 'error' | 'success';
      title: string;
      message: string;
    }) => void;
  }
}
