/**
 * Service de cache pour les données GitHub utilisant IndexedDB
 * 
 * Ce service permet de stocker localement les résultats des requêtes
 * à l'API GitHub pour améliorer les performances et réduire les appels API.
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('GitHubCacheService');

// Définition des types pour la base de données
interface GitHubCacheDB {
  repositories: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      username?: string;
    };
    indexes: { 'by-username': string };
  };
  repository: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      repoFullName?: string;
    };
  };
  issues: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      repoFullName?: string;
    };
    indexes: { 'by-repo': string };
  };
  pullRequests: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      repoFullName?: string;
    };
    indexes: { 'by-repo': string };
  };
  commits: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      repoFullName?: string;
    };
    indexes: { 'by-repo': string };
  };
  readmes: {
    key: string;
    value: {
      content: string;
      url: string;
      timestamp: number;
    };
  };
}

// Configurer les durées de validité du cache (en millisecondes)
const CACHE_DURATION = {
  repositories: 1000 * 60 * 30, // 30 minutes
  repository: 1000 * 60 * 30,   // 30 minutes
  issues: 1000 * 60 * 15,       // 15 minutes
  pullRequests: 1000 * 60 * 15, // 15 minutes
  commits: 1000 * 60 * 30,      // 30 minutes
  readmes: 1000 * 60 * 60,      // 1 heure
};

class GitHubCacheService {
  private db: Promise<any>;
  private static instance: GitHubCacheService;

  private constructor() {
    this.db = this.initDatabase();
  }

  public static getInstance(): GitHubCacheService {
    if (!GitHubCacheService.instance) {
      GitHubCacheService.instance = new GitHubCacheService();
    }
    return GitHubCacheService.instance;
  }

  private async initDatabase(): Promise<any> {
    try {
      // Import dynamique d'idb pour éviter l'échec de résolution au build si non installé
      const modName = 'idb';
      const idbMod: any = await import(/* @vite-ignore */ modName);
      const openDB = (idbMod as any)?.openDB as (name: string, version: number, opts: any) => Promise<any>;
      if (!openDB) throw new Error('openDB not available');

      const db = await openDB('github-cache', 1, {
        upgrade(db: any) {
          // Créer les object stores pour chaque type de données
          if (!db.objectStoreNames.contains('repositories')) {
            const reposStore = db.createObjectStore('repositories', { keyPath: 'key' });
            reposStore.createIndex('by-username', 'username');
          }
          if (!db.objectStoreNames.contains('repository')) {
            db.createObjectStore('repository', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('issues')) {
            const issuesStore = db.createObjectStore('issues', { keyPath: 'key' });
            issuesStore.createIndex('by-repo', 'repoFullName');
          }
          if (!db.objectStoreNames.contains('pullRequests')) {
            const prsStore = db.createObjectStore('pullRequests', { keyPath: 'key' });
            prsStore.createIndex('by-repo', 'repoFullName');
          }
          if (!db.objectStoreNames.contains('commits')) {
            const commitsStore = db.createObjectStore('commits', { keyPath: 'key' });
            commitsStore.createIndex('by-repo', 'repoFullName');
          }
          if (!db.objectStoreNames.contains('readmes')) {
            db.createObjectStore('readmes', { keyPath: 'key' });
          }
        },
      });
      logger.info('Base de données GitHubCache initialisée avec succès');
      return db;
    } catch (error) {
      // Fallback no-op cache (désactive le cache si idb indisponible)
      logger.warn('IndexedDB (idb) indisponible, désactivation du cache GitHub', error as any);
      const noop = async () => undefined;
      return {
        get: noop,
        put: noop,
        clear: noop,
        transaction: () => ({ store: { openCursor: async () => null } }),
        objectStoreNames: { contains: () => false },
      };
    }
  }

  /**
   * Vérifie si les données en cache sont valides
   */
  private isCacheValid(timestamp: number, type: keyof typeof CACHE_DURATION): boolean {
    const now = Date.now();
    return now - timestamp < CACHE_DURATION[type];
  }

  /**
   * Génère une clé unique pour un élément de cache
   */
  private generateKey(type: string, params: Record<string, any>): string {
    const paramsString = Object.entries(params)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `${type}:${paramsString}`;
  }

  /**
   * Récupère les dépôts en cache ou null si le cache est invalide/inexistant
   */
  public async getRepositories(username: string): Promise<any | null> {
    try {
      const db = await this.db;
      const key = this.generateKey('repositories', { username });
      const cachedData = await db.get('repositories', key);
      
      if (cachedData && this.isCacheValid(cachedData.timestamp, 'repositories')) {
        logger.info(`Cache hit pour les dépôts de ${username}`);
        return cachedData.data;
      }
      
      logger.info(`Cache miss pour les dépôts de ${username}`);
      return null;
    } catch (error) {
      logger.error('Erreur lors de la récupération des dépôts en cache', error);
      return null;
    }
  }

  /**
   * Récupère un dépôt spécifique en cache ou null si le cache est invalide/inexistant
   */
  public async getRepository(owner: string, repo: string): Promise<any | null> {
    try {
      const db = await this.db;
      const key = this.generateKey('repository', { owner, repo });
      const cachedData = await db.get('repository', key);
      
      if (cachedData && this.isCacheValid(cachedData.timestamp, 'repository')) {
        logger.info(`Cache hit pour le dépôt ${owner}/${repo}`);
        return cachedData.data;
      }
      
      logger.info(`Cache miss pour le dépôt ${owner}/${repo}`);
      return null;
    } catch (error) {
      logger.error('Erreur lors de la récupération du dépôt en cache', error);
      return null;
    }
  }

  /**
   * Stocke les dépôts dans le cache
   */
  public async cacheRepositories(username: string, repositories: any): Promise<void> {
    try {
      const db = await this.db;
      const key = this.generateKey('repositories', { username });
      
      await db.put('repositories', {
        key,
        data: repositories,
        timestamp: Date.now(),
        username
      });
      
      logger.info(`Dépôts de ${username} mis en cache`);
    } catch (error) {
      logger.error('Erreur lors de la mise en cache des dépôts', error);
    }
  }
  
  /**
   * Stocke un dépôt spécifique dans le cache
   */
  public async cacheRepository(owner: string, repo: string, repository: any): Promise<void> {
    try {
      const db = await this.db;
      const key = this.generateKey('repository', { owner, repo });
      const repoFullName = `${owner}/${repo}`;
      
      await db.put('repository', {
        key,
        data: repository,
        timestamp: Date.now(),
        repoFullName
      });
      
      logger.info(`Dépôt ${repoFullName} mis en cache`);
    } catch (error) {
      logger.error('Erreur lors de la mise en cache du dépôt', error);
    }
  }

  /**
   * Récupère les issues en cache ou null si le cache est invalide/inexistant
   */
  public async getIssues(owner: string, repo: string, state: string): Promise<any | null> {
    try {
      const db = await this.db;
      const key = this.generateKey('issues', { owner, repo, state });
      const cachedData = await db.get('issues', key);
      
      if (cachedData && this.isCacheValid(cachedData.timestamp, 'issues')) {
        logger.info(`Cache hit pour les issues de ${owner}/${repo}`);
        return cachedData.data;
      }
      
      logger.info(`Cache miss pour les issues de ${owner}/${repo}`);
      return null;
    } catch (error) {
      logger.error('Erreur lors de la récupération des issues en cache', error);
      return null;
    }
  }

  /**
   * Stocke les issues dans le cache
   */
  public async cacheIssues(owner: string, repo: string, state: string, issues: any): Promise<void> {
    try {
      const db = await this.db;
      const key = this.generateKey('issues', { owner, repo, state });
      const repoFullName = `${owner}/${repo}`;
      
      await db.put('issues', {
        key,
        data: issues,
        timestamp: Date.now(),
        repoFullName
      });
      
      logger.info(`Issues de ${repoFullName} mises en cache`);
    } catch (error) {
      logger.error('Erreur lors de la mise en cache des issues', error);
    }
  }

  /**
   * Récupère les pull requests en cache ou null si le cache est invalide/inexistant
   */
  public async getPullRequests(owner: string, repo: string, state: string): Promise<any | null> {
    try {
      const db = await this.db;
      const key = this.generateKey('pullRequests', { owner, repo, state });
      const cachedData = await db.get('pullRequests', key);
      
      if (cachedData && this.isCacheValid(cachedData.timestamp, 'pullRequests')) {
        logger.info(`Cache hit pour les pull requests de ${owner}/${repo}`);
        return cachedData.data;
      }
      
      logger.info(`Cache miss pour les pull requests de ${owner}/${repo}`);
      return null;
    } catch (error) {
      logger.error('Erreur lors de la récupération des pull requests en cache', error);
      return null;
    }
  }

  /**
   * Stocke les pull requests dans le cache
   */
  public async cachePullRequests(owner: string, repo: string, state: string, pullRequests: any): Promise<void> {
    try {
      const db = await this.db;
      const key = this.generateKey('pullRequests', { owner, repo, state });
      const repoFullName = `${owner}/${repo}`;
      
      await db.put('pullRequests', {
        key,
        data: pullRequests,
        timestamp: Date.now(),
        repoFullName
      });
      
      logger.info(`Pull requests de ${repoFullName} mises en cache`);
    } catch (error) {
      logger.error('Erreur lors de la mise en cache des pull requests', error);
    }
  }

  /**
   * Récupère les commits en cache ou null si le cache est invalide/inexistant
   */
  public async getCommits(owner: string, repo: string): Promise<any | null> {
    try {
      const db = await this.db;
      const key = this.generateKey('commits', { owner, repo });
      const cachedData = await db.get('commits', key);
      
      if (cachedData && this.isCacheValid(cachedData.timestamp, 'commits')) {
        logger.info(`Cache hit pour les commits de ${owner}/${repo}`);
        return cachedData.data;
      }
      
      logger.info(`Cache miss pour les commits de ${owner}/${repo}`);
      return null;
    } catch (error) {
      logger.error('Erreur lors de la récupération des commits en cache', error);
      return null;
    }
  }

  /**
   * Stocke les commits dans le cache
   */
  public async cacheCommits(owner: string, repo: string, commits: any): Promise<void> {
    try {
      const db = await this.db;
      const key = this.generateKey('commits', { owner, repo });
      const repoFullName = `${owner}/${repo}`;
      
      await db.put('commits', {
        key,
        data: commits,
        timestamp: Date.now(),
        repoFullName
      });
      
      logger.info(`Commits de ${repoFullName} mis en cache`);
    } catch (error) {
      logger.error('Erreur lors de la mise en cache des commits', error);
    }
  }

  /**
   * Récupère le README en cache ou null si le cache est invalide/inexistant
   */
  public async getReadme(owner: string, repo: string): Promise<any | null> {
    try {
      const db = await this.db;
      const key = this.generateKey('readmes', { owner, repo });
      const cachedData = await db.get('readmes', key);
      
      if (cachedData && this.isCacheValid(cachedData.timestamp, 'readmes')) {
        logger.info(`Cache hit pour le README de ${owner}/${repo}`);
        return {
          content: cachedData.content,
          url: cachedData.url
        };
      }
      
      logger.info(`Cache miss pour le README de ${owner}/${repo}`);
      return null;
    } catch (error) {
      logger.error('Erreur lors de la récupération du README en cache', error);
      return null;
    }
  }

  /**
   * Stocke le README dans le cache
   */
  public async cacheReadme(owner: string, repo: string, content: string, url: string): Promise<void> {
    try {
      const db = await this.db;
      const key = this.generateKey('readmes', { owner, repo });
      
      await db.put('readmes', {
        key,
        content,
        url,
        timestamp: Date.now()
      });
      
      logger.info(`README de ${owner}/${repo} mis en cache`);
    } catch (error) {
      logger.error('Erreur lors de la mise en cache du README', error);
    }
  }

  /**
   * Efface les données obsolètes du cache
   */
  public async clearStaleCache(): Promise<void> {
    try {
      const db = await this.db;
      const now = Date.now();
      
      // Nettoyer les dépôts obsolètes
      const repoTx = db.transaction('repositories', 'readwrite');
      const repoCursor = await repoTx.store.openCursor();
      
      while (repoCursor) {
        if (now - repoCursor.value.timestamp > CACHE_DURATION.repositories) {
          await repoCursor.delete();
          logger.info('Suppression d\'un élément de cache de dépôt obsolète');
        }
        await repoCursor.continue();
      }
      
      // Nettoyer les issues obsolètes
      const issueTx = db.transaction('issues', 'readwrite');
      const issueCursor = await issueTx.store.openCursor();
      
      while (issueCursor) {
        if (now - issueCursor.value.timestamp > CACHE_DURATION.issues) {
          await issueCursor.delete();
          logger.info('Suppression d\'un élément de cache d\'issue obsolète');
        }
        await issueCursor.continue();
      }
      
      // Continuer avec les autres types de données...
      logger.info('Nettoyage du cache terminé');
    } catch (error) {
      logger.error('Erreur lors du nettoyage du cache', error);
    }
  }

  /**
   * Efface toutes les données du cache
   */
  public async clearAllCache(): Promise<void> {
    try {
      const db = await this.db;
      
      await db.clear('repositories');
      await db.clear('repository');
      await db.clear('issues');
      await db.clear('pullRequests');
      await db.clear('commits');
      await db.clear('readmes');
      
      logger.info('Cache entièrement effacé');
    } catch (error) {
      logger.error('Erreur lors de l\'effacement complet du cache', error);
    }
  }
}

export default GitHubCacheService;
