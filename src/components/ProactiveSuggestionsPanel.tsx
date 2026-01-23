/**
 * components/ProactiveSuggestionsPanel.tsx
 * Composant pour afficher les suggestions proactives
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useProactiveSuggestions } from '../hooks/useProactiveSuggestions';
import { useSilenceTriggers } from '../hooks/useSilenceTriggers';
import { useAppStore } from '../store/appStore';
import type { Suggestion } from '../agents/ProactiveSuggestionsAgent';
import './ProactiveSuggestions.css';

// Icônes pour les différentes catégories de suggestions
const CATEGORY_ICONS: Record<string, string> = {
  task: '✓',
  reminder: '⏰',
  info: 'ℹ️',
  action: '➡️',
};

const ProactiveSuggestionsPanel: React.FC = () => {
  const { suggestions, isLoading, dismissSuggestion, executeSuggestion, clearAllSuggestions, generateSuggestions } = useProactiveSuggestions();
  const conversationContext = useAppStore((state) => state.conversationContext);
  const [lastSuggestionTime, setLastSuggestionTime] = useState<number>(Date.now());
  const [silenceTriggered, setSilenceTriggered] = useState<boolean>(false);
  
  // Configuration du déclencheur de silence
  const SILENCE_THRESHOLD = 45000; // 45 secondes
  const SUGGESTION_COOLDOWN = 120000; // 2 minutes entre les suggestions proactives
  
  // Callback appelé quand un silence est détecté
  const handleSilenceDetected = useCallback(() => {
    const now = Date.now();
    // Vérifie si on a déjà déclenché une suggestion récemment
    if (now - lastSuggestionTime > SUGGESTION_COOLDOWN) {
      void generateSuggestions();
      setLastSuggestionTime(now);
      setSilenceTriggered(true);
      setTimeout(() => setSilenceTriggered(false), 5000); // Réinitialise l'indicateur après 5 secondes
    }
  }, [generateSuggestions, lastSuggestionTime]);
  
  // Initialisation du détecteur de silence
  const { isSilent } = useSilenceTriggers({
    silenceThreshold: SILENCE_THRESHOLD,
    onSilenceDetected: handleSilenceDetected
  });
  
  // Déclenche une génération de suggestions lorsque le contexte de conversation change
  useEffect(() => {
    if (conversationContext?.lastIntent) {
      void generateSuggestions();
      setLastSuggestionTime(Date.now());
    }
  }, [conversationContext?.lastIntent, generateSuggestions]);
  
  // Fonction pour gérer le clic sur une suggestion
  const handleSuggestionClick = async (suggestion: Suggestion) => {
    const result = await executeSuggestion(suggestion.id);
    
    if (result.success && result.intent) {
      // Émet une intention vers le gestionnaire principal
      useAppStore.setState({
        conversationContext: {
          ...conversationContext,
          lastIntent: result.intent,
          timestamp: Date.now(),
        }
      });
    }
  };
  
  // Fonction pour formater le timestamp d'une suggestion
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Si aucune suggestion n'est disponible ou en cours de chargement
  if (suggestions.length === 0) {
    return (
      <div className="panel suggestions-panel">
        <div className="panel-header">
          <h3>Suggestions</h3>
          <button 
            className="refresh-button"
            onClick={() => generateSuggestions()}
            disabled={isLoading}
          >
            {isLoading ? "..." : "⟳"}
          </button>
        </div>
        <div className="panel-content empty">
          {isLoading ? (
            <p>Génération de suggestions...</p>
          ) : (
            <p>Aucune suggestion disponible pour le moment.</p>
          )}
        </div>
      </div>
    );
  }
  
  // Affiche la liste des suggestions
  return (
    <div className="panel suggestions-panel">
      <div className="panel-header">
        <h3>
          Suggestions ({suggestions.filter(s => !s.dismissed).length})
          {isSilent && <span className="silence-indicator">🔇</span>}
          {silenceTriggered && <span className="triggered-indicator">💡</span>}
        </h3>
        <div className="header-actions">
          <button 
            className="refresh-button"
            onClick={() => generateSuggestions()}
            disabled={isLoading}
            title="Rafraîchir les suggestions"
          >
            {isLoading ? "..." : "⟳"}
          </button>
          <button 
            className="clear-button"
            onClick={() => clearAllSuggestions()}
            disabled={isLoading}
            title="Effacer toutes les suggestions"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="panel-content">
        <ul className="suggestions-list">
          {suggestions
            .filter(s => !s.dismissed)
            .map((suggestion) => (
              <li key={suggestion.id} className={`suggestion-item ${suggestion.category}`}>
                <div 
                  className="suggestion-content" 
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="suggestion-icon">
                    {suggestion.icon ? 
                      <span className="material-icons">{suggestion.icon}</span> : 
                      CATEGORY_ICONS[suggestion.category] || '•'
                    }
                  </div>
                  <div className="suggestion-text">
                    <h4>{suggestion.title}</h4>
                    <p>{suggestion.description}</p>
                    <span className="suggestion-timestamp">
                      {formatTimestamp(suggestion.timestamp)}
                    </span>
                  </div>
                  <button 
                    className="dismiss-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void dismissSuggestion(suggestion.id);
                    }}
                    title="Ignorer cette suggestion"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default ProactiveSuggestionsPanel;
