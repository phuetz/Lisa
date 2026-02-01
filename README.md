# 🤖 Lisa – Assistant IA Multi-Sensoriel

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff.svg)](https://vitejs.dev/)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA-green.svg)](#accessibilité)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Assistant virtuel vivant** avec perception multi-sensorielle (5 sens), 50+ agents IA, workflows visuels et interface accessible WCAG 2.1 AA.

Lisa est un assistant IA **100% navigateur** qui perçoit, raisonne et agit. Elle combine vision, audition, toucher, environnement et proprioception pour créer une expérience utilisateur immersive.

**Status**: ✅ **Production-Ready** | **Score UX/UI**: 10/10 | **Accessibilité**: WCAG 2.1 AA | **Dernière MàJ**: 31 Jan 2026

[![Android](https://img.shields.io/badge/Android-Capacitor-3DDC84.svg)](https://capacitorjs.com/)
[![Gemini](https://img.shields.io/badge/Gemini_3-Supported-4285F4.svg)](https://ai.google.dev/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4.svg)](https://core.telegram.org/bots)
[![Discord](https://img.shields.io/badge/Discord-Bot-5865F2.svg)](https://discord.js.org/)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4.svg)](#-extension-chrome)

---

## 🌟 Nouveautés - Modernisation OpenClaw (Jan 2026)

Lisa intègre désormais des fonctionnalités inspirées d'[OpenClaw](https://github.com/openclaw/openclaw) :

| Module | Description | Technologie |
|--------|-------------|-------------|
| **Telegram Bot** | Bot Telegram fonctionnel | grammy |
| **Discord Bot** | Bot Discord avec commandes | discord.js |
| **Model Failover** | Multi-provider avec fallback auto | OpenAI, Anthropic, Google, Ollama, Groq, Mistral |
| **Voice Wake Pro** | Détection wake word avancée | Porcupine + Web Speech API |
| **Edge TTS** | Synthèse vocale gratuite | Microsoft Edge TTS |
| **Sessions Tools Pro** | Communication Agent-to-Agent | WebSocket |

> Voir [OPENCLAW_VS_LISA_COMPARISON.md](OPENCLAW_VS_LISA_COMPARISON.md) pour les détails.

---

## 🌐 Extension Chrome (Computer Use)

Lisa dispose d'une **extension Chrome** permettant le contrôle autonome du navigateur, similaire à Claude Computer Use.

### Installation

```bash
# 1. Générer les icônes
# Ouvrir apps/chrome-extension/generate-icons.html dans Chrome
# Cliquer "Télécharger tous les icônes" → les placer dans icons/

# 2. Installer dans Chrome
# Aller à chrome://extensions/
# Activer "Mode développeur"
# "Charger l'extension non empaquetée" → sélectionner apps/chrome-extension
```

### Fonctionnalités

| Fonctionnalité | Raccourci | Description |
|----------------|-----------|-------------|
| **Ouvrir Lisa** | `Ctrl+Shift+L` | Ouvre le popup |
| **Screenshot** | `Ctrl+Shift+S` | Capture et envoie à Lisa pour analyse |
| **Menu contextuel** | Clic droit | "Analyser avec Lisa" |

### Commandes supportées

| Commande | Description |
|----------|-------------|
| `browser.navigate` | Naviguer vers une URL |
| `browser.click` | Cliquer sur un élément (sélecteur ou coordonnées) |
| `browser.type` | Saisir du texte |
| `browser.scroll` | Faire défiler la page |
| `browser.screenshot` | Capturer la page |
| `browser.evaluate` | Exécuter JavaScript |
| `browser.getContent` | Extraire le contenu de la page |

### Architecture

```
apps/chrome-extension/
├── manifest.json      # Manifest V3
├── background.js      # Service Worker (connexion Gateway)
├── content.js         # Script injecté dans les pages
├── popup.html/js      # Interface popup
└── icons/             # Icônes PNG
```

> 📖 Voir [apps/chrome-extension/README.md](apps/chrome-extension/README.md) pour la documentation complète.

---

## 🖥️ Gateway & Contrôle Ordinateur

Lisa intègre un **Gateway WebSocket** (inspiré d'OpenClaw) pour le contrôle de l'ordinateur.

### Composants

| Module | Description | Fichier |
|--------|-------------|---------|
| **GatewayServer** | Control plane WebSocket | `src/gateway/GatewayServer.ts` |
| **DesktopController** | Souris, clavier, fenêtres | `src/gateway/DesktopController.ts` |
| **BrowserController** | Automatisation navigateur | `src/gateway/BrowserController.ts` |
| **ScreenCapture** | Screenshots et enregistrement | `src/gateway/ScreenCapture.ts` |
| **NodeManager** | Contrôle multi-appareils | `src/gateway/NodeManager.ts` |

### Exemple d'utilisation

```typescript
import { getDesktopController, getBrowserController, getScreenCapture } from './gateway';

// Contrôle souris/clavier
const desktop = getDesktopController();
await desktop.mouseMove(500, 300);
await desktop.mouseClick('left');
await desktop.type("Bonjour Lisa!");
await desktop.hotkey('save'); // Ctrl+S

// Automatisation navigateur
const browser = getBrowserController();
await browser.navigate('https://google.com');
await browser.type('#search', 'Lisa AI assistant');
await browser.click('button[type="submit"]');

// Capture d'écran
const capture = getScreenCapture();
const screenshot = await capture.captureScreen();
await capture.startRecording();
```

### Sécurité

- **blockedApps** : `['taskmgr', 'regedit', 'cmd', 'powershell']`
- **safeMode** : Confirmation requise pour actions destructives
- **allowedApps** : Whitelist optionnelle

---

## 🧠 Les 5 Sens de Lisa

Lisa perçoit le monde à travers **5 modalités sensorielles** :

| Sens | Icône | Description | Technologies |
|------|-------|-------------|--------------|
| **Vision** | 👁️ | Détection objets, visages, gestes, poses | MediaPipe, TensorFlow.js |
| **Ouïe** | 👂 | Reconnaissance vocale, émotions audio | Web Speech API, Whisper |
| **Toucher** | ✋ | Gestes souris/tactile, IoT | Pointer Events, WebHID |
| **Environnement** | 🌍 | Météo, qualité air, géolocalisation | APIs externes |
| **Proprioception** | 💭 | État système, mémoire, CPU | Performance API |

```typescript
// Utilisation
import { useSenses } from './hooks/useSenses';

const { percepts, status, enableSense } = useSenses({
  enableVision: true,
  enableHearing: true,
});
```

---

## 🤖 50+ Agents IA

### Agents de Perception

| Agent | Description |
|-------|-------------|
| **VisionAgent** | Analyse et décrit le contenu visuel (webcam, captures d'écran, images) |
| **HearingAgent** | Traite l'audio avec transcription et détection d'émotions |
| **AudioAnalysisAgent** | Analyse audio avancée avec transcription, émotions et filtrage |
| **ImageAnalysisAgent** | Analyse d'images avec détection d'objets et description |
| **OCRAgent** | Extraction de texte depuis images, captures d'écran ou zones sélectionnées |

### Agents de Communication

| Agent | Description |
|-------|-------------|
| **SmallTalkAgent** | Conversations décontractées avec réponses personnalisées et contexte émotionnel |
| **EmailAgent** | Composition et gestion d'emails avec templates intelligents |
| **TranslationAgent** | Traduction entre langues avec adaptation culturelle et contextuelle |
| **SpeechSynthesisAgent** | Convertit le texte en parole pour communication verbale |
| **ContentGeneratorAgent** | Génère et manipule du contenu textuel avec options stylistiques |

### Agents de Productivité

| Agent | Description |
|-------|-------------|
| **CalendarAgent** | Gestion des événements Google Calendar (création, mise à jour, consultation) |
| **TodoAgent** | Gestion de liste de tâches (ajout, suppression, mise à jour) |
| **SchedulerAgent** | Optimisation de planning avec analyse de disponibilité |
| **MemoryAgent** | Gestion de la mémoire épisodique et long terme |
| **ProactiveSuggestionsAgent** | Suggestions proactives basées sur le contexte utilisateur |
| **PersonalizationAgent** | Adaptation de l'expérience selon préférences et comportements |

### Agents de Développement

| Agent | Description |
|-------|-------------|
| **CodeInterpreterAgent** | Exécution de code Python pour calculs et analyse de données |
| **GitHubAgent** | Interaction avec GitHub (repos, issues, PRs, commits) |
| **GeminiCodeAgent** | Génération de code via l'API Gemini |
| **GeminiCliAgent** | Interaction avec le CLI Gemini |
| **GrokCliAgent** | Interaction avec le CLI Grok |
| **WorkflowCodeAgent** | Exécution sécurisée de code JS/TS dans les workflows |
| **PowerShellAgent** | Exécution sécurisée de commandes PowerShell |

### Agents d'Intégration IoT/Robotique

| Agent | Description |
|-------|-------------|
| **RosAgent** | Interaction avec topics et services ROS via rosbridge |
| **RosPublisherAgent** | Publication de messages sur topics ROS |
| **RobotAgent** | Contrôle et interaction avec robots |
| **MQTTAgent** | Communication via protocole MQTT |
| **SmartHomeAgent** | Contrôle des appareils connectés et scénarios domotiques |
| **SystemIntegrationAgent** | Intégration avec systèmes externes |

### Agents de Workflow

| Agent | Description |
|-------|-------------|
| **PlannerAgent** | Génère et exécute des workflows multi-étapes complexes |
| **TriggerAgent** | Gestion des triggers et webhooks dans les workflows |
| **TransformAgent** | Transformation de données dans les workflows |
| **ConditionAgent** | Évaluation de conditions dans les workflows |
| **DelayAgent** | Introduction de délais dans les workflows |
| **ForEachAgent** | Itération sur collections dans les workflows |
| **SetAgent** | Gestion des variables et état dans les workflows |
| **WorkflowHTTPAgent** | Requêtes HTTP dans les workflows |
| **UserWorkflowAgent** | Gestion des workflows utilisateur personnalisés |

### Agents d'Analyse

| Agent | Description |
|-------|-------------|
| **NLUAgent** | Analyse NLU (sentiment, émotions, entités) |
| **DataAnalysisAgent** | Analyse de données et génération de rapports |
| **KnowledgeGraphAgent** | Gestion du graphe de connaissances (entités, relations) |
| **ContextAgent** | Gestion du contexte avancé pour mémoire et cohérence |
| **CriticAgent** | Évaluation critique et amélioration des réponses |

### Agents Spécialisés

| Agent | Description |
|-------|-------------|
| **WeatherAgent** | Données météo actuelles et prévisions |
| **WebSearchAgent** | Recherche web et réponses concises |
| **WebContentReaderAgent** | Lecture et résumé de contenu web |
| **ScreenShareAgent** | Gestion du partage d'écran |
| **MetaHumanAgent** | Contrôle du MetaHuman (expressions, poses) |
| **HealthMonitorAgent** | Surveillance de la santé et bien-être |
| **SecurityAgent** | Surveillance sécurité et détection de risques |
| **CoordinatorAgent** | Coordination entre agents multiples |
| **LLMAgent** | Assistant LLM universel pour texte et code |

---

## 🛠️ Tools IA Intégrés

Lisa dispose de **10 outils** que l'IA peut utiliser automatiquement :

| Tool | Description | API |
|------|-------------|-----|
| **WeatherTool** | Météo actuelle + prévisions 7 jours | Open-Meteo (gratuit) |
| **ReminderTool** | Rappels et alarmes avec notifications | Local + Capacitor |
| **CalculatorTool** | Calculs, conversions, pourcentages | JavaScript |
| **TranslatorTool** | Traduction 25+ langues | MyMemory (gratuit) |
| **DictionaryTool** | Définitions, synonymes, étymologie | Free Dictionary |
| **SummarizerTool** | Résumé de pages web/texte | JavaScript |
| **ImageGeneratorTool** | Génération d'images | DALL-E / Imagen |
| **WebSearchTool** | Recherche web | OpenAI |
| **WebContentReaderTool** | Extraction contenu web | Fetch |
| **CodeInterpreterTool** | Exécution Python | Pyodide |

```typescript
// Utilisation
import { toolRegistry } from './tools';

const weather = await toolRegistry.weather.execute({ city: 'Paris', days: 3 });
const calc = await toolRegistry.calculator.execute({ expression: '20% of 150' });
```

---

## 🔀 Workflows Visuels

Éditeur de workflows drag-and-drop avec nodes spécialisés :

| Node | Description |
|------|-------------|
| **SenseNode** | Entrée des 5 sens avec filtrage |
| **AIAgentNode** | Exécution d'agents IA |
| **ConditionNode** | Branching conditionnel |
| **RosServiceNode** | Appel services ROS |
| **TransformNode** | Transformation de données |

---

## ♿ Accessibilité (WCAG 2.1 AA)

Lisa est **entièrement accessible** :

- ✅ **Skip Links** - Navigation clavier rapide
- ✅ **Focus Visible** - Indicateurs de focus clairs
- ✅ **Aria Labels** - Boutons et icônes labellisés
- ✅ **Contraste** - Ratios conformes WCAG
- ✅ **Mouvement Réduit** - Respect `prefers-reduced-motion`
- ✅ **Texte Agrandi** - Mode texte +25%
- ✅ **Haut Contraste** - Mode contraste élevé

```tsx
// Composant AccessibilitySettings inclus
<AccessibilitySettings onConfigChange={handleA11yChange} />
```

---

## 🚀 Démarrage Rapide

### Installation

```bash
# Cloner et installer
git clone https://github.com/votre-username/Lisa.git
cd Lisa && pnpm install

# Configurer
cp .env.example .env
```

### Configuration (.env)

```env
# IA Providers (au moins un requis)
VITE_GEMINI_API_KEY=AIzaSy...    # Google Gemini 3 (recommandé)
VITE_OPENAI_API_KEY=sk-...       # OpenAI GPT-4
VITE_ANTHROPIC_API_KEY=sk-ant-...# Anthropic Claude

# Local (optionnel)
VITE_LMSTUDIO_URL=http://localhost:1234  # LM Studio
VITE_OLLAMA_URL=http://localhost:11434   # Ollama

# APIs externes (optionnel)
VITE_WEATHER_API_KEY=...         # API Météo
VITE_AIR_QUALITY_API_KEY=...     # API Qualité Air
```

> 💡 **Astuce** : Les clés API peuvent aussi être configurées dans l'app via **Paramètres > Clés API**

---

## 🖥️ Version Web (PC / Navigateur)

C'est la version principale de développement. Elle s'exécute directement dans votre navigateur.

**Particularités :**
- Utilise les API standards du navigateur (Webcam, Micro)
- Idéale pour le développement rapide (Hot Reload)
- C'est le "Cerveau" central qui est mis à jour en premier

**Démarrage :**

```bash
pnpm dev
# ou
npm run dev
```

> **Accès** : Ouvrez http://localhost:5180 dans votre navigateur.

---

## 📱 Version Mobile (Android / iOS)

Application native générée via **Capacitor**. Elle "encapsule" la version Web dans une coquille native et lui donne des super-pouvoirs.

**Particularités :**
- **Architecture** : Le code React est compilé et injecté dans une WebView native
- **Super-pouvoirs (Plugins)** via `apps/mobile/capacitor.config.ts` :
  - 🔔 **Notifications Push** - `@capacitor/push-notifications`
  - 📳 **Haptique** - Vibrations précises `@capacitor/haptics`
  - 📸 **Caméra Native** - Meilleures perfs `@capacitor/camera`
  - ⌨️ **Clavier Natif** - `@capacitor/keyboard`
- **Source** : Fichiers compilés depuis `../../dist` (build de la version web)

**Workflow de démarrage :**

```bash
# 1. Construire le code Web (génère le dossier dist)
pnpm build

# 2. Synchroniser avec le Mobile (copie dist vers Android/iOS)
pnpm mobile:sync

# 3. Ouvrir Android Studio
cd apps/mobile
npx cap open android
# Cliquez sur "Run" ▶️ pour lancer sur téléphone/émulateur
```

### Script Automatisé (Windows PowerShell)

```powershell
# Lancement complet (build + sync + emulator + run)
.\scripts\run-android.ps1

# Options
.\scripts\run-android.ps1 -Clean        # Nettoie avant build
.\scripts\run-android.ps1 -Release      # Build release
.\scripts\run-android.ps1 -NoEmulator   # Sans émulateur (device physique)
.\scripts\run-android.ps1 -Device "Pixel_7_API_34"  # Émulateur spécifique
```

---

## ⚡ Différences Web vs Mobile

| Fonctionnalité | Version Web 🖥️ | Version Mobile 📱 |
|----------------|-----------------|-------------------|
| **Moteur** | Navigateur (V8/SpiderMonkey) | WebView Native + Capacitor Bridge |
| **Accès Caméra** | API HTML5 MediaDevices | Plugin Natif (@capacitor/camera) |
| **Vibration** | Limitée (navigator.vibrate) | Avancée (@capacitor/haptics) |
| **Réseau** | HTTPS strict | HTTPS + Scheme natif (lisa://) |
| **Debug** | Console Nav. (F12) | Android Studio / Safari DevTools |
| **Fichiers** | dist/ servi par Vite | dist/ copié dans l'APK/IPA |

> 💡 **Conseil** : Développez toujours sur la version Web (`pnpm dev`) pour la logique et l'UI. Ne passez sur la version Mobile que pour tester les fonctionnalités natives ou faire une release.

---

## 🧪 Tests & Qualité

```bash
pnpm test                              # Tests unitaires (Vitest)
pnpm test -- src/path/file.test.ts     # Test fichier unique
pnpm test -- -t "nom du test"          # Tests par pattern
pnpm test:watch                        # Mode watch
pnpm typecheck                         # Vérification TypeScript
pnpm lint                              # ESLint
pnpm test:e2e                          # Tests E2E (Playwright)
```

---

## 🏗️ Architecture

```
src/
├── features/              # Organisation par feature
│   ├── agents/            # 50+ agents IA
│   │   ├── core/          # Registry, types, lazy-loading
│   │   └── implementations/ # Tous les agents
│   ├── vision/            # Vision (YOLOv8, MediaPipe)
│   │   ├── api.ts         # Point d'entrée
│   │   └── worker.ts      # Web Worker
│   ├── hearing/           # Ouïe (Whisper, Web Speech)
│   │   ├── api.ts         # Point d'entrée
│   │   └── worker.ts      # Web Worker
│   └── workflow/          # Système de workflows
│       ├── executor/      # Moteur d'exécution
│       └── nodes/         # Types de nodes
├── senses/                # Sens de base
│   ├── touch.ts           # Toucher
│   ├── environment.ts     # Environnement
│   └── proprioception.ts  # Proprioception
├── components/            # Composants React
│   ├── chat/              # Interface chat
│   └── ui/                # Design system
├── hooks/                 # Hooks personnalisés
├── store/                 # Zustand stores
├── services/              # Services métier
├── api/                   # Serveur Express
└── packages/              # SDK monorepo
```

### Stack Technique

| Catégorie | Technologies |
|-----------|--------------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6, MUI 7, Tailwind |
| **IA** | TensorFlow.js, MediaPipe, Whisper, GPT-5 |
| **3D** | Three.js, Unreal Engine 5.6 (MetaHuman) |
| **Backend** | Express 5, Prisma, PostgreSQL |
| **Tests** | Vitest, Playwright |

---

## 📱 Pages

| Route | Description |
|-------|-------------|
| `/chat` | Interface chat IA principale |
| `/dashboard` | Vue d'ensemble |
| `/senses` | Dashboard des 5 sens |
| `/agents` | Liste des 50+ agents |
| `/workflows` | Éditeur de workflows |
| `/vision` | Panel vision + OCR |
| `/audio` | Panel audio + TTS |
| `/settings` | Configuration |

---

## 🔧 Développement

### Créer un Agent

```typescript
// src/features/agents/implementations/MonAgent.ts
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../core/types';

export class MonAgent implements BaseAgent {
  name = 'MonAgent';
  description = 'Mon agent personnalisé';
  version = '1.0.0';
  domain = 'custom';
  capabilities = ['ma-capacite'];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    return { success: true, output: 'Résultat' };
  }
}

// Ajouter dans src/features/agents/core/registry.ts:
// ['MonAgent', '../implementations/MonAgent'],
```

### Utiliser les 5 Sens

```typescript
import { useSenses } from './hooks/useSenses';

function MyComponent() {
  const { percepts, status, enableSense, disableSense } = useSenses({
    enableVision: true,
    enableHearing: true,
    enableTouch: true,
  });

  // Accéder aux derniers percepts
  const visionPercept = percepts.vision[0];
  const hearingPercept = percepts.hearing[0];
}
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Installation détaillée |
| [AUDIT_UX_UI_2025.md](AUDIT_UX_UI_2025.md) | Rapport accessibilité |
| [OPENCLAW_VS_LISA_COMPARISON.md](OPENCLAW_VS_LISA_COMPARISON.md) | Comparaison OpenClaw vs Lisa |
| [docs/MODULES_OPENCLAW.md](docs/MODULES_OPENCLAW.md) | Documentation modules OpenClaw |
| [docs/GATEWAY.md](docs/GATEWAY.md) | Gateway & Contrôle Ordinateur |
| [apps/chrome-extension/README.md](apps/chrome-extension/README.md) | Extension Chrome |

---

## 🤝 Contribution

```bash
# Fork et clone
git clone https://github.com/votre-username/Lisa.git

# Créer branche
git checkout -b feature/ma-feature

# Tester
npm test && npm run typecheck

# Push
git push origin feature/ma-feature
```

---

## 📄 Licence

**MIT** - Voir [LICENSE](LICENSE)

### Technologies

| Technologie | Usage |
|-------------|-------|
| MediaPipe | Vision par ordinateur |
| TensorFlow.js | IA embarquée |
| React 19 | Interface utilisateur |
| Three.js | Rendu 3D |
| Zustand | State management |

---

---

## 🎨 Thèmes

8 thèmes prédéfinis + couleurs personnalisables :

| Thème | Couleur principale |
|-------|-------------------|
| Sombre (défaut) | `#10b981` |
| Clair | `#059669` |
| Minuit | `#8b5cf6` |
| Océan | `#06b6d4` |
| Forêt | `#22c55e` |
| Coucher de soleil | `#f97316` |
| Rose | `#ec4899` |
| Monochrome | `#a0a0a0` |

---

## 📤 Export Conversations

Formats supportés :
- **Markdown** (.md) - Format lisible
- **JSON** (.json) - Import/export
- **PDF** (.html → Print) - Partage
- **Texte** (.txt) - Simple

```typescript
import { conversationExportService } from './services/ConversationExportService';

const blob = await conversationExportService.export(conversation, { format: 'markdown' });
conversationExportService.download(blob, 'ma-conversation.md');
```

---

## 🎯 Modèles IA Supportés (avec Failover)

Lisa supporte **6 providers** avec basculement automatique :

| Provider | Modèles | Failover |
|----------|---------|----------|
| **Google Gemini** | Gemini 3 Pro, Gemini 3 Flash, Gemini 2.5 Pro/Flash | ✅ |
| **OpenAI** | GPT-4, GPT-4o, GPT-3.5 Turbo | ✅ |
| **Anthropic** | Claude 3 Opus, Sonnet, Haiku | ✅ |
| **Groq** | Llama 3, Mixtral (ultra-rapide) | ✅ |
| **Mistral** | Mistral Large, Medium, Small | ✅ |
| **Local** | LM Studio, Ollama (tous modèles) | ✅ |

```typescript
// Exemple Model Failover
import { getModelFailover } from '@/gateway';

const failover = getModelFailover({
  models: [
    { provider: 'anthropic', model: 'claude-3-sonnet', apiKey: '...', priority: 1 },
    { provider: 'openai', model: 'gpt-4', apiKey: '...', priority: 2 },
    { provider: 'ollama', model: 'llama3', baseUrl: 'http://localhost:11434', priority: 3 },
  ],
  maxRetries: 3,
  timeoutMs: 30000,
});

const response = await failover.complete({
  messages: [{ role: 'user', content: 'Bonjour Lisa!' }],
});
```

---

## 📱 Channels de Communication

### Telegram Bot

```typescript
import { getTelegramBot } from '@/gateway';

const bot = getTelegramBot({ 
  token: process.env.TELEGRAM_BOT_TOKEN,
  allowedUsers: ['123456789'], // Optional whitelist
});

bot.setMessageHandler(async (msg) => {
  // Traiter le message et retourner la réponse
  return `Bonjour ${msg.firstName}! Tu as dit: ${msg.text}`;
});

await bot.start();
```

**Commandes disponibles:**
- `/start` - Démarrer la conversation
- `/status` - État de Lisa
- `/mood` - Humeur actuelle
- `/reset` - Réinitialiser la conversation

### Discord Bot

```typescript
import { getDiscordBot } from '@/gateway';

const discord = getDiscordBot({
  token: process.env.DISCORD_BOT_TOKEN,
  commandPrefix: '!lisa',
});

discord.setMessageHandler(async (msg) => {
  return `Salut ${msg.displayName}! ${msg.text}`;
});

await discord.start();
```

**Commandes disponibles:**
- `!lisa help` - Aide
- `!lisa status` - État
- `!lisa mood` - Humeur
- `!lisa reset` - Réinitialiser
- `@Lisa <message>` - Mentionner Lisa

---

## 🎤 Voice Wake & TTS

### Voice Wake Pro (Porcupine)

```typescript
import { getVoiceWakePro } from '@/gateway';

const voiceWake = await getVoiceWakePro({
  accessKey: process.env.PICOVOICE_ACCESS_KEY, // Optionnel
  wakeWords: ['Lisa', 'Hey Lisa'],
  sensitivity: 0.5,
});

voiceWake.on('wake', (event) => {
  console.log(`Wake word détecté: ${event.keyword}`);
});

await voiceWake.start();
```

### Edge TTS (Gratuit)

```typescript
import { getEdgeTTS, LISA_VOICES } from '@/gateway';

const tts = getEdgeTTS({
  voice: 'fr-FR-DeniseNeural', // Voix française naturelle
  rate: '+0%',
  pitch: '+0Hz',
});

await tts.initialize();
await tts.speak("Bonjour! Je suis Lisa, ta compagne virtuelle.");
```

**Voix françaises disponibles:**
- `fr-FR-DeniseNeural` (Femme, France)
- `fr-FR-HenriNeural` (Homme, France)
- `fr-FR-EloiseNeural` (Femme, France)
- `fr-CA-SylvieNeural` (Femme, Canada)

---

## 🤝 Agent-to-Agent Communication

```typescript
import { getSessionsTools } from '@/gateway';

const sessions = getSessionsTools();

// Lister les sessions actives
const activeSessions = await sessions.sessionsList({ status: 'active' });

// Envoyer un message à une autre session
const result = await sessions.sessionsSend('session-123', 'Bonjour!', {
  replyBack: true,
  timeout: 30000,
});

// Créer une nouvelle session
const newSession = await sessions.sessionsSpawn('Assistant Recherche', {
  channelType: 'internal',
  initialMessages: [{ role: 'system', content: 'Tu es un assistant de recherche.' }],
});
```

---

**🚀 Développé avec ❤️ pour l'assistant IA du futur**
