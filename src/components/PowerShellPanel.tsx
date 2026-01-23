import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { agentRegistry } from '../features/agents/core/registry';
import { createLogger } from '../utils/logger';
import './PowerShellPanel.css';

const logger = createLogger('PowerShellPanel');

interface CommandHistory {
  id: string;
  command: string;
  output: string;
  status: 'success' | 'error' | 'running';
  timestamp: number;
}

interface CommandSuggestion {
  command: string;
  description: string;
}

const COMMON_COMMANDS: CommandSuggestion[] = [
  { command: 'Get-Process', description: 'Affiche la liste des processus en cours d\'exécution' },
  { command: 'Get-Service', description: 'Affiche la liste des services Windows' },
  { command: 'Get-ChildItem', description: 'Liste les fichiers et dossiers (équivalent à dir/ls)' },
  { command: 'Get-Content', description: 'Affiche le contenu d\'un fichier' },
  { command: 'Get-Date', description: 'Affiche la date et l\'heure actuelles' },
  { command: 'Get-ComputerInfo', description: 'Affiche les informations système' },
  { command: 'Get-NetIPAddress', description: 'Affiche la configuration réseau' },
  { command: 'Test-Connection', description: 'Teste une connexion réseau (ping)' },
  { command: 'Get-Help', description: 'Affiche l\'aide pour une commande' },
  { command: 'Clear-Host', description: 'Efface la console (cls)' },
];

const PowerShellPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<CommandSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLearningMode, setIsLearningMode] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { intent } = useAppStore();

  // Charger l'historique des commandes depuis le localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('powershell_history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(parsedHistory);
      } catch (error) {
        logger.error('Erreur lors du chargement de l\'historique', error);
      }
    }
  }, []);

  // Sauvegarder l'historique des commandes dans le localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('powershell_history', JSON.stringify(history));
    }
  }, [history]);

  // Détecter les intents liés à PowerShell
  useEffect(() => {
    if (intent && intent.toLowerCase().includes('powershell')) {
      setIsVisible(true);
    }
  }, [intent]);

  // Faire défiler vers le bas après chaque mise à jour
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history, error]);

  // Focus sur l'input quand le panel devient visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Filtrer les suggestions en fonction de la commande en cours
  useEffect(() => {
    if (command) {
      const filtered = COMMON_COMMANDS.filter(suggestion =>
        suggestion.command.toLowerCase().includes(command.toLowerCase())
      );
      setFilteredSuggestions(filtered.slice(0, 5)); // Limiter à 5 suggestions
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [command]);

  // Exécuter la commande PowerShell
  const executeCommand = async () => {
    if (!command.trim()) return;

    setIsExecuting(true);
    setError(null);

    const newHistoryItem: CommandHistory = {
      id: Date.now().toString(),
      command: command.trim(),
      output: '',
      status: 'running',
      timestamp: Date.now(),
    };

    // Ajouter la commande à l'historique avec statut 'running'
    setHistory(prev => [newHistoryItem, ...prev]);
    
    try {
      const powershellAgent = agentRegistry.getAgent('PowerShellAgent');
      if (!powershellAgent) {
        throw new Error('PowerShellAgent non trouvé');
      }

      // Exécution de la commande via l'agent
      const result = await powershellAgent.execute({
        action: 'executeCommand',
        command: command.trim(),
        learningMode: isLearningMode,
      });

      // Mise à jour de l'historique avec le résultat
      setHistory(prev => prev.map(item => 
        item.id === newHistoryItem.id 
          ? { 
              ...item, 
              output: result.output || 'Commande exécutée avec succès (pas de sortie)',
              status: result.error ? 'error' : 'success'
            } 
          : item
      ));
      
      if (result.error) {
        setError(`Erreur: ${result.error}`);
      }
    } catch (error) {
      logger.error('Erreur lors de l\'exécution de la commande', error);
      
      // Mise à jour de l'historique avec l'erreur
      setHistory(prev => prev.map(item => 
        item.id === newHistoryItem.id 
          ? { 
              ...item, 
              output: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
              status: 'error'
            } 
          : item
      ));
      
      setError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsExecuting(false);
      setCommand(''); // Effacer la commande après l'exécution
    }
  };

  // Gestionnaire de soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand();
  };

  // Utiliser une suggestion (helper non-hook)
  const applySuggestion = (suggestion: string) => {
    setCommand(suggestion);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Effacer l'historique
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('powershell_history');
  };

  // Formater la date pour l'affichage
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="powershell-panel">
      <div className="powershell-header">
        <h2>PowerShell Terminal</h2>
        <div className="powershell-controls">
          <label className="learning-mode-toggle">
            <input
              type="checkbox"
              checked={isLearningMode}
              onChange={() => setIsLearningMode(!isLearningMode)}
            />
            Mode apprentissage
          </label>
          <button 
            className="clear-history-button"
            onClick={clearHistory}
            title="Effacer l'historique"
          >
            Effacer l'historique
          </button>
          <button 
            className="close-button"
            onClick={() => setIsVisible(false)}
            title="Fermer le terminal"
          >
            ×
          </button>
        </div>
      </div>

      <div className="terminal-info">
        {isLearningMode ? (
          <div className="learning-mode-info">
            <span>ℹ️ Mode apprentissage activé:</span> Les commandes seront exécutées avec des explications détaillées.
          </div>
        ) : null}
      </div>

      <div className="terminal-container">
        <div className="terminal-output" ref={terminalRef}>
          {error && (
            <div className="terminal-error">{error}</div>
          )}
          
          {history.length === 0 ? (
            <div className="terminal-welcome">
              <p>Bienvenue dans le terminal PowerShell de Lisa.</p>
              <p>Tapez une commande pour commencer ou utilisez les suggestions.</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="command-entry">
                <div className="command-header">
                  <span className="command-prompt">PS&gt;</span>
                  <span className="command-text">{item.command}</span>
                  <span className="command-time">{formatDate(item.timestamp)}</span>
                </div>
                <div className={`command-output ${item.status}`}>
                  {item.status === 'running' ? (
                    <div className="loading-indicator">Exécution en cours...</div>
                  ) : item.output ? (
                    <pre>{item.output}</pre>
                  ) : (
                    <span className="no-output">Pas de sortie</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="command-form">
          <div className="command-input-container">
            <span className="input-prompt">PS&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Tapez une commande PowerShell..."
              disabled={isExecuting}
              className="command-input"
              autoComplete="off"
            />
          </div>
          
          {showSuggestions && (
            <div className="suggestions">
              {filteredSuggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className="suggestion-item"
                  onClick={() => applySuggestion(suggestion.command)}
                >
                  <div className="suggestion-command">{suggestion.command}</div>
                  <div className="suggestion-description">{suggestion.description}</div>
                </div>
              ))}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isExecuting || !command.trim()}
            className="execute-button"
          >
            {isExecuting ? "Exécution..." : "Exécuter"}
          </button>
        </form>
      </div>

      <div className="powershell-footer">
        <div className="security-notice">
          <span>🔒</span> Les commandes sont exécutées dans un environnement contrôlé avec des restrictions de sécurité.
        </div>
      </div>
    </div>
  );
};

export default PowerShellPanel;
