import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { agentRegistry } from '../features/agents/core/registry';
import { createLogger } from '../utils/logger';
import './ScreenSharePanel.css';

const logger = createLogger('ScreenSharePanel');

interface ShareSession {
  id: string;
  startTime: number;
  status: 'active' | 'ended';
  type: 'screen' | 'window' | 'tab';
  hasAudio: boolean;
  resolution?: string;
  endTime?: number;
}

const ScreenSharePanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareOptions, setShareOptions] = useState({
    audio: false,
    shareType: 'screen' as 'screen' | 'window' | 'tab',
  });
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [currentSession, setCurrentSession] = useState<ShareSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<ShareSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const { intent } = useAppStore();

  // Charger l'historique des sessions depuis le localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('screenshare_history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setSessionHistory(parsedHistory);
      } catch (error) {
        logger.error('Erreur lors du chargement de l\'historique des sessions', error);
      }
    }
  }, []);

  // Sauvegarder l'historique des sessions dans le localStorage
  useEffect(() => {
    if (sessionHistory.length > 0) {
      localStorage.setItem('screenshare_history', JSON.stringify(sessionHistory));
    }
  }, [sessionHistory]);

  // Détecter les intents liés au partage d'écran
  useEffect(() => {
    if (intent && 
       (intent.toLowerCase().includes('partage d\'écran') || 
        intent.toLowerCase().includes('partager mon écran') ||
        intent.toLowerCase().includes('screen share'))) {
      setIsVisible(true);
    }
  }, [intent]);

  // Configurer la vidéo quand le stream change
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  // Nettoyer la session de partage lors du démontage du composant
  useEffect(() => {
    return () => {
      stopSharing();
    };
  }, []);

  // Démarrer le partage d'écran
  const startSharing = async () => {
    setError(null);
    
    try {
      const screenShareAgent = agentRegistry.getAgent('ScreenShareAgent');
      if (!screenShareAgent) {
        throw new Error('ScreenShareAgent non trouvé');
      }

      const execResult = await screenShareAgent.execute({
        action: 'startScreenShare',
        options: {
          audio: shareOptions.audio,
          shareType: shareOptions.shareType
        }
      });

      const stream = (execResult as any)?.stream as MediaStream | undefined;
      if (stream) {
        setMediaStream(stream);
        setIsSharing(true);
        
        const newSession: ShareSession = {
          id: Date.now().toString(),
          startTime: Date.now(),
          status: 'active',
          type: shareOptions.shareType,
          hasAudio: shareOptions.audio,
          resolution: `${stream.getVideoTracks()[0].getSettings().width}x${stream.getVideoTracks()[0].getSettings().height}`
        };
        
        setCurrentSession(newSession);
        showNotification('Partage d\'écran démarré', 'success');
        
        // Configurer la détection de fin de partage
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          handleStreamEnded(newSession.id);
        });
      } else {
        throw new Error('Aucun flux média reçu');
      }
    } catch (error) {
      logger.error('Erreur lors du démarrage du partage d\'écran', error);
      setError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      showNotification(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error');
    }
  };

  // Arrêter le partage d'écran
  const stopSharing = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    
    if (currentSession) {
      handleStreamEnded(currentSession.id);
    }
    
    setIsSharing(false);
  };

  // Gérer la fin d'une session de partage
  const handleStreamEnded = (sessionId: string) => {
    if (currentSession && currentSession.id === sessionId) {
      const endedSession = {
        ...currentSession,
        status: 'ended' as const,
        endTime: Date.now()
      };
      
      setSessionHistory(prev => [endedSession, ...prev]);
      setCurrentSession(null);
      showNotification('Partage d\'écran terminé', 'info');
    }
  };

  // Afficher une notification
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Formater la durée
  const formatDuration = (startTime: number, endTime: number) => {
    const durationMs = endTime - startTime;
    const seconds = Math.floor(durationMs / 1000) % 60;
    const minutes = Math.floor(durationMs / (1000 * 60)) % 60;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;
  };

  // Formater la date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Effacer l'historique des sessions
  const clearHistory = () => {
    setSessionHistory([]);
    localStorage.removeItem('screenshare_history');
    showNotification('Historique effacé', 'success');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="screenshare-panel">
      <div className="screenshare-header">
        <h2>Partage d'écran</h2>
        <button 
          className="close-button" 
          onClick={() => setIsVisible(false)}
        >
          ×
        </button>
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="screenshare-content">
        <div className="screenshare-controls">
          <h3>{isSharing ? 'Session active' : 'Démarrer un partage d\'écran'}</h3>
          
          {!isSharing ? (
            <>
              <div className="option-group">
                <label>Type de partage:</label>
                <div className="radio-options">
                  <label>
                    <input
                      type="radio"
                      name="shareType"
                      checked={shareOptions.shareType === 'screen'}
                      onChange={() => setShareOptions(prev => ({...prev, shareType: 'screen'}))}
                    />
                    Écran complet
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="shareType"
                      checked={shareOptions.shareType === 'window'}
                      onChange={() => setShareOptions(prev => ({...prev, shareType: 'window'}))}
                    />
                    Fenêtre
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="shareType"
                      checked={shareOptions.shareType === 'tab'}
                      onChange={() => setShareOptions(prev => ({...prev, shareType: 'tab'}))}
                    />
                    Onglet
                  </label>
                </div>
              </div>
              
              <div className="option-group">
                <label>
                  <input
                    type="checkbox"
                    checked={shareOptions.audio}
                    onChange={() => setShareOptions(prev => ({...prev, audio: !prev.audio}))}
                  />
                  Partager l'audio
                </label>
              </div>
              
              <button 
                className="start-button"
                onClick={startSharing}
              >
                Démarrer le partage
              </button>
            </>
          ) : (
            <div className="active-session">
              <div className="session-info">
                <div><strong>Type:</strong> {currentSession?.type === 'screen' ? 'Écran complet' : currentSession?.type === 'window' ? 'Fenêtre' : 'Onglet'}</div>
                <div><strong>Audio:</strong> {currentSession?.hasAudio ? 'Activé' : 'Désactivé'}</div>
                <div><strong>Résolution:</strong> {currentSession?.resolution || 'Inconnue'}</div>
                <div><strong>Démarré:</strong> {currentSession ? formatDate(currentSession.startTime) : ''}</div>
              </div>
              
              <button 
                className="stop-button"
                onClick={stopSharing}
              >
                Arrêter le partage
              </button>
            </div>
          )}
        </div>

        <div className="preview-container">
          {isSharing ? (
            <video 
              ref={videoRef}
              autoPlay 
              muted
              className="video-preview"
            />
          ) : (
            <div className="preview-placeholder">
              <span>L'aperçu du partage s'affichera ici</span>
            </div>
          )}
        </div>
      </div>

      <div className="screenshare-history">
        <div className="history-header">
          <h3>Historique des sessions</h3>
          {sessionHistory.length > 0 && (
            <button 
              className="clear-history-button"
              onClick={clearHistory}
            >
              Effacer l'historique
            </button>
          )}
        </div>
        
        {sessionHistory.length > 0 ? (
          <div className="history-list">
            {sessionHistory.map(session => (
              <div key={session.id} className="history-item">
                <div className="history-info">
                  <div className="history-type">
                    {session.type === 'screen' ? '🖥️ Écran complet' : session.type === 'window' ? '🪟 Fenêtre' : '🔖 Onglet'}
                    {session.hasAudio && ' 🔊'}
                  </div>
                  <div className="history-time">
                    {formatDate(session.startTime)}
                    {session.endTime && ` (${formatDuration(session.startTime, session.endTime)})`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-history">Aucune session de partage dans l'historique</p>
        )}
      </div>

      <div className="screenshare-footer">
        <div className="privacy-notice">
          <span>🔒</span> Vos partages d'écran sont sécurisés et ne sont jamais enregistrés sur nos serveurs.
        </div>
      </div>
    </div>
  );
};

export default ScreenSharePanel;
