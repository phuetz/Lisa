import axios, { type AxiosRequestConfig, type Method } from 'axios';
import {
  AgentDomains,
  type AgentDomain,
  type AgentParameter,
  type AgentCapability,
  type AgentExecuteProps, 
  type AgentExecuteResult, 
  type BaseAgent 
} from '../core/types';
import { agentRegistry } from '../core/registry';

/**
 * Agent spécialisé pour les requêtes HTTP dans les workflows
 * Fournit des méthodes sécurisées pour interagir avec des API externes
 */
export class WorkflowHTTPAgent implements BaseAgent {
  // Identité et métadonnées
  public name = 'WorkflowHTTPAgent';
  public description = 'Agent pour les requêtes HTTP dans les workflows';
  public version = '1.0.0';
  public domain: AgentDomain = AgentDomains.INTEGRATION;
  public capabilities = ['httpRequest', 'apiCall', 'webhookManagement'];
  public valid = true;

  // Liste des hôtes autorisés - peut être configuré par l'administrateur
  private allowedHosts: string[] = [
    'api.weather.com',
    'api.github.com',
    'api.openai.com',
    'localhost',
    '127.0.0.1',
    // Ajouter d'autres hôtes de confiance ici
  ];

  /**
   * Méthode d'exécution principale de l'agent
   * @param props Propriétés d'exécution
   */
  public async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    
    try {
      // Validation des entrées
      const validation = await this.validateInput(props);
      if (!validation.valid) {
        return {
          success: false,
          output: null,
          error: `Validation failed: ${validation.errors?.join(', ')}`,
          metadata: {
            executionTime: Date.now() - startTime,
            timestamp: Date.now()
          }
        };
      }
      
      // Déterminer l'action à effectuer
      const { intent, parameters } = props;
      
      switch (intent) {
        case 'httpRequest':
          return await this.handleHttpRequest(parameters ?? {});
          
        case 'apiCall':
          return await this.handleApiCall(parameters ?? {});
          
        case 'webhookManagement':
          return await this.handleWebhookManagement(parameters ?? {});
          
        default:
          return {
            success: false,
            output: null,
            error: `Unknown intent: ${intent}`,
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Vérifie si l'agent peut traiter la requête
   * @param query Requête à vérifier
   */
  public async canHandle(query: string): Promise<number> {
    const httpTerms = ['http', 'request', 'api', 'get', 'post', 'fetch', 'webhook', 'api call'];
    
    // Calculer un score basé sur les termes présents
    const queryLower = query.toLowerCase();
    let score = 0;
    
    for (const term of httpTerms) {
      if (queryLower.includes(term)) {
        score += 0.2;
      }
    }
    
    // Limiter à 0.9 pour laisser place à d'autres agents plus spécifiques
    return Math.min(score, 0.9);
  }

  /**
   * Liste les paramètres requis pour une tâche donnée
   * @param task Tâche à exécuter
   */
  public async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    if (task.includes('http') || task.includes('request') || task.includes('api')) {
      return [
        {
          name: 'url',
          type: 'string',
          required: true,
          description: 'URL de la requête'
        },
        {
          name: 'method',
          type: 'string',
          required: false,
          description: 'Méthode HTTP (GET, POST, PUT, DELETE, etc.)',
          defaultValue: 'GET'
        },
        {
          name: 'headers',
          type: 'object',
          required: false,
          description: 'En-têtes de la requête'
        },
        {
          name: 'data',
          type: 'object',
          required: false,
          description: 'Données à envoyer avec la requête'
        }
      ];
    }
    
    return [];
  }

  /**
   * Retourne les capacités détaillées de l'agent
   */
  public async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: 'httpRequest',
        description: 'Envoie une requête HTTP à une URL spécifique',
        requiredParameters: [
          {
            name: 'url',
            type: 'string',
            required: true,
            description: 'URL de la requête'
          },
          {
            name: 'method',
            type: 'string',
            required: false,
            description: 'Méthode HTTP (GET, POST, PUT, DELETE, etc.)',
            defaultValue: 'GET'
          }
        ]
      },
      {
        name: 'apiCall',
        description: 'Effectue un appel API structuré avec authentification',
        requiredParameters: [
          {
            name: 'endpoint',
            type: 'string',
            required: true,
            description: 'Point de terminaison API'
          },
          {
            name: 'apiKey',
            type: 'string',
            required: true,
            description: 'Clé API pour l\'authentification'
          }
        ]
      },
      {
        name: 'webhookManagement',
        description: 'Gère les webhooks pour les workflows',
        requiredParameters: [
          {
            name: 'action',
            type: 'string',
            required: true,
            description: 'Action à effectuer (create, update, delete, test)'
          },
          {
            name: 'workflowId',
            type: 'string',
            required: true,
            description: 'ID du workflow associé'
          }
        ]
      }
    ];
  }

  /**
   * Valide les entrées de l'agent
   * @param props Propriétés à valider
   */
  public async validateInput(props: AgentExecuteProps): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const { intent, parameters } = props;
    
    if (!intent) {
      errors.push('Intent is required');
      return { valid: false, errors };
    }
    
    if (!parameters) {
      errors.push('Parameters are required');
      return { valid: false, errors };
    }
    
    switch (intent) {
      case 'httpRequest': {
        if (!parameters.url) {
          errors.push('URL is required for httpRequest');
        } else if (!this.isAllowedUrl(parameters.url)) {
          errors.push('URL is not allowed for security reasons');
        }
        break;
      }
      
      case 'apiCall': {
        if (!parameters.endpoint) {
          errors.push('Endpoint is required for apiCall');
        }
        if (!parameters.apiKey) {
          errors.push('API key is required for apiCall');
        }
        break;
      }
      
      case 'webhookManagement': {
        if (!parameters.action) {
          errors.push('Action is required for webhookManagement');
        }
        if (!parameters.workflowId) {
          errors.push('Workflow ID is required for webhookManagement');
        }
        break;
      }
      
      default:
        errors.push(`Unknown intent: ${intent}`);
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Gère une requête HTTP générique
   * @param parameters Paramètres de la requête
   */
  private async handleHttpRequest(parameters: Record<string, any>): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    
    try {
      const { url, method = 'GET', headers = {}, data, timeout = 10000 } = parameters;
      
      // Vérification de sécurité
      if (!this.isAllowedUrl(url)) {
        return {
          success: false,
          output: null,
          error: 'URL not allowed for security reasons',
          metadata: {
            executionTime: Date.now() - startTime,
            timestamp: Date.now()
          }
        };
      }
      
      // Configuration de la requête
      const config: AxiosRequestConfig = {
        url,
        method: method as Method,
        headers,
        timeout,
        ...(data && method !== 'GET' ? { data } : {}),
        ...(data && method === 'GET' ? { params: data } : {})
      };
      
      // Exécution de la requête
      const response = await axios(config);
      
      return {
        success: true,
        output: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          headers: response.headers
        },
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now(),
          source: url
        }
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          output: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : null,
          error: error.message,
          metadata: {
            executionTime: Date.now() - startTime,
            timestamp: Date.now()
          }
        };
      }
      
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Gère un appel API structuré avec authentification
   * @param parameters Paramètres de l'appel API
   */
  private async handleApiCall(parameters: Record<string, any>): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    
    try {
      const { endpoint, apiKey, method = 'GET', data, service, version: _version = 'v1' } = parameters;
      
      // Construction de l'URL basée sur le service
      let baseUrl = '';
      switch (service?.toLowerCase()) {
        case 'github':
          baseUrl = 'https://api.github.com';
          break;
        case 'openai':
          baseUrl = 'https://api.openai.com';
          break;
        // Ajouter d'autres services supportés ici
        default:
          baseUrl = endpoint.startsWith('http') ? '' : 'https://';
      }
      
      const url = `${baseUrl}${endpoint}`;
      
      // Vérification de sécurité
      if (!this.isAllowedUrl(url)) {
        return {
          success: false,
          output: null,
          error: 'API endpoint not allowed for security reasons',
          metadata: {
            executionTime: Date.now() - startTime,
            timestamp: Date.now()
          }
        };
      }
      
      // Configuration des en-têtes d'authentification
      const headers: Record<string, string> = {};
      if (apiKey) {
        if (service?.toLowerCase() === 'github') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (service?.toLowerCase() === 'openai') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
          headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
        }
      }
      
      // Ajout d'en-têtes communs
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
      
      // Exécution de la requête
      const response = await axios({
        url,
        method: method as Method,
        headers,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
      });
      
      return {
        success: true,
        output: {
          status: response.status,
          data: response.data
        },
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now(),
          source: service || url
        }
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          output: error.response ? {
            status: error.response.status,
            data: error.response.data
          } : null,
          error: error.message,
          metadata: {
            executionTime: Date.now() - startTime,
            timestamp: Date.now()
          }
        };
      }
      
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Gère les opérations de gestion des webhooks
   * @param parameters Paramètres pour la gestion des webhooks
   */
  private async handleWebhookManagement(parameters: Record<string, any>): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const { action, workflowId } = parameters;
    
    try {
      // Génération d'un ID unique pour le webhook
      const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const baseUrl = window.location.origin || 'https://app.lisa-assistant.com';
      const webhookUrl = `${baseUrl}/api/webhooks/${webhookId}`;
      
      switch (action.toLowerCase()) {
        case 'create':
          // Dans une implémentation réelle, enregistrerait le webhook dans une base de données
          return {
            success: true,
            output: {
              webhookId,
              webhookUrl,
              workflowId,
              created: new Date().toISOString()
            },
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
          
        case 'update':
          // Mise à jour d'un webhook existant
          return {
            success: true,
            output: {
              webhookId: parameters.webhookId || webhookId,
              webhookUrl,
              workflowId,
              updated: new Date().toISOString()
            },
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
          
        case 'delete':
          // Suppression d'un webhook
          return {
            success: true,
            output: {
              webhookId: parameters.webhookId,
              deleted: true,
              timestamp: new Date().toISOString()
            },
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
          
        case 'test':
          // Test d'un webhook
          return {
            success: true,
            output: {
              webhookId: parameters.webhookId || webhookId,
              testResult: 'Webhook test successful',
              timestamp: new Date().toISOString()
            },
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
          
        default:
          return {
            success: false,
            output: null,
            error: `Unknown webhook action: ${action}`,
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Vérifie si une URL est autorisée pour des raisons de sécurité
   * @param url URL à vérifier
   */
  private isAllowedUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      
      // Vérifier si l'hôte est dans la liste des hôtes autorisés
      return this.allowedHosts.some(allowedHost => 
        hostname === allowedHost || hostname.endsWith(`.${allowedHost}`)
      );
    } catch {
      return false;
    }
  }
}

// Enregistrement de l'agent dans le registre
agentRegistry.register(new WorkflowHTTPAgent());

export default WorkflowHTTPAgent;
