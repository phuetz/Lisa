# 📚 Documentation des Modules OpenClaw pour Lisa

> **Version**: 1.0.0 | **Date**: 31 Janvier 2026

Cette documentation décrit les nouveaux modules implémentés dans Lisa, inspirés du projet [OpenClaw](https://github.com/openclaw/openclaw).

---

## 📦 Vue d'Ensemble

| Module | Fichier | Dépendance | Description |
|--------|---------|------------|-------------|
| TelegramBot | `channels/TelegramBot.ts` | grammy | Bot Telegram fonctionnel |
| DiscordBot | `channels/DiscordBot.ts` | discord.js | Bot Discord fonctionnel |
| ModelFailover | `ModelFailover.ts` | - | Multi-provider avec fallback |
| VoiceWakePro | `VoiceWakePro.ts` | @picovoice/porcupine-web | Wake word detection |
| EdgeTTS | `EdgeTTS.ts` | node-edge-tts | Text-to-Speech gratuit |
| SessionsToolsPro | `SessionsToolsPro.ts` | - | Agent-to-Agent communication |

---

## 🤖 TelegramBot

### Installation

```bash
pnpm add -w grammy
```

### Configuration

```typescript
interface TelegramConfig {
  token: string;              // Bot token from @BotFather
  allowedUsers?: string[];    // Whitelist user IDs or usernames
  allowedGroups?: string[];   // Whitelist group/chat IDs
  webhookUrl?: string;        // For webhook mode (optional)
  pollingMode?: boolean;      // Use long polling (default: true)
  rateLimitPerSecond?: number;
}
```

### Utilisation

```typescript
import { getTelegramBot, TelegramBot } from '@/gateway';

// Créer et configurer le bot
const bot = getTelegramBot({
  token: process.env.TELEGRAM_BOT_TOKEN!,
  allowedUsers: ['123456789', 'mon_username'],
});

// Handler pour les messages
bot.setMessageHandler(async (msg) => {
  console.log(`Message de ${msg.firstName}: ${msg.text}`);
  
  // Retourner la réponse à envoyer
  return `Bonjour ${msg.firstName}! Tu as dit: ${msg.text}`;
});

// Événements
bot.on('message', (msg) => console.log('Nouveau message:', msg));
bot.on('photo', (msg) => console.log('Photo reçue:', msg.mediaFileId));
bot.on('voice', (msg) => console.log('Message vocal:', msg.mediaFileId));
bot.on('error', (err) => console.error('Erreur:', err));

// Démarrer
await bot.start();

// Envoyer un message manuellement
await bot.sendMessage(chatId, 'Hello!');
await bot.sendPhoto(chatId, photoUrl, 'Légende');

// Arrêter
await bot.stop();
```

### Commandes Intégrées

| Commande | Description |
|----------|-------------|
| `/start` | Message de bienvenue |
| `/status` | État actuel de Lisa |
| `/mood` | Humeur aléatoire |
| `/reset` | Réinitialiser conversation |
| `/help` | Liste des commandes |

### Types

```typescript
interface TelegramMessage {
  id: number;
  chatId: number;
  userId: number;
  username?: string;
  firstName?: string;
  text: string;
  isGroup: boolean;
  replyToMessageId?: number;
  mediaType?: 'photo' | 'audio' | 'video' | 'document' | 'voice' | 'sticker';
  mediaFileId?: string;
  timestamp: Date;
}

interface TelegramState {
  isConnected: boolean;
  botUsername?: string;
  botId?: number;
  messageCount: number;
  lastActivity?: Date;
  error?: string;
}
```

---

## 💬 DiscordBot

### Installation

```bash
pnpm add -w discord.js
```

### Configuration

```typescript
interface DiscordConfig {
  token: string;              // Bot token from Discord Developer Portal
  allowedUsers?: string[];    // Whitelist user IDs
  allowedGuilds?: string[];   // Whitelist server IDs
  allowedChannels?: string[]; // Whitelist channel IDs
  commandPrefix?: string;     // Default: '!lisa'
  activityMessage?: string;   // Status message
}
```

### Utilisation

```typescript
import { getDiscordBot } from '@/gateway';

const discord = getDiscordBot({
  token: process.env.DISCORD_BOT_TOKEN!,
  commandPrefix: '!lisa',
  activityMessage: 'avec toi 💜',
});

discord.setMessageHandler(async (msg) => {
  return `Salut ${msg.displayName}! ${msg.text}`;
});

discord.on('connected', ({ username, guildCount }) => {
  console.log(`Connecté en tant que ${username} sur ${guildCount} serveurs`);
});

await discord.start();
```

### Commandes Intégrées

| Commande | Description |
|----------|-------------|
| `!lisa help` | Aide |
| `!lisa status` | État de Lisa |
| `!lisa mood` | Humeur |
| `!lisa reset` | Réinitialiser |
| `@Lisa <msg>` | Mentionner Lisa |

### Types

```typescript
interface DiscordMessage {
  id: string;
  channelId: string;
  guildId?: string;
  userId: string;
  username: string;
  displayName: string;
  text: string;
  isDM: boolean;
  isBot: boolean;
  replyToMessageId?: string;
  attachments: Array<{ url: string; type: string; name: string }>;
  timestamp: Date;
}
```

---

## 🔄 ModelFailover

### Configuration

```typescript
interface FailoverConfig {
  models: ModelConfig[];       // Liste des modèles par priorité
  maxRetries?: number;         // Tentatives par modèle (default: 3)
  retryDelayMs?: number;       // Délai entre tentatives (default: 1000)
  timeoutMs?: number;          // Timeout par requête (default: 30000)
  healthCheckIntervalMs?: number; // Intervalle health check (default: 60000)
}

interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'groq' | 'mistral';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  priority?: number;           // Plus bas = plus prioritaire
}
```

### Utilisation

```typescript
import { getModelFailover } from '@/gateway';

const failover = getModelFailover({
  models: [
    { provider: 'anthropic', model: 'claude-3-sonnet-20240229', apiKey: '...', priority: 1 },
    { provider: 'openai', model: 'gpt-4', apiKey: '...', priority: 2 },
    { provider: 'groq', model: 'llama3-70b-8192', apiKey: '...', priority: 3 },
    { provider: 'ollama', model: 'llama3', baseUrl: 'http://localhost:11434', priority: 4 },
  ],
  maxRetries: 3,
  timeoutMs: 30000,
});

// Complétion avec fallback automatique
const response = await failover.complete({
  messages: [
    { role: 'system', content: 'Tu es Lisa, une compagne virtuelle.' },
    { role: 'user', content: 'Bonjour!' },
  ],
  temperature: 0.7,
  maxTokens: 1000,
});

console.log(response.content);      // Réponse
console.log(response.provider);     // Provider utilisé
console.log(response.latencyMs);    // Latence

// Événements
failover.on('completion', ({ provider, model, latencyMs }) => {
  console.log(`Réponse de ${provider}/${model} en ${latencyMs}ms`);
});

failover.on('error', ({ provider, error, retry }) => {
  console.warn(`Erreur ${provider} (tentative ${retry}):`, error);
});

failover.on('allModelsFailed', ({ errors }) => {
  console.error('Tous les modèles ont échoué:', errors);
});

// Health checks
failover.startHealthChecks();
const health = failover.getHealthStatus();
const healthyModels = failover.getHealthyModels();
```

### Providers Supportés

| Provider | Base URL | Authentification |
|----------|----------|------------------|
| OpenAI | `https://api.openai.com/v1` | Bearer token |
| Anthropic | `https://api.anthropic.com/v1` | x-api-key header |
| Google | `https://generativelanguage.googleapis.com/v1beta` | Query param |
| Ollama | `http://localhost:11434` | Aucune |
| Groq | `https://api.groq.com/openai/v1` | Bearer token |
| Mistral | `https://api.mistral.ai/v1` | Bearer token |

---

## 🎤 VoiceWakePro

### Configuration

```typescript
interface VoiceWakeProConfig {
  accessKey?: string;              // Picovoice access key (optionnel)
  wakeWords?: string[];            // Mots de réveil (default: ['Lisa'])
  sensitivity?: number;            // 0.0 - 1.0 (default: 0.5)
  enableContinuousListening?: boolean;
  autoStart?: boolean;
}
```

### Utilisation

```typescript
import { getVoiceWakePro } from '@/gateway';

// Avec Porcupine (si access key fourni)
const voiceWake = await getVoiceWakePro({
  accessKey: process.env.PICOVOICE_ACCESS_KEY,
  wakeWords: ['Lisa', 'Hey Lisa'],
  sensitivity: 0.5,
});

// Sans access key: utilise Web Speech API (fallback gratuit)
const voiceWakeFree = await getVoiceWakePro({
  wakeWords: ['Lisa', 'Hey Lisa', 'OK Lisa'],
});

voiceWake.on('wake', (event) => {
  console.log(`Wake word détecté: ${event.keyword}`);
  console.log(`Index: ${event.keywordIndex}`);
  console.log(`Confiance: ${event.confidence}`);
});

voiceWake.on('started', () => console.log('Écoute démarrée'));
voiceWake.on('stopped', () => console.log('Écoute arrêtée'));
voiceWake.on('error', (err) => console.error('Erreur:', err));

await voiceWake.start();

// État
const state = voiceWake.getState();
console.log(state.isListening, state.wakeCount, state.lastWake);

// Ajuster sensibilité
voiceWake.setSensitivity(0.7);

// Arrêter
await voiceWake.stop();
await voiceWake.release();
```

---

## 🔊 EdgeTTS

### Configuration

```typescript
interface EdgeTTSConfig {
  voice?: string;      // Voix (default: 'fr-FR-DeniseNeural')
  rate?: string;       // Vitesse (ex: '+10%', '-20%')
  pitch?: string;      // Hauteur (ex: '+5Hz', '-10Hz')
  volume?: string;     // Volume (ex: '+20%')
  language?: string;   // Langue (default: 'fr-FR')
}
```

### Voix Disponibles

```typescript
import { LISA_VOICES } from '@/gateway';

// Voix françaises prédéfinies
const voices = [
  { shortName: 'fr-FR-DeniseNeural', gender: 'Female', locale: 'fr-FR' },
  { shortName: 'fr-FR-HenriNeural', gender: 'Male', locale: 'fr-FR' },
  { shortName: 'fr-FR-EloiseNeural', gender: 'Female', locale: 'fr-FR' },
  { shortName: 'fr-CA-SylvieNeural', gender: 'Female', locale: 'fr-CA' },
  { shortName: 'en-US-JennyNeural', gender: 'Female', locale: 'en-US' },
  { shortName: 'en-US-AriaNeural', gender: 'Female', locale: 'en-US' },
];
```

### Utilisation

```typescript
import { getEdgeTTS } from '@/gateway';

const tts = getEdgeTTS({
  voice: 'fr-FR-DeniseNeural',
  rate: '+0%',
  pitch: '+0Hz',
});

await tts.initialize();

// Parler
await tts.speak("Bonjour! Je suis Lisa, ta compagne virtuelle.");

// Événements
tts.on('speaking', ({ text }) => console.log('Parle:', text));
tts.on('ended', () => console.log('Terminé'));
tts.on('error', (err) => console.error('Erreur:', err));

// Contrôles
tts.pause();
tts.resume();
tts.stop();

// Changer voix/paramètres
tts.setVoice('fr-FR-HenriNeural');
tts.setRate('+10%');
tts.setPitch('-5Hz');

// État
const state = tts.getState();
console.log(state.isSpeaking, state.voice);
```

---

## 🤝 SessionsToolsPro

### Types

```typescript
interface Session {
  id: string;
  name: string;
  agentId: string;
  channelType: 'telegram' | 'discord' | 'whatsapp' | 'webchat' | 'internal';
  channelId?: string;
  peerId?: string;
  peerName?: string;
  status: 'active' | 'idle' | 'busy' | 'offline';
  createdAt: Date;
  lastActivity: Date;
  metadata?: Record<string, unknown>;
}

interface SessionMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
```

### Utilisation

```typescript
import { getSessionsTools } from '@/gateway';

const sessions = getSessionsTools();

// Lister les sessions
const activeSessions = await sessions.sessionsList({ status: 'active' });
const telegramSessions = await sessions.sessionsList({ channelType: 'telegram' });

// Historique d'une session
const history = await sessions.sessionsHistory('session-123', {
  limit: 50,
  after: new Date('2024-01-01'),
});

// Envoyer un message à une session
const result = await sessions.sessionsSend('session-123', 'Bonjour!', {
  replyBack: true,      // Attendre une réponse
  timeout: 30000,       // Timeout en ms
  priority: 'high',
});

if (result.success) {
  console.log('Réponse:', result.response);
}

// Créer une nouvelle session
const newSession = await sessions.sessionsSpawn('Assistant Recherche', {
  channelType: 'internal',
  agentConfig: { role: 'researcher' },
  initialMessages: [
    { role: 'system', content: 'Tu es un assistant de recherche.' },
  ],
});

// Fermer une session
await sessions.sessionsClose('session-123');

// Événements
sessions.on('messageSent', ({ sessionId, message }) => {
  console.log(`Message envoyé à ${sessionId}`);
});

sessions.on('sessionSpawned', (session) => {
  console.log(`Nouvelle session: ${session.name}`);
});
```

---

## 🔧 Variables d'Environnement

```env
# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# Discord
DISCORD_BOT_TOKEN=MTIz...

# Picovoice (optionnel)
PICOVOICE_ACCESS_KEY=abc123...

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
```

---

## 📝 Notes

- **TelegramBot** et **DiscordBot** sont des modules **backend** (Node.js) - ne fonctionnent pas directement dans le navigateur
- **VoiceWakePro** et **EdgeTTS** fonctionnent dans le navigateur avec fallback Web API
- **ModelFailover** fonctionne partout (browser + Node.js)
- **SessionsToolsPro** est un module de gestion en mémoire

---

## 🔗 Liens Utiles

- [grammy Documentation](https://grammy.dev/)
- [discord.js Guide](https://discordjs.guide/)
- [Picovoice Console](https://console.picovoice.ai/)
- [Edge TTS Voices](https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/language-support)
