/**
 * Agent Router Service
 * 
 * Routes user messages to specialized agents before falling back to LLM.
 * Detects intents like weather, calendar, etc. and calls the appropriate agent.
 */

import { agentRegistry } from '../features/agents/core/registry';

export interface RouteResult {
  handled: boolean;
  agentName?: string;
  response?: string;
  data?: unknown;
}

// Intent patterns for routing
const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  agent: string;
  intent: string;
  extractParams?: (match: RegExpMatchArray, query: string) => Record<string, unknown>;
}> = [
  // Weather
  {
    pattern: /(?:quelle?|quel)\s+(?:est\s+)?(?:la\s+)?(?:météo|meteo|temps)\s*(?:à|a|pour|de|sur)?\s*(.+)?/i,
    agent: 'WeatherAgent',
    intent: 'get_current',
    extractParams: (match) => ({ location: match[1]?.trim() || undefined })
  },
  {
    pattern: /(?:météo|meteo|weather)\s*(?:à|a|pour|de|sur|in|at)?\s*(.+)?/i,
    agent: 'WeatherAgent',
    intent: 'get_current',
    extractParams: (match) => ({ location: match[1]?.trim() || undefined })
  },
  {
    pattern: /(?:il\s+fait\s+(?:quel\s+)?temps|what.?s\s+the\s+weather)/i,
    agent: 'WeatherAgent',
    intent: 'get_current',
    extractParams: () => ({})
  },
  {
    pattern: /(?:prévisions?|forecast)\s*(?:météo|meteo)?\s*(?:pour|for)?\s*(.+)?/i,
    agent: 'WeatherAgent',
    intent: 'get_forecast',
    extractParams: (match) => ({ location: match[1]?.trim() || undefined, days: 3 })
  },
  {
    pattern: /(?:température|temperature)\s*(?:à|a|pour|de|sur|in|at)?\s*(.+)?/i,
    agent: 'WeatherAgent',
    intent: 'get_current',
    extractParams: (match) => ({ location: match[1]?.trim() || undefined })
  },
  {
    pattern: /(?:va-t-il\s+pleuvoir|will\s+it\s+rain|pluie\s+(?:aujourd'hui|demain|today|tomorrow))/i,
    agent: 'WeatherAgent',
    intent: 'get_forecast',
    extractParams: () => ({ days: 2 })
  },
  
  // Calendar (if CalendarAgent exists)
  {
    pattern: /(?:mes?\s+)?(?:rendez-vous|rdv|événements?|events?|agenda)\s*(?:aujourd'hui|demain|cette\s+semaine)?/i,
    agent: 'CalendarAgent',
    intent: 'list_events',
    extractParams: () => ({})
  },
  
  // Todo
  {
    pattern: /(?:mes?\s+)?(?:tâches?|todos?|to-do)\s*(?:aujourd'hui|en\s+cours)?/i,
    agent: 'TodoAgent',
    intent: 'list',
    extractParams: () => ({})
  },
  
  // Web Search
  {
    pattern: /(?:cherche|recherche|search|google|trouve)\s+(?:sur\s+(?:le\s+)?(?:web|internet)\s+)?(.+)/i,
    agent: 'WebSearchAgent',
    intent: 'search',
    extractParams: (match) => ({ query: match[1]?.trim() })
  },
  
  // Translation
  {
    pattern: /(?:traduis?|translate)\s+(?:en\s+)?(\w+)\s*[:\s]+(.+)/i,
    agent: 'TranslationAgent',
    intent: 'translate',
    extractParams: (match) => ({ targetLanguage: match[1], text: match[2] })
  },
];

class AgentRouterService {
  /**
   * Try to route a message to a specialized agent
   */
  async route(message: string): Promise<RouteResult> {
    const normalizedMessage = message.toLowerCase().trim();
    
    for (const { pattern, agent, intent, extractParams } of INTENT_PATTERNS) {
      const match = normalizedMessage.match(pattern);
      
      if (match) {
        console.log(`[AgentRouter] Matched pattern for ${agent} with intent ${intent}`);
        
        try {
          // Check if agent is available
          if (!agentRegistry.hasAgent(agent)) {
            console.warn(`[AgentRouter] Agent ${agent} not available`);
            continue;
          }
          
          // Extract parameters
          const params = extractParams ? extractParams(match, message) : {};
          
          // Execute agent
          const result = await agentRegistry.execute(agent, {
            intent,
            parameters: params,
            language: 'fr'
          });
          
          if (result.success && result.output) {
            return {
              handled: true,
              agentName: agent,
              response: this.formatAgentResponse(agent, intent, result.output),
              data: result.output
            };
          }
        } catch (error) {
          console.error(`[AgentRouter] Error executing ${agent}:`, error);
        }
      }
    }
    
    return { handled: false };
  }
  
  /**
   * Format agent output into a human-readable response
   */
  private formatAgentResponse(agent: string, intent: string, data: unknown): string {
    if (agent === 'WeatherAgent') {
      return this.formatWeatherResponse(intent, data);
    }
    
    // Default formatting
    if (typeof data === 'string') {
      return data;
    }
    
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * Format weather data into a nice response
   */
  private formatWeatherResponse(intent: string, data: unknown): string {
    const weather = data as {
      location?: string;
      temperature?: number;
      condition?: string;
      humidity?: number;
      wind_speed?: number;
      forecast?: Array<{
        day: string;
        min_temp: number;
        max_temp: number;
        condition: string;
      }>;
    };
    
    if (!weather) {
      return "Je n'ai pas pu récupérer les données météo.";
    }
    
    const location = weather.location || 'votre position';
    
    if (intent === 'get_current') {
      const temp = weather.temperature !== undefined ? `${Math.round(weather.temperature)}°C` : 'N/A';
      const condition = this.translateCondition(weather.condition);
      const humidity = weather.humidity !== undefined ? `${weather.humidity}%` : '';
      const wind = weather.wind_speed !== undefined ? `${Math.round(weather.wind_speed)} km/h` : '';
      
      let response = `🌤️ **Météo à ${location}**\n\n`;
      response += `🌡️ Température : **${temp}**\n`;
      response += `☁️ Conditions : ${condition}\n`;
      if (humidity) response += `💧 Humidité : ${humidity}\n`;
      if (wind) response += `💨 Vent : ${wind}\n`;
      
      return response;
    }
    
    if (intent === 'get_forecast' && weather.forecast) {
      let response = `📅 **Prévisions pour ${location}**\n\n`;
      
      for (const day of weather.forecast) {
        const condition = this.translateCondition(day.condition);
        response += `**${day.day}** : ${Math.round(day.min_temp)}°C - ${Math.round(day.max_temp)}°C, ${condition}\n`;
      }
      
      return response;
    }
    
    return JSON.stringify(weather, null, 2);
  }
  
  /**
   * Translate weather condition to French
   */
  private translateCondition(condition?: string): string {
    if (!condition) return 'Inconnu';
    
    const translations: Record<string, string> = {
      'clear': '☀️ Ensoleillé',
      'partly_cloudy': '⛅ Partiellement nuageux',
      'cloudy': '☁️ Nuageux',
      'rain': '🌧️ Pluie',
      'snow': '❄️ Neige',
      'thunderstorm': '⛈️ Orage',
      'fog': '🌫️ Brouillard',
      'drizzle': '🌦️ Bruine',
      'hail': '🌨️ Grêle'
    };
    
    return translations[condition.toLowerCase()] || condition;
  }
}

export const agentRouterService = new AgentRouterService();
