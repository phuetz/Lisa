# Configuration GPT ChatGPT pour Lisa

Ce dossier contient tous les fichiers nécessaires pour créer un GPT personnalisé dans ChatGPT qui se connecte à Lisa.

## Fichiers inclus

| Fichier | Description |
|---------|-------------|
| `openapi-schema.json` | Schéma OpenAPI à importer dans les Actions du GPT |
| `gpt-instructions.md` | Instructions système à copier dans le GPT |
| `README.md` | Ce guide d'installation |

## Guide d'installation pas à pas

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
   - Option A: Utiliser [ngrok](https://ngrok.com): `ngrok http 3000`
   - Option B: Déployer sur un serveur avec HTTPS
   - Option C: Utiliser Cloudflare Tunnel

4. **Notez votre URL publique** (ex: `https://abc123.ngrok.io`)

### Étape 2: Créer le GPT

1. Aller sur **https://chat.openai.com/gpts/editor**

2. Cliquer sur **"Create a GPT"** ou **"Créer un GPT"**

3. Dans l'onglet **"Configure"**:

   #### Nom
   ```
   Lisa Bridge
   ```

   #### Description
   ```
   Pont vers Lisa, une assistante IA avancée avec vision, mémoire, domotique et workflows.
   ```

   #### Instructions
   Copier le contenu de `gpt-instructions.md`

### Étape 3: Configurer les Actions

1. Dans l'onglet **"Configure"**, descendre jusqu'à **"Actions"**

2. Cliquer sur **"Create new action"**

3. Dans **"Authentication"**:
   - Type: **API Key**
   - API Key: `votre-cle-api-secrete` (la même que `LISA_BRIDGE_API_KEY`)
   - Auth Type: **Custom**
   - Custom Header Name: `X-Lisa-API-Key`

4. Dans **"Schema"**:
   - Cliquer sur **"Import from URL"** ou coller le contenu de `openapi-schema.json`
   - **IMPORTANT**: Modifier l'URL du serveur dans le schéma:
     ```json
     "servers": [
       {
         "url": "https://VOTRE-URL-PUBLIQUE/api/bridge"
       }
     ]
     ```

5. Cliquer sur **"Save"**

### Étape 4: Tester le GPT

1. Cliquer sur **"Preview"** en haut à droite

2. Essayer ces commandes:
   - "Vérifie si Lisa est en ligne" → devrait appeler `healthCheck`
   - "Demande à Lisa de se présenter" → devrait appeler `chatWithLisa`
   - "Quels outils Lisa a-t-elle ?" → devrait appeler `listTools`

### Étape 5: Publier (optionnel)

1. Cliquer sur **"Save"** puis choisir:
   - **Only me**: Privé
   - **Anyone with a link**: Partageable par lien
   - **Everyone**: Public sur le GPT Store

## Dépannage

### "Could not connect to server"
- Vérifier que Lisa est démarrée (`npm run start-api`)
- Vérifier que l'URL est accessible publiquement
- Vérifier le certificat HTTPS

### "Authentication failed"
- Vérifier que `LISA_BRIDGE_API_KEY` correspond
- Vérifier que le header est `X-Lisa-API-Key`

### "Action failed"
- Regarder les logs du serveur Lisa
- Vérifier que la route existe (`GET /api/bridge/health`)

## Sécurité

⚠️ **Important**:
- Ne jamais partager votre `LISA_BRIDGE_API_KEY`
- Utiliser HTTPS en production
- Limiter les origines CORS si possible
- Activer le rate limiting

## Support

Pour toute question, consultez la documentation complète dans `docs/AI_BRIDGE_INTEGRATION.md`.
