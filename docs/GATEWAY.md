# 🖥️ Lisa Gateway & Computer Control

Documentation complète du système Gateway et des capacités de contrôle de l'ordinateur de Lisa.

## Vue d'ensemble

Le Gateway Lisa est un **control plane WebSocket** inspiré d'[OpenClaw](https://openclaw.ai/), permettant :
- Gestion centralisée des sessions et channels
- Contrôle du navigateur et du bureau
- Communication multi-appareils (nodes)
- Automatisation et scripts

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Lisa Gateway (port 18789)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Sessions  │  │   Channels  │  │    Tools    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└────────────────────────────┬────────────────────────────────────┘
                             │ WebSocket
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐  ┌─────────▼─────────┐  ┌──────▼──────┐
│ Chrome Ext.   │  │   React App       │  │   Mobile    │
│ (browser)     │  │   (localhost)     │  │   (Capacitor│
└───────────────┘  └───────────────────┘  └─────────────┘
```

## Modules

### 1. GatewayServer

Point d'entrée principal du Gateway.

```typescript
import { getGateway } from './gateway';

const gateway = getGateway({
  port: 18789,
  host: '127.0.0.1',
  sessions: {
    maxPerUser: 10,
    idleTimeout: 3600000, // 1 heure
    pruneInterval: 60000  // 1 minute
  }
});

// Créer une session
const session = await gateway.createSession('user123', 'chat', {
  name: 'Session principale'
});

// Écouter les événements
gateway.on('session:created', (session) => {
  console.log('Nouvelle session:', session.id);
});

gateway.on('message:received', (message) => {
  console.log('Message reçu:', message.payload.content);
});
```

### 2. DesktopController

Contrôle du bureau : souris, clavier, fenêtres.

```typescript
import { getDesktopController } from './gateway';

const desktop = getDesktopController({
  enabled: true,
  mouseSpeed: 10,
  keyDelay: 50,
  safeMode: true, // Confirmation pour actions destructives
  blockedApps: ['taskmgr', 'regedit', 'cmd', 'powershell']
});

// Souris
await desktop.mouseMove(500, 300);
await desktop.mouseClick('left');
await desktop.mouseDoubleClick(100, 200);
await desktop.mouseScroll(3, 'down');
await desktop.mouseDrag(0, 0, 500, 500);

// Clavier
await desktop.type("Bonjour Lisa!");
await desktop.pressKey('enter');
await desktop.pressKey('s', ['ctrl']); // Ctrl+S

// Raccourcis prédéfinis
await desktop.hotkey('copy');     // Ctrl+C
await desktop.hotkey('paste');    // Ctrl+V
await desktop.hotkey('save');     // Ctrl+S
await desktop.hotkey('undo');     // Ctrl+Z
await desktop.hotkey('selectAll'); // Ctrl+A
await desktop.hotkey('find');     // Ctrl+F

// Fenêtres
const windows = await desktop.getWindows();
await desktop.focusWindow(windows[0].id);
await desktop.minimizeWindow();
await desktop.maximizeWindow();

// Applications
await desktop.launchApp('notepad');

// Clipboard
await desktop.copyToClipboard("Texte copié");
const text = await desktop.pasteFromClipboard();
```

#### Raccourcis clavier disponibles

| Nom | Raccourci | Description |
|-----|-----------|-------------|
| `copy` | Ctrl+C | Copier |
| `paste` | Ctrl+V | Coller |
| `cut` | Ctrl+X | Couper |
| `undo` | Ctrl+Z | Annuler |
| `redo` | Ctrl+Shift+Z | Rétablir |
| `save` | Ctrl+S | Sauvegarder |
| `selectAll` | Ctrl+A | Tout sélectionner |
| `find` | Ctrl+F | Rechercher |
| `newTab` | Ctrl+T | Nouvel onglet |
| `closeTab` | Ctrl+W | Fermer onglet |
| `switchWindow` | Alt+Tab | Changer fenêtre |
| `desktop` | Win+D | Afficher bureau |
| `screenshot` | Win+Shift+S | Capture d'écran |

### 3. BrowserController

Automatisation du navigateur (Playwright-compatible).

```typescript
import { getBrowserController } from './gateway';

const browser = getBrowserController({
  headless: false,
  viewport: { width: 1280, height: 720 },
  timeout: 30000
});

// Connexion
await browser.connect();

// Navigation
await browser.newPage('https://google.com');
await browser.navigate('https://example.com');

// Interactions
await browser.click('#submit-btn');
await browser.click('button.primary');
await browser.type('#search', 'Lisa AI', { delay: 50 });
await browser.scroll({ y: 500 });
await browser.scroll({ selector: '#footer' });
await browser.hover('.menu-item');
await browser.select('#country', 'FR');
await browser.press('Enter');

// Capture
const screenshot = await browser.screenshot({ fullPage: true });
const pdf = await browser.pdf({ format: 'A4' });

// JavaScript
const result = await browser.evaluate('document.title');

// Attente
await browser.wait(2000);
await browser.waitForSelector('.loaded');

// Snapshot complet
const snapshot = await browser.snapshot();
// { url, title, html, text, screenshot, timestamp }

// Batch d'actions
const results = await browser.execute([
  { type: 'navigate', value: 'https://example.com' },
  { type: 'wait', value: '1000' },
  { type: 'click', target: '#login' },
  { type: 'type', target: '#email', value: 'test@example.com' },
  { type: 'screenshot' }
]);
```

### 4. ScreenCapture

Screenshots et enregistrement vidéo.

```typescript
import { getScreenCapture } from './gateway';

const capture = getScreenCapture({
  quality: 'high',
  format: 'png',
  maxDuration: 300, // 5 minutes
  fps: 30,
  audio: false,
  cursor: true
});

// Screenshot
const screenshot = await capture.captureScreen({
  source: 'screen', // 'screen' | 'window' | 'tab'
  quality: 0.9
});
capture.downloadScreenshot(screenshot.id, 'capture.png');

// Enregistrement
await capture.startRecording();
// ... actions ...
capture.pauseRecording();
capture.resumeRecording();
const recording = capture.stopRecording();

// Téléchargement
await capture.downloadRecording(recording.id, 'video.webm');

// Stats
const stats = capture.getStats();
// { screenshotCount, recordingCount, isRecording, totalRecordingSize }
```

### 5. NodeManager

Gestion multi-appareils (mobile, desktop, IoT).

```typescript
import { getNodeManager } from './gateway';

const nodeManager = getNodeManager();
nodeManager.start();

// Enregistrer un appareil
const node = nodeManager.registerNode({
  name: 'iPhone de Patrick',
  type: 'mobile',
  platform: 'ios',
  capabilities: ['camera', 'microphone', 'location', 'notifications'],
  metadata: {
    osVersion: '17.0',
    deviceModel: 'iPhone 15 Pro'
  }
});

// Lister les nodes
const onlineNodes = nodeManager.getOnlineNodes();
const mobileNodes = nodeManager.listNodes({ type: 'mobile', status: 'online' });
const cameraNode = nodeManager.findNodeWithCapability('camera');

// Exécuter des actions
await nodeManager.captureScreen(node.id);
await nodeManager.sendNotification(node.id, 'Lisa', 'Bonjour!');
await nodeManager.openUrl(node.id, 'https://example.com');
await nodeManager.getLocation(node.id);
await nodeManager.readClipboard(node.id);
await nodeManager.writeClipboard(node.id, 'Texte');
await nodeManager.runShortcut(node.id, 'MonRaccourci', { input: 'data' });

// Heartbeat
nodeManager.heartbeat(node.id, { batteryLevel: 85, isCharging: true });
```

#### Types de nodes

| Type | Description |
|------|-------------|
| `mobile` | Smartphone (iOS, Android) |
| `desktop` | Ordinateur (Windows, macOS, Linux) |
| `tablet` | Tablette |
| `browser` | Extension navigateur |
| `iot` | Appareil IoT |
| `server` | Serveur |

#### Capacités

| Capacité | Description |
|----------|-------------|
| `camera` | Accès caméra |
| `microphone` | Accès micro |
| `speaker` | Sortie audio |
| `screen_capture` | Capture écran |
| `notifications` | Notifications |
| `clipboard` | Presse-papiers |
| `file_system` | Système de fichiers |
| `browser` | Contrôle navigateur |
| `location` | Géolocalisation |
| `contacts` | Contacts |
| `calendar` | Calendrier |
| `sms` | SMS |
| `calls` | Appels |
| `shortcuts` | Raccourcis (iOS) |
| `home_automation` | Domotique |

### 6. SessionPruning

Gestion intelligente du contexte avec compaction.

```typescript
import { getSessionPruning } from './gateway';

const pruning = getSessionPruning({
  enabled: true,
  maxTokens: 128000,
  targetTokens: 100000,
  strategy: 'hybrid', // 'sliding-window' | 'summarize' | 'importance-based' | 'hybrid'
  summarizeOld: true,
  preserveSystemMessages: true,
  preserveRecentCount: 10,
  autoCompactThreshold: 80 // %
});

// Créer session
const session = pruning.createSession();

// Ajouter messages
pruning.addMessage({
  role: 'user',
  content: 'Bonjour Lisa!',
  tokens: 10
});

// Compaction manuelle
const result = await pruning.prune(session.id);
// { success, removedMessages, removedTokens, newSummary, finalTokenCount }

// Stats
const stats = pruning.getStats();
// { messageCount, totalTokens, summaryCount, usagePercent, needsPruning }

// Contexte pour LLM
const context = pruning.getContextForLLM();
// { messages, summaries }
```

### 7. SessionCompactor

Compaction avancée avec résumé IA.

```typescript
import { sessionCompactor } from './services/SessionCompactor';

// Vérifier si compaction nécessaire
if (sessionCompactor.needsCompaction(messages)) {
  const compacted = await sessionCompactor.compact(session);
  // { sessionId, summary, facts, recentMessages, compactionMeta }
}

// Exporter en JSONL
const jsonl = sessionCompactor.exportAsJSONL(session);

// Importer depuis JSONL
const imported = sessionCompactor.importFromJSONL(jsonl);

// Construire contexte optimisé
const context = sessionCompactor.buildContext(compacted);
```

## Extension Chrome

L'extension Chrome se connecte au Gateway pour contrôler le navigateur.

### Installation

1. Générer les icônes : ouvrir `apps/chrome-extension/generate-icons.html`
2. Aller à `chrome://extensions/`
3. Activer "Mode développeur"
4. "Charger l'extension non empaquetée" → `apps/chrome-extension`

### Communication

```javascript
// Extension → Gateway
sendToGateway({
  type: 'browser.screenshot',
  payload: { dataUrl, url, title }
});

// Gateway → Extension
handleGatewayMessage({
  type: 'browser.click',
  payload: { selector: '#submit-btn' }
});
```

### Commandes supportées

| Type | Payload | Description |
|------|---------|-------------|
| `browser.navigate` | `{ url, tabId? }` | Naviguer |
| `browser.click` | `{ selector?, x?, y? }` | Cliquer |
| `browser.type` | `{ selector?, text, delay? }` | Saisir |
| `browser.screenshot` | `{ fullPage? }` | Capturer |
| `browser.evaluate` | `{ script }` | Évaluer JS |
| `browser.scroll` | `{ x?, y?, selector? }` | Défiler |
| `browser.getContent` | `{ selector?, type? }` | Extraire contenu |
| `clipboard.read` | - | Lire clipboard |
| `clipboard.write` | `{ text }` | Écrire clipboard |
| `notification.show` | `{ title, message }` | Notification |

## Comparaison avec OpenClaw

| Fonctionnalité | Lisa | OpenClaw |
|----------------|------|----------|
| Gateway WebSocket | ✅ Port 18789 | ✅ Port 18789 |
| Session Pruning | ✅ Hybrid + AI | ✅ /compact |
| Multi-channel | ✅ Telegram, Discord, Slack, WhatsApp | ✅ + iMessage, Signal |
| Browser Control | ✅ Extension Chrome | ✅ Puppeteer |
| Desktop Control | ✅ Mouse, Keyboard, Windows | ✅ Via nodes |
| Screen Capture | ✅ Screenshots + Recording | ✅ screen.record |
| Multi-device | ✅ NodeManager | ✅ Nodes iOS/Android/macOS |
| Model Failover | ✅ 6 providers | ✅ OAuth + API key |
| Open Source | ✅ | ✅ |

## Sécurité

### Applications bloquées par défaut

```typescript
blockedApps: ['taskmgr', 'regedit', 'cmd', 'powershell']
```

### Mode sécurisé

```typescript
const desktop = getDesktopController({
  safeMode: true,        // Confirmation requise
  allowedApps: ['notepad', 'chrome'], // Whitelist
});
```

### Événements de confirmation

```typescript
desktop.on('confirmation:required', ({ action, appName }) => {
  // Demander confirmation à l'utilisateur
  if (confirm(`Autoriser ${action} sur ${appName}?`)) {
    desktop.launchApp(appName, [], { confirmed: true });
  }
});
```

## Dépannage

### Le Gateway ne démarre pas

```bash
# Vérifier le port
netstat -an | findstr 18789

# Redémarrer Lisa
pnpm dev
```

### L'extension ne se connecte pas

1. Vérifier que Lisa est lancée (`pnpm dev`)
2. Vérifier la console Chrome (F12 → Console)
3. Vérifier les logs : `[Lisa Extension]`

### Les actions échouent

```typescript
// Activer les logs détaillés
const desktop = getDesktopController();
desktop.on('action:executed', (action) => {
  console.log('Action:', action);
});
```

## API Reference

Voir les fichiers source pour la documentation TypeScript complète :

- `src/gateway/GatewayServer.ts`
- `src/gateway/DesktopController.ts`
- `src/gateway/BrowserController.ts`
- `src/gateway/ScreenCapture.ts`
- `src/gateway/NodeManager.ts`
- `src/gateway/SessionPruning.ts`
- `src/services/SessionCompactor.ts`
