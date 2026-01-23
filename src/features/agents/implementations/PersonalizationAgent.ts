/**
 * PersonalizationAgent - Adapts the user experience based on preferences and behavior
 * 
 * This agent learns from user interactions and customizes the experience
 * by tracking preferences, adapting recommendations, and tailoring responses.
 */

import { 
  type AgentCapability, 
  AgentDomains, 
  type AgentExecuteProps, 
  type AgentExecuteResult, 
  type AgentParameter, 
  type BaseAgent 
} from '../core/types';

/**
 * User preference category
 */
export type PreferenceCategory = 
  | 'ui'            // UI preferences (theme, layout)
  | 'notification'  // Notification preferences
  | 'language'      // Language preferences
  | 'content'       // Content preferences (topics of interest)
  | 'privacy'       // Privacy preferences
  | 'interaction';  // Interaction preferences (voice, text, etc.)

/**
 * User preference data structure
 */
export interface UserPreference {
  category: PreferenceCategory;
  key: string;
  value: any;
  confidence: number;  // 0-1 indicating how confident we are in this preference
  source: 'explicit' | 'implicit' | 'default';  // How this preference was determined
  timestamp: number;   // When this preference was last updated
}

/**
 * Supported personalization intents
 */
export type PersonalizationIntent = 
  | 'get_preferences'
  | 'set_preference'
  | 'get_recommendations'
  | 'track_interaction'
  | 'get_user_profile'
  | 'adapt_response';

/**
 * Agent for personalizing user experience
 */
export class PersonalizationAgent implements BaseAgent {
  name = 'PersonalizationAgent';
  description = "Adapte l'expérience utilisateur en fonction des préférences et comportements";
  version = '1.0.0';
  domain = AgentDomains.INTEGRATION;
  capabilities = [
    'preference_management',
    'behavioral_tracking',
    'content_recommendation',
    'response_adaptation'
  ];

  // In a real implementation, this would be stored in a persistent store
  private preferences: Record<string, UserPreference> = {
    'ui.theme': {
      category: 'ui',
      key: 'theme',
      value: 'auto',
      confidence: 1.0,
      source: 'default',
      timestamp: Date.now()
    },
    'ui.fontSize': {
      category: 'ui',
      key: 'fontSize',
      value: 'medium',
      confidence: 1.0,
      source: 'default',
      timestamp: Date.now()
    },
    'language.primary': {
      category: 'language',
      key: 'primary',
      value: 'fr',
      confidence: 1.0,
      source: 'default',
      timestamp: Date.now()
    },
    'notification.allowVoice': {
      category: 'notification',
      key: 'allowVoice',
      value: true,
      confidence: 1.0,
      source: 'default',
      timestamp: Date.now()
    }
  };

  // Track user interactions for behavioral analysis
  private interactions: Array<{
    type: string;
    data: any;
    timestamp: number;
  }> = [];

  // Topics of interest with confidence scores
  private interests: Record<string, number> = {
    'technology': 0.8,
    'news': 0.6,
    'weather': 0.7,
    'calendar': 0.5
  };

  /**
   * Main execution method for the agent
   */
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const intent = props.intent as PersonalizationIntent;
    const parameters = props.parameters || {};
    const language = props.language || this.getPreferenceValue('language.primary', 'fr');

    try {
      let result;
      switch (intent) {
        case 'get_preferences':
          result = this.getPreferences(parameters.category as PreferenceCategory);
          break;
        case 'set_preference':
          result = this.setPreference(
            parameters.category as PreferenceCategory,
            parameters.key,
            parameters.value,
            parameters.source || 'explicit'
          );
          break;
        case 'get_recommendations':
          result = await this.getRecommendations(
            parameters.type,
            parameters.count || 5,
            parameters.context
          );
          break;
        case 'track_interaction':
          result = this.trackInteraction(
            parameters.type,
            parameters.data
          );
          break;
        case 'get_user_profile':
          result = this.getUserProfile();
          break;
        case 'adapt_response':
          result = await this.adaptResponse(
            parameters.content,
            parameters.context,
            language
          );
          break;
        default:
          return {
            success: false,
            output: `Intent non supporté: ${intent}`,
            error: new Error('UNSUPPORTED_INTENT'),
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
      }

      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          confidence: 0.9,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Determines if this agent can handle a specific query
   */
  async canHandle(query: string, _context?: any): Promise<number> {
    const normalizedQuery = query.toLowerCase();
    
    // Keywords related to personalization
    const personalizationKeywords = [
      'préférence', 'préférences', 'personnaliser', 'personnalisation',
      'profil', 'paramètre', 'paramètres', 'configurer', 'configuration',
      'thème', 'langue', 'notification', 'recommandation'
    ];
    
    // Count matches
    const matches = personalizationKeywords.filter(keyword => 
      normalizedQuery.includes(keyword)).length;
    
    // Calculate confidence score
    let score = matches > 0 ? 0.3 + Math.min(matches * 0.15, 0.6) : 0;
    
    // Add more confidence if the query explicitly mentions preferences or settings
    if (normalizedQuery.includes('préférence') || normalizedQuery.includes('paramètre')) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Returns required parameters for a specific task
   */
  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    const normalizedTask = task.toLowerCase();
    
    if (normalizedTask.includes('préférence') && normalizedTask.includes('définir')) {
      return [
        {
          name: 'category',
          type: 'string',
          required: true,
          description: 'Catégorie de préférence (ui, notification, language, content, privacy, interaction)'
        },
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Clé de la préférence'
        },
        {
          name: 'value',
          type: 'string',
          required: true,
          description: 'Valeur à définir'
        }
      ];
    }
    
    if (normalizedTask.includes('préférence') && normalizedTask.includes('obtenir')) {
      return [
        {
          name: 'category',
          type: 'string',
          required: false,
          description: 'Catégorie de préférence à récupérer (optionnel)'
        }
      ];
    }
    
    if (normalizedTask.includes('recommandation')) {
      return [
        {
          name: 'type',
          type: 'string',
          required: true,
          description: 'Type de recommandations (content, feature, etc.)'
        },
        {
          name: 'count',
          type: 'number',
          required: false,
          description: 'Nombre de recommandations',
          defaultValue: 5
        }
      ];
    }
    
    return [];
  }

  /**
   * Returns detailed capability information
   */
  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: 'preference_management',
        description: 'Gestion des préférences utilisateur',
        requiredParameters: [
          {
            name: 'category',
            type: 'string',
            required: true,
            description: 'Catégorie de préférence'
          },
          {
            name: 'key',
            type: 'string',
            required: true,
            description: 'Clé de la préférence'
          }
        ]
      },
      {
        name: 'content_recommendation',
        description: 'Recommandations de contenu personnalisées',
        requiredParameters: [
          {
            name: 'type',
            type: 'string',
            required: true,
            description: 'Type de recommandation'
          }
        ]
      }
    ];
  }

  /**
   * Get user preferences, optionally filtered by category
   */
  private getPreferences(category?: PreferenceCategory): any {
    if (category) {
      const filteredPreferences = Object.values(this.preferences)
        .filter(pref => pref.category === category);
      
      return {
        category,
        preferences: filteredPreferences,
        count: filteredPreferences.length
      };
    }
    
    return {
      preferences: Object.values(this.preferences),
      count: Object.keys(this.preferences).length
    };
  }

  /**
   * Set a user preference
   */
  private setPreference(
    category: PreferenceCategory, 
    key: string, 
    value: any, 
    source: 'explicit' | 'implicit' | 'default' = 'explicit'
  ): any {
    const prefKey = `${category}.${key}`;
    const existing = this.preferences[prefKey];
    
    // Update or create preference
    this.preferences[prefKey] = {
      category,
      key,
      value,
      confidence: source === 'explicit' ? 1.0 : (existing?.confidence || 0.5),
      source,
      timestamp: Date.now()
    };
    
    return {
      category,
      key,
      value,
      source,
      updated: true
    };
  }

  /**
   * Get the value of a specific preference with fallback
   */
  private getPreferenceValue(prefKey: string, defaultValue: any): any {
    return this.preferences[prefKey]?.value ?? defaultValue;
  }

  /**
   * Get personalized recommendations based on user profile
   */
  private async getRecommendations(type: string, count: number = 5, context?: any): Promise<any> {
    // In a real implementation, this would use a recommendation algorithm
    // Here, we'll return mock recommendations based on interests
    
    if (type === 'content') {
      // Sort interests by confidence score
      const sortedInterests = Object.entries(this.interests)
        .sort(([, a], [, b]) => b - a)
        .map(([topic]) => topic);
      
      const recommendations = sortedInterests.slice(0, count).map(topic => ({
        topic,
        confidence: this.interests[topic],
        reason: `Basé sur votre historique d'interactions et préférences`
      }));
      
      return {
        type,
        count: recommendations.length,
        recommendations
      };
    }
    
    if (type === 'feature') {
      // Recommend features based on usage patterns
      const recommendations = [
        {
          feature: 'voice_commands',
          priority: 'high',
          reason: 'Utilisation fréquente des commandes vocales'
        },
        {
          feature: 'weather_dashboard',
          priority: 'medium',
          reason: 'Consultation régulière de la météo'
        }
      ].slice(0, count);
      
      return {
        type,
        count: recommendations.length,
        recommendations
      };
    }
    
    return {
      type,
      count: 0,
      recommendations: [],
      message: 'Type de recommandation non supporté'
    };
  }

  /**
   * Track a user interaction for behavioral analysis
   */
  private trackInteraction(type: string, data: any): any {
    const interaction = {
      type,
      data,
      timestamp: Date.now()
    };
    
    this.interactions.push(interaction);
    
    // Limit history size
    if (this.interactions.length > 100) {
      this.interactions.shift();
    }
    
    // Update interests based on interaction
    if (data.topic) {
      this.updateInterest(data.topic, 0.1);
    }
    
    // In a real implementation, we would analyze the interaction
    // to implicitly learn preferences
    this.analyzeInteraction(type, data);
    
    return {
      tracked: true,
      interactionCount: this.interactions.length
    };
  }

  /**
   * Get user profile information
   */
  private getUserProfile(): any {
    const interactionsByType = this.interactions.reduce((acc, interaction) => {
      acc[interaction.type] = (acc[interaction.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const sortedInterests = Object.entries(this.interests)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [topic, score]) => {
        acc[topic] = score;
        return acc;
      }, {} as Record<string, number>);
    
    return {
      preferences: Object.values(this.preferences),
      interactionCounts: interactionsByType,
      interests: sortedInterests,
      interactionCount: this.interactions.length
    };
  }

  /**
   * Adapt a response based on user preferences
   */
  private async adaptResponse(content: string, context: any, language: string): Promise<any> {
    if (!content) {
      throw new Error('Contenu requis pour adaptation');
    }
    
    // In a real implementation, this would adapt the content based on:
    // - User language preference
    // - Tone preference (formal vs casual)
    // - Level of detail preference
    // - Visual vs textual preference
    
    const fontSize = this.getPreferenceValue('ui.fontSize', 'medium');
    const theme = this.getPreferenceValue('ui.theme', 'auto');
    
    // Mock response adaptation
    const adaptedContent = content;
    
    return {
      originalContent: content,
      adaptedContent,
      adaptations: {
        language,
        fontSize,
        theme
      }
    };
  }

  /**
   * Update user interest in a topic
   */
  private updateInterest(topic: string, increment: number): void {
    const currentScore = this.interests[topic] || 0;
    this.interests[topic] = Math.min(Math.max(currentScore + increment, 0), 1);
    
    // Decay other interests slightly to maintain relative importance
    Object.keys(this.interests).forEach(t => {
      if (t !== topic) {
        this.interests[t] = Math.max(this.interests[t] - 0.01, 0);
      }
    });
  }

  /**
   * Analyze interaction to derive implicit preferences
   */
  private analyzeInteraction(type: string, data: any): void {
    // In a real implementation, this would analyze the interaction
    // to derive implicit preferences
    
    if (type === 'voice_command' && data.success) {
      // User successfully used voice command, they might prefer voice interactions
      this.setPreference('interaction', 'preferVoice', true, 'implicit');
    }
    
    if (type === 'notification_click' && data.type) {
      // User clicked on a notification, they might be interested in this type
      this.setPreference('notification', `interest.${data.type}`, true, 'implicit');
    }
  }
}
