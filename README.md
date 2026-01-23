# 🤖 Lisa – Assistant IA Multi-Sensoriel

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff.svg)](https://vitejs.dev/)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA-green.svg)](#accessibilité)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Assistant virtuel vivant** avec perception multi-sensorielle (5 sens), 50+ agents IA, workflows visuels et interface accessible WCAG 2.1 AA.

Lisa est un assistant IA **100% navigateur** qui perçoit, raisonne et agit. Elle combine vision, audition, toucher, environnement et proprioception pour créer une expérience utilisateur immersive.

**Status**: ✅ **Production-Ready** | **Score UX/UI**: 10/10 | **Accessibilité**: WCAG 2.1 AA | **Dernière MàJ**: 23 Jan 2026

[![Android](https://img.shields.io/badge/Android-Capacitor-3DDC84.svg)](https://capacitorjs.com/)
[![Gemini](https://img.shields.io/badge/Gemini_3-Supported-4285F4.svg)](https://ai.google.dev/)

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

| Catégorie | Agents | Exemple |
|-----------|--------|---------|
| **Communication** | SmallTalkAgent, EmailAgent, TranslationAgent | Conversations naturelles |
| **Perception** | VisionAgent, HearingAgent, OCRAgent, ImageAnalysisAgent | Analyse d'images/audio |
| **Productivité** | CalendarAgent, TodoAgent, SchedulerAgent | Gestion du quotidien |
| **Développement** | CodeInterpreterAgent, GitHubAgent, GeminiCodeAgent | Assistance code |
| **Intégration** | RosAgent, MQTTAgent, SmartHomeAgent | IoT et robotique |
| **Workflow** | PlannerAgent, TriggerAgent, TransformAgent | Automatisation |
| **Santé** | HealthMonitorAgent, SecurityAgent | Surveillance bien-être |

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

## 🎯 Modèles IA Supportés

| Provider | Modèles |
|----------|--------|
| **Google Gemini** | Gemini 3 Pro, Gemini 3 Flash, Gemini 2.5 Pro/Flash |
| **OpenAI** | GPT-4, GPT-3.5 Turbo |
| **Anthropic** | Claude 3 |
| **Local** | LM Studio, Ollama (tous modèles) |

---

**🚀 Développé avec ❤️ pour l'assistant IA du futur**
