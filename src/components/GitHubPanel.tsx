import React, { useState, useEffect } from 'react';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { agentRegistry } from '../agents/registry';
import { createLogger } from '../utils/logger';
import GitHubCacheService from '../services/GitHubCacheService';
import './GitHubPanel.css';

const logger = createLogger('GitHubPanel');

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  isPrivate: boolean;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  state: string;
  url: string;
  createdAt: string;
  author: string;
  labels: string[];
}

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  url: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

type ViewType = 'repos' | 'issues' | 'pulls' | 'commits' | 'readme';

const GitHubPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [currentView, setCurrentView] = useState<ViewType>('repos');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [readme, setReadme] = useState<{ content: string | null, url: string | null }>({ content: null, url: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [useCache, setUseCache] = useState<boolean>(true);
  const [cacheStatus, setCacheStatus] = useState<{
    repositories: boolean;
    issues: boolean;
    pullRequests: boolean;
    commits: boolean;
    readme: boolean;
  }>({repositories: false, issues: false, pullRequests: false, commits: false, readme: false});

  const { lastIntent } = useVisionAudioStore();

  useEffect(() => {
    // Vérifier si l'intent concerne GitHub
    if (lastIntent && lastIntent.toLowerCase().includes('github')) {
      setIsVisible(true);
    }
  }, [lastIntent]);

  useEffect(() => {
    // Charger le token de l'API GitHub depuis localStorage s'il existe
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      setToken(savedToken);
    }

    // Charger d'autres préférences utilisateur
    const savedUsername = localStorage.getItem('github_username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
    
    // Charger la préférence de cache
    const savedCachePreference = localStorage.getItem('github_use_cache');
    if (savedCachePreference !== null) {
      setUseCache(savedCachePreference === 'true');
    }
  }, []);

  const handleSaveToken = () => {
    if (token) {
      localStorage.setItem('github_token', token);
      setNotification({ message: 'Token GitHub sauvegardé', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSaveUsername = () => {
    if (username) {
      localStorage.setItem('github_username', username);
      setNotification({ message: 'Nom d\'utilisateur sauvegardé', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      loadRepositories();
    }
  };

  /**
   * Gère le changement de préférence de cache
   */
  const handleCacheToggle = () => {
    const newCacheValue = !useCache;
    setUseCache(newCacheValue);
    localStorage.setItem('github_use_cache', String(newCacheValue));
    setNotification({ 
      message: newCacheValue ? 'Cache activé' : 'Cache désactivé', 
      type: 'info' 
    });
    setTimeout(() => setNotification(null), 3000);
  };
  
  /**
   * Efface le cache GitHub et rafraîche les données
   */
  const handleClearCache = async () => {
    setIsLoading(true);
    setNotification({ message: 'Effacement du cache en cours...', type: 'info' });
    
    try {
      const cacheService = GitHubCacheService.getInstance();
      await cacheService.clearAllCache();
      
      setNotification({ message: 'Cache effacé avec succès', type: 'success' });
      
      // Recharger les données actuelles selon la vue active
      if (currentView === 'repos') {
        await loadRepositories();
      } else if (currentView === 'issues') {
        await loadIssues();
      } else if (currentView === 'pulls') {
        await loadPullRequests();
      } else if (currentView === 'commits') {
        await loadCommits();
      } else if (currentView === 'readme') {
        await loadReadme();
      }
    } catch (error) {
      logger.error('Erreur lors de l\'effacement du cache', error);
      setError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const loadRepositories = async () => {
    if (!username) {
      setError('Veuillez spécifier un nom d\'utilisateur');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCacheStatus(prev => ({...prev, repositories: false}));

    try {
      const githubAgent = agentRegistry.getAgent('GitHubAgent');
      if (!githubAgent) {
        throw new Error('GitHubAgent non trouvé');
      }

      // Vérifier d'abord si les données sont dans le cache
      let cachedData = null;
      if (useCache) {
        const cacheService = GitHubCacheService.getInstance();
        cachedData = await cacheService.getRepositories(username);
        if (cachedData) {
          setCacheStatus(prev => ({...prev, repositories: true}));
        }
      }

      const result = await githubAgent.execute({
        action: 'listRepositories',
        token,
        username,
        useCache
      });

      setRepositories(result);
      setCurrentView('repos');
    } catch (error) {
      logger.error('Erreur lors du chargement des dépôts', error);
      setError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadIssues = async () => {
    if (!repoOwner || !repoName) {
      setError('Veuillez spécifier le propriétaire et le nom du dépôt');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCacheStatus(prev => ({...prev, issues: false}));

    try {
      const githubAgent = agentRegistry.getAgent('GitHubAgent');
      if (!githubAgent) {
        throw new Error('GitHubAgent non trouvé');
      }

      // Vérifier d'abord si les données sont dans le cache
      if (useCache) {
        const cacheService = GitHubCacheService.getInstance();
        const cachedData = await cacheService.getIssues(repoOwner, repoName, 'all');
        if (cachedData) {
          setCacheStatus(prev => ({...prev, issues: true}));
        }
      }

      const result = await githubAgent.execute({
        action: 'listIssues',
        token,
        owner: repoOwner,
        repo: repoName,
        state: 'all',
        useCache
      });

      setIssues(result);
      setCurrentView('issues');
    } catch (error) {
      logger.error('Erreur lors du chargement des issues', error);
      setError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPullRequests = async () => {
    if (!repoOwner || !repoName) {
      setError('Veuillez spécifier le propriétaire et le nom du dépôt');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCacheStatus(prev => ({...prev, pullRequests: false}));

    try {
      const githubAgent = agentRegistry.getAgent('GitHubAgent');
      if (!githubAgent) {
        throw new Error('GitHubAgent non trouvé');
      }
      
      // Vérifier d'abord si les données sont dans le cache
      if (useCache) {
        const cacheService = GitHubCacheService.getInstance();
        const cachedData = await cacheService.getPullRequests(repoOwner, repoName, 'all');
        if (cachedData) {
          setCacheStatus(prev => ({...prev, pullRequests: true}));
        }
      }

      const result = await githubAgent.execute({
        action: 'listPullRequests',
        token,
        owner: repoOwner,
        repo: repoName,
        state: 'all',
        useCache
      });

      setPullRequests(result);
      setCurrentView('pulls');
    } catch (error) {
      logger.error('Erreur lors du chargement des pull requests', error);
      setError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommits = async () => {
    if (!repoOwner || !repoName) {
      setError('Veuillez spécifier le propriétaire et le nom du dépôt');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCacheStatus(prev => ({...prev, commits: false}));

    try {
      const githubAgent = agentRegistry.getAgent('GitHubAgent');
      if (!githubAgent) {
        throw new Error('GitHubAgent non trouvé');
      }
      
      // Vérifier d'abord si les données sont dans le cache
      if (useCache) {
        const cacheService = GitHubCacheService.getInstance();
        const cachedData = await cacheService.getCommits(repoOwner, repoName);
        if (cachedData) {
          setCacheStatus(prev => ({...prev, commits: true}));
        }
      }

      const result = await githubAgent.execute({
        action: 'listCommits',
        token,
        owner: repoOwner,
        repo: repoName,
        useCache
      });

      setCommits(result);
      setCurrentView('commits');
    } catch (error) {
      logger.error('Erreur lors du chargement des commits', error);
      setError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReadme = async () => {
    if (!repoOwner || !repoName) {
      setError('Veuillez spécifier le propriétaire et le nom du dépôt');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCacheStatus(prev => ({...prev, readme: false}));

    try {
      const githubAgent = agentRegistry.getAgent('GitHubAgent');
      if (!githubAgent) {
        throw new Error('GitHubAgent non trouvé');
      }
      
      // Vérifier d'abord si les données sont dans le cache
      if (useCache) {
        const cacheService = GitHubCacheService.getInstance();
        const cachedData = await cacheService.getReadme(repoOwner, repoName);
        if (cachedData) {
          setCacheStatus(prev => ({...prev, readme: true}));
        }
      }

      const result = await githubAgent.execute({
        action: 'getReadme',
        token,
        owner: repoOwner,
        repo: repoName,
        useCache
      });

      setReadme({
        content: result.content,
        url: result.url
      });
      setCurrentView('readme');
    } catch (error) {
      logger.error('Erreur lors du chargement du README', error);
      setError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRepository = (owner: string, name: string) => {
    setRepoOwner(owner);
    setRepoName(name);
    // Chargement des issues par défaut après sélection d'un dépôt
    setCurrentView('issues');
    loadIssues();
  };

  const handleCreateIssue = async (title: string, body: string) => {
    if (!repoOwner || !repoName || !title || !body) {
      setError('Informations manquantes pour créer une issue');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const githubAgent = agentRegistry.getAgent('GitHubAgent');
      if (!githubAgent) {
        throw new Error('GitHubAgent non trouvé');
      }

      const result = await githubAgent.execute({
        action: 'createIssue',
        token,
        owner: repoOwner,
        repo: repoName,
        title,
        body
      });

      setNotification({ message: `Issue créée: #${result.number}`, type: 'success' });
      // Recharger les issues pour afficher la nouvelle
      loadIssues();
    } catch (error) {
      logger.error('Erreur lors de la création de l\'issue', error);
      setError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="github-panel">
      <h2>GitHub Explorer</h2>
      
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="auth-section">
        <div className="input-group">
          <input 
            type="password"
            placeholder="Token GitHub (optionnel)" 
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button onClick={handleSaveToken}>Sauvegarder Token</button>
        </div>
        <div className="input-group">
          <input 
            type="text"
            placeholder="Nom d'utilisateur GitHub" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleSaveUsername}>Sauvegarder</button>
        </div>
        <button className="load-button" onClick={loadRepositories}>
          Charger les dépôts
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {repoOwner && repoName && (
        <div className="repo-context">
          <h3>Dépôt sélectionné: {repoOwner}/{repoName}</h3>
          <div className="nav-buttons">
            <button 
              onClick={loadIssues}
              className={currentView === 'issues' ? 'active' : ''}
            >
              Issues
            </button>
            <button 
              onClick={loadPullRequests}
              className={currentView === 'pulls' ? 'active' : ''}
            >
              Pull Requests
            </button>
            <button 
              onClick={loadCommits}
              className={currentView === 'commits' ? 'active' : ''}
            >
              Commits
            </button>
            <button 
              onClick={loadReadme}
              className={currentView === 'readme' ? 'active' : ''}
            >
              README
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading">Chargement en cours...</div>
      ) : (
        <div className="content-area">
          {currentView === 'repos' && repositories.length > 0 && (
            <div className="repos-list">
              <h3>Dépôts ({repositories.length})</h3>
              <ul>
                {repositories.map(repo => (
                  <li key={repo.id} className="repo-item">
                    <div className="repo-header">
                      <h4>{repo.name}</h4>
                      <span className="repo-stats">
                        ⭐ {repo.stars} 🍴 {repo.forks}
                      </span>
                    </div>
                    <p className="repo-desc">{repo.description || 'Pas de description'}</p>
                    <div className="repo-footer">
                      <span className="repo-lang">{repo.language || 'N/A'}</span>
                      <div className="repo-actions">
                        <a href={repo.url} target="_blank" rel="noopener noreferrer">
                          Voir sur GitHub
                        </a>
                        <button 
                          onClick={() => handleSelectRepository(
                            repo.fullName.split('/')[0], 
                            repo.fullName.split('/')[1]
                          )}
                        >
                          Explorer
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentView === 'issues' && (
            <>
              <div className="create-issue">
                <h3>Créer une issue</h3>
                <input 
                  type="text" 
                  placeholder="Titre de l'issue" 
                  id="issue-title" 
                />
                <textarea 
                  placeholder="Description de l'issue" 
                  id="issue-body"
                />
                <button 
                  onClick={() => {
                    const title = (document.getElementById('issue-title') as HTMLInputElement).value;
                    const body = (document.getElementById('issue-body') as HTMLTextAreaElement).value;
                    handleCreateIssue(title, body);
                  }}
                >
                  Créer l'issue
                </button>
              </div>

              <div className="issues-list">
                <h3>Issues ({issues.length})</h3>
                {issues.length === 0 ? (
                  <p>Aucune issue trouvée</p>
                ) : (
                  <ul>
                    {issues.map(issue => (
                      <li key={issue.id} className="issue-item">
                        <div className="issue-header">
                          <span className={`issue-state ${issue.state}`}>
                            {issue.state === 'open' ? '🟢' : '🔴'} #{issue.number}
                          </span>
                          <h4>{issue.title}</h4>
                        </div>
                        <div className="issue-footer">
                          <span className="issue-author">@{issue.author}</span>
                          <a href={issue.url} target="_blank" rel="noopener noreferrer">
                            Voir sur GitHub
                          </a>
                        </div>
                        <div className="issue-labels">
                          {issue.labels.map(label => (
                            <span key={label} className="issue-label">{label}</span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {currentView === 'pulls' && (
            <div className="pulls-list">
              <h3>Pull Requests ({pullRequests.length})</h3>
              {pullRequests.length === 0 ? (
                <p>Aucune pull request trouvée</p>
              ) : (
                <ul>
                  {pullRequests.map(pr => (
                    <li key={pr.id} className="pr-item">
                      <div className="pr-header">
                        <span className={`pr-state ${pr.state}`}>
                          {pr.state === 'open' ? '🟢' : '🔴'} #{pr.number}
                        </span>
                        <h4>{pr.title}</h4>
                      </div>
                      <div className="pr-branches">
                        {pr.sourceBranch} → {pr.targetBranch}
                      </div>
                      <div className="pr-footer">
                        <span className="pr-author">@{pr.author}</span>
                        <a href={pr.url} target="_blank" rel="noopener noreferrer">
                          Voir sur GitHub
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {currentView === 'commits' && (
            <div className="commits-list">
              <h3>Commits récents ({commits.length})</h3>
              {commits.length === 0 ? (
                <p>Aucun commit trouvé</p>
              ) : (
                <ul>
                  {commits.map(commit => (
                    <li key={commit.sha} className="commit-item">
                      <div className="commit-header">
                        <h4 className="commit-sha">{commit.sha.substring(0, 7)}</h4>
                        <span className="commit-date">
                          {new Date(commit.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="commit-message">{commit.message}</p>
                      <div className="commit-footer">
                        <span className="commit-author">@{commit.author}</span>
                        <a href={commit.url} target="_blank" rel="noopener noreferrer">
                          Voir sur GitHub
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {currentView === 'readme' && (
            <div className="readme-content">
              <h3>README</h3>
              {readme.content ? (
                <div className="markdown-content">
                  <pre>{readme.content}</pre>
                </div>
              ) : (
                <p>Pas de README trouvé</p>
              )}
              {readme.url && (
                <div className="readme-footer">
                  <a href={readme.url} target="_blank" rel="noopener noreferrer">
                    Voir sur GitHub
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="github-panel-footer">
        <div className="cache-controls">
          <div className="cache-toggle">
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={useCache} 
                onChange={handleCacheToggle}
              />
              <span className="toggle-slider"></span>
            </label>
            <span>Utiliser le cache</span>
            {currentView !== '' && cacheStatus[currentView as keyof typeof cacheStatus] && (
              <span className="cache-indicator">🔄 Données en cache</span>
            )}
          </div>
          <button 
            className="clear-cache-button" 
            onClick={handleClearCache}
            disabled={!useCache}
          >
            Rafraîchir le cache
          </button>
        </div>
        <div className="close-button-container">
          <button 
            className="close-button" 
            onClick={() => setIsVisible(false)}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default GitHubPanel;
