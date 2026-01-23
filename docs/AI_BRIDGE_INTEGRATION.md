# AI Bridge - Intégration Lisa ↔ ChatGPT ↔ Claude

## Vue d'ensemble

Le système AI Bridge permet à Lisa de communiquer avec ChatGPT (OpenAI) et Claude (Anthropic) de manière bidirectionnelle. Il utilise le protocole MCP (Model Context Protocol) pour exposer les capacités de Lisa comme outils utilisables par les LLMs externes.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   ChatGPT   │◄───►│              │◄───►│    Lisa     │
│   (GPTs)    │     │  AI Bridge   │     │   Agents    │
└─────────────┘     │   Service    │     └─────────────┘
                    │              │
┌─────────────┐     │              │     ┌─────────────┐
│   Claude    │◄───►│              │◄───►│  MCP Server │
│   (API)     │     │              │     │   (Tools)   │
└─────────────┘     └──────────────┘     └─────────────┘
```

## Composants

### 1. MCP Server (`src/mcp/LisaMcpServer.ts`)
Serveur MCP qui expose les outils de Lisa:
- `lisa_chat` - Conversation contextuelle
- `lisa_vision_analyze` - Analyse d'images
- `lisa_calendar_query` - Gestion du calendrier
- `lisa_smart_home` - Contrôle domotique
- `lisa_memory_store/recall` - Mémoire persistante
- `lisa_workflow_execute` - Exécution de workflows
- `lisa_agent_invoke` - Invocation d'agents
- `lisa_system_status` - Statut système

### 2. AI Bridge Service (`src/mcp/AIBridgeService.ts`)
Service unifié pour la communication multi-IA:
- Sessions de conversation persistantes
- Routage vers ChatGPT/Claude/Lisa
- Support du streaming
- Exécution des tool calls
- Génération du schéma OpenAPI

### 3. API Routes (`src/api/routes/bridge.ts`)
Endpoints REST pour l'intégration:
- `POST /api/bridge/chat` - Chat synchrone
- `POST /api/bridge/chat/stream` - Chat streaming (SSE)
- `POST /api/bridge/invoke` - Invoquer un outil
- `GET /api/bridge/tools` - Liste des outils
- `GET /api/bridge/openapi.json` - Schema OpenAPI
- `POST /api/bridge/session` - Créer une session
- `GET /api/bridge/health` - Health check

### 4. React Hook (`src/hooks/useAIBridge.ts`)
Hook pour l'intégration frontend:
```tsx
const { 
  sendMessage, 
  streamMessage, 
  invokeTool,
  messages,
  isLoading,
  isStreaming 
} = useAIBridge({ defaultTarget: 'lisa' });
```

### 5. UI Component (`src/components/AIBridgePanel.tsx`)
Interface utilisateur pour tester le bridge.

## Configuration

### Variables d'environnement

```env
# API Keys pour les providers
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Clé API pour le bridge (optionnel)
LISA_BRIDGE_API_KEY=your-bridge-api-key

# Configuration MCP
VITE_MCP_TOKEN=your-mcp-token
```

## Intégration avec ChatGPT GPTs

### Étape 1: Préparer votre serveur Lisa

1. **Configurer les variables d'environnement** dans `.env`:
   ```env
   LISA_BRIDGE_API_KEY=votre-cle-api-secrete
   VITE_OPENAI_API_KEY=sk-votre-cle-openai
   ```

2. **Démarrer le serveur API Lisa**:
   ```bash
   npm run start-api
   ```

3. **Exposer Lisa sur Internet** (pour que ChatGPT puisse y accéder):
   - **Option A**: Utiliser [ngrok](https://ngrok.com): `ngrok http 3000`
   - **Option B**: Déployer sur un serveur avec HTTPS
   - **Option C**: Utiliser Cloudflare Tunnel

4. **Notez votre URL publique** (ex: `https://abc123.ngrok.io`)

### Étape 2: Créer le GPT

1. Aller sur **https://chat.openai.com/gpts/editor**

2. Cliquer sur **"Create a GPT"**

3. Dans l'onglet **"Configure"**:

#### Nom du GPT
```
Lisa Bridge
```

#### Description
```
Pont vers Lisa, une assistante IA avancée avec vision, mémoire, domotique et workflows.
```

#### Instructions (à copier)
```
Tu es un GPT qui sert de pont entre l'utilisateur et Lisa, une assistante IA avancée installée localement. Tu peux accéder aux capacités de Lisa via l'API Bridge.

## Tes capacités via Lisa

### 🗣️ Communication
- **chatWithLisa**: Envoyer des messages à Lisa pour des conversations contextuelles
- **invokeAgent**: Appeler des agents spécialisés (planner, critic, memory, vision, hearing)

### 👁️ Vision
- **analyzeImage**: Analyser des images (objets, texte, scènes)
- Lisa utilise MediaPipe pour la détection de pose, mains, visage

### 📅 Productivité
- **manageCalendar**: Gérer le calendrier (créer, lister, modifier, supprimer des événements)
- **executeWorkflow**: Lancer des workflows automatisés

### 🏠 Domotique
- **controlSmartHome**: Contrôler les appareils (lumières, thermostats, etc.)
- Actions: on, off, toggle, set, status

### 🧠 Mémoire
- **storeMemory**: Sauvegarder des informations (préférences, faits, contexte)
- **recallMemory**: Rechercher des informations stockées (par clé ou sémantiquement)

### ⚙️ Système
- **getSystemStatus**: Vérifier l'état de Lisa et ses composants
- **listTools**: Voir tous les outils disponibles
- **healthCheck**: Vérifier que Lisa est en ligne

## Comment répondre

1. Toujours vérifier d'abord si Lisa est disponible avec healthCheck si tu as un doute
2. Utiliser les bons outils selon la demande de l'utilisateur
3. Expliquer ce que tu fais quand tu appelles Lisa
4. Reformuler les réponses de Lisa de manière naturelle
5. Gérer les erreurs gracieusement si Lisa n'est pas disponible

## Ton style

- Sois amical et serviable
- Parle en français par défaut
- Explique clairement ce que Lisa peut faire
- Si une action échoue, propose des alternatives
```

### Étape 3: Configurer les Actions

1. Dans l'onglet **"Configure"**, descendre jusqu'à **"Actions"**

2. Cliquer sur **"Create new action"**

3. Dans **"Authentication"**:
   - Type: **API Key**
   - API Key: `votre-cle-api-secrete` (la même que `LISA_BRIDGE_API_KEY`)
   - Auth Type: **Custom**
   - Custom Header Name: `X-Lisa-API-Key`

4. Dans **"Schema"**, coller ce schéma OpenAPI complet:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Lisa AI Bridge API",
    "description": "API pour connecter ChatGPT à Lisa",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://VOTRE-URL-PUBLIQUE/api/bridge",
      "description": "Remplacer par votre URL ngrok ou serveur"
    }
  ],
  "paths": {
    "/chat": {
      "post": {
        "operationId": "chatWithLisa",
        "summary": "Envoyer un message à Lisa",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "message": { "type": "string", "description": "Le message à envoyer" },
                  "sessionId": { "type": "string", "description": "ID de session (optionnel)" }
                },
                "required": ["message"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Réponse de Lisa",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "response": { "type": "string" },
                    "sessionId": { "type": "string" },
                    "toolsUsed": { "type": "array", "items": { "type": "string" } }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/vision/analyze": {
      "post": {
        "operationId": "analyzeImage",
        "summary": "Analyser une image",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "image": { "type": "string", "description": "Image en base64 ou URL" },
                  "prompt": { "type": "string", "description": "Question sur l'image" }
                },
                "required": ["image"]
              }
            }
          }
        },
        "responses": { "200": { "description": "Analyse de l'image" } }
      }
    },
    "/calendar": {
      "post": {
        "operationId": "manageCalendar",
        "summary": "Gérer le calendrier",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "action": { "type": "string", "enum": ["list", "create", "update", "delete"] },
                  "date": { "type": "string", "description": "Date ISO" },
                  "title": { "type": "string" },
                  "description": { "type": "string" }
                },
                "required": ["action"]
              }
            }
          }
        },
        "responses": { "200": { "description": "Résultat calendrier" } }
      }
    },
    "/smarthome": {
      "post": {
        "operationId": "controlSmartHome",
        "summary": "Contrôler la domotique",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "device": { "type": "string", "description": "Nom de l'appareil" },
                  "action": { "type": "string", "enum": ["on", "off", "toggle", "set", "status"] },
                  "value": { "type": "number", "description": "Valeur (pour set)" }
                },
                "required": ["device", "action"]
              }
            }
          }
        },
        "responses": { "200": { "description": "Résultat domotique" } }
      }
    },
    "/memory/store": {
      "post": {
        "operationId": "storeMemory",
        "summary": "Stocker en mémoire",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "key": { "type": "string" },
                  "value": { "type": "string" },
                  "category": { "type": "string", "enum": ["preference", "fact", "context"] }
                },
                "required": ["key", "value"]
              }
            }
          }
        },
        "responses": { "200": { "description": "Confirmation" } }
      }
    },
    "/memory/recall": {
      "post": {
        "operationId": "recallMemory",
        "summary": "Rappeler de la mémoire",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "key": { "type": "string" },
                  "category": { "type": "string" },
                  "semantic_query": { "type": "string", "description": "Recherche sémantique" }
                }
              }
            }
          }
        },
        "responses": { "200": { "description": "Informations trouvées" } }
      }
    },
    "/workflow/execute": {
      "post": {
        "operationId": "executeWorkflow",
        "summary": "Exécuter un workflow",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "workflow_id": { "type": "string" },
                  "workflow_name": { "type": "string" },
                  "parameters": { "type": "object" }
                }
              }
            }
          }
        },
        "responses": { "200": { "description": "Résultat workflow" } }
      }
    },
    "/agent/invoke": {
      "post": {
        "operationId": "invokeAgent",
        "summary": "Invoquer un agent",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "agent": { "type": "string", "description": "planner, critic, memory, vision, hearing..." },
                  "input": { "type": "string" },
                  "options": { "type": "object" }
                },
                "required": ["agent", "input"]
              }
            }
          }
        },
        "responses": { "200": { "description": "Réponse agent" } }
      }
    },
    "/system/status": {
      "post": {
        "operationId": "getSystemStatus",
        "summary": "Statut système Lisa",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "components": { "type": "array", "items": { "type": "string" } }
                }
              }
            }
          }
        },
        "responses": { "200": { "description": "Statut système" } }
      }
    },
    "/tools": {
      "get": {
        "operationId": "listTools",
        "summary": "Lister les outils disponibles",
        "responses": { "200": { "description": "Liste des outils" } }
      }
    },
    "/health": {
      "get": {
        "operationId": "healthCheck",
        "summary": "Vérifier que Lisa est en ligne",
        "responses": { "200": { "description": "Statut de santé" } }
      }
    }
  }
}
```

5. Cliquer sur **"Save"**

### Étape 4: Tester le GPT

1. Cliquer sur **"Preview"** en haut à droite

2. Essayer ces commandes:
   - "Vérifie si Lisa est en ligne" → devrait appeler `healthCheck`
   - "Demande à Lisa de se présenter" → devrait appeler `chatWithLisa`
   - "Quels outils Lisa a-t-elle ?" → devrait appeler `listTools`

### Étape 5: Publier (optionnel)

Cliquer sur **"Save"** puis choisir:
- **Only me**: Privé
- **Anyone with a link**: Partageable par lien
- **Everyone**: Public sur le GPT Store

## Intégration avec Claude

### Via API directe

```typescript
import { aiBridgeService } from './mcp/AIBridgeService';

// Créer une session avec Claude
const session = aiBridgeService.createSession(['claude']);

// Envoyer un message
const response = await aiBridgeService.sendMessage(
  session.id,
  "Analyse cette image",
  'user',
  'claude'
);
```

### Outils disponibles pour Claude

```typescript
const tools = aiBridgeService.getAnthropicTools();
// Format compatible avec l'API Anthropic
```

## Exemples d'utilisation

### Chat simple

```bash
curl -X POST http://localhost:3000/api/bridge/chat \
  -H "Content-Type: application/json" \
  -H "X-Lisa-API-Key: your-key" \
  -d '{"message": "Bonjour Lisa!", "target": "lisa"}'
```

### Invoquer un outil

```bash
curl -X POST http://localhost:3000/api/bridge/invoke \
  -H "Content-Type: application/json" \
  -H "X-Lisa-API-Key: your-key" \
  -d '{"tool": "lisa_system_status", "arguments": {}}'
```

### Streaming

```bash
curl -X POST http://localhost:3000/api/bridge/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-Lisa-API-Key: your-key" \
  -d '{"message": "Raconte-moi une histoire", "target": "chatgpt"}'
```

## Sécurité

1. **Authentification**: Toutes les routes sont protégées par API key
2. **Rate limiting**: Appliqué via le middleware global
3. **CORS**: Configuré pour les origines autorisées
4. **Validation**: Schémas Zod pour toutes les entrées

## Dépannage

### Erreur "API key non configurée"
Vérifier que `VITE_OPENAI_API_KEY` ou `VITE_ANTHROPIC_API_KEY` sont définis.

### Erreur "Session non trouvée"
Créer une nouvelle session via `POST /api/bridge/session`.

### Streaming ne fonctionne pas
Vérifier que le client supporte Server-Sent Events (SSE).

## Roadmap

- [ ] Support des images dans les messages
- [ ] Historique de conversation persistant
- [ ] Multi-modal (audio, vidéo)
- [ ] Webhooks pour événements
- [ ] Rate limiting par session
