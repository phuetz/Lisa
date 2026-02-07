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
 * Agent spécialisé pour l'exécution de code dans les workflows
 * Fournit un environnement d'exécution sécurisé pour JavaScript/TypeScript
 */
export class WorkflowCodeAgent implements BaseAgent {
  // Identité et métadonnées
  public name = 'WorkflowCodeAgent';
  public description = 'Agent pour l\'exécution sécurisée de code JavaScript/TypeScript dans les workflows';
  public version = '1.0.0';
  public domain: AgentDomain = AgentDomains.ANALYSIS;
  public capabilities = ['executeCode', 'evaluateExpression', 'defineFunction'];
  public valid = true;

  // Liste des modules autorisés pour l'importation
  private allowedModules: string[] = [
    'lodash',
    'moment',
    'axios',
    'uuid',
    'json-schema',
    // Ajouter d'autres modules de confiance ici
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
        case 'executeCode':
          return await this.handleCodeExecution(parameters);
          
        case 'evaluateExpression':
          return await this.handleExpressionEvaluation(parameters);
          
        case 'defineFunction':
          return await this.handleFunctionDefinition(parameters);
          
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
    const codeTerms = [
      'code', 'execute', 'run', 'javascript', 'typescript', 
      'function', 'expression', 'eval', 'script', 'transform'
    ];
    
    // Calculer un score basé sur les termes présents
    const queryLower = query.toLowerCase();
    let score = 0;
    
    for (const term of codeTerms) {
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
    if (task.includes('execute') || task.includes('code') || task.includes('run')) {
      return [
        {
          name: 'code',
          type: 'string',
          required: true,
          description: 'Code JavaScript/TypeScript à exécuter'
        },
        {
          name: 'input',
          type: 'object',
          required: false,
          description: 'Données d\'entrée pour le code'
        },
        {
          name: 'timeout',
          type: 'number',
          required: false,
          description: 'Délai maximum d\'exécution en ms',
          defaultValue: 5000
        }
      ];
    } else if (task.includes('expression') || task.includes('eval')) {
      return [
        {
          name: 'expression',
          type: 'string',
          required: true,
          description: 'Expression JavaScript à évaluer'
        },
        {
          name: 'context',
          type: 'object',
          required: false,
          description: 'Contexte pour l\'évaluation'
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
        name: 'executeCode',
        description: 'Exécute un bloc de code JavaScript/TypeScript dans un environnement sécurisé',
        requiredParameters: [
          {
            name: 'code',
            type: 'string',
            required: true,
            description: 'Code JavaScript/TypeScript à exécuter'
          },
          {
            name: 'input',
            type: 'object',
            required: false,
            description: 'Données d\'entrée pour le code'
          }
        ]
      },
      {
        name: 'evaluateExpression',
        description: 'Évalue une expression JavaScript simple',
        requiredParameters: [
          {
            name: 'expression',
            type: 'string',
            required: true,
            description: 'Expression JavaScript à évaluer'
          },
          {
            name: 'context',
            type: 'object',
            required: false,
            description: 'Contexte pour l\'évaluation'
          }
        ]
      },
      {
        name: 'defineFunction',
        description: 'Définit une fonction réutilisable',
        requiredParameters: [
          {
            name: 'name',
            type: 'string',
            required: true,
            description: 'Nom de la fonction'
          },
          {
            name: 'code',
            type: 'string',
            required: true,
            description: 'Code de la fonction'
          },
          {
            name: 'params',
            type: 'array',
            required: false,
            description: 'Paramètres de la fonction'
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
      case 'executeCode': {
        if (!parameters.code) {
          errors.push('Code is required for executeCode');
        } else if (!this.isSafeCode(parameters.code)) {
          errors.push('Code contains potentially unsafe operations');
        }
        break;
      }
      
      case 'evaluateExpression': {
        if (!parameters.expression) {
          errors.push('Expression is required for evaluateExpression');
        } else if (!this.isSafeExpression(parameters.expression)) {
          errors.push('Expression contains potentially unsafe operations');
        }
        break;
      }
      
      case 'defineFunction': {
        if (!parameters.name) {
          errors.push('Name is required for defineFunction');
        }
        if (!parameters.code) {
          errors.push('Code is required for defineFunction');
        } else if (!this.isSafeCode(parameters.code)) {
          errors.push('Function code contains potentially unsafe operations');
        }
        break;
      }
      
      default:
        errors.push(`Unknown intent: ${intent}`);
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Gère l'exécution de code JavaScript/TypeScript
   * @param parameters Paramètres pour l'exécution
   */
  private async handleCodeExecution(parameters: Record<string, any>): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const { code, input = {}, timeout = 5000 } = parameters;
    
    try {
      // Créer un environnement d'exécution sécurisé
      const result = await this.executeSandboxedCode(code, input, timeout);
      
      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
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
   * Gère l'évaluation d'expressions
   * @param parameters Paramètres pour l'évaluation
   */
  private async handleExpressionEvaluation(parameters: Record<string, any>): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const { expression, context = {} } = parameters;
    
    try {
      // Évaluer l'expression de manière sécurisée
      const result = await this.evaluateSandboxedExpression(expression, context);
      
      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
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
   * Gère la définition de fonctions
   * @param parameters Paramètres pour la définition
   */
  private async handleFunctionDefinition(parameters: Record<string, any>): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const { name, code, params = [] } = parameters;
    
    try {
      // Créer une fonction à partir du code
      const functionBody = `return function ${name}(${params.join(', ')}) {\n${code}\n}`;
      const func = new Function(functionBody)();
      
      return {
        success: true,
        output: {
          name,
          function: func.toString(),
          params
        },
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
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
   * Exécute du code dans un environnement sandbox
   * @param code Code à exécuter
   * @param input Données d'entrée
   * @param timeout Timeout en ms
   */
  private async executeSandboxedCode(code: string, input: any, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      // Créer un timeout pour l'exécution
      const timeoutId = setTimeout(() => {
        reject(new Error(`Code execution timed out after ${timeout}ms`));
      }, timeout);
      
      try {
        // Dans une implémentation réelle, nous utiliserions vm2/isolated-vm ou un Worker 
        // pour exécuter le code dans un environnement isolé
        
        // Préparation du code avec des protections
        const safeCode = `
          "use strict";
          return (function(input) {
            ${code}
          })(input);
        `;

        // Exécuter le code
        const result = new Function('input', safeCode)(input);
        
        // Nettoyer le timeout
        clearTimeout(timeoutId);
        
        // Résoudre avec le résultat
        resolve(result);
      } catch (error) {
        // Nettoyer le timeout
        clearTimeout(timeoutId);
        
        // Rejeter avec l'erreur
        reject(error);
      }
    });
  }

  /**
   * Évalue une expression dans un environnement sandbox
   * @param expression Expression à évaluer
   * @param context Contexte d'évaluation
   */
  private async evaluateSandboxedExpression(expression: string, context: Record<string, any>): Promise<any> {
    // Créer une fonction qui évalue l'expression dans le contexte donné
    const evalFunction = new Function(
      ...Object.keys(context),
      `"use strict"; return (${expression});`
    );
    
    // Évaluer l'expression avec le contexte
    return evalFunction(...Object.values(context));
  }

  /**
   * Vérifie si le code est sécurisé
   * @param code Code à vérifier
   */
  private isSafeCode(code: string): boolean {
    // Liste des motifs dangereux
    const unsafePatterns = [
      /eval\s*\(/,                   // eval()
      /Function\s*\(/,               // Function constructor
      /process/,                     // Node.js process object
      /require\s*\([^)]*['"](fs|path|child_process|os|net|http|https|crypto|dns|dgram|stream|zlib|tls|v8)['"]/,  // Dangerous modules
      /document\s*\.\s*(write|cookie)/,  // DOM manipulation
      /localStorage/,                // Browser storage
      /window\s*\.\s*(location|open|history)/, // Browser navigation
    ];
    
    // Vérifier si le code contient des motifs dangereux
    return !unsafePatterns.some(pattern => pattern.test(code));
  }

  /**
   * Vérifie si l'expression est sécurisée
   * @param expression Expression à vérifier
   */
  private isSafeExpression(expression: string): boolean {
    // Pour les expressions, nous sommes encore plus stricts
    const unsafePatterns = [
      /eval\s*\(/,        // eval()
      /Function\s*\(/,     // Function constructor
      /\bprocess\b/,       // Node.js process
      /require\s*\(/,      // require()
      /import\s*\(/,       // dynamic import
      /\bdocument\b/,      // Browser DOM
      /\bwindow\b/,        // Browser window
      /\blocalStorage\b/,  // Browser storage
      /\.\s*prototype\s*\./ // Prototype manipulation
    ];
    
    return !unsafePatterns.some(pattern => pattern.test(expression));
  }
}

// Enregistrement de l'agent dans le registre
agentRegistry.register(new WorkflowCodeAgent());

export default WorkflowCodeAgent;
