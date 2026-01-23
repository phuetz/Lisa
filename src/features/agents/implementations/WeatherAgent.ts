/**
 * WeatherAgent - Fetches and processes weather data
 * 
 * This agent handles weather-related queries including current conditions,
 * forecasts, and weather alerts using the Open-Meteo API.
 */

import { AgentDomains } from '../core/types';
import type {
  AgentCapability,
  AgentExecuteProps,
  AgentExecuteResult,
  AgentParameter,
  BaseAgent
} from '../core/types';
import { agentRegistry } from '../core/registry';

/**
 * Interface for geolocation data
 */
interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Supported weather intents
 */
export type WeatherIntent =
  | 'get_current'
  | 'get_forecast'
  | 'get_alerts'
  | 'get_hourly'
  | 'search_location';

/**
 * Weather condition types
 */
export type WeatherCondition =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'thunderstorm'
  | 'fog'
  | 'drizzle'
  | 'hail';

/**
 * Interface for formatted weather data
 */
export interface FormattedWeatherData {
  location: string;
  temperature?: number;
  condition?: WeatherCondition;
  humidity?: number;
  wind_speed?: number;
  wind_direction?: string;
  forecast?: Array<{
    day: string;
    min_temp: number;
    max_temp: number;
    condition: WeatherCondition;
  }>;
}

/**
 * Agent for fetching and processing weather data
 */
export class WeatherAgent implements BaseAgent {
  name = 'WeatherAgent';
  description = 'Récupère et analyse les données météorologiques actuelles et les prévisions';
  version = '1.1.0';
  domain = AgentDomains.KNOWLEDGE; // Utilisation du domaine KNOWLEDGE au lieu de INFORMATION
  capabilities = [
    'current_weather',
    'weather_forecast',
    'weather_alerts',
    'hourly_forecast',
    'location_search'
  ];

  /**
   * Get the current geolocation position
   */
  private async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject('Geolocation is not supported by your browser.');
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 600000 // Cache position for 10 minutes
      });
    });
  }

  /**
   * Search for a location by name
   */
  private async searchLocation(query: string): Promise<{ latitude: number, longitude: number, name: string }> {
    try {
      const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

      // If API key is available, use OpenWeatherMap geocoding
      if (apiKey) {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();

          if (data && data.length > 0) {
            const location = data[0];
            return {
              latitude: location.lat,
              longitude: location.lon,
              name: `${location.name}${location.state ? ', ' + location.state : ''}${location.country ? ', ' + location.country : ''}`
            };
          }
        }
      }

      // Fallback to mock locations if API is not available
      console.warn('[WeatherAgent] Using fallback geocoding. Set VITE_WEATHER_API_KEY for real geocoding.');
      const mockLocations: Record<string, { lat: number, lon: number, name: string }> = {
        'paris': { lat: 48.8566, lon: 2.3522, name: 'Paris, France' },
        'london': { lat: 51.5074, lon: -0.1278, name: 'London, UK' },
        'new york': { lat: 40.7128, lon: -74.0060, name: 'New York, USA' },
        'tokyo': { lat: 35.6762, lon: 139.6503, name: 'Tokyo, Japan' },
      };

      const lowerQuery = query.toLowerCase();
      const location = Object.entries(mockLocations).find(([key]) => key.includes(lowerQuery))?.[1];

      if (location) {
        return {
          latitude: location.lat,
          longitude: location.lon,
          name: location.name
        };
      }

      throw new Error(`Location not found: ${query}`);
    } catch (error) {
      console.error('Error searching location:', error);
      throw error;
    }
  }

  /**
   * Main execution method for the agent
   */
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const intent = props.intent as WeatherIntent || props.command as WeatherIntent;
    const parameters = props.parameters || {};
    const language = props.language || 'en';

    try {
      // Input validation
      const validation = await this.validateInput(props);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors?.join(', '),
          output: null,
          metadata: {
            executionTime: Date.now() - startTime
          }
        };
      }

      let result;
      switch (intent) {
        case 'get_current':
          result = await this.getCurrentWeather(parameters.location);
          break;
        case 'get_forecast':
          result = await this.getForecast(parameters.location, parameters.days || 3);
          break;
        case 'get_hourly':
          result = await this.getHourlyForecast(parameters.location, parameters.hours || 12);
          break;
        case 'get_alerts':
          result = await this.getWeatherAlerts(parameters.location);
          break;
        case 'search_location':
          result = await this.searchLocation(parameters.query);
          break;
        default:
          return {
            success: false,
            output: `Intent non supporté: ${intent}`,
            error: new Error('UNSUPPORTED_INTENT'),
            metadata: {
              executionTime: Date.now() - startTime
            }
          };
      }

      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          source: `weather-${intent}`
        }
      };
    } catch (error: any) {
      console.error(`WeatherAgent error executing ${intent}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        output: null,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Determines if this agent can handle a specific query
   */
  async canHandle(query: string, _context?: any): Promise<number> {
    const lowerQuery = query.toLowerCase();

    const weatherKeywords = [
      'meteo', 'météo', 'weather', 'température', 'temperature',
      'rain', 'snow', 'pluie', 'neige', 'forecast', 'prévision',
      'humid', 'humide', 'vent', 'wind', 'orage', 'storm',
      'degrees', 'degrés', 'celsius', 'fahrenheit',
      'today', 'tomorrow', 'aujourd\'hui', 'demain',
      'ce matin', 'ce soir', 'this morning', 'tonight',
      'cette semaine', 'this week'
    ];

    const weatherRegexes = [
      /what.?s the weather( like)?( today| tomorrow)?/i,
      /comment fait-il( aujourd'hui| demain)?/i,
      /quel temps fait-il( aujourd'hui| demain)?/i,
      /forecast for (today|tomorrow|this week)/i,
      /prévisions (météo|pour) (aujourd'hui|demain|cette semaine)/i
    ];

    // Check for keyword matches
    for (const keyword of weatherKeywords) {
      if (lowerQuery.includes(keyword)) {
        return 0.7; // 70% confidence
      }
    }

    // Check for regex patterns
    for (const regex of weatherRegexes) {
      if (regex.test(lowerQuery)) {
        return 0.9; // 90% confidence
      }
    }

    return 0; // Cannot handle
  }

  /**
   * Returns required parameters for a specific task
   */
  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    switch (task) {
      case 'get_current':
      case 'get_alerts':
        return [{
          name: 'location',
          type: 'string',
          required: false,
          description: 'Location for weather information (city name). If not provided, geolocation will be used.'
        }];
      case 'get_forecast':
        return [
          {
            name: 'location',
            type: 'string',
            required: false,
            description: 'Location for weather forecast (city name). If not provided, geolocation will be used.'
          },
          {
            name: 'days',
            type: 'number',
            required: false,
            description: 'Number of days to forecast (1-7)',
            defaultValue: 3
          }
        ];
      case 'get_hourly':
        return [
          {
            name: 'location',
            type: 'string',
            required: false,
            description: 'Location for hourly forecast (city name). If not provided, geolocation will be used.'
          },
          {
            name: 'hours',
            type: 'number',
            required: false,
            description: 'Number of hours to forecast (1-48)',
            defaultValue: 12
          }
        ];
      case 'search_location':
        return [{
          name: 'query',
          type: 'string',
          required: true,
          description: 'Location name to search for'
        }];
      default:
        return [];
    }
  }

  /**
   * Returns detailed capability information
   */
  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: 'Current Weather',
        description: 'Get current weather conditions for a location',
        requiredParameters: await this.getRequiredParameters('get_current')
      },
      {
        name: 'Weather Forecast',
        description: 'Get multi-day weather forecast for a location',
        requiredParameters: await this.getRequiredParameters('get_forecast')
      },
      {
        name: 'Hourly Forecast',
        description: 'Get hour-by-hour weather forecast',
        requiredParameters: await this.getRequiredParameters('get_hourly')
      },
      {
        name: 'Weather Alerts',
        description: 'Get active weather warnings and alerts',
        requiredParameters: await this.getRequiredParameters('get_alerts')
      },
      {
        name: 'Location Search',
        description: 'Search for a location by name',
        requiredParameters: await this.getRequiredParameters('search_location')
      }
    ];
  }

  /**
   * Validates input parameters
   */
  async validateInput(props: AgentExecuteProps): Promise<{ valid: boolean; errors?: string[] }> {
    const intent = props.intent as WeatherIntent || props.command as WeatherIntent;
    const parameters = props.parameters || {};
    const errors: string[] = [];

    switch (intent) {
      case 'search_location':
        if (!parameters.query) {
          errors.push('A location query is required for location search');
        }
        break;
      case 'get_forecast':
        if (parameters.days && (typeof parameters.days !== 'number' || parameters.days < 1 || parameters.days > 7)) {
          errors.push('Days must be a number between 1 and 7');
        }
        break;
      case 'get_hourly':
        if (parameters.hours && (typeof parameters.hours !== 'number' || parameters.hours < 1 || parameters.hours > 48)) {
          errors.push('Hours must be a number between 1 and 48');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Get current weather conditions
   */
  private async getCurrentWeather(locationQuery?: string): Promise<any> {
    try {
      let latitude, longitude, locationName;

      if (locationQuery) {
        const location = await this.searchLocation(locationQuery);
        latitude = location.latitude;
        longitude = location.longitude;
        locationName = location.name;
      } else {
        const position = await this.getCurrentPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        locationName = 'Current Location';
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m,winddirection_10m&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch weather data from API');
      }

      const data = await response.json();

      // Process raw data into a more user-friendly format
      const formattedData: FormattedWeatherData = {
        location: locationName,
        temperature: data.current_weather.temperature,
        condition: this.mapWeatherCode(data.current_weather.weathercode),
        wind_speed: data.current_weather.windspeed,
        wind_direction: this.getWindDirection(data.current_weather.winddirection),
        humidity: data.hourly.relativehumidity_2m[0]
      };

      return formattedData;
    } catch (error) {
      console.error('Error getting current weather:', error);
      throw error;
    }
  }

  /**
   * Get weather forecast for multiple days
   */
  private async getForecast(locationQuery?: string, days: number = 3): Promise<any> {
    try {
      let latitude, longitude, locationName;

      if (locationQuery) {
        const location = await this.searchLocation(locationQuery);
        latitude = location.latitude;
        longitude = location.longitude;
        locationName = location.name;
      } else {
        const position = await this.getCurrentPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        locationName = 'Current Location';
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch forecast data from API');
      }

      const data = await response.json();

      // Format the forecast data
      const forecast = [];
      const daysToInclude = Math.min(days, data.daily.time.length);

      for (let i = 0; i < daysToInclude; i++) {
        forecast.push({
          day: this.formatDate(data.daily.time[i]),
          min_temp: data.daily.temperature_2m_min[i],
          max_temp: data.daily.temperature_2m_max[i],
          condition: this.mapWeatherCode(data.daily.weathercode[i])
        });
      }

      const formattedData: FormattedWeatherData = {
        location: locationName,
        forecast
      };

      return formattedData;
    } catch (error) {
      console.error('Error getting forecast:', error);
      throw error;
    }
  }

  /**
   * Get hourly weather forecast
   */
  private async getHourlyForecast(locationQuery?: string, hours: number = 12): Promise<any> {
    try {
      let latitude, longitude, locationName;

      if (locationQuery) {
        const location = await this.searchLocation(locationQuery);
        latitude = location.latitude;
        longitude = location.longitude;
        locationName = location.name;
      } else {
        const position = await this.getCurrentPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        locationName = 'Current Location';
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relativehumidity_2m,windspeed_10m,weathercode&forecast_hours=${hours}&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch hourly forecast from API');
      }

      const data = await response.json();
      return {
        location: locationName,
        hourly_forecast: data.hourly
      };
    } catch (error) {
      console.error('Error getting hourly forecast:', error);
      throw error;
    }
  }

  /**
   * Get active weather alerts and warnings
   */
  private async getWeatherAlerts(locationQuery?: string): Promise<any> {
    try {
      let locationName;

      if (locationQuery) {
        const location = await this.searchLocation(locationQuery);
        locationName = location.name;
      } else {
        locationName = 'Current Location';
      }

      // In a real implementation, this would call a weather alerts API
      // For now, we'll return mock data
      return {
        location: locationName,
        alerts: [],
        has_active_alerts: false
      };
    } catch (error) {
      console.error('Error getting weather alerts:', error);
      throw error;
    }
  }

  /**
   * Format a date string
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }

  /**
   * Convert wind direction in degrees to cardinal direction
   */
  private getWindDirection(degrees: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    const index = Math.round((degrees % 360) / 45);
    return directions[index];
  }

  /**
   * Map Open-Meteo weather codes to our weather condition type
   */
  private mapWeatherCode(code: number): WeatherCondition {
    // WMO codes: https://www.nodc.noaa.gov/archive/arc0021/0002199/1.1/data/0-data/HTML/WMO-CODE/WMO4677.HTM
    if (code === 0) return 'clear';
    if (code === 1) return 'partly_cloudy';
    if (code === 2) return 'partly_cloudy';
    if (code === 3) return 'cloudy';
    if (code >= 51 && code <= 67) return 'rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code === 95 || code === 96 || code === 99) return 'thunderstorm';
    if (code >= 45 && code <= 49) return 'fog';
    if (code >= 80 && code <= 82) return 'drizzle';
    if (code >= 85 && code <= 86) return 'snow';
    if (code >= 95 && code <= 96) return 'thunderstorm';

    return 'partly_cloudy'; // Default
  }
}

// Register an instance of the agent with the registry.
agentRegistry.register(new WeatherAgent());
