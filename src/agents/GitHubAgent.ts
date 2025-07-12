import { agentRegistry } from './registry';
import { AgentDomain, AgentParameter, BaseAgent } from './types';
import { Octokit } from '@octokit/rest';
import { createLogger } from '../utils/logger';
import GitHubCacheService from '../services/GitHubCacheService';

const logger = createLogger('GitHubAgent');

/**
 * GitHubAgent - Agent pour interagir avec l'API GitHub
 * 
 * Cet agent permet d'accéder aux fonctionnalités de GitHub comme :
 * - Lister les dépôts
 * - Gérer les issues
 * - Consulter les pull requests
 * - Afficher les commits récents
 */
export class GitHubAgent implements BaseAgent {
  name = 'GitHubAgent';
  description = 'Agent pour interagir avec GitHub (repos, issues, PRs, commits)';
  version = '1.0.0';
  domain = AgentDomain.INTEGRATION;
  capabilities = ['repo-listing', 'issue-management', 'pr-management', 'commit-history'];

  private octokit: Octokit | null = null;
  private cacheService = GitHubCacheService.getInstance();
  private useCache = true;

  /**
   * Initialise l'agent GitHub avec un token d'authentification
   * @param token Token d'authentification GitHub (optionnel)
   */
  constructor(private token?: string) {
    // Si un token est fourni à l'initialisation, créer l'instance Octokit
    if (token) {
      this.initOctokit(token);
    }
  }

  /**
   * Initialise l'instance Octokit avec un token d'authentification
   * @param token Token d'authentification GitHub
   */
  private initOctokit(token: string): void {
    try {
      this.octokit = new Octokit({ auth: token });
      logger.info('GitHub Octokit initialisé avec succès');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation d\'Octokit', error);
      throw new Error('Impossible d\'initialiser la connexion GitHub');
    }
  }

  /**
   * Vérifie si l'agent peut traiter la requête
   * @param query Requête utilisateur
   * @returns Score de confiance entre 0 et 1
   */
  async canHandle(query: string): Promise<number> {
    const githubKeywords = [
      'github', 'repo', 'dépôt', 'repository', 'commit', 'pull request', 
      'pr', 'issue', 'bug', 'branche', 'branch', 'fork', 'étoile', 'star',
      'git', 'clone', 'push', 'merge'
    ];
    
    return this.calculateKeywordMatch(query, githubKeywords);
  }

  /**
   * Exécute une action GitHub
   * @param params Paramètres de l'action
   * @returns Résultat de l'action
   */
  async execute(params: any): Promise<any> {
    const { action, token, useCache = true, ...actionParams } = params;
    
    // Configurer l'utilisation du cache
    this.useCache = useCache;
    
    // Si un token est fourni dans les paramètres ou pas encore initialisé
    if ((token && (!this.octokit || token !== this.token)) || (!this.octokit && import.meta.env.VITE_GITHUB_TOKEN)) {
      const authToken = token || import.meta.env.VITE_GITHUB_TOKEN;
      this.initOctokit(authToken);
      this.token = authToken;
    }
    
    // Nettoyer le cache obsolète de manière asynchrone
    this.cacheService.clearStaleCache().catch(error => {
      logger.warn('Erreur lors du nettoyage du cache obsolète', error);
    });
    
    // Vérifier que l'Octokit est initialisé
    if (!this.octokit) {
      throw new Error('GitHub non authentifié. Veuillez fournir un token d\'accès.');
    }
    
    try {
      switch (action) {
        case 'listRepositories':
          return await this.listRepositories(actionParams.username, actionParams.page, actionParams.perPage);
        case 'getRepository':
          return await this.getRepository(actionParams.owner, actionParams.repo);
        case 'listIssues':
          return await this.listIssues(actionParams.owner, actionParams.repo, actionParams.state);
        case 'createIssue':
          return await this.createIssue(
            actionParams.owner, 
            actionParams.repo, 
            actionParams.title, 
            actionParams.body, 
            actionParams.labels
          );
        case 'listPullRequests':
          return await this.listPullRequests(actionParams.owner, actionParams.repo, actionParams.state);
        case 'listCommits':
          return await this.listCommits(actionParams.owner, actionParams.repo, actionParams.branch);
        case 'getReadme':
          return await this.getReadme(actionParams.owner, actionParams.repo);
        default:
          throw new Error(`Action inconnue: ${action}`);
      }
    } catch (error) {
      logger.error(`Erreur lors de l'exécution de l'action GitHub ${action}:`, error);
      throw new Error(`Erreur GitHub: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Retourne les paramètres requis pour une tâche donnée
   * @param task Description de la tâche
   * @returns Liste des paramètres requis
   */
  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    if (task.toLowerCase().includes('liste') && task.toLowerCase().includes('dépôt')) {
      return [{
        name: 'username',
        description: 'Nom d\'utilisateur GitHub',
        type: 'string',
        required: true
      }, {
        name: 'useCache',
        description: 'Utiliser le cache (true par défaut)',
        type: 'boolean',
        required: false
      }];
    }
    
    // Paramètres pour les issues, PRs, etc.
    if (task.toLowerCase().includes('issue') || task.toLowerCase().includes('pull request') || 
        task.toLowerCase().includes('commit') || task.toLowerCase().includes('readme')) {
      return [{
        name: 'owner',
        description: 'Propriétaire du dépôt',
        type: 'string',
        required: true
      }, {
        name: 'repo',
        description: 'Nom du dépôt',
        type: 'string',
        required: true
      }, {
        name: 'useCache',
        description: 'Utiliser le cache (true par défaut)',
        type: 'boolean',
        required: false
      }];
    }
    
    return [];
  }

  /**
   * Liste les dépôts d'un utilisateur
   * @param username Nom d'utilisateur
   * @param page Numéro de page (défaut: 1)
   * @param perPage Nombre de résultats par page (défaut: 30)
   * @returns Liste des dépôts
   */
  private async listRepositories(username: string, page = 1, perPage = 30): Promise<any> {
    // Vérifier le cache si activé
    if (this.useCache) {
      const cacheKey = { username, page, perPage };
      const cachedData = await this.cacheService.getRepositories(username);
      if (cachedData) {
        logger.info(`Utilisation des données en cache pour les dépôts de ${username}`);
        return cachedData;
      }
    }
    
    // Récupérer les données depuis l'API si pas en cache ou cache désactivé
    const response = await this.octokit!.repos.listForUser({
      username,
      per_page: perPage,
      page
    });
    
    const repositories = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      isPrivate: repo.private,
      updatedAt: repo.updated_at,
      createdAt: repo.created_at
    }));
    
    // Mettre en cache les résultats si le cache est activé
    if (this.useCache) {
      await this.cacheService.cacheRepositories(username, repositories);
    }
    
    return repositories;
  }

  /**
   * Obtient les détails d'un dépôt
   * @param owner Propriétaire du dépôt
   * @param repo Nom du dépôt
   * @returns Détails du dépôt
   */
  private async getRepository(owner: string, repo: string): Promise<any> {
    // Vérifier le cache si activé
    if (this.useCache) {
      const cachedData = await this.cacheService.getRepository(owner, repo);
      if (cachedData) {
        logger.info(`Utilisation des données en cache pour le dépôt ${owner}/${repo}`);
        return cachedData;
      }
    }
    
    // Récupérer les données depuis l'API si pas en cache ou cache désactivé
    const response = await this.octokit!.repos.get({ owner, repo });
    const repoData = response.data;
    
    return {
      id: repoData.id,
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description,
      url: repoData.html_url,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language,
      isPrivate: repoData.private,
      defaultBranch: repoData.default_branch,
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      topics: repoData.topics,
      hasIssues: repoData.has_issues,
      hasProjects: repoData.has_projects,
      hasWiki: repoData.has_wiki
    };
  }

  /**
   * Liste les issues d'un dépôt
   * @param owner Propriétaire du dépôt
   * @param repo Nom du dépôt
   * @param state État des issues (all, open, closed)
   * @returns Liste des issues
   */
  private async listIssues(owner: string, repo: string, state = 'open'): Promise<any> {
    // Vérifier le cache si activé
    if (this.useCache) {
      const cachedIssues = await this.cacheService.getIssues(owner, repo, state);
      if (cachedIssues) {
        logger.info(`Utilisation des données en cache pour les issues de ${owner}/${repo}`);
        return cachedIssues;
      }
    }
    
    // Récupérer les données depuis l'API si pas en cache ou cache désactivé
    const response = await this.octokit!.issues.listForRepo({
      owner,
      repo,
      state: state as 'open' | 'closed' | 'all'
    });
    
    const issues = response.data.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      url: issue.html_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      author: issue.user?.login,
      labels: issue.labels.map((label: any) => label.name)
    }));
    
    // Mettre en cache les résultats si le cache est activé
    if (this.useCache) {
      await this.cacheService.cacheIssues(owner, repo, state, issues);
    }
    
    return issues;
  }

  /**
   * Crée une nouvelle issue
   * @param owner Propriétaire du dépôt
   * @param repo Nom du dépôt
   * @param title Titre de l'issue
   * @param body Contenu de l'issue
   * @param labels Labels à appliquer
   * @returns Issue créée
   */
  private async createIssue(owner: string, repo: string, title: string, body: string, labels?: string[]): Promise<any> {
    const response = await this.octokit!.issues.create({
      owner,
      repo,
      title,
      body,
      labels
    });
    
    const issue = response.data;
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      createdAt: issue.created_at
    };
  }

  /**
   * Liste les pull requests d'un dépôt
   * @param owner Propriétaire du dépôt
   * @param repo Nom du dépôt
   * @param state État des pull requests (all, open, closed)
   * @returns Liste des pull requests
   */
  private async listPullRequests(owner: string, repo: string, state = 'open'): Promise<any> {
    // Vérifier le cache si activé
    if (this.useCache) {
      const cachedPRs = await this.cacheService.getPullRequests(owner, repo, state);
      if (cachedPRs) {
        logger.info(`Utilisation des données en cache pour les pull requests de ${owner}/${repo}`);
        return cachedPRs;
      }
    }
    
    // Récupérer les données depuis l'API si pas en cache ou cache désactivé
    const response = await this.octokit!.pulls.list({
      owner,
      repo,
      state: state as 'open' | 'closed' | 'all'
    });
    
    const pullRequests = response.data.map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      url: pr.html_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      closedAt: pr.closed_at,
      mergedAt: pr.merged_at,
      author: pr.user?.login,
      sourceBranch: pr.head.ref,
      targetBranch: pr.base.ref
    }));
    
    // Mettre en cache les résultats si le cache est activé
    if (this.useCache) {
      await this.cacheService.cachePullRequests(owner, repo, state, pullRequests);
    }
    
    return pullRequests;
  }

  /**
   * Liste les commits d'un dépôt
   * @param owner Propriétaire du dépôt
   * @param repo Nom du dépôt
   * @param branch Nom de la branche (défaut: branche par défaut)
   * @returns Liste des commits
   */
  private async listCommits(owner: string, repo: string, branch?: string): Promise<any> {
    // Vérifier le cache si activé
    if (this.useCache && !branch) { // Cache uniquement pour la branche par défaut
      const cachedCommits = await this.cacheService.getCommits(owner, repo);
      if (cachedCommits) {
        logger.info(`Utilisation des données en cache pour les commits de ${owner}/${repo}`);
        return cachedCommits;
      }
    }
    
    // Récupérer les données depuis l'API si pas en cache ou cache désactivé
    const response = await this.octokit!.repos.listCommits({
      owner,
      repo,
      ...(branch ? { sha: branch } : {})
    });
    
    const commits = response.data.map(commit => ({
      sha: commit.sha,
      url: commit.html_url,
      message: commit.commit.message,
      author: commit.author?.login || commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date
    }));
    
    // Mettre en cache les résultats si le cache est activé et qu'il s'agit de la branche par défaut
    if (this.useCache && !branch) {
      await this.cacheService.cacheCommits(owner, repo, commits);
    }
    
    return commits;
  }

  /**
   * Récupère le contenu du README d'un dépôt
   * @param owner Propriétaire du dépôt
   * @param repo Nom du dépôt
   * @returns Contenu du README
   */
  private async getReadme(owner: string, repo: string): Promise<any> {
    try {
      // Vérifier le cache si activé
      if (this.useCache) {
        const cachedReadme = await this.cacheService.getReadme(owner, repo);
        if (cachedReadme) {
          logger.info(`Utilisation du README en cache pour ${owner}/${repo}`);
          return cachedReadme;
        }
      }
      
      // Récupérer les données depuis l'API si pas en cache ou cache désactivé
      const response = await this.octokit!.repos.getReadme({
        owner,
        repo
      });
      
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      const result = {
        content,
        url: response.data.html_url
      };
      
      // Mettre en cache les résultats si le cache est activé
      if (this.useCache) {
        await this.cacheService.cacheReadme(owner, repo, content, response.data.html_url);
      }
      
      return result;
    } catch (error) {
      logger.warn(`README non trouvé pour ${owner}/${repo}`);
      return { content: null, error: 'README non trouvé' };
    }
  }

  /**
   * Calcule le score de correspondance entre une requête et des mots-clés
   * @param query Requête utilisateur
   * @param keywords Liste de mots-clés
   * @returns Score de correspondance (0-1)
   */
  private calculateKeywordMatch(query: string, keywords: string[]): number {
    const words = query.toLowerCase().split(' ');
    const matches = keywords.filter(kw => words.some(w => w.includes(kw.toLowerCase())));
    return matches.length / Math.max(5, 1); // Score normalisé entre 0 et 1
  }
}

// Enregistrer l'agent dans le registre global
const githubAgent = new GitHubAgent();
agentRegistry.register(githubAgent);

export default githubAgent;
