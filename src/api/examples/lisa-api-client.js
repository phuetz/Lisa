/**
 * Client JavaScript pour l'API Lisa
 * 
 * Ce client peut être utilisé pour se connecter à l'API Lisa depuis GPT Lisa
 * ou toute autre application JavaScript.
 */

class LisaApiClient {
  /**
   * Initialise un client pour l'API Lisa
   * @param {string} apiKey - Clé API pour l'authentification
   * @param {string} baseUrl - URL de base de l'API Lisa (par défaut: http://localhost:3001)
   */
  constructor(apiKey, baseUrl = 'http://localhost:3001') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Effectue une requête à l'API Lisa
   * @param {string} endpoint - Point d'accès API (ex: /api/intent/process)
   * @param {string} method - Méthode HTTP (GET, POST, PUT, DELETE)
   * @param {object} body - Corps de la requête pour POST/PUT
   * @returns {Promise<object>} - Réponse de l'API
   */
  async request(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };

    const options = {
      method,
      headers
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Erreur API Lisa:', error);
      return {
        success: false,
        error: `Erreur de connexion à l'API Lisa: ${error.message}`
      };
    }
  }

  /**
   * Vérifie si l'API est en ligne
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    const response = await this.request('/health');
    return response.success === true;
  }

  /**
   * Liste tous les agents disponibles
   * @returns {Promise<Array>} - Liste des agents
   */
  async listAgents() {
    const response = await this.request('/api/agents');
    return response.success ? response.data : [];
  }

  /**
   * Traite une intention utilisateur
   * @param {string} text - Texte de l'intention
   * @param {string} language - Langue (par défaut: fr)
   * @param {object} context - Contexte de l'intention
   * @returns {Promise<object>} - Résultat du traitement
   */
  async processIntent(text, language = 'fr', context = {}) {
    const response = await this.request('/api/intent/process', 'POST', {
      text,
      language,
      context
    });
    
    return response;
  }

  /**
   * Obtient la météo pour une localisation
   * @param {string} location - Localisation (ex: Paris)
   * @returns {Promise<object>} - Données météo
   */
  async getWeather(location) {
    const response = await this.request(`/api/weather?location=${encodeURIComponent(location)}`);
    return response;
  }

  /**
   * Obtient les prévisions météo pour une localisation
   * @param {string} location - Localisation (ex: Paris)
   * @param {number} days - Nombre de jours (par défaut: 5)
   * @returns {Promise<object>} - Données de prévisions
   */
  async getWeatherForecast(location, days = 5) {
    const response = await this.request(
      `/api/weather/forecast?location=${encodeURIComponent(location)}&days=${days}`
    );
    return response;
  }

  /**
   * Liste toutes les tâches
   * @returns {Promise<Array>} - Liste des tâches
   */
  async listTodos() {
    const response = await this.request('/api/todos');
    return response.success ? response.data : [];
  }

  /**
   * Ajoute une nouvelle tâche
   * @param {string} title - Titre de la tâche
   * @param {string} dueDate - Date d'échéance (optionnel)
   * @param {string} priority - Priorité (optionnel)
   * @param {string} category - Catégorie (optionnel)
   * @returns {Promise<object>} - Tâche créée
   */
  async addTodo(title, dueDate = null, priority = null, category = null) {
    const response = await this.request('/api/todos', 'POST', {
      title,
      dueDate,
      priority,
      category
    });
    
    return response;
  }

  /**
   * Recherche dans les mémoires
   * @param {string} query - Requête de recherche
   * @returns {Promise<Array>} - Mémoires correspondantes
   */
  async searchMemories(query) {
    const response = await this.request(`/api/memory/search?q=${encodeURIComponent(query)}`);
    return response.success ? response.data : [];
  }

  /**
   * Crée une nouvelle mémoire
   * @param {string} content - Contenu de la mémoire
   * @param {Array<string>} tags - Tags associés (optionnel)
   * @returns {Promise<object>} - Mémoire créée
   */
  async createMemory(content, tags = []) {
    const response = await this.request('/api/memory', 'POST', {
      content,
      tags
    });
    
    return response;
  }
}

// Exemple d'utilisation:
// 
// const lisa = new LisaApiClient('votre-cle-api-ici');
// 
// async function testLisa() {
//   // Vérifier si l'API est en ligne
//   const isHealthy = await lisa.isHealthy();
//   console.log('API en ligne:', isHealthy);
//   
//   // Traiter une intention
//   const result = await lisa.processIntent('Quel temps fait-il à Paris ?');
//   console.log('Résultat:', result);
// }
// 
// testLisa();

// Exporter le client pour utilisation dans d'autres environnements
export default LisaApiClient;
