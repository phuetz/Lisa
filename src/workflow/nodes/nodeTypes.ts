/**
 * nodeTypes.ts
 * Définition de tous les types de nœuds disponibles dans le workflow
 */

export interface NodeInputOutput {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface NodeType {
  name: string;
  category: string;
  description: string;
  icon?: string;
  color?: string;
  inputs?: NodeInputOutput[];
  outputs?: NodeInputOutput[];
  configSchema?: Record<string, any>; // À remplacer par un schéma Zod ou Yup
  examples?: Array<{
    title: string;
    description: string;
    config: Record<string, any>;
  }>;
}

// Définition des types de nœuds disponibles dans l'éditeur
export const nodeTypes: Record<string, NodeType> = {
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
    configSchema: {
      url: { type: 'string', required: true },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      headers: { type: 'object' },
      body: { type: 'object' },
      timeout: { type: 'number' }
    },
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
          body: { name: 'Example', value: 123 }
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
      { id: 'data', type: 'any', label: 'Données d\'entrée' }
    ],
    outputs: [
      { id: 'data', type: 'any', label: 'Données transformées' }
    ],
    configSchema: {
      transformType: { 
        type: 'string', 
        enum: ['map', 'filter', 'reduce', 'sort', 'groupBy', 'custom'],
        required: true 
      },
      expression: { type: 'string', description: 'Expression de transformation' }
    },
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
      { id: 'data', type: 'any', label: 'Données' }
    ],
    outputs: [
      { id: 'true', type: 'any', label: 'Si vrai' },
      { id: 'false', type: 'any', label: 'Si faux' }
    ],
    configSchema: {
      condition: { 
        type: 'string', 
        required: true,
        description: 'Expression JavaScript évaluée à vrai/faux'
      }
    },
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
    configSchema: {
      language: { 
        type: 'string', 
        enum: ['javascript', 'python'],
        default: 'javascript'
      },
      code: { 
        type: 'string', 
        required: true,
        format: 'code' 
      }
    },
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
    configSchema: {
      model: { 
        type: 'string', 
        enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
        default: 'gpt-3.5-turbo'
      },
      temperature: { 
        type: 'number', 
        min: 0,
        max: 2,
        default: 0.7
      },
      prompt: { type: 'string' },
      systemMessage: { type: 'string' }
    },
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

  // Entrées / Sorties
  'input': {
    name: 'Entrée',
    category: 'IO',
    description: 'Point d\'entrée du workflow',
    icon: '⬅️',
    color: 'indigo',
    outputs: [
      { id: 'data', type: 'any', label: 'Données' }
    ],
    configSchema: {
      defaultValue: { type: 'any' },
      description: { type: 'string' }
    },
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
    configSchema: {
      description: { type: 'string' },
      name: { type: 'string' }
    },
    examples: [
      {
        title: 'Sortie principale',
        description: 'Résultat final du workflow',
        config: {
          name: 'result',
          description: 'Résultat de l\'opération'
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
    configSchema: {
      url: { type: 'string', required: true, description: 'URL du rosbridge WebSocket (ex: ws://localhost:9090)' },
      topic: { type: 'string', required: true, description: 'Nom du topic ou service ROS' },
      messageType: { type: 'string', required: true, description: 'Type du message ou service ROS (ex: std_msgs/String, geometry_msgs/Twist)' },
      mode: { type: 'string', enum: ['publish', 'subscribe', 'service'], required: true, description: 'Mode d\'opération ROS' },
      timeout: { type: 'number', description: 'Délai d\'attente en ms (défaut: 5000)' }
    },
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
  }
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
