# Lisa – Vision & Hearing Assistant

Lisa est un assistant virtuel exécuté 100 % dans le navigateur qui perçoit le visage, les mains, les objets, la posture et les sons ambiants. Elle propose désormais une architecture basée sur des agents intelligents, des fonctionnalités PWA avancées et une API REST pour l'intégration externe.

## Vue d'ensemble

Lisa est conçue comme un assistant virtuel moderne qui:

- **Fonctionne entièrement côté client**: Aucun serveur backend n'est nécessaire pour les fonctionnalités de base
- **Respecte la vie privée**: Les données sensibles restent sur l'appareil de l'utilisateur
- **Utilise des technologies web modernes**: WebRTC, TensorFlow.js, Web Speech API, Notifications API
- **S'adapte à l'utilisateur**: Interface contextuelle qui répond à l'attention et aux intentions de l'utilisateur
- **Contrôle complet de l'ordinateur**: Automatisation du bureau via Code Buddy (inspiré d'Open Interpreter)

## Code Buddy - Contrôle Informatique par IA

Code Buddy est le module de contrôle d'ordinateur de Lisa, inspiré par [Open Interpreter](https://github.com/openinterpreter/open-interpreter). Il permet à l'IA de contrôler votre ordinateur de manière autonome.

### Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| **Capture d'écran** | Screenshots en temps réel |
| **Contrôle souris** | Clics, mouvements, défilement, drag & drop |
| **Contrôle clavier** | Saisie de texte, raccourcis clavier |
| **Détection d'éléments** | OCR pour trouver du texte à l'écran |
| **Détection d'icônes** | Computer vision pour trouver des icônes (close, minimize, search, menu...) |
| **Gestion du presse-papiers** | Lecture et écriture |
| **Gestion de fichiers** | Lecture, écriture, listage de répertoires |
| **Recherche web** | Recherche silencieuse sans ouvrir de navigateur |
| **Système de compétences** | Enregistrement et réutilisation d'actions |

### Installation du Backend Desktop

```bash
cd packages/lisa-desktop
pip install aiohttp pyautogui pillow pyperclip pytesseract opencv-python numpy
python src/server.py
```

Le serveur démarre sur `http://localhost:8765`.

### API Computer (style Open Interpreter)

```typescript
import { computer } from './services/ComputerControlService';

// Capture d'écran
const screenshot = await computer.display.view();

// Cliquer sur du texte ou des coordonnées
await computer.mouse.click("Fichier");
await computer.mouse.click({ x: 100, y: 200 });

// Cliquer sur une icône détectée
await computer.mouse.clickIcon("close");

// Saisir du texte
await computer.keyboard.write("Hello World!");

// Raccourcis clavier
await computer.keyboard.hotkey("ctrl", "s");

// Recherche web silencieuse
const results = await computer.browser.search("météo Paris");

// Gestion de fichiers
const content = await computer.files.read("/path/to/file.txt");
await computer.files.write("/path/to/file.txt", "contenu");

// Compétences réutilisables
computer.skills.learn("ouvrir_chrome", "Ouvre Chrome et va sur Google", [
  { keyboard: { type: 'hotkey', keys: ['win'] } },
  { wait: 500 },
  { keyboard: { type: 'write', text: 'chrome' } },
  { keyboard: { type: 'press', key: 'enter' } }
]);
await computer.skills.run("ouvrir_chrome");
```

### Modes de sécurité

| Mode | Description |
|------|-------------|
| `off` | Exécution automatique sans confirmation |
| `ask` | Demande confirmation avant chaque action |
| `auto` | Exécute sauf si action dangereuse détectée |

### Profils préconfigurés

- **default** - Mode équilibré avec confirmations
- **fast** - Réponses rapides, auto-run activé
- **vision** - Mode vision avec détection d'éléments
- **safe** - Sécurité maximale, pas de contrôle machine
- **local** - Utilise LM Studio en local
- **coding** - Optimisé pour la génération de code

## Configuration

### Variables d'environnement
Créez un fichier `.env.local` à la racine du projet :

```env
VITE_GOOGLE_CLIENT_ID=<votre client id>
VITE_GOOGLE_API_KEY=<votre api key>
VITE_GOOGLE_SEARCH_API_KEY=<votre clé API Google Search>
VITE_GOOGLE_SEARCH_ENGINE_ID=<votre ID Google Custom Search Engine>
VITE_LLM_API_KEY=<votre clé API OpenAI>
VITE_OPENAI_API_KEY=<votre clé API OpenAI pour PlannerAgent>
VITE_MCP_TOKEN=<token bearer facultatif>
VITE_PV_ACCESS_KEY=<clé Picovoice Porcupine>
JWT_SECRET=<votre chaîne de caractères secrète pour les jetons d'authentification>
```

### Wake-word (Porcupine)

Lisa peut utiliser [Picovoice Porcupine](https://picovoice.ai/) pour détecter « Hey Lisa » de manière fiable, hors-ligne.

1. Créez un compte gratuit sur picovoice.ai et récupérez votre **Access Key**.  
2. Ajoutez-la dans `.env.local` :

```env
VITE_PV_ACCESS_KEY=<votre access key Picovoice>
```

3. Installez les dépendances :

```bash
npm i @picovoice/porcupine-web @picovoice/web-voice-processor
```

4. (Optionnel) Pour un mot-clé personnalisé, placez le fichier `lisa.ppn` dans `public/porcupine/` et remplacez `BuiltInKeyword.PORCUPINE` par le chemin du modèle dans `useWakeWord.ts`.

### Sécurité
- Le jeton Google OAuth est désormais stocké dans **`sessionStorage`** (au lieu de `localStorage`) et sera purgé à la fermeture de l'onglet.
- Un **Content-Security-Policy** strict est injecté via un plugin Vite (`csp-headers`). Vous pouvez l'ajuster dans `vite.config.ts`.
- Les appels MCP utilisent un en-tête `Authorization: Bearer <VITE_MCP_TOKEN>` si la variable est définie.
- Les notifications push utilisent un **Service Worker** conforme aux bonnes pratiques de sécurité.

### Architecture Basée sur des Agents

Lisa utilise une architecture modulaire basée sur des agents qui permet une extensibilité et une maintenance simplifiée :

### Écosystème d'agents spécialisés

Lisa implémente une architecture multi-agents inspirée de GenSpark, où chaque agent est spécialisé dans un domaine particulier et collabore au sein d'un réseau d'agents pour résoudre des problèmes complexes.

![Architecture multi-agents](https://via.placeholder.com/800x400?text=Architecture+Multi-Agents+de+Lisa)

#### PlannerAgent

L'agent de planification central qui :
- Analyse les requêtes en langage naturel pour comprendre l'intention de l'utilisateur
- Décompose les tâches complexes en étapes exécutables
- Génère dynamiquement des plans d'exécution optimisés
- Coordonne l'exécution parallèle des tâches lorsque c'est possible
- Surveille et ajuste les plans en temps réel
- Intègre les résultats des agents spécialisés

```typescript
// Exemple d'utilisation du PlannerAgent
const planner = agentRegistry.getAgent('PlannerAgent');
const result = await planner.execute({ 
  request: "Résume les derniers articles sur l'IA et crée un rappel pour demain", 
  language: 'fr' 
});
```

#### Répertoire d'agents spécialisés

Lisa dispose d'un ensemble complet d'agents spécialisés couvrant différents domaines d'expertise :

##### Agents de connaissances et d'information

| Agent | Description | Capacités |  
|-------|-------------|----------|  
| **WeatherAgent** | Fournit des données météorologiques précises et des prévisions | Conditions actuelles, prévisions, alertes météo |
| **WebSearchAgent** | Effectue des recherches web pour répondre aux questions | Recherche sémantique, filtrage des résultats, extraction d'information |
| **WebContentReaderAgent** | Extrait et analyse le contenu des pages web | Extraction de texte, analyse de structure, résumé de contenu |
| **NewsAgent** | Agrège et résume les actualités | Collecte multi-sources, classification par thème, détection de biais |
| **WikiAgent** | Accède aux informations encyclopédiques | Recherche précise, vérification des faits, extraction de définitions |

##### Agents de productivité et organisation

| Agent | Description | Capacités |  
|-------|-------------|----------|  
| **CalendarAgent** | Gère les événements et planifications | Création/modification d'événements, rappels, conflits |
| **TodoAgent** | Gère les listes de tâches | Création/modification de tâches, priorités, échéances |
| **NotesAgent** | Crée et organise des notes | Prise de notes, catégorisation, recherche contextuelle |
| **EmailAgent** | Assiste dans la gestion des emails | Analyse, classement, suggestion de réponses |
| **SchedulerAgent** | Optimise la planification d'événements | Analyse de disponibilité, suggestion de créneaux |

##### Agents d'analyse et de création

| Agent | Description | Capacités |  
|-------|-------------|----------|  
| **CodeInterpreterAgent** | Exécute et explique du code | Analyse de code, exécution sécurisée, débogage |
| **DataAnalysisAgent** | Analyse des ensembles de données | Statistiques, visualisations, tendances |
| **ContentGeneratorAgent** | Crée du contenu textuel et créatif | Rédaction, résumés, traductions |
| **ImageAnalysisAgent** | Analyse des images et du contenu visuel | Reconnaissance d'objets, analyse de scènes, OCR |
| **AudioAnalysisAgent** | Traite et analyse les signaux audio | Transcription, détection d'émotions, filtrage |

##### Agents d'assistance et d'intégration

| Agent | Description | Capacités |  
|-------|-------------|----------|  
| **SmartHomeAgent** | Intègre les appareils connectés | Contrôle d'appareils, scénarios, surveillance |
| **HealthMonitorAgent** | Suit les données de santé et bien-être | Analyse de tendances, rappels, recommandations |
| **TranslationAgent** | Traduit le contenu entre différentes langues | Traduction contextuelle, adaptation culturelle |
| **PersonalizationAgent** | Adapte l'expérience à l'utilisateur | Apprentissage des préférences, suggestions personnalisées |
| **SecurityAgent** | Surveille et protège la vie privée | Détection de risques, recommendations de sécurité |
| **RosAgent** | Interagit avec les systèmes ROS (Robot Operating System) | Publication de messages, souscription à des topics, appel de services ROS |

#### Architecture du registre d'agents

Le système de registre centralise tous les agents disponibles :

- Implémente le pattern Singleton pour garantir une instance unique
- Permet de rechercher des agents par nom, domaine ou capacité
- Facilite l'ajout de nouvelles capacités sans modifier le code existant
- Chaque agent respecte une interface commune pour une intégration standardisée

```typescript
// Interface standardisée pour tous les agents
interface BaseAgent {
  // Propriétés d'identification
  name: string;                    // Nom unique de l'agent
  description: string;             // Description courte
  version: string;                 // Version de l'agent
  domain: AgentDomain;             // Domaine d'expertise (enum)
  capabilities: string[];          // Liste de capacités spécifiques
  requiresAuthentication?: boolean; // Nécessite une authentification
  
  // Méthodes
  execute(props: AgentExecuteProps): Promise<AgentExecuteResult>;
  canHandle(query: string, context?: any): Promise<number>; // Score de confiance 0-1
  getRequiredParameters(task: string): Promise<AgentParameter[]>;
}

// Exemple d'implémentation d'un nouvel agent
class SmartHomeAgent implements BaseAgent {
  name = 'SmartHomeAgent';
  description = 'Contrôle les appareils connectés et gère les scénarios domotiques';
  version = '1.0.0';
  domain = AgentDomain.INTEGRATION;
  capabilities = ['device_control', 'scene_management', 'status_monitoring'];
  
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    // Logique de contrôle domotique
    const { intent, devices, action, parameters } = props;
    
    switch (intent) {
      case 'toggle_device':
        return await this.toggleDevice(devices[0], parameters);
      case 'run_scene':
        return await this.activateScene(parameters.sceneName);
      case 'get_status':
        return await this.getDeviceStatus(devices);
      default:
        return { 
          success: false, 
          output: `Intent non supporté: ${intent}`,
          error: new Error('UNSUPPORTED_INTENT')
        };
    }
  }
  
  async canHandle(query: string, context?: any): Promise<number> {
    // Analyse si la requête concerne la domotique
    const smartHomeKeywords = ['lumière', 'chauffage', 'température', 'scénario', 'allumer', 'éteindre'];
    return this.calculateKeywordMatch(query, smartHomeKeywords);
  }
  
  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    // Détermine les paramètres nécessaires en fonction de la tâche
    if (task.includes('allumer') || task.includes('éteindre')) {
      return [{ name: 'device', type: 'string', required: true }];
    }
    return [];
  }
  
  private calculateKeywordMatch(query: string, keywords: string[]): number {
    // Calcule un score de correspondance entre 0 et 1
    const words = query.toLowerCase().split(' ');
    const matches = keywords.filter(kw => words.some(w => w.includes(kw.toLowerCase())));
    return matches.length / Math.max(keywords.length, 1);
  }
}

// Enregistrement de l'agent dans le registre
agentRegistry.register(new SmartHomeAgent());
```

#### Collaboration inter-agents

Le système implémente un mécanisme sophistiqué de collaboration entre agents:

##### Protocole de communication

Les agents communiquent via un protocole standardisé qui permet :
- **Communication asynchrone** : Messages et événements entre agents
- **Partage de contexte** : Transmission de contexte entre différents agents 
- **Réduction d'incertitude** : Mécanismes de clarification et validation
- **Fusion de connaissances** : Combinaison des informations de multiples agents

```typescript
// Exemple de communication inter-agents
const weatherAgent = agentRegistry.getAgent('WeatherAgent');
const schedulerAgent = agentRegistry.getAgent('SchedulerAgent');

// WeatherAgent détecte des conditions météo défavorables
const weatherAlert = await weatherAgent.execute({ intent: 'check_weather_alert', location: 'Paris' });

// Communication de l'alerte au SchedulerAgent
if (weatherAlert.output.severity > 0.7) {
  await schedulerAgent.execute({ 
    intent: 'adjust_schedule',
    context: { weatherAlert: weatherAlert.output },
    parameters: { adjustmentReason: 'WEATHER_ALERT' }
  });
}
```

##### Orchestration de plans complexes

Le PlannerAgent orchestre des workflows complexes en :

- Déterminant l'ordre optimal d'exécution des agents
- Gérant les dépendances entre tâches et sous-tâches
- Parallélisant l'exécution quand les tâches sont indépendantes
- Adaptant le plan en cas d'échec ou de nouvelles contraintes
- Optimisant les ressources système disponibles

```typescript
// Exemple de plan généré pour une requête complexe
const plan = {
  goal: "Organiser une réunion demain en tenant compte de la météo et préparer un résumé des documents pertinents",
  steps: [
    {
      id: "weather-check",
      agent: "WeatherAgent",
      task: "Vérifier la météo pour demain",
      dependencies: [],
      status: "pending"
    },
    {
      id: "calendar-check",
      agent: "CalendarAgent",
      task: "Vérifier les disponibilités de demain",
      dependencies: [],
      status: "pending"
    },
    {
      id: "doc-search",
      agent: "WebSearchAgent",
      task: "Rechercher les documents pertinents",
      dependencies: [],
      status: "pending"
    },
    {
      id: "schedule-meeting",
      agent: "SchedulerAgent",
      task: "Programmer la réunion",
      dependencies: ["weather-check", "calendar-check"],
      status: "waiting"
    },
    {
      id: "summarize-docs",
      agent: "ContentGeneratorAgent",
      task: "Résumer les documents trouvés",
      dependencies: ["doc-search"],
      status: "waiting"
    },
    {
      id: "prepare-briefing",
      agent: "NotesAgent",
      task: "Préparer un briefing pour la réunion",
      dependencies: ["schedule-meeting", "summarize-docs"],
      status: "waiting"
    }
  ]
};
```

#### Interface de gestion de workflow

L'interface utilisateur de gestion des workflows permet de :

- Visualiser en temps réel l'exécution des étapes d'un plan
- Voir les dépendances entre les étapes et leur état (en attente, en cours, terminé, échoué)
- Intervenir manuellement pour ajuster ou corriger un plan en cours d'exécution
- Sauvegarder un plan réussi comme modèle pour une réutilisation ultérieure
- Créer des points de contrôle (checkpoints) pour reprendre l'exécution après un arrêt

### Fonctionnalités PWA

Lisa est une Progressive Web App (PWA) complète offrant une expérience similaire à une application native :

#### Installation et intégration système

- **Manifest PWA**: Définit l'apparence, l'orientation et les icones de l'application
- **Installation sur l'écran d'accueil**: Ajout d'icône sur l'écran d'accueil comme une application native
- **Icônes adaptatives**: Support des icônes maskables et badges de notification
- **Raccourcis d'application**: Actions rapides accessibles depuis l'icône de l'application

```json
// Extrait du fichier manifest.json
{
  "name": "Lisa Virtual Assistant",
  "short_name": "Lisa",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#121212",
  "theme_color": "#6e8efb"  
}
```

#### Service Worker

Le Service Worker offre de nombreuses fonctionnalités avancées :

- **Cache stratégique**: Mise en cache des ressources statiques pour un chargement rapide
- **Fonctionnement hors-ligne**: Accès aux fonctionnalités de base sans connexion internet
- **Mise à jour en arrière-plan**: Installation automatique des nouvelles versions
- **Gestion des notifications**: Réception et traitement des notifications push

```javascript
// Enregistrement du Service Worker dans main.tsx
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered with scope:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};
```

#### Notifications Push

Le système de notifications permet de :

- **Recevoir des alertes**: Notifications pour alarmes et minuteurs même lorsque le navigateur est fermé
- **Actions rapides**: Boutons d'action directement dans la notification (snooze, arrêt, etc.)
- **Planification**: Programmation de notifications futures pour rappels ou événements
- **Permission utilisateur**: Gestion respectueuse des autorisations via une interface dédiée

## Internationalisation (i18n)

Lisa supports English and French. The language is auto-detected from your browser locale (`navigator.language`). Any locale starting with **`fr`** selects French, otherwise English.

If you want to override the language manually for testing, open your browser console and run:

```js
localStorage.setItem('i18nextLng', 'fr'); // or 'en'
location.reload();
```

At runtime you may also build a custom toggle:
```tsx
import { useTranslation } from 'react-i18next';
const { i18n } = useTranslation();
<i onClick={() => i18n.changeLanguage('fr')}>FR</i>
<i onClick={() => i18n.changeLanguage('en')}>EN</i>
```

All user-facing strings live in `src/locales/{en,fr}/common.json`.

### Fonctionnalités Avancées

Lisa offre un ensemble de fonctionnalités avancées pour améliorer la productivité et l'expérience utilisateur:

#### Résumé de presse-papiers

- **Surveillance intelligente**: Détection automatique du contenu copié dans le presse-papiers
- **Résumé via LLM**: Utilisation d'un modèle de langage pour générer des résumés concis
- **Contrôle utilisateur**: Options pour activer/désactiver la surveillance ou déclencher manuellement un résumé
- **Support multi-langue**: Analyse et résumé dans la langue de l'interface (EN/FR/ES)

```typescript
// Exemple d'utilisation du résumé de presse-papiers
const { summarizeClipboard, toggleClipboardMonitoring } = useClipboardSummarizer();
// Résumer manuellement le contenu actuel du presse-papiers
const summary = await summarizeClipboard();
// Activer/désactiver la surveillance automatique
toggleClipboardMonitoring();
```

#### Recherche web et réponses

- **Intégration Google Search**: Recherche de résultats pertinents via l'API Google Custom Search
- **Synthèse d'information**: Génération de réponses concises à partir de multiples sources
- **Citation des sources**: Indication des sources utilisées pour la réponse
- **Contexte de conversation**: Les résultats sont conservés pour les questions de suivi

#### Conversations contextuelles

Lisa maintient un contexte conversationnel pour des interactions plus naturelles :

- **Mémoire à court terme**: Rappel des sujets récents et des interactions
- **Questions de suivi**: Compréhension des questions comme "Et pour demain?" après une demande de météo
- **Références contextuelles**: Résolution correcte des pronoms et références
- **Historique conversationnel**: Conservation d'un historique limité pour le contexte

#### Support multi-langue

L'assistant est entièrement disponible en plusieurs langues :

- **Interface utilisateur**: Traduction complète de l'interface (i18next)
- **Reconnaissance vocale**: Détection automatique de la langue parlée
- **Analyses d'intention**: Compréhension des commandes en anglais, français et espagnol
- **Synthèse vocale**: Réponses vocales dans la langue détectée
- **LLM multilingue**: Traitement des requêtes dans toutes les langues supportées

#### API REST pour intégrations externes

Lisa expose désormais une API REST complète permettant à des applications externes (comme GPT Lisa) d'accéder aux fonctionnalités de l'assistant :

- **Authentification par clé API**: Sécurité robuste avec en-tête `x-api-key`
- **Points d'accès complets**: Accès aux agents, intentions, météo, tâches et mémoire
- **Format JSON standard**: Toutes les réponses suivent une structure cohérente
- **Gestion d'erreurs avancée**: Codes d'erreur et messages explicites
- **Documentation complète**: Dans `src/api/README.md`

```bash
# Démarrage de l'API (après configuration du fichier .env)
npm run start-api
```

```javascript
// Exemple d'utilisation du client JavaScript pour l'API Lisa
import LisaApiClient from './lisa-api-client.js';

const lisa = new LisaApiClient('votre-cle-api-securisee');

async function askLisa() {
  // Vérifier si l'API est disponible
  const isHealthy = await lisa.isHealthy();
  if (!isHealthy) return console.error('API Lisa indisponible');
  
  // Traiter une intention
  const result = await lisa.processIntent('Quel temps fait-il à Paris ?');
  console.log(result.data.response);
}
```

### Organisation du code

Le projet suit une structure modulaire claire pour faciliter la maintenance et l'extension :

```
src/
├── agents/              # Système d'agents intelligents
│   ├── registry.ts     # Registre central des agents
│   ├── types.ts        # Types et interfaces des agents
│   ├── PlannerAgent.ts # Agent d'orchestration principal
│   └── MetaHumanAgent.ts # Agent de contrôle du MetaHuman
├── components/         # Composants React réutilisables
│   ├── UI/             # Éléments d'interface générique
│   ├── panels/         # Panneaux fonctionnels (alarmes, todos, etc.)
│   ├── MetaHumanCanvas.tsx # Composant de rendu 3D pour le MetaHuman
│   ├── ModelLoader.tsx # Chargeur de modèles 3D
│   └── MetaHumanControlsPanel.tsx # Panneau de contrôle du MetaHuman
├── hooks/              # Hooks React personnalisés
│   ├── useAlarmTimerScheduler.ts  # Gestion des alarmes et minuteurs
│   ├── useClipboardSummarizer.ts  # Surveillance et résumé du presse-papiers
│   └── useNotifications.ts        # Gestion des notifications push
├── store/              # État global de l'application
│   ├── visionAudioStore.ts        # Store Zustand principal
│   └── metaHumanStore.ts # Store Zustand pour le MetaHuman
├── tools/              # Outils spécifiques
├── locales/            # Fichiers de traduction
│   ├── en/             # Anglais
│   ├── fr/             # Français
│   └── es/             # Espagnol
└── public/             # Ressources statiques et service worker
```

## Application Desktop (Electron)

Lisa peut tourner en tant qu'application desktop native via Electron :

### Développement
```bash
pnpm electron:dev        # Lance Electron avec le dev server Vite (HMR)
pnpm electron:build      # Build main + preload + renderer
pnpm electron:preview    # Preview du build Electron
```

### Packaging
```bash
pnpm electron:package    # Build + crée un installateur (.exe / .dmg / .AppImage)
```

### Architecture Electron
```
electron/
  main.ts          # Processus principal (BrowserWindow, Tray, IPC, API server)
  preload.ts       # Bridge sécurisé (contextBridge → window.electronAPI)
  types.ts         # Types TypeScript partagés
electron.vite.config.ts  # Config electron-vite (3 targets)
```

### Fonctionnalités natives
- **System tray** avec menu contextuel (Ouvrir, Chat, Dashboard, Agents, Quitter)
- **Notifications natives** via l'API Electron
- **Screen capture** via desktopCapturer
- **Accès fichiers** (lecture/écriture texte et binaire)
- **Dialogues natifs** (ouvrir/sauvegarder fichier)
- **Serveur API embarqué** sur port 3001

## Démo locale
```bash
pnpm install
pnpm dev
# http://localhost:5180
```

- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
