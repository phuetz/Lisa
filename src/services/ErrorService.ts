/**
 * 🚨 Error Service - Gestion centralisée des erreurs
 * Messages utilisateur clairs et actions de récupération
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface UserFriendlyError {
  id: string;
  title: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  action?: {
    label: string;
    handler: () => void;
  };
  details?: string;
  dismissed?: boolean;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  agentName?: string;
  userId?: string;
}

// Error code mappings to user-friendly messages
const ERROR_MESSAGES: Record<string, { title: string; message: string; severity: ErrorSeverity }> = {
  // Network errors
  NETWORK_ERROR: {
    title: 'Problème de connexion',
    message: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
    severity: 'error',
  },
  TIMEOUT: {
    title: 'Délai dépassé',
    message: 'La requête a pris trop de temps. Veuillez réessayer.',
    severity: 'warning',
  },
  
  // LM Studio errors
  LM_STUDIO_UNAVAILABLE: {
    title: 'LM Studio non disponible',
    message: 'Le serveur LM Studio n\'est pas accessible. Assurez-vous qu\'il est démarré sur le port 1234.',
    severity: 'error',
  },
  LM_STUDIO_MODEL_ERROR: {
    title: 'Erreur du modèle',
    message: 'Le modèle IA n\'a pas pu générer de réponse. Essayez de reformuler votre question.',
    severity: 'warning',
  },
  
  // Agent errors
  AGENT_NOT_FOUND: {
    title: 'Agent non trouvé',
    message: 'L\'agent demandé n\'existe pas ou n\'est pas chargé.',
    severity: 'error',
  },
  AGENT_EXECUTION_FAILED: {
    title: 'Échec de l\'exécution',
    message: 'L\'agent n\'a pas pu accomplir la tâche demandée.',
    severity: 'error',
  },
  
  // Vision errors
  CAMERA_ACCESS_DENIED: {
    title: 'Accès caméra refusé',
    message: 'Lisa a besoin d\'accéder à votre caméra pour cette fonctionnalité. Autorisez l\'accès dans les paramètres de votre navigateur.',
    severity: 'warning',
  },
  CAMERA_NOT_FOUND: {
    title: 'Caméra non détectée',
    message: 'Aucune caméra n\'a été trouvée sur cet appareil.',
    severity: 'error',
  },
  
  // Audio errors
  MICROPHONE_ACCESS_DENIED: {
    title: 'Accès microphone refusé',
    message: 'Lisa a besoin d\'accéder à votre microphone pour cette fonctionnalité. Autorisez l\'accès dans les paramètres de votre navigateur.',
    severity: 'warning',
  },
  SPEECH_RECOGNITION_ERROR: {
    title: 'Erreur de reconnaissance vocale',
    message: 'Impossible de comprendre ce que vous avez dit. Parlez plus clairement ou réessayez.',
    severity: 'info',
  },
  
  // Storage errors
  STORAGE_FULL: {
    title: 'Stockage plein',
    message: 'L\'espace de stockage local est plein. Supprimez des données pour continuer.',
    severity: 'warning',
  },
  STORAGE_ERROR: {
    title: 'Erreur de stockage',
    message: 'Impossible de sauvegarder les données localement.',
    severity: 'error',
  },
  
  // Generic errors
  UNKNOWN_ERROR: {
    title: 'Erreur inattendue',
    message: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
    severity: 'error',
  },
  VALIDATION_ERROR: {
    title: 'Données invalides',
    message: 'Les données fournies ne sont pas valides.',
    severity: 'warning',
  },
};

class ErrorServiceImpl {
  private errors: UserFriendlyError[] = [];
  private maxErrors = 50;
  private listeners: Set<(errors: UserFriendlyError[]) => void> = new Set();

  /**
   * Créer une erreur utilisateur à partir d'un code
   */
  createError(
    code: string,
    context?: ErrorContext,
    customMessage?: string
  ): UserFriendlyError {
    const template = ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
    
    const error: UserFriendlyError = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: template.title,
      message: customMessage || template.message,
      severity: template.severity,
      timestamp: new Date(),
      details: context ? this.formatContext(context) : undefined,
    };

    this.addError(error);
    return error;
  }

  /**
   * Créer une erreur à partir d'une exception
   */
  fromException(
    error: Error | unknown,
    context?: ErrorContext
  ): UserFriendlyError {
    const code = this.detectErrorCode(error);
    const customMessage = error instanceof Error ? error.message : undefined;
    return this.createError(code, context, customMessage);
  }

  /**
   * Détecter le code d'erreur à partir d'une exception
   */
  private detectErrorCode(error: Error | unknown): string {
    if (!(error instanceof Error)) return 'UNKNOWN_ERROR';
    
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch') || name === 'typeerror') {
      return 'NETWORK_ERROR';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    }

    // LM Studio errors
    if (message.includes('lm studio') || message.includes('localhost:1234')) {
      return 'LM_STUDIO_UNAVAILABLE';
    }

    // Camera/Microphone errors
    if (message.includes('permission denied') || message.includes('notallowederror')) {
      if (message.includes('camera') || message.includes('video')) {
        return 'CAMERA_ACCESS_DENIED';
      }
      if (message.includes('microphone') || message.includes('audio')) {
        return 'MICROPHONE_ACCESS_DENIED';
      }
    }

    // Storage errors
    if (message.includes('quota') || message.includes('storage')) {
      return 'STORAGE_FULL';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Formater le contexte pour l'affichage
   */
  private formatContext(context: ErrorContext): string {
    const parts: string[] = [];
    if (context.component) parts.push(`Composant: ${context.component}`);
    if (context.action) parts.push(`Action: ${context.action}`);
    if (context.agentName) parts.push(`Agent: ${context.agentName}`);
    return parts.join(' | ');
  }

  /**
   * Ajouter une erreur
   */
  private addError(error: UserFriendlyError): void {
    this.errors.unshift(error);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }
    this.notifyListeners();
    
    // Log to console for debugging
    console.error(`[${error.severity.toUpperCase()}] ${error.title}: ${error.message}`, error.details);
  }

  /**
   * Obtenir toutes les erreurs non-dismissées
   */
  getActiveErrors(): UserFriendlyError[] {
    return this.errors.filter(e => !e.dismissed);
  }

  /**
   * Obtenir toutes les erreurs
   */
  getAllErrors(): UserFriendlyError[] {
    return [...this.errors];
  }

  /**
   * Dismisser une erreur
   */
  dismissError(id: string): void {
    const error = this.errors.find(e => e.id === id);
    if (error) {
      error.dismissed = true;
      this.notifyListeners();
    }
  }

  /**
   * Dismisser toutes les erreurs
   */
  dismissAll(): void {
    this.errors.forEach(e => e.dismissed = true);
    this.notifyListeners();
  }

  /**
   * Effacer toutes les erreurs
   */
  clearAll(): void {
    this.errors = [];
    this.notifyListeners();
  }

  /**
   * S'abonner aux changements
   */
  subscribe(callback: (errors: UserFriendlyError[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifier les listeners
   */
  private notifyListeners(): void {
    const activeErrors = this.getActiveErrors();
    this.listeners.forEach(callback => callback(activeErrors));
  }

  /**
   * Afficher un toast d'erreur (à intégrer avec un système de toast)
   */
  showToast(
    title: string,
    message: string,
    severity: ErrorSeverity = 'error'
  ): UserFriendlyError {
    const error: UserFriendlyError = {
      id: `toast_${Date.now()}`,
      title,
      message,
      severity,
      timestamp: new Date(),
    };
    this.addError(error);
    return error;
  }

  /**
   * Helper pour les erreurs de succès (notifications)
   */
  showSuccess(title: string, message: string): UserFriendlyError {
    return this.showToast(title, message, 'info');
  }
}

// Export singleton
export const errorService = new ErrorServiceImpl();

// Export error codes for use in other modules
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  LM_STUDIO_UNAVAILABLE: 'LM_STUDIO_UNAVAILABLE',
  LM_STUDIO_MODEL_ERROR: 'LM_STUDIO_MODEL_ERROR',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_EXECUTION_FAILED: 'AGENT_EXECUTION_FAILED',
  CAMERA_ACCESS_DENIED: 'CAMERA_ACCESS_DENIED',
  CAMERA_NOT_FOUND: 'CAMERA_NOT_FOUND',
  MICROPHONE_ACCESS_DENIED: 'MICROPHONE_ACCESS_DENIED',
  SPEECH_RECOGNITION_ERROR: 'SPEECH_RECOGNITION_ERROR',
  STORAGE_FULL: 'STORAGE_FULL',
  STORAGE_ERROR: 'STORAGE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;
