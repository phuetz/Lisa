/**
 * AI Models Constants
 * Liste des modèles disponibles pour chaque provider
 */

export interface AIModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'xai' | 'local';
  contextWindow: number;
  costPer1MTokens: {
    input: number;
    output: number;
  };
  features: {
    streaming: boolean;
    vision: boolean;
    function_calling: boolean;
  };
  speed: 'fast' | 'medium' | 'slow';
  intelligence: 'high' | 'medium' | 'basic';
}

export const AI_MODELS: Record<string, AIModelInfo> = {
  // OpenAI GPT-5 Models (NOUVEAUX - Nov 2024)
  'gpt-5': {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 1.25,   // $1.25 / 1M input tokens
      output: 10.00  // $10.00 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'high'
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 0.25,   // $0.25 / 1M input tokens
      output: 2.00   // $2.00 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'high'
  },
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 0.05,   // $0.05 / 1M input tokens
      output: 0.40   // $0.40 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'medium'
  },
  'gpt-5-pro': {
    id: 'gpt-5-pro',
    name: 'GPT-5 Pro',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 15.00,   // $15.00 / 1M input tokens
      output: 120.00  // $120.00 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'medium',
    intelligence: 'high'
  },
  
  // OpenAI GPT-4.1 Models
  'gpt-4.1': {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 3.00,   // $3.00 / 1M input tokens
      output: 12.00  // $12.00 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'high'
  },
  'gpt-4.1-mini': {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 0.80,   // $0.80 / 1M input tokens
      output: 3.20   // $3.20 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'medium'
  },
  'gpt-4.1-nano': {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 0.20,   // $0.20 / 1M input tokens
      output: 0.80   // $0.80 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'medium'
  },
  
  // OpenAI GPT-4o Models (Génération précédente)
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 2.50,  // $2.50 / 1M input tokens
      output: 10.00 // $10.00 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'high'
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 0.150,  // $0.150 / 1M input tokens
      output: 0.600  // $0.600 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'medium'
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 10.00,  // $10.00 / 1M input tokens
      output: 30.00  // $30.00 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'medium',
    intelligence: 'high'
  },
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    contextWindow: 8192,
    costPer1MTokens: {
      input: 30.00,  // $30.00 / 1M input tokens
      output: 60.00  // $60.00 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: false,
      function_calling: true
    },
    speed: 'slow',
    intelligence: 'high'
  },
  'o1': {
    id: 'o1',
    name: 'O1',
    provider: 'openai',
    contextWindow: 200000,
    costPer1MTokens: {
      input: 15.00,  // $15.00 / 1M input tokens
      output: 60.00  // $60.00 / 1M output tokens
    },
    features: {
      streaming: false,
      vision: false,
      function_calling: false
    },
    speed: 'slow',
    intelligence: 'high'
  },
  'o1-mini': {
    id: 'o1-mini',
    name: 'O1 Mini',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 3.00,   // $3.00 / 1M input tokens
      output: 12.00  // $12.00 / 1M output tokens
    },
    features: {
      streaming: false,
      vision: false,
      function_calling: false
    },
    speed: 'slow',
    intelligence: 'high'
  },
  'o1-preview': {
    id: 'o1-preview',
    name: 'O1 Preview (Deprecated)',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 15.00,  // $15.00 / 1M input tokens
      output: 60.00  // $60.00 / 1M output tokens
    },
    features: {
      streaming: false,
      vision: false,
      function_calling: false
    },
    speed: 'slow',
    intelligence: 'high'
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16385,
    costPer1MTokens: {
      input: 0.50,   // $0.50 / 1M input tokens
      output: 1.50   // $1.50 / 1M output tokens
    },
    features: {
      streaming: true,
      vision: false,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'basic'
  },

  // Anthropic Models (Claude)
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    costPer1MTokens: {
      input: 3.00,
      output: 15.00
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'medium',
    intelligence: 'high'
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    costPer1MTokens: {
      input: 0.80,
      output: 4.00
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: false
    },
    speed: 'fast',
    intelligence: 'medium'
  },
  'claude-3-opus-20240229': {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    costPer1MTokens: {
      input: 15.00,
      output: 75.00
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'slow',
    intelligence: 'high'
  },

  // OpenAI O4 Models (Raisonnement avancé)
  'o4-mini': {
    id: 'o4-mini',
    name: 'O4 Mini',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 4.00,   // $4.00 / 1M input tokens
      output: 16.00  // $16.00 / 1M output tokens
    },
    features: {
      streaming: false,
      vision: false,
      function_calling: false
    },
    speed: 'slow',
    intelligence: 'high'
  },

  // xAI Grok Models
  'grok-4-latest': {
    id: 'grok-4-latest',
    name: 'Grok 4',
    provider: 'xai',
    contextWindow: 131072,
    costPer1MTokens: {
      input: 3.00,
      output: 15.00
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'high'
  },
  'grok-3-latest': {
    id: 'grok-3-latest',
    name: 'Grok 3',
    provider: 'xai',
    contextWindow: 131072,
    costPer1MTokens: {
      input: 3.00,
      output: 15.00
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'high'
  },
  'grok-3-fast': {
    id: 'grok-3-fast',
    name: 'Grok 3 Fast',
    provider: 'xai',
    contextWindow: 131072,
    costPer1MTokens: {
      input: 0.60,
      output: 4.00
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'high'
  },
  'grok-2-latest': {
    id: 'grok-2-latest',
    name: 'Grok 2',
    provider: 'xai',
    contextWindow: 131072,
    costPer1MTokens: {
      input: 2.00,
      output: 10.00
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'high'
  },
  'grok-2-vision-latest': {
    id: 'grok-2-vision-latest',
    name: 'Grok 2 Vision',
    provider: 'xai',
    contextWindow: 32768,
    costPer1MTokens: {
      input: 2.00,
      output: 10.00
    },
    features: {
      streaming: true,
      vision: true,
      function_calling: true
    },
    speed: 'fast',
    intelligence: 'high'
  },

  // Local Models (exemples)
  'llama-3.1-8b': {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B',
    provider: 'local',
    contextWindow: 128000,
    costPer1MTokens: {
      input: 0,
      output: 0
    },
    features: {
      streaming: true,
      vision: false,
      function_calling: false
    },
    speed: 'fast',
    intelligence: 'medium'
  },
  'mistral-small': {
    id: 'mistral-small',
    name: 'Mistral Small',
    provider: 'local',
    contextWindow: 32000,
    costPer1MTokens: {
      input: 0,
      output: 0
    },
    features: {
      streaming: true,
      vision: false,
      function_calling: false
    },
    speed: 'fast',
    intelligence: 'medium'
  }
};

/**
 * Modèles recommandés par cas d'usage
 */
export const RECOMMENDED_MODELS = {
  // Usage quotidien, rapide et économique
  daily: ['gpt-5-nano', 'gpt-4.1-nano', 'claude-3-5-haiku-20241022', 'llama-3.1-8b'],
  
  // Tâches complexes nécessitant intelligence maximale
  complex: ['gpt-5', 'gpt-5-mini', 'claude-3-5-sonnet-20241022', 'gpt-4.1'],
  
  // Raisonnement avancé (maths, code)
  reasoning: ['gpt-5-pro', 'o4-mini', 'o1', 'gpt-5'],
  
  // Vision/images
  vision: ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'claude-3-5-sonnet-20241022'],
  
  // Budget limité
  budget: ['gpt-5-nano', 'gpt-4.1-nano', 'claude-3-5-haiku-20241022', 'llama-3.1-8b'],
  
  // Local/Confidentialité
  local: ['llama-3.1-8b', 'mistral-small'],
  
  // Meilleurs nouveaux modèles 2024
  latest: ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5-pro'],
  
  // xAI Grok Models
  grok: ['grok-4-latest', 'grok-3-latest', 'grok-3-fast', 'grok-2-latest', 'grok-2-vision-latest']
};

/**
 * Obtenir les infos d'un modèle
 */
export function getModelInfo(modelId: string): AIModelInfo | undefined {
  return AI_MODELS[modelId];
}

/**
 * Lister les modèles d'un provider
 */
export function getModelsByProvider(provider: 'openai' | 'anthropic' | 'xai' | 'local'): AIModelInfo[] {
  return Object.values(AI_MODELS).filter(m => m.provider === provider);
}

/**
 * Estimer le coût d'une conversation
 */
export function estimateCost(
  modelId: string, 
  inputTokens: number, 
  outputTokens: number
): number {
  const model = AI_MODELS[modelId];
  if (!model) return 0;
  
  return (
    (inputTokens / 1_000_000) * model.costPer1MTokens.input +
    (outputTokens / 1_000_000) * model.costPer1MTokens.output
  );
}

export default AI_MODELS;
