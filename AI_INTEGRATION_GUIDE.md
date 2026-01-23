# 🤖 Guide d'Intégration IA - Lisa

**Date**: 6 Novembre 2025  
**Status**: ✅ Prêt à l'emploi

---

## 🎯 Ce Qui a Été Intégré

### 1. Service IA Unifié (`aiService.ts`)

Service multi-provider avec support streaming :

#### Providers Supportés

| Provider | Modèles | Streaming | Vision |
|----------|---------|-----------|--------|
| **OpenAI** | GPT-4o, GPT-4o-mini, GPT-4 | ✅ | ✅ |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus | ✅ | ✅ |
| **Local** | Ollama, LM Studio, etc. | ✅ | ❌ |

#### Fonctionnalités

- ✅ Streaming temps réel (Server-Sent Events)
- ✅ Support images (vision multi-modale)
- ✅ Gestion erreurs robuste
- ✅ Configuration dynamique
- ✅ Fallback providers

### 2. Hook React (`useAIChat.ts`)

Hook pour intégration facile dans les composants :

```typescript
const { 
  sendMessage,        // Envoyer un message
  cancelGeneration,   // Annuler génération
  regenerateLastResponse, // Régénérer
  isLoading,          // État chargement
  isStreaming         // État streaming
} = useAIChat(conversationId, {
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  systemPrompt: 'Tu es Lisa, un assistant IA...'
});
```

### 3. Composant Upload d'Images (`ImageUpload.tsx`)

- ✅ Drag & drop
- ✅ Preview avec suppression
- ✅ Conversion Base64 automatique
- ✅ Limite de taille (5MB)
- ✅ Validation format

---

## ⚙️ Configuration

### 1. Clés API

Ajouter dans `.env` :

```env
# OpenAI
VITE_OPENAI_API_KEY=sk-...

# Anthropic (Claude)
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Optionnel: API locale
# Pas besoin de clé si utilisation Ollama/LM Studio
```

### 2. Obtenir les Clés

#### OpenAI
1. Aller sur [platform.openai.com](https://platform.openai.com/)
2. Créer un compte / se connecter
3. Aller dans "API Keys"
4. Créer une nouvelle clé
5. Ajouter des crédits (minimum $5)

**Modèles recommandés** :
- `gpt-4o-mini` : Rapide et économique (~$0.15/M tokens)
- `gpt-4o` : Plus puissant (~$2.50/M tokens)
- `gpt-4` : Le plus intelligent (~$30/M tokens)

#### Anthropic (Claude)
1. Aller sur [console.anthropic.com](https://console.anthropic.com/)
2. Créer un compte
3. Aller dans "API Keys"
4. Créer une nouvelle clé
5. Ajouter des crédits

**Modèles recommandés** :
- `claude-3-5-sonnet-20241022` : Meilleur rapport qualité/prix
- `claude-3-opus-latest` : Le plus puissant

#### Local (Gratuit)

**Option 1: Ollama**
```bash
# Installer Ollama
# https://ollama.ai

# Télécharger un modèle
ollama pull llama2
ollama pull mistral

# L'API sera sur http://localhost:11434
```

**Option 2: LM Studio**
1. Télécharger [LM Studio](https://lmstudio.ai/)
2. Télécharger un modèle (ex: Llama 2)
3. Démarrer le serveur local
4. Configurer baseURL dans le code

---

## 🚀 Utilisation

### Exemple Complet

```typescript
import { useAIChat } from '../hooks/useAIChat';
import { ImageUpload } from '../components/chat/ImageUpload';

function MyChatComponent() {
  const [currentImage, setCurrentImage] = useState<string>();
  
  const { 
    sendMessage, 
    isLoading, 
    isStreaming 
  } = useAIChat(conversationId, {
    provider: 'openai', // ou 'anthropic', 'local'
    model: 'gpt-4o-mini',
    temperature: 0.7,
    systemPrompt: 'Tu es Lisa, un assistant IA français...'
  });

  const handleSend = async (message: string) => {
    await sendMessage(message, currentImage);
    setCurrentImage(undefined);
  };

  return (
    <div>
      <ImageUpload
        currentImage={currentImage}
        onImageSelect={setCurrentImage}
        onImageRemove={() => setCurrentImage(undefined)}
      />
      
      <input 
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !isLoading) {
            handleSend(e.currentTarget.value);
          }
        }}
      />
      
      {isStreaming && <TypingIndicator />}
    </div>
  );
}
```

### Exemple avec Vision (Images)

```typescript
// Envoyer un message avec une image
const base64Image = '...'; // Base64 ou URL
await sendMessage('Décris cette image', base64Image);
```

### Changer de Provider

```typescript
// OpenAI
const chat = useAIChat(id, { 
  provider: 'openai', 
  model: 'gpt-4o-mini' 
});

// Anthropic (Claude)
const chat = useAIChat(id, { 
  provider: 'anthropic', 
  model: 'claude-3-5-sonnet-20241022' 
});

// Local (Ollama)
const chat = useAIChat(id, { 
  provider: 'local', 
  model: 'llama2',
  baseURL: 'http://localhost:11434'
});
```

### Annuler une Génération

```typescript
const { cancelGeneration } = useAIChat(conversationId);

// Dans un bouton Stop
<button onClick={cancelGeneration}>
  Arrêter la génération
</button>
```

### Régénérer une Réponse

```typescript
const { regenerateLastResponse } = useAIChat(conversationId);

// Dans un bouton Régénérer
<button onClick={regenerateLastResponse}>
  Régénérer
</button>
```

---

## 📊 Streaming en Temps Réel

Le streaming affiche les tokens au fur et à mesure :

```typescript
// Le hook gère automatiquement le streaming
const { sendMessage, isStreaming } = useAIChat(conversationId);

// Envoyer un message = streaming automatique
await sendMessage('Raconte-moi une histoire');

// isStreaming = true pendant la génération
// Le message s'affiche token par token dans la conversation
```

---

## 🎨 Intégration ChatInput

Pour intégrer au `ChatInput` existant :

```typescript
// Dans ChatInput.tsx
import { useAIChat } from '../../hooks/useAIChat';
import { ImageUpload } from './ImageUpload';

function ChatInput({ conversationId }: Props) {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string>();
  
  const { sendMessage, isLoading } = useAIChat(conversationId, {
    provider: 'openai',
    model: 'gpt-4o-mini',
    systemPrompt: 'Tu es Lisa, assistante IA française...'
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    await sendMessage(input, image);
    setInput('');
    setImage(undefined);
  };

  return (
    <div className="chat-input">
      <ImageUpload 
        currentImage={image}
        onImageSelect={setImage}
        onImageRemove={() => setImage(undefined)}
      />
      
      <textarea 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      
      <button onClick={handleSend} disabled={isLoading}>
        {isLoading ? 'Envoi...' : 'Envoyer'}
      </button>
    </div>
  );
}
```

---

## 💰 Coûts Estimés

### OpenAI (gpt-4o-mini)

- **Prix**: ~$0.15 / 1M tokens input, ~$0.60 / 1M tokens output
- **Conversation moyenne**: ~10¢ pour 100 messages
- **Recommandé pour**: Usage quotidien

### Anthropic (Claude 3.5 Sonnet)

- **Prix**: ~$3 / 1M tokens input, ~$15 / 1M tokens output
- **Conversation moyenne**: ~$2 pour 100 messages
- **Recommandé pour**: Tâches complexes

### Local (Gratuit)

- **Prix**: 0€
- **Requis**: GPU recommandé (8GB+ VRAM)
- **Recommandé pour**: Confidentialité, dev, tests

---

## 🔒 Sécurité

### ⚠️ Important

- **NE JAMAIS** commit les clés API dans Git
- Les clés doivent être dans `.env` (déjà dans `.gitignore`)
- En production, utiliser des variables d'environnement

### Vérification

```bash
# Vérifier que .env est ignoré
git status .env
# Doit afficher: nothing to commit
```

---

## 🐛 Dépannage

### Erreur: "VITE_OPENAI_API_KEY non configurée"

```bash
# 1. Créer/éditer .env à la racine du projet
echo "VITE_OPENAI_API_KEY=sk-..." >> .env

# 2. Redémarrer le serveur de dev
Ctrl+C
npm run dev
```

### Erreur: "Rate limit exceeded"

Vous avez dépassé la limite de requêtes. Attendez quelques minutes ou:
- Ajouter des crédits à votre compte
- Passer à un plan payant
- Réduire le nombre de requêtes

### Erreur: "Invalid API key"

- Vérifier que la clé commence par `sk-` (OpenAI) ou `sk-ant-` (Anthropic)
- Vérifier que la clé est active sur le dashboard
- Recréer une nouvelle clé si nécessaire

### Pas de streaming

Vérifier que:
- Le provider supporte le streaming (OpenAI, Anthropic: oui; Local: dépend)
- La connexion réseau est stable
- Le modèle supporte le streaming

---

## 📝 Prochaines Étapes

### Maintenant

1. ✅ Configurer les clés API dans `.env`
2. ✅ Tester avec un provider (OpenAI recommandé)
3. ✅ Intégrer au `ChatInput`

### Bientôt

- [ ] Ajouter bouton "Stop generation"
- [ ] Ajouter bouton "Regenerate"
- [ ] Support audio (Text-to-Speech)
- [ ] Support artifacts (code, graphs)
- [ ] Fine-tuning sur données utilisateur

---

## 🎉 Résultat

Vous avez maintenant :
- ✅ Service IA multi-provider
- ✅ Streaming temps réel
- ✅ Support images/vision
- ✅ Hook React prêt à l'emploi
- ✅ Upload images intégré
- ✅ Gestion erreurs robuste

**Lisa peut maintenant discuter intelligemment !** 🚀

---

**Document créé par**: Cascade AI  
**Date**: 6 Novembre 2025, 08:30
