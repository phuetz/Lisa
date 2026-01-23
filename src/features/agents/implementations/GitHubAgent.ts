import { agentRegistry } from '../core/registry';
import { AgentDomains, type AgentExecuteProps, type AgentExecuteResult, type AgentParameter, type BaseAgent } from '../core/types';
import { Octokit } from '@octokit/rest';
import GitHubCacheService from '../../../services/GitHubCacheService';

const logger = console;

interface RepoSummary {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  isPrivate: boolean;
  updatedAt: string;
  createdAt: string;
}

interface RepoDetails extends RepoSummary {
  defaultBranch: string;
  topics?: string[];
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
}

interface IssueSummary {
  id: number;
  number: number;
  title: string;
  state: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  author: string | undefined;
  labels: string[];
}

interface PullRequestSummary {
  id: number;
  number: number;
  title: string;
  state: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  author: string | undefined;
  sourceBranch: string;
  targetBranch: string;
}

interface CommitSummary {
  sha: string;
  url: string;
  message: string;
  author: string;
  date: string | undefined;
}

interface IssueCreatedResult {
  id: number;
  number: number;
  title: string;
  url: string;
  createdAt: string;
}

interface ReadmeResult {
  content: string | null;
  url: string;
  error?: string;
}

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
  domain = AgentDomains.INTEGRATION;
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
   * @param props Propriétés d'exécution conformes à BaseAgent
   * @returns Résultat standardisé AgentExecuteResult
   */
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const parameters = props.parameters ?? {};
    const action = (props.intent as string | undefined) ?? (parameters.action as string | undefined);
    const token = parameters.token as string | undefined;
    const useCache = parameters.useCache !== false;
    const startedAt = Date.now();

    // Configurer l'utilisation du cache
    this.useCache = useCache;

    // Si un token est fourni dans les paramètres ou pas encore initialisé
    if ((token && (!this.octokit || token !== this.token)) || (!this.octokit && import.meta.env.VITE_GITHUB_TOKEN)) {
      const authToken = token || import.meta.env.VITE_GITHUB_TOKEN;
      this.initOctokit(authToken);
      this.token = authToken;
    }
    
    // Nettoyer le cache obsolète de manière asynchrone
    this.cacheService.clearStaleCache().catch(err => {
      logger.warn('Erreur lors du nettoyage du cache obsolète', err);
    });
    
    // Vérifier que l'Octokit est initialisé
    if (!this.octokit) {
      return {
        success: false,
        output: null,
        error: 'GitHub non authentifié. Veuillez fournir un token d\'accès.',
      };
    }
    
    try {
      if (!action) {
        throw new Error('Action manquante (intent ou parameters.action)');
      }

      let output: unknown;
      switch (action) {
        case 'listRepositories':
          output = await this.listRepositories(
            parameters.username as string, 
            parameters.page as number | undefined, 
            parameters.perPage as number | undefined
          );
          break;
        case 'getRepository':
          output = await this.getRepository(parameters.owner as string, parameters.repo as string);
          break;
        case 'listIssues':
          output = await this.listIssues(parameters.owner as string, parameters.repo as string, parameters.state as string | undefined);
          break;
        case 'createIssue':
          output = await this.createIssue(
            parameters.owner as string, 
            parameters.repo as string, 
            parameters.title as string, 
            parameters.body as string, 
            parameters.labels as string[] | undefined
          );
          break;
        case 'listPullRequests':
          output = await this.listPullRequests(parameters.owner as string, parameters.repo as string, parameters.state as string | undefined);
          break;
        case 'listCommits':
          output = await this.listCommits(parameters.owner as string, parameters.repo as string, parameters.branch as string | undefined);
          break;
        case 'getReadme':
          output = await this.getReadme(parameters.owner as string, parameters.repo as string);
          break;
        default:
          throw new Error(`Action inconnue: ${action}`);
      }

      return {
        success: true,
        output,
        metadata: { executionTime: Date.now() - startedAt, timestamp: Date.now(), source: 'GitHubAgent' },
      };
    } catch (error) {
      logger.error(`Erreur lors de l'exécution de l'action GitHub ${action}:`, error);
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        metadata: { executionTime: Date.now() - startedAt, timestamp: Date.now(), source: 'GitHubAgent' },
      };
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
  private async listRepositories(username: string, page = 1, perPage = 30): Promise<RepoSummary[]> {
    // Vérifier le cache si activé
    if (this.useCache) {
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
    
    const repositories: RepoSummary[] = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      language: repo.language ?? null,
      isPrivate: repo.private,
      updatedAt: repo.updated_at ?? '',
      createdAt: repo.created_at ?? ''
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
  private async getRepository(owner: string, repo: string): Promise<RepoDetails> {
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
  private async listIssues(owner: string, repo: string, state = 'open'): Promise<IssueSummary[]> {
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
      labels: (issue.labels as Array<{ name?: string }> | undefined)?.map(label => label.name ?? '').filter(Boolean) ?? []
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
  private async createIssue(owner: string, repo: string, title: string, body: string, labels?: string[]): Promise<IssueCreatedResult> {
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
  private async listPullRequests(owner: string, repo: string, state = 'open'): Promise<PullRequestSummary[]> {
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
  private async listCommits(owner: string, repo: string, branch?: string): Promise<CommitSummary[]> {
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
  private async getReadme(owner: string, repo: string): Promise<ReadmeResult> {
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
      const readmeUrl = response.data.html_url ?? '';
      const result = {
        content,
        url: readmeUrl
      };
      
      // Mettre en cache les résultats si le cache est activé
      if (this.useCache) {
        await this.cacheService.cacheReadme(owner, repo, content, readmeUrl);
      }
      
      return result;
    } catch {
      logger.warn(`README non trouvé pour ${owner}/${repo}`);
      return { content: null, url: '', error: 'README non trouvé' };
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
