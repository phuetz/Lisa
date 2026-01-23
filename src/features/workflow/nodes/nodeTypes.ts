/**
 * nodeTypes.ts
 * Définition de tous les types de nœuds disponibles dans le workflow
 */

import { z } from 'zod';
import { RosAgentConfigSchema } from '../../../agents/RosAgent';

export interface NodeInputOutput {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
}

// Define a base schema for node configuration using Zod
export const BaseNodeConfigSchema = z.object({
  // Common fields for all nodes can go here
});

export interface NodeType {
  name: string;
  category: string;
  description: string;
  icon?: string;
  color?: string;
  inputs?: NodeInputOutput[];
  outputs?: NodeInputOutput[];
  configSchema?: z.ZodTypeAny;
  examples?: Array<{
    title: string;
    description: string;
    config: Record<string, unknown>;
  }>;
}

// Define the schema for the webhook node
export const WebhookConfigSchema = BaseNodeConfigSchema.extend({
  path: z.string().min(1, 'Path is required').describe('Chemin de l\'URL du webhook (ex: /mon-webhook)'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST').describe('Méthode HTTP attendue'),
  responseBody: z.string().optional().describe('Corps de la réponse HTTP (JSON ou texte)'),
  responseHeaders: z.record(z.string(), z.string()).optional().describe('En-têtes de la réponse HTTP'),
  statusCode: z.number().int().min(100).max(599).optional().describe('Code de statut HTTP de la réponse'),
});

// Définition des types de nœuds disponibles dans l'éditeur

export const nodeTypes: Record<string, NodeType> = {
  'webhook': {
    name: 'Webhook',
    category: 'Trigger',
    description: 'Déclenche le workflow via une requête HTTP entrante.',
    icon: '🎣',
    color: '#FF9800',
    inputs: [],
    outputs: [
      { id: 'body', type: 'object', label: 'Corps de la requête' },
      { id: 'headers', type: 'object', label: 'En-têtes de la requête' },
      { id: 'query', type: 'object', label: 'Paramètres de requête' }
    ],
    configSchema: WebhookConfigSchema, // Use the Zod schema here
    examples: [
      {
        title: 'Webhook simple',
        description: 'Déclenche le workflow et répond avec un statut 200.',
        config: {
          path: '/simple-webhook',
          method: 'GET',
          responseBody: '{ "status": "ok" }',
          statusCode: 200
        }
      }
    ]
  },


  // Opérations HTTP
  'http-request': {
    name: 'Requête HTTP',
    category: 'API',
    description: 'Envoie une requête HTTP et récupère la réponse',
    icon: '🌐',
    color: 'blue',
    inputs: [
      { id: 'data', type: 'object', label: 'Données' }
    ],
    outputs: [
      { id: 'response', type: 'object', label: 'Réponse' },
      { id: 'headers', type: 'object', label: 'En-têtes' },
      { id: 'status', type: 'number', label: 'Code HTTP' }
    ],
    configSchema: z.object({
      url: z.string().url('URL must be a valid URL').describe('URL de la requête'),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET').describe('Méthode HTTP'),
      headers: z.record(z.string(), z.string()).optional().describe('En-têtes de la requête (JSON)'),
      body: z.string().optional().describe('Corps de la requête (JSON ou texte)'),
      timeout: z.number().int().positive('Timeout must be a positive number').optional().describe('Délai d\'attente en ms'),
    }),
    examples: [
      {
        title: 'GET Request',
        description: 'Récupérer des données depuis une API',
        config: {
          url: 'https://api.example.com/data',
          method: 'GET'
        }
      },
      {
        title: 'POST avec JSON',
        description: 'Envoyer des données au format JSON',
        config: {
          url: 'https://api.example.com/create',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ "name": "Example", "value": 123 }' // Body as string for simplicity in config
        }
      }
    ]
  },

  'set': {
    name: 'Set',
    category: 'Data',
    description: 'Définit ou modifie une valeur dans les données du workflow.',
    icon: '📝',
    color: 'orange',
    inputs: [
      { id: 'input', type: 'any', label: 'Données d\'entrée' }
    ],
    outputs: [
      { id: 'output', type: 'any', label: 'Données de sortie' }
    ],
    configSchema: z.object({
      key: z.string().min(1, 'Key is required').describe('Clé de la propriété à définir'),
      value: z.string().describe('Valeur ou expression à assigner').meta({ expression: true }),
    }),
    examples: [
      {
        title: 'Définir une nouvelle propriété',
        description: 'Ajoute une nouvelle propriété aux données.',
        config: {
          key: 'myNewProperty',
          value: 'Hello World'
        }
      },
      {
        title: 'Modifier une propriété existante',
        description: 'Met à jour la valeur d\'une propriété existante.',
        config: {
          key: 'existingProperty',
          value: '{{input.value}} * 2'
        }
      }
    ]
  },

  // Manipulation de données
  'data-transform': {
    name: 'Transformation de données',
    category: 'Data',
    description: 'Transforme des données selon différents modèles',
    icon: '🔄',
    color: 'green',
    inputs: [
      { id: 'data', type: 'any', label: "Données d'entrée" }
    ],
    outputs: [
      { id: 'data', type: 'any', label: 'Données transformées' }
    ],
    configSchema: z.object({
      transformType: z.enum(['map', 'filter', 'reduce', 'sort', 'groupBy', 'custom']).describe('Action à effectuer'),
      expression: z.string().optional().describe('Expression de transformation (JavaScript)').meta({ expression: true }),
    }),
    examples: [
      {
        title: 'Mapper un tableau',
        description: 'Appliquer une transformation à chaque élément',
        config: {
          transformType: 'map',
          expression: 'item => item.value * 2'
        }
      },
      {
        title: 'Filtrer des données',
        description: 'Conserver uniquement les éléments correspondants',
        config: {
          transformType: 'filter',
          expression: 'item => item.status === "active"'
        }
      }
    ]
  },

  // Flux de contrôle
  'condition': {
    name: 'Condition',
    category: 'Logic',
    description: 'Exécution conditionnelle basée sur les données d\'entrée',
    icon: '⚙️',
    color: 'yellow',
    inputs: [
      { id: 'input', type: 'any', label: 'Données' }
    ],
    outputs: [
      { id: 'true', type: 'any', label: 'Si vrai' },
      { id: 'false', type: 'any', label: 'Si faux' }
    ],
    configSchema: z.object({
      condition: z.string().min(1, 'Condition is required').describe('Expression JavaScript évaluée à vrai/faux').meta({ expression: true }),
    }),
    examples: [
      {
        title: 'Vérifier une valeur',
        description: 'Branchement selon une valeur numérique',
        config: {
          condition: 'inputs.data.value > 100'
        }
      }
    ]
  },

  'for-each': {
    name: 'Pour chaque',
    category: 'Logic',
    description: 'Itère sur une liste de données et exécute les nœuds suivants pour chaque élément.',
    icon: '🔁',
    color: '#8BC34A',
    inputs: [
      { id: 'input', type: 'any', label: 'Données d\'entrée' }
    ],
    outputs: [
      { id: 'output', type: 'any', label: 'Sortie de la boucle' }
    ],
    configSchema: z.object({
      listExpression: z.string().min(1, 'List expression is required').describe('Expression JavaScript pour la liste à itérer (ex: input.items)').meta({ expression: true }),
      iterationVariable: z.string().min(1, 'Iteration variable is required').default('item').describe('Nom de la variable pour chaque élément (ex: item)').meta({ expression: true }),
    }),
    examples: [
      {
        title: 'Itérer sur un tableau',
        description: 'Exécute les nœuds suivants pour chaque élément d\'un tableau.',
        config: {
          listExpression: 'input.users',
          iterationVariable: 'user'
        }
      }
    ]
  },

  // Exécution de code
  'condition-code': {
    name: 'Condition (Code)',
    category: 'Logic',
    description: 'Exécution conditionnelle basée sur les données d\'entrée (via code).',
    icon: '⚙️',
    color: 'yellow',
    inputs: [
      { id: 'data', type: 'any', label: 'Données' }
    ],
    outputs: [
      { id: 'true', type: 'any', label: 'Si vrai' },
      { id: 'false', type: 'any', label: 'Si faux' }
    ],
    configSchema: z.object({
      condition: z.string().min(1, 'Condition is required').describe('Expression JavaScript évaluée à vrai/faux').meta({ expression: true }),
    }),
    examples: [
      {
        title: 'Vérifier une valeur',
        description: 'Branchement selon une valeur numérique',
        config: {
          condition: 'inputs.data.value > 100'
        }
      }
    ]
  },

  // Exécution de code
  'code': {
    name: 'Exécuter du code',
    category: 'Code',
    description: 'Exécute du code JavaScript ou Python personnalisé',
    icon: '📝',
    color: 'purple',
    inputs: [
      { id: 'data', type: 'any', label: 'Données d\'entrée' }
    ],
    outputs: [
      { id: 'result', type: 'any', label: 'Résultat' }
    ],
    configSchema: z.object({
      language: z.enum(['javascript', 'python']).default('javascript'),
      code: z.string().min(1, 'Code is required').describe('Code à exécuter').refine(val => val.includes('result'), { message: 'Code must define a "result" variable' }).meta({ expression: true }),
    }),
    examples: [
      {
        title: 'Traitement JS simple',
        description: 'Transformer des données avec JavaScript',
        config: {
          language: 'javascript',
          code: 'const result = inputs.data.map(item => {\n  return { ...item, processed: true };\n});'
        }
      },
      {
        title: 'Calcul Python',
        description: 'Utiliser NumPy pour des calculs',
        config: {
          language: 'python',
          code: 'import numpy as np\n\ndata = inputs["data"]\nresult = np.mean(data)'
        }
      }
    ]
  },

  // Services externes
  'openai': {
    name: 'OpenAI',
    category: 'AI',
    description: 'Intégration avec l\'API OpenAI pour la génération de texte',
    icon: '🧠',
    color: 'teal',
    inputs: [
      { id: 'prompt', type: 'string', label: 'Prompt' },
      { id: 'data', type: 'object', label: 'Contexte' }
    ],
    outputs: [
      { id: 'response', type: 'string', label: 'Réponse' },
      { id: 'usage', type: 'object', label: 'Utilisation' }
    ],
    configSchema: z.object({
      model: z.enum(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']).default('gpt-3.5-turbo'),
      temperature: z.number().min(0).max(2).default(0.7),
      prompt: z.string().min(1, 'Prompt is required').describe('Prompt pour la génération de contenu').meta({ expression: true }),
      systemMessage: z.string().optional().describe('Message système pour le modèle').meta({ expression: true }),
    }),
    examples: [
      {
        title: 'Génération de texte',
        description: 'Générer une réponse à une question',
        config: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          prompt: 'Explique-moi comment fonctionne la photosynthèse'
        }
      },
      {
        title: 'Classification',
        description: 'Classifier le sentiment d\'un texte',
        config: {
          model: 'gpt-4',
          temperature: 0.3,
          systemMessage: 'Tu es un classificateur de sentiment qui répond uniquement par "positif", "négatif" ou "neutre".'
        }
      }
    ]
  },

  'content-generator': {
    name: 'Générateur de Contenu',
    category: 'AI',
    description: 'Génère et manipule du contenu textuel (résumé, traduction, réécriture).',
    icon: '✍️',
    color: '#FF5722',
    inputs: [
      { id: 'input', type: 'string', label: 'Texte/Prompt' }
    ],
    outputs: [
      { id: 'output', type: 'string', label: 'Contenu Généré' }
    ],
    configSchema: z.object({
      
      text: z.string().optional().describe('Texte à traiter (pour résumé, traduction, réécriture)').meta({ expression: true }),
      prompt: z.string().optional().describe('Prompt pour la génération de contenu').meta({ expression: true }),
      targetLanguage: z.string().optional().describe('Langue cible (pour traduction)'),
      style: z.enum(['formal', 'casual', 'creative', 'technical', 'persuasive']).optional().describe('Style d\'écriture'),
      length: z.enum(['short', 'medium', 'long']).optional().describe('Longueur du contenu'),
    }),
    examples: [
      {
        title: 'Résumer un texte',
        description: 'Résumer un long paragraphe en quelques phrases.',
        config: {
          action: 'summarize',
          text: 'Ceci est un très long texte à résumer...',
          length: 'short'
        }
      },
      {
        title: 'Traduire en anglais',
        description: "Traduire un texte du français vers l'anglais.",
        config: {
          action: 'translate',
          text: 'Bonjour le monde!',
          targetLanguage: 'en'
        }
      },
      {
        title: 'Générer une idée',
        description: 'Générer des idées de titres pour un article de blog.',
        config: {
          action: 'generate',
          prompt: "Idées de titres pour un article sur l'IA générative",
          length: 'short'
        }
      }
    ]
  },



  'personalization': {
    name: 'Personnalisation',
    category: 'AI',
    description: "Adapte l'expérience utilisateur en fonction des préférences et comportements.",
    icon: '👤',
    color: '#4CAF50',
    inputs: [
      { id: 'action', type: 'string', label: 'Action' },
      { id: 'params', type: 'object', label: 'Paramètres' }
    ],
    outputs: [
      { id: 'result', type: 'object', label: 'Résultat' }
    ],
    configSchema: z.object({
      action: z.enum(['get_preferences', 'set_preference', 'get_recommendations', 'track_interaction', 'get_user_profile', 'adapt_response']).describe('Action à effectuer'),
      category: z.string().optional().describe('Catégorie de préférence'),
      key: z.string().optional().describe('Clé de préférence'),
      value: z.unknown().optional().describe('Valeur de préférence'),
      context: z.record(z.string(), z.unknown()).optional().describe('Contexte pour les recommandations/adaptation'),
    }),
    examples: [
      {
        title: 'Obtenir les préférences',
        description: "Récupérer les préférences de l'utilisateur.",
        config: {
          action: 'get_preferences',
          category: 'ui'
        }
      },
      {
        title: 'Définir une préférence',
        description: "Définir le thème préféré de l'utilisateur.",
        config: {
          action: 'set_preference',
          category: 'ui',
          key: 'theme',
          value: 'dark'
        }
      }
    ]
  },

  'audio-classifier': {
    name: 'Classificateur Audio',
    category: 'AI',
    description: 'Classifie les sons provenant d\'une source audio (microphone, fichier).',
    icon: '🔊',
    color: 'orange',
    inputs: [
      { id: 'audioSource', type: 'any', label: 'Source Audio' }
    ],
    outputs: [
      { id: 'classification', type: 'object', label: 'Classification' }
    ],
    configSchema: z.object({
      model: z.string().optional().describe('Modèle de classification audio à utiliser'),
      threshold: z.number().min(0).max(1).default(0.5).optional().describe('Seuil de confiance'),
    }),
    examples: [
      {
        title: 'Détection de parole',
        description: 'Détecte si la source audio contient de la parole.',
        config: {
          model: 'speech_commands',
          threshold: 0.7
        }
      }
    ]
  },

  'object-detector': {
    name: "Détecteur d'Objets",
    category: 'AI',
    description: 'Détecte et identifie les objets dans une image ou un flux vidéo.',
    icon: '👁️',
    color: 'purple',
    inputs: [
      { id: 'imageSource', type: 'any', label: 'Source Image/Vidéo' }
    ],
    outputs: [
      { id: 'detections', type: 'array', label: "Détections d'Objets" }
    ],
    configSchema: z.object({
      model: z.string().optional().describe('Modèle de détection d\'objets à utiliser'),
      threshold: z.number().min(0).max(1).default(0.5).optional().describe('Seuil de confiance'),
    }),
    examples: [
      {
        title: 'Détection générale',
        description: 'Détecte les objets courants dans une image.',
        config: {
          model: 'efficientdet_lite0',
          threshold: 0.6
        }
      }
    ]
  },

  'rosPublisher': {
    name: 'ROS Publisher',
    category: 'ROS',
    description: 'Publishes a message to a ROS topic.',
    icon: '⬆️',
    color: 'pink',
    inputs: [
      { id: 'input', type: 'any', label: 'Input Data' }
    ],
    outputs: [
      { id: 'output', type: 'object', label: 'Output Status' }
    ],
    configSchema: z.object({
      topicName: z.string().min(1, 'Topic name is required').describe('Name of the ROS topic'),
      messageType: z.string().min(1, 'Message type is required').describe('Type of the ROS message (e.g., std_msgs/String)'),
      messageContent: z.record(z.string(), z.unknown()).describe('Content of the message in JSON format'),
    }),
    examples: [
      {
        title: 'Publish String Message',
        description: 'Publish a simple string message to /chatter topic',
        config: {
          topicName: '/chatter',
          messageType: 'std_msgs/String',
          messageContent: { data: 'Hello ROS!' }
        }
      }
    ]
  },

  'rosSubscriber': {
    name: 'ROS Subscriber',
    category: 'ROS',
    description: 'Subscribes to a ROS topic and outputs received messages.',
    icon: '⬇️',
    color: 'pink',
    inputs: [
      { id: 'trigger', type: 'any', label: 'Trigger' }
    ],
    outputs: [
      { id: 'message', type: 'object', label: 'Received Message' }
    ],
    configSchema: z.object({
      topicName: z.string().min(1, 'Topic name is required').describe('Name of the ROS topic to subscribe to'),
      messageType: z.string().min(1, 'Message type is required').describe('Type of the ROS message (e.g., std_msgs/String)'),
      timeout: z.number().int().optional().describe('Timeout in ms for receiving a message (default: 5000)'),
    }),
    examples: [
      {
        title: 'Subscribe to String Message',
        description: 'Subscribe to /chatter topic for string messages',
        config: {
          topicName: '/chatter',
          messageType: 'std_msgs/String',
          timeout: 5000
        }
      }
    ]
  },

  'rosService': {
    name: 'ROS Service',
    category: 'ROS',
    description: 'Calls a ROS service and outputs the response.',
    icon: '↔️',
    color: 'pink',
    inputs: [
      { id: 'request', type: 'object', label: 'Service Request' }
    ],
    outputs: [
      { id: 'response', type: 'object', label: 'Service Response' }
    ],
    configSchema: z.object({
      serviceName: z.string().min(1, 'Service name is required').describe('Name of the ROS service to call'),
      serviceType: z.string().min(1, 'Service type is required').describe('Type of the ROS service (e.g., my_robot_msgs/PickUpObject)'),
      requestContent: z.record(z.string(), z.unknown()).optional().describe('Content of the service request in JSON format'),
      timeout: z.number().int().optional().describe('Timeout in ms for service response (default: 5000)'),
    }),
    examples: [
      {
        title: 'Call PickUpObject Service',
        description: 'Call a service to pick up an object',
        config: {
          serviceName: '/my_robot/pick_up',
          serviceType: 'my_robot_msgs/PickUpObject',
          requestContent: {
            object_id: 'cube_1',
            location: { x: 1.0, y: 2.0, z: 0.0 }
          },
          timeout: 10000
        }
      }
    ]
  },

  'delay': {
    name: 'Délai',
    category: 'Logic',
    description: 'Introduit un délai configurable dans le workflow.',
    icon: '⏳',
    color: '#FFC107',
    inputs: [
      { id: 'input', type: 'any', label: 'Entrée' }
    ],
    outputs: [
      { id: 'output', type: 'any', label: 'Sortie' }
    ],
    configSchema: z.object({
      delayMs: z.number().int().positive('Delay must be a positive number').default(1000).describe('Délai en millisecondes'),
    }),
    examples: [
      {
        title: 'Délai de 1 seconde',
        description: 'Pause le workflow pendant 1000 ms.',
        config: {
          delayMs: 1000
        }
      }
    ]
  },

  'log': {
    name: 'Log',
    category: 'Utility',
    description: 'Enregistre un message dans les logs du workflow.',
    icon: '📜',
    color: '#607D8B',
    inputs: [
      { id: 'input', type: 'any', label: 'Données à logger' }
    ],
    outputs: [
      { id: 'output', type: 'any', label: 'Données pass-through' }
    ],
    configSchema: z.object({
      message: z.string().min(1, 'Message is required').describe('Message à logger'),
      level: z.enum(['info', 'warn', 'error', 'debug']).default('info').describe('Niveau de log'),
    }),
    examples: [
      {
        title: 'Logger un message',
        description: 'Enregistrer un message simple.',
        config: {
          message: 'Workflow démarré.',
          level: 'info'
        }
      },
      {
        title: 'Logger des données',
        description: "Enregistrer le contenu d'une variable.",
        config: {
          message: 'Données reçues: {{input}}',
          level: 'debug'
        }
      }
    ]
  },

  // Entrées / Sorties
  
  'calendar': {
    name: 'Google Agenda',
    category: 'Productivity',
    description: 'Gère les événements Google Agenda (créer, lister, etc.).',
    icon: '📅',
    color: '#4285F4',
    inputs: [
      { id: 'action', type: 'string', label: 'Action' },
      { id: 'params', type: 'object', label: 'Paramètres' }
    ],
    outputs: [
      { id: 'result', type: 'object', label: 'Résultat' }
    ],
    configSchema: z.object({
      action: z.enum(['create_event', 'list_events', 'delete_event', 'update_event', 'find_available_time']).describe('Action à effectuer'),
      eventData: z.record(z.string(), z.unknown()).optional().describe('Données de l\'événement (pour créer/mettre à jour)'),
      period: z.enum(['today', 'tomorrow', 'week', 'month', 'custom']).optional().describe('Période pour lister les événements'),
      eventId: z.string().optional().describe('ID de l\'événement (pour supprimer/mettre à jour)'),
      duration: z.number().int().optional().describe('Durée en minutes (pour trouver un créneau)'),
      date: z.string().optional().describe('Date (pour trouver un créneau)'),
    }),
    examples: [
      {
        title: 'Créer un événement',
        description: 'Créer un nouvel événement dans Google Agenda.',
        config: {
          action: 'create_event',
          eventData: {
            summary: 'Réunion d\'équipe',
            start: { dateTime: '2025-07-15T10:00:00', timeZone: 'Europe/Paris' },
            end: { dateTime: '2025-07-15T11:00:00', timeZone: 'Europe/Paris' },
          },
        },
      },
      {
        title: 'Lister les événements d\'aujourd\'hui',
        description: 'Lister tous les événements pour aujourd\'hui.',
        config: {
          action: 'list_events',
          period: 'today',
        },
      },
    ],
  },
  'todo': {
    name: 'Liste de tâches',
    category: 'Productivity',
    description: "Gère la liste de tâches de l'utilisateur.",
    icon: '✅',
    color: '#34A853',
    inputs: [
      { id: 'action', type: 'string', label: 'Action' },
      { id: 'params', type: 'object', label: 'Paramètres' }
    ],
    outputs: [
      { id: 'result', type: 'object', label: 'Résultat' }
    ],
    configSchema: z.object({
      action: z.enum(['add_item', 'remove_item', 'list_items', 'update_item', 'mark_complete', 'mark_incomplete', 'clear_completed']).describe('Action à effectuer'),
      text: z.string().optional().describe('Texte de la tâche'),
      id: z.string().optional().describe('ID de la tâche'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Priorité de la tâche'),
      dueDate: z.string().optional().describe('Date d\'échéance de la tâche'),
      filter: z.enum(['all', 'active', 'completed']).optional().describe('Filtre pour lister les tâches'),
    }),
    examples: [
      {
        title: 'Ajouter une tâche',
        description: 'Ajouter une nouvelle tâche à la liste.',
        config: {
          action: 'add_item',
          text: 'Acheter du lait',
          priority: 'high',
        },
      },
      {
        title: 'Lister les tâches actives',
        description: 'Lister toutes les tâches actives.',
        config: {
          action: 'list_items',
          filter: 'active',
        },
      },
    ],
  },

  'github': {
    name: 'GitHub',
    category: 'API',
    description: "Interagit avec l'API GitHub (repos, issues, PRs, commits).",
    icon: '🐙',
    color: '#181717',
    inputs: [
      { id: 'action', type: 'string', label: 'Action' },
      { id: 'params', type: 'object', label: 'Paramètres' }
    ],
    outputs: [
      { id: 'result', type: 'object', label: 'Résultat' }
    ],
    configSchema: z.object({
      action: z.enum(['listRepositories', 'getRepository', 'listIssues', 'createIssue', 'listPullRequests', 'listCommits', 'getReadme']).describe('Action à effectuer'),
      owner: z.string().optional().describe('Propriétaire du dépôt'),
      repo: z.string().optional().describe('Nom du dépôt'),
      username: z.string().optional().describe("Nom d'utilisateur GitHub"),
      state: z.enum(['open', 'closed', 'all']).optional().describe('État (issues/PRs)'),
      title: z.string().optional().describe('Titre (pour créer issue)'),
      body: z.string().optional().describe('Corps (pour créer issue)'),
      labels: z.array(z.string()).optional().describe('Labels (pour créer issue)'),
    }),
    examples: [
      {
        title: 'Lister les dépôts',
        description: "Lister tous les dépôts d'un utilisateur.",
        config: {
          action: 'listRepositories',
          username: 'octocat',
        },
      },
      {
        title: 'Créer une issue',
        description: 'Créer une nouvelle issue dans un dépôt.',
        config: {
          action: 'createIssue',
          owner: 'octocat',
          repo: 'hello-world',
          title: 'Bug: Something is broken',
          body: 'Detailed description of the bug.',
          labels: ['bug', 'help wanted'],
        },
      },
    ],
  },

  'powershell': {
    name: 'PowerShell',
    category: 'System',
    description: 'Exécute des commandes PowerShell sur le système hôte.',
    icon: '💻',
    color: '#012456',
    inputs: [
      { id: 'command', type: 'string', label: 'Commande' },
      { id: 'options', type: 'object', label: 'Options' }
    ],
    outputs: [
      { id: 'output', type: 'string', label: 'Sortie' },
      { id: 'error', type: 'string', label: 'Erreur' }
    ],
    configSchema: z.object({
      command: z.string().min(1, 'Command is required').describe('Commande PowerShell à exécuter'),
      timeout: z.number().int().optional().describe('Délai d\'attente en ms'),
    }),
    examples: [
      {
        title: 'Obtenir les processus',
        description: 'Lister les processus en cours d\'exécution.',
        config: {
          command: 'Get-Process'
        }
      },
      {
        title: 'Obtenir les services',
        description: 'Lister les services Windows.',
        config: {
          command: 'Get-Service'
        }
      }
    ]
  },
  
  'speech-synthesis': {
    name: 'Synthèse Vocale',
    category: 'Communication',
    description: 'Convertit du texte en parole et le prononce.',
    icon: '🗣️',
    color: '#673AB7',
    inputs: [
      { id: 'text', type: 'string', label: 'Texte à prononcer' }
    ],
    outputs: [
      { id: 'status', type: 'string', label: 'Statut' }
    ],
    configSchema: z.object({
      text: z.string().min(1, 'Text is required').describe('Texte à convertir en parole'),
      voice: z.string().optional().describe('Nom de la voix à utiliser'),
      rate: z.number().min(0.1).max(10).default(1.0).optional().describe('Vitesse de la parole'),
      pitch: z.number().min(0).max(2).default(1.0).optional().describe('Hauteur de la parole'),
    }),
    examples: [
      {
        title: 'Prononcer un texte',
        description: 'Convertir un texte en parole et le prononcer.',
        config: {
          text: 'Bonjour, je suis Lisa.',
          voice: 'Google français',
        },
      },
    ],
  },
  'web-search': {
    name: 'Recherche Web',
    category: 'AI',
    description: 'Effectue une recherche sur le web et résume les résultats.',
    icon: '🔍',
    color: '#DB4437',
    inputs: [
      { id: 'query', type: 'string', label: 'Requête' }
    ],
    outputs: [
      { id: 'summary', type: 'string', label: 'Résumé' },
      { id: 'results', type: 'array', label: 'Résultats bruts' }
    ],
    configSchema: z.object({
      query: z.string().min(1, 'Query is required').describe('Requête de recherche web'),
    }),
    examples: [
      {
        title: 'Rechercher des informations',
        description: 'Rechercher des informations sur un sujet donné.',
        config: {
          query: 'Actualités de l\'IA',
        },
      },
    ],
  },
  'web-content-reader': {
    name: 'Lecture Contenu Web',
    category: 'API',
    description: 'Lit et extrait le contenu principal d\'une URL donnée.',
    icon: '📄',
    color: '#0F9D58',
    inputs: [
      { id: 'url', type: 'string', label: 'URL' }
    ],
    outputs: [
      { id: 'content', type: 'string', label: 'Contenu Textuel' },
      { id: 'summary', type: 'string', label: 'Résumé' }
    ],
    configSchema: z.object({
      url: z.string().url('URL must be a valid URL').describe('URL de la page web à lire'),
    }),
    examples: [
      {
        title: 'Lire une page web',
        description: "Lire le contenu d'une page web.",
        config: {
          url: 'https://example.com',
        },
      },
    ],
  },
  'smart-home': {
    name: 'Maison Intelligente',
    category: 'IoT',
    description: 'Contrôle les appareils connectés et gère les scénarios domotiques.',
    icon: '🏠',
    color: '#FFC107',
    inputs: [
      { id: 'action', type: 'string', label: 'Action' },
      { id: 'params', type: 'object', label: 'Paramètres' }
    ],
    outputs: [
      { id: 'result', type: 'object', label: 'Résultat' }
    ],
    configSchema: z.object({
      action: z.enum(['toggle_device', 'get_device_status', 'set_device_value', 'run_scene', 'list_devices', 'list_scenes']).describe('Action à effectuer'),
      deviceId: z.string().optional().describe('ID de l\'appareil'),
      value: z.unknown().optional().describe('Valeur à définir (pour set_device_value)'),
      sceneId: z.string().optional().describe('ID de la scène à activer'),
    }),
    examples: [
      {
        title: 'Allumer une lumière',
        description: 'Allumer une lumière spécifique.',
        config: {
          action: 'toggle_device',
          deviceId: 'light_1',
          value: true,
        },
      },
      {
        title: 'Lancer une scène',
        description: 'Lancer une scène domotique.',
        config: {
          action: 'run_scene',
          sceneId: 'morning_routine',
        },
      },
    ],
  },

  // Entrées / Sorties
  'input': {
    name: 'Entrée',
    category: 'IO',
    description: "Point d'entrée du workflow",
    icon: '⬅️',
    color: 'indigo',
    outputs: [
      { id: 'data', type: 'any', label: 'Données' }
    ],
    configSchema: z.object({
      defaultValue: z.unknown().optional().describe('Valeur par défaut').meta({ expression: true }),
      description: z.string().optional().describe("Description de l'entrée"),
    }),
    examples: [
      {
        title: 'Entrée simple',
        description: 'Point d\'entrée avec valeur par défaut',
        config: {
          defaultValue: { start: true },
          description: 'Point de départ du workflow'
        }
      }
    ]
  },

  'output': {
    name: 'Sortie',
    category: 'IO',
    description: 'Point de sortie du workflow',
    icon: '➡️',
    color: 'red',
    inputs: [
      { id: 'data', type: 'any', label: 'Données' }
    ],
    configSchema: z.object({
      description: z.string().optional().describe('Description de la sortie'),
      name: z.string().optional().describe('Nom de la sortie'),
    }),
    examples: [
      {
        title: 'Sortie principale',
        description: 'Résultat final du workflow',
        config: {
          name: 'result',
          description: "Résultat de l'opération"
        }
      }
    ]
  },

  // ROS
  'rosTopic': {
    name: 'ROS Topic',
    category: 'ROS',
    description: 'Interagit avec les topics et services ROS via rosbridge_suite.',
    icon: '🤖',
    color: 'pink',
    inputs: [
      { id: 'payload', type: 'object', label: 'Payload (Publish/Service)' }
    ],
    outputs: [
      { id: 'response', type: 'object', label: 'Réponse (Subscribe/Service)' }
    ],
    configSchema: RosAgentConfigSchema,
    examples: [
      {
        title: 'Publier un message Twist',
        description: 'Publier une commande de vitesse pour un robot',
        config: {
          url: 'ws://localhost:9090',
          topic: '/cmd_vel',
          messageType: 'geometry_msgs/Twist',
          payload: {
            linear: { x: 0.5, y: 0.0, z: 0.0 },
            angular: { x: 0.0, y: 0.0, z: 0.0 }
          }
        }
      },
      {
        title: 'Souscrire à un topic String',
        description: 'Recevoir des messages d\'un topic de chaîne de caractères',
        config: {
          url: 'ws://localhost:9090',
          topic: '/chatter',
          messageType: 'std_msgs/String',
          mode: 'subscribe'
        }
      },
      {
        title: 'Appeler un service',
        description: 'Appeler un service ROS pour une action spécifique',
        config: {
          url: 'ws://localhost:9090',
          topic: '/my_robot/pick_up',
          messageType: 'my_robot_msgs/PickUpObject',
          mode: 'service',
          payload: {
            object_id: 'cube_1',
            location: { x: 1.0, y: 2.0, z: 0.0 }
          }
        }
      }
    ]
  },

  'subWorkflow': {
    name: 'Sous-Workflow',
    category: 'Logic',
    description: 'Exécute un autre workflow comme une étape.',
    icon: '➡️',
    color: '#6A0DAD',
    inputs: [
      { id: 'input', type: 'any', label: 'Entrée du sous-workflow' }
    ],
    outputs: [
      { id: 'output', type: 'any', label: 'Sortie du sous-workflow' }
    ],
    configSchema: z.object({
      workflowId: z.string().min(1, 'Workflow ID is required').describe('ID du workflow à exécuter'),
    }),
    examples: [
      {
        title: 'Exécuter un workflow de nettoyage',
        description: 'Lance un workflow pour nettoyer des données.',
        config: {
          workflowId: 'clean_data_workflow_123',
        },
      },
    ],
  },

  // === NOUVEAUX NŒUDS - 5 SENS & AI AGENTS ===

  'sense': {
    name: 'Sense Input',
    category: 'Perception',
    description: 'Lit les percepts des 5 sens de Lisa (Vision, Ouïe, Toucher, Environnement, Proprioception).',
    icon: '🧠',
    color: '#2196F3',
    inputs: [],
    outputs: [
      { id: 'percept', type: 'object', label: 'Tout percept' },
      { id: 'vision', type: 'object', label: 'Vision' },
      { id: 'hearing', type: 'object', label: 'Ouïe' },
      { id: 'touch', type: 'object', label: 'Toucher' },
      { id: 'environment', type: 'object', label: 'Environnement' },
      { id: 'proprioception', type: 'object', label: 'Proprioception' },
    ],
    configSchema: z.object({
      enabledSenses: z.array(z.enum(['vision', 'hearing', 'touch', 'environment', 'proprioception'])).default(['vision', 'hearing']).describe('Sens à activer'),
      triggerMode: z.enum(['any', 'all', 'specific']).default('any').describe('Mode de déclenchement'),
      specificSense: z.enum(['vision', 'hearing', 'touch', 'environment', 'proprioception']).optional().describe('Sens spécifique (si mode=specific)'),
      minConfidence: z.number().min(0).max(1).default(0.5).describe('Confiance minimale pour déclencher'),
      bufferSize: z.number().int().positive().default(10).describe('Taille du buffer de percepts'),
    }),
    examples: [
      {
        title: 'Écouter la vision',
        description: 'Déclenche le workflow sur détection d\'objets',
        config: {
          enabledSenses: ['vision'],
          triggerMode: 'specific',
          specificSense: 'vision',
          minConfidence: 0.7,
        },
      },
      {
        title: 'Multi-modal',
        description: 'Écoute vision et audio simultanément',
        config: {
          enabledSenses: ['vision', 'hearing'],
          triggerMode: 'any',
          minConfidence: 0.5,
        },
      },
    ],
  },

  'aiAgent': {
    name: 'AI Agent',
    category: 'AI',
    description: 'Exécute un agent Lisa (46+ agents disponibles: Chat, Vision, Code, etc.).',
    icon: '🤖',
    color: '#9C27B0',
    inputs: [
      { id: 'input', type: 'any', label: 'Données d\'entrée' },
    ],
    outputs: [
      { id: 'output', type: 'any', label: 'Résultat' },
      { id: 'error', type: 'string', label: 'Erreur' },
    ],
    configSchema: z.object({
      agentId: z.string().min(1, 'Agent ID is required').describe('ID de l\'agent à exécuter'),
      agentCategory: z.enum(['communication', 'perception', 'productivity', 'development', 'analysis', 'integration', 'workflow', 'security']).optional().describe('Catégorie de l\'agent'),
      prompt: z.string().optional().describe('Instructions pour l\'agent'),
      model: z.string().default('gpt-5-nano').describe('Modèle AI à utiliser'),
      temperature: z.number().min(0).max(2).default(0.7).describe('Température (créativité)'),
      maxTokens: z.number().int().positive().default(1000).describe('Tokens maximum'),
      timeout: z.number().int().positive().default(30000).describe('Timeout en ms'),
    }),
    examples: [
      {
        title: 'Chat Agent',
        description: 'Agent de conversation général',
        config: {
          agentId: 'ChatAgent',
          agentCategory: 'communication',
          prompt: 'Aide l\'utilisateur avec sa demande',
          model: 'gpt-5-nano',
        },
      },
      {
        title: 'Code Agent',
        description: 'Génération de code',
        config: {
          agentId: 'CodeAgent',
          agentCategory: 'development',
          prompt: 'Génère du code TypeScript propre',
          model: 'gpt-5',
          temperature: 0.3,
        },
      },
    ],
  },

  'conditionAdvanced': {
    name: 'Condition (Avancée)',
    category: 'Logic',
    description: 'Branching conditionnel avec mode simple (comparaison) ou avancé (JavaScript).',
    icon: '🔀',
    color: '#FF9800',
    inputs: [
      { id: 'input', type: 'any', label: 'Données' },
    ],
    outputs: [
      { id: 'true', type: 'any', label: 'Si vrai ✓' },
      { id: 'false', type: 'any', label: 'Si faux ✗' },
    ],
    configSchema: z.object({
      mode: z.enum(['simple', 'advanced']).default('simple').describe('Mode de condition'),
      // Mode simple
      leftOperand: z.string().optional().describe('Valeur gauche (ex: {{input.value}})'),
      operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith', 'matches']).default('eq').describe('Opérateur de comparaison'),
      rightOperand: z.string().optional().describe('Valeur droite'),
      // Mode avancé
      condition: z.string().optional().describe('Expression JavaScript (mode avancé)'),
    }),
    examples: [
      {
        title: 'Comparaison simple',
        description: 'Vérifie si une valeur est supérieure à 10',
        config: {
          mode: 'simple',
          leftOperand: '{{input.value}}',
          operator: 'gt',
          rightOperand: '10',
        },
      },
      {
        title: 'Condition avancée',
        description: 'Expression JavaScript complexe',
        config: {
          mode: 'advanced',
          condition: 'input.type === "urgent" && input.priority > 5',
        },
      },
    ],
  },
};

// Catégories des nœuds pour l'organisation
export const nodeCategories = [
  { id: 'IO', name: 'Entrées/Sorties', color: 'indigo' },
  { id: 'Logic', name: 'Logique', color: 'yellow' },
  { id: 'Data', name: 'Données', color: 'green' },
  { id: 'API', name: 'API & Intégrations', color: 'blue' },
  { id: 'AI', name: 'Intelligence Artificielle', color: 'teal' },
  { id: 'Code', name: 'Code', color: 'purple' },
  { id: 'ROS', name: 'Robot Operating System', color: 'pink' },
  { id: 'Perception', name: 'Perception (5 Sens)', color: 'cyan' },
];

// n8n-inspired styles for nodes
export const nodeStyles: Record<string, { border: string; icon: string }> = {
  // Triggers
  start: { border: 'border-green-400', icon: '▶️' },
  cron: { border: 'border-green-400', icon: '⏰' },

  // Communication
  email: { border: 'border-blue-400', icon: '📧' },
  slack: { border: 'border-blue-400', icon: '💬' },

  // Database
  mysql: { border: 'border-purple-400', icon: '🗃️' },
  mongodb: { border: 'border-purple-400', icon: '🍃' },

  // AI
  openai: { border: 'border-emerald-400', icon: '🤖' },
  claude: { border: 'border-emerald-400', icon: '🧠' },

  // Core/Code
  transform: { border: 'border-orange-400', icon: '🔄' },
  code: { border: 'border-orange-400', icon: '</>' },

  // Flow
  merge: { border: 'border-cyan-400', icon: '🔀' },
  condition: { border: 'border-cyan-400', icon: '❓' },

  // Cloud
  aws: { border: 'border-amber-400', icon: '☁️' },
  google: { border: 'border-amber-400', icon: '🇬' },
  
  // Default
  default: { border: 'border-gray-400', icon: '📦' },
};

export const nodeShapes: Record<string, { width: string; height: string; shapeClass: string }> = {
  trigger: { width: 'w-24', height: 'h-24', shapeClass: 'hexagon' },
  communication: { width: 'w-32', height: 'h-20', shapeClass: 'rounded-lg' },
  database: { width: 'w-36', height: 'h-24', shapeClass: 'rounded-lg' },
  ai: { width: 'w-40', height: 'h-28', shapeClass: 'rounded-lg' },
  flow: { width: 'w-24', height: 'h-16', shapeClass: 'rounded-lg' },
  IO: { width: 'w-24', height: 'h-16', shapeClass: 'rounded-lg' },
  default: { width: 'w-32', height: 'h-20', shapeClass: 'rounded-lg' },
};

export default nodeTypes;
