import { agentRegistry } from '../core/registry';
import { AgentDomains } from '../core/types';
import type { AgentParameter, BaseAgent } from '../core/types';
import { createLogger } from '../../../utils/logger';

/**
 * Interface pour les options de partage d'écran
 */
interface ScreenShareOptions {
  audio?: boolean;
  video?: boolean;
  displaySurface?: 'browser' | 'window' | 'monitor';
  selfBrowserSurface?: 'include' | 'exclude';
  systemAudio?: 'include' | 'exclude';
}

/**
 * État de la session de partage d'écran
 */
interface ScreenShareState {
  isActive: boolean;
  stream: MediaStream | null;
  startTime: number | null;
  options: ScreenShareOptions | null;
  sessionId: string | null;
  error: string | null;
}

/**
 * ScreenShareAgent - Agent pour gérer le partage d'écran
 * 
 * Cet agent permet de:
 * - Démarrer une session de partage d'écran
 * - Arrêter une session de partage d'écran
 * - Vérifier l'état du partage d'écran
 * - Modifier les options de partage en cours de session
 */
export class ScreenShareAgent implements BaseAgent {
  name = 'ScreenShareAgent';
  description = 'Agent pour gérer le partage d\'écran';
  version = '1.0.0';
  domain = AgentDomains.INTEGRATION;
  capabilities = ['screen-sharing', 'window-sharing', 'monitor-sharing', 'audio-sharing'];

  private state: ScreenShareState = {
    isActive: false,
    stream: null,
    startTime: null,
    options: null,
    sessionId: null,
    error: null
  };
  private logger = createLogger('ScreenShareAgent');

  /**
   * Vérifie si l'agent peut traiter la requête
   * @param query Requête utilisateur
   * @returns Score de confiance entre 0 et 1
   */
  async canHandle(query: string): Promise<number> {
    const screenShareKeywords = [
      'partage d\'écran', 'partager écran', 'partage écran', 'screen share', 
      'partager mon écran', 'voir mon écran', 'afficher mon écran',
      'screen sharing', 'partage de fenêtre', 'partager fenêtre',
      'capturer écran', 'capture d\'écran'
    ];
    
    return this.calculateKeywordMatch(query, screenShareKeywords);
  }

  /**
   * Exécute une action de partage d'écran
   * @param params Paramètres de l'action
   * @returns Résultat de l'action
   */
  async execute(params: any): Promise<any> {
    const action = params.intent || params.action;
    const actionParams = params.parameters || params;

    try {
      switch (action) {
        case 'start_sharing':
        case 'startScreenShare':
          return await this.startScreenShare(actionParams);
        case 'stop_sharing':
        case 'stopScreenShare':
          return await this.stopScreenShare();
        case 'get_status':
        case 'getScreenShareState':
          return { success: true, output: this.getScreenShareState() };
        case 'update_options':
        case 'updateScreenShareOptions':
          return await this.updateScreenShareOptions(actionParams);
        case 'checkCapabilities':
          return this.checkCapabilities();
        default:
          throw new Error(`Action inconnue: ${action}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur lors de l'exécution de l'action de partage d'écran ${action}:`, error as any);
      
      this.state.error = errorMessage;
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Retourne les paramètres requis pour une tâche donnée
   * @param task Description de la tâche
   * @returns Liste des paramètres requis
   */
  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    if (task.includes('partage') && task.includes('écran') && 
       (task.includes('commencer') || task.includes('démarrer') || task.includes('lancer'))) {
      return [
        { name: 'action', type: 'string', required: true, description: 'Action (startScreenShare)' },
        { name: 'audio', type: 'boolean', description: 'Inclure l\'audio?', required: false },
        { name: 'displaySurface', type: 'string', description: 'Type de surface (browser, window, monitor)', required: false }
      ];
    }
    
    if (task.includes('partage') && task.includes('écran') && 
       (task.includes('arrêter') || task.includes('stopper') || task.includes('terminer'))) {
      return [
        { name: 'action', type: 'string', required: true, description: 'Action (stopScreenShare)' }
      ];
    }
    
    return [
      { name: 'action', type: 'string', description: 'Action de partage d\'écran à exécuter', required: true }
    ];
  }

  /**
   * Démarre une session de partage d'écran
   * @param options Options de partage d'écran
   * @returns État de la session
   */
  private async startScreenShare(options: ScreenShareOptions = {}): Promise<any> {
    // Vérifier si un partage est déjà actif
    if (this.state.isActive && this.state.stream) {
      return {
        success: false,
        error: 'Une session de partage d\'écran est déjà active',
        state: this.getScreenShareState()
      };
    }

    try {
      // Vérifier si l'API getDisplayMedia est disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('L\'API de partage d\'écran n\'est pas disponible dans ce navigateur');
      }

      // Configuration des options de partage d'écran
      const displayMediaOptions: any = {
        video: {
          cursor: "always",
          displaySurface: options.displaySurface || 'monitor'
        },
        audio: options.audio === true ? {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } : false,
        selfBrowserSurface: options.selfBrowserSurface || 'exclude',
        systemAudio: options.systemAudio || 'exclude'
      };

      // Demander à l'utilisateur de partager son écran
      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      
      // Mettre à jour l'état
      this.state = {
        isActive: true,
        stream: stream,
        startTime: Date.now(),
        options: options,
        sessionId: `share-${Date.now()}`,
        error: null
      };

      // Écouter l'événement de fin de partage (quand l'utilisateur arrête manuellement)
      const videoTracks = stream.getVideoTracks?.();
      if (videoTracks && videoTracks.length > 0) {
        videoTracks[0].addEventListener('ended', () => {
          this.logger.info('Utilisateur a arrêté le partage d\'écran');
          this.stopScreenShare();
        });
      }

      this.logger.info('Session de partage d\'écran démarrée avec succès');
      
      return {
        success: true,
        output: {
          message: 'Session de partage d\'écran démarrée avec succès',
          sessionId: this.state.sessionId,
          ...this.getScreenShareState()
        },
        streamId: this.state.sessionId
      };
    } catch (error) {
      // L'utilisateur a probablement annulé le partage d'écran ou une erreur est survenue
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Impossible de démarrer le partage d\'écran';
      
      this.logger.error('Erreur lors du démarrage du partage d\'écran:', error as any);
      
      this.state.error = errorMessage;
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Arrête la session de partage d'écran active
   * @returns Résultat de l'opération
   */
  private async stopScreenShare(): Promise<any> {
    if (!this.state.isActive || !this.state.stream) {
      return {
        success: false,
        error: 'Aucune session de partage d\'écran active',
      };
    }

    try {
      // Arrêter toutes les pistes du stream
      this.state.stream.getTracks().forEach(track => {
        track.stop();
      });

      // Calculer la durée de la session
      const duration = this.state.startTime ? Math.floor((Date.now() - this.state.startTime) / 1000) : 0;
      
      // Enregistrer les infos de la session terminée
      const sessionSummary = {
        sessionId: this.state.sessionId,
        duration: duration, // durée en secondes
        startTime: this.state.startTime,
        endTime: Date.now(),
        options: this.state.options
      };

      // Réinitialiser l'état
      this.state = {
        isActive: false,
        stream: null,
        startTime: null,
        options: null,
        sessionId: null,
        error: null
      };

      this.logger.info('Session de partage d\'écran arrêtée avec succès');
      
      return {
        success: true,
        message: 'Session de partage d\'écran arrêtée avec succès',
        sessionSummary
      };
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur lors de l\'arrêt du partage d\'écran';
      
      this.logger.error('Erreur lors de l\'arrêt du partage d\'écran:', error as any);
      
      // Même en cas d'erreur, on tente de réinitialiser l'état
      this.state = {
        isActive: false,
        stream: null,
        startTime: null,
        options: null,
        sessionId: null,
        error: errorMessage
      };
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Retourne l'état actuel de la session de partage d'écran
   * @returns État de la session
   */
  private getScreenShareState(): any {
    // Créer un objet d'état sans la référence stream qui n'est pas sérialisable
    const safeState = {
      isActive: this.state.isActive,
      startTime: this.state.startTime,
      options: this.state.options,
      sessionId: this.state.sessionId,
      error: this.state.error,
      duration: this.state.startTime ? Math.floor((Date.now() - this.state.startTime) / 1000) : 0,
      trackInfo: this.state.stream ? {
        videoTracks: this.state.stream.getVideoTracks?.()?.length ?? 0,
        audioTracks: this.state.stream.getAudioTracks?.()?.length ?? 0,
        videoEnabled: (this.state.stream.getVideoTracks?.()?.length ?? 0) > 0 ?
                     this.state.stream.getVideoTracks!()[0].enabled : false
      } : null
    };
    
    return safeState;
  }

  /**
   * Met à jour les options de la session de partage active
   * @param options Nouvelles options
   * @returns État mis à jour de la session
   */
  private async updateScreenShareOptions(options: Partial<ScreenShareOptions>): Promise<any> {
    if (!this.state.isActive || !this.state.stream) {
      return {
        success: false,
        error: 'Aucune session de partage d\'écran active'
      };
    }

    try {
      // Mettre à jour les options audio si spécifiées
      if (options.audio !== undefined) {
        const audioTracks = this.state.stream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = options.audio || false;
        });
      }

      // Mettre à jour les options
      this.state.options = { ...this.state.options, ...options };

      return {
        success: true,
        message: 'Options de partage d\'écran mises à jour avec succès',
        state: this.getScreenShareState()
      };
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur lors de la mise à jour des options';
      
      this.logger.error('Erreur lors de la mise à jour des options de partage d\'écran:', error as any);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Vérifie les capacités de partage d'écran du navigateur
   * @returns Informations sur les capacités disponibles
   */
  private checkCapabilities(): any {
    const supported = (navigator.mediaDevices && 'getSupportedConstraints' in navigator.mediaDevices)
      ? (navigator.mediaDevices.getSupportedConstraints() as Record<string, unknown>)
      : {};
    return {
      screenShareSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      browserName: this.getBrowserName(),
      constraints: {
        video: 'displaySurface' in supported,
        audio: 'systemAudio' in supported,
      }
    };
  }

  /**
   * Détermine le nom du navigateur
   * @returns Nom du navigateur
   */
  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.indexOf("Firefox") > -1) return "Firefox";
    else if (userAgent.indexOf("Chrome") > -1) return "Chrome";
    else if (userAgent.indexOf("Safari") > -1) return "Safari";
    else if (userAgent.indexOf("Edge") > -1) return "Edge";
    else if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident/") > -1) return "Internet Explorer";
    else return "Unknown";
  }

  /**
   * Calcule le score de correspondance entre une requête et des mots-clés
   * @param query Requête utilisateur
   * @param keywords Liste de mots-clés
   * @returns Score de correspondance (0-1)
   */
  private calculateKeywordMatch(query: string, keywords: string[]): number {
    const words = query.toLowerCase().split(' ');
    const matches = keywords.filter(kw => {
      // Gérer les mots-clés composés (ex: "partage d'écran")
      const kwParts = kw.toLowerCase().split(' ');
      if (kwParts.length === 1) {
        return words.some(w => w.includes(kw.toLowerCase()));
      } else {
        // Pour les expressions, vérifier si la requête contient toutes les parties
        return kwParts.every(part => words.some(w => w.includes(part)));
      }
    });
    
    return Math.min(matches.length / 2, 1); // Score normalisé entre 0 et 1
  }
}

// Enregistrer l'agent dans le registre global
const screenShareAgent = new ScreenShareAgent();
agentRegistry.register(screenShareAgent);

export default screenShareAgent;
