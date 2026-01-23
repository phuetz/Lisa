/**
 * WeatherTool: Obtenir la météo actuelle et les prévisions
 * Utilise Open-Meteo API (gratuit, sans clé API)
 */

interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  forecast?: ForecastDay[];
}

interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  description: string;
  precipitationChance: number;
}

interface ExecuteProps {
  city: string;
  days?: number; // Nombre de jours de prévision (1-7)
}

interface ExecuteResult {
  success: boolean;
  output?: WeatherData | null;
  error?: string | null;
}

interface GeocodingResult {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    admin1?: string;
  }>;
}

interface WeatherResponse {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    precipitation: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max: number[];
  };
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Ciel dégagé ☀️',
  1: 'Principalement dégagé 🌤️',
  2: 'Partiellement nuageux ⛅',
  3: 'Couvert ☁️',
  45: 'Brouillard 🌫️',
  48: 'Brouillard givrant 🌫️',
  51: 'Bruine légère 🌧️',
  53: 'Bruine modérée 🌧️',
  55: 'Bruine dense 🌧️',
  61: 'Pluie légère 🌧️',
  63: 'Pluie modérée 🌧️',
  65: 'Pluie forte 🌧️',
  71: 'Neige légère 🌨️',
  73: 'Neige modérée 🌨️',
  75: 'Neige forte 🌨️',
  77: 'Grains de neige 🌨️',
  80: 'Averses légères 🌦️',
  81: 'Averses modérées 🌦️',
  82: 'Averses violentes 🌦️',
  85: 'Averses de neige légères 🌨️',
  86: 'Averses de neige fortes 🌨️',
  95: 'Orage ⛈️',
  96: 'Orage avec grêle légère ⛈️',
  99: 'Orage avec grêle forte ⛈️',
};

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

function getWindDirection(degrees: number): string {
  const index = Math.round(degrees / 45) % 8;
  return WIND_DIRECTIONS[index];
}

function getWeatherDescription(code: number): string {
  return WEATHER_CODES[code] || 'Inconnu';
}

export class WeatherTool {
  name = 'WeatherTool';
  description = 'Obtient la météo actuelle et les prévisions pour une ville donnée.';

  private async geocode(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Erreur lors de la géolocalisation');
    }
    
    const data = await response.json() as GeocodingResult;
    if (!data.results || data.results.length === 0) {
      return null;
    }
    
    const result = data.results[0];
    const locationName = result.admin1 
      ? `${result.name}, ${result.admin1}, ${result.country}`
      : `${result.name}, ${result.country}`;
    
    return {
      lat: result.latitude,
      lon: result.longitude,
      name: locationName,
    };
  }

  async execute({ city, days = 3 }: ExecuteProps): Promise<ExecuteResult> {
    if (!city || typeof city !== 'string') {
      return { success: false, error: 'Une ville valide doit être fournie.', output: null };
    }

    try {
      // Géolocaliser la ville
      const location = await this.geocode(city);
      if (!location) {
        return { success: false, error: `Ville "${city}" non trouvée.`, output: null };
      }

      // Récupérer la météo
      const forecastDays = Math.min(Math.max(days, 1), 7);
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=${forecastDays}`;

      const response = await fetch(weatherUrl);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de la météo');
      }

      const data = await response.json() as WeatherResponse;
      
      if (!data.current) {
        throw new Error('Données météo non disponibles');
      }

      // Construire les prévisions
      const forecast: ForecastDay[] = [];
      if (data.daily) {
        for (let i = 0; i < data.daily.time.length; i++) {
          forecast.push({
            date: new Date(data.daily.time[i]).toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            }),
            tempMax: Math.round(data.daily.temperature_2m_max[i]),
            tempMin: Math.round(data.daily.temperature_2m_min[i]),
            description: getWeatherDescription(data.daily.weather_code[i]),
            precipitationChance: data.daily.precipitation_probability_max[i],
          });
        }
      }

      const weatherData: WeatherData = {
        location: location.name,
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        description: getWeatherDescription(data.current.weather_code),
        windSpeed: Math.round(data.current.wind_speed_10m),
        windDirection: getWindDirection(data.current.wind_direction_10m),
        precipitation: data.current.precipitation,
        forecast,
      };

      return { success: true, output: weatherData };
    } catch (error) {
      console.error('WeatherTool execution failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue', 
        output: null 
      };
    }
  }

  formatResponse(data: WeatherData): string {
    let response = `🌍 **Météo à ${data.location}**\n\n`;
    response += `🌡️ **${data.temperature}°C** (ressenti ${data.feelsLike}°C)\n`;
    response += `${data.description}\n`;
    response += `💧 Humidité: ${data.humidity}%\n`;
    response += `💨 Vent: ${data.windSpeed} km/h ${data.windDirection}\n`;
    
    if (data.precipitation > 0) {
      response += `🌧️ Précipitations: ${data.precipitation} mm\n`;
    }

    if (data.forecast && data.forecast.length > 0) {
      response += `\n📅 **Prévisions:**\n`;
      for (const day of data.forecast) {
        response += `- **${day.date}**: ${day.tempMin}°C / ${day.tempMax}°C - ${day.description}`;
        if (day.precipitationChance > 0) {
          response += ` (${day.precipitationChance}% pluie)`;
        }
        response += '\n';
      }
    }

    return response;
  }
}

export const weatherTool = new WeatherTool();
