# API Lisa

Cette API permet à des applications externes (comme GPT Lisa) d'accéder aux fonctionnalités de Lisa.

## Configuration

L'API utilise les variables d'environnement suivantes:

- `LISA_API_PORT`: Port d'écoute de l'API (par défaut: 3001)
- `LISA_API_KEY`: Clé d'API pour l'authentification (générez une clé forte pour la production)
- `LISA_CORS_ORIGINS`: Liste d'origines autorisées séparées par des virgules (par défaut: http://localhost:3000,https://chat.openai.com)
- `DATABASE_URL`: Chaîne de connexion pour la base de données PostgreSQL. Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`
- `JWT_SECRET`: Une chaîne de caractères secrete et complexe utilisée pour signer les tokens d'authentification. (Ex: `openssl rand -hex 32`)

## Authentification

Toutes les requêtes API doivent inclure une en-tête `x-api-key` avec votre clé API:

```
x-api-key: votre-cle-api-ici
```

## Points d'accès API

### Informations système

- **GET /health**
  - Description: Vérifie si l'API fonctionne correctement
  - Authentification: Non requise
  - Réponse: `{ success: true, data: { status: 'ok', version: '1.0.0', timestamp: '...' } }`

### Agents

- **GET /api/agents**
  - Description: Liste tous les agents disponibles
  - Authentification: Requise
  - Réponse: `{ success: true, data: [{ name, description, capabilities, version }, ...] }`

- **GET /api/agents/:name**
  - Description: Obtient les détails d'un agent spécifique
  - Authentification: Requise
  - Réponse: `{ success: true, data: { name, description, capabilities, version } }`

- **POST /api/agents/:name/execute**
  - Description: Exécute une action avec un agent spécifique
  - Authentification: Requise
  - Corps: `{ action: string, params: any }`
  - Réponse: `{ success: true, data: any }`

### Traitement d'intentions

- **POST /api/intent/process**
  - Description: Traite une intention utilisateur
  - Authentification: Requise
  - Corps: `{ text: string, language?: string, context?: object }`
  - Réponse: `{ success: true, data: { response, plan, explanation, traceId, success } }`

### Météo

- **GET /api/weather**
  - Description: Obtient la météo actuelle pour une localisation
  - Authentification: Requise
  - Paramètres: `location` (obligatoire)
  - Réponse: `{ success: true, data: any }`

- **GET /api/weather/forecast**
  - Description: Obtient les prévisions météo pour une localisation
  - Authentification: Requise
  - Paramètres: `location` (obligatoire), `days` (optionnel, défaut: 5)
  - Réponse: `{ success: true, data: any }`

### Tâches (Todos)

- **GET /api/todos**
  - Description: Liste toutes les tâches
  - Authentification: Requise
  - Réponse: `{ success: true, data: any }`

- **POST /api/todos**
  - Description: Crée une nouvelle tâche
  - Authentification: Requise
  - Corps: `{ title, dueDate?, priority?, category? }`
  - Réponse: `{ success: true, data: any }`

- **PUT /api/todos/:id**
  - Description: Met à jour une tâche existante
  - Authentification: Requise
  - Corps: `{ title?, completed?, dueDate?, priority?, category? }`
  - Réponse: `{ success: true, data: any }`

- **DELETE /api/todos/:id**
  - Description: Supprime une tâche
  - Authentification: Requise
  - Réponse: `{ success: true, data: any }`

- **PATCH /api/todos/:id/complete**
  - Description: Marque une tâche comme terminée
  - Authentification: Requise
  - Réponse: `{ success: true, data: any }`

### Mémoire

- **GET /api/memory**
  - Description: Liste toutes les mémoires
  - Authentification: Requise
  - Réponse: `{ success: true, data: any }`

- **GET /api/memory/search**
  - Description: Recherche dans les mémoires
  - Authentification: Requise
  - Paramètres: `q` (requête de recherche)
  - Réponse: `{ success: true, data: any }`

- **POST /api/memory**
  - Description: Crée une nouvelle mémoire
  - Authentification: Requise
  - Corps: `{ content, tags? }`
  - Réponse: `{ success: true, data: any }`

- **GET /api/memory/:id**
  - Description: Obtient une mémoire spécifique
  - Authentification: Requise
  - Réponse: `{ success: true, data: any }`

- **DELETE /api/memory/:id**
  - Description: Supprime une mémoire
  - Authentification: Requise
  - Réponse: `{ success: true, data: any }`

## Codes d'erreur

- `200/201`: Succès
- `400`: Requête invalide (paramètres manquants ou invalides)
- `401`: Non autorisé (clé API manquante ou invalide)
- `404`: Ressource non trouvée
- `500`: Erreur interne du serveur

## Exemple d'utilisation avec JavaScript/TypeScript

```typescript
// Exemple de client JavaScript pour l'API Lisa
async function callLisaApi() {
  const apiKey = 'votre-cle-api-ici';
  const baseUrl = 'http://localhost:3001';
  
  // Traiter une intention utilisateur
  const response = await fetch(`${baseUrl}/api/intent/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      text: 'Quel temps fait-il à Paris ?',
      language: 'fr'
    })
  });
  
  const data = await response.json();
  console.log(data);
}
```

## Exemple d'utilisation pour GPT Lisa

Pour permettre à GPT Lisa d'utiliser cette API, vous pouvez utiliser un plugin ou une fonction qui envoie des requêtes à l'API Lisa. Voici un exemple:

```javascript
// Fonction pour GPT Lisa
async function askLisa(question, context = {}) {
  const apiKey = 'votre-cle-api-ici';
  const baseUrl = 'http://votre-serveur.com';
  
  try {
    const response = await fetch(`${baseUrl}/api/intent/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        text: question,
        language: 'fr',
        context
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return `Erreur: ${data.error}`;
    }
    
    return data.data.response;
  } catch (error) {
    return `Impossible de contacter Lisa: ${error.message}`;
  }
}
```

## Démarrage du serveur API

Pour démarrer le serveur API:

```bash
# Définir la clé API
export LISA_API_KEY=votre-cle-api-securisee

# Démarrer le serveur
npm run start-api
```

ou en ajoutant un script dans votre package.json:

```json
{
  "scripts": {
    "start-api": "ts-node src/api/index.ts"
  }
}
```
