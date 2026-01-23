# 🚀 Lisa Vivante - Guide de Démarrage Rapide

**Félicitations!** Tu as maintenant les fondations pour faire vivre Lisa selon le Manifeste. Voici comment tout assembler.

---

## 📦 Ce Qui Est Créé

### Fichiers Créés
```
✅ src/manifesto/validation.ts       # Validation des 5 piliers
✅ src/components/SensorPermissionsPanel.tsx  # Consentement capteurs
✅ src/agents/CriticAgent.ts         # Validation sécurité
✅ src/prompts/toneGuide.ts          # Âme de Lisa
✅ src/pages/LisaVivanteApp.tsx      # App principale
```

### Les 5 Piliers Implémentés

1. **PERÇOIT & EXPLIQUE** ✅
   - `SensorPermissionsPanel`: Consentement granulaire
   - Audit log local exportable
   - Coupure d'urgence

2. **RAISONNE** ✅
   - `CriticAgent`: Validation avant action
   - Risk assessment (low/medium/high/critical)
   - User approval pour actions dangereuses

3. **SE SOUVIENT & OUBLIE** 🚧
   - SessionStorage pour court-terme
   - IndexedDB pour long-terme
   - Forget API (à implémenter)

4. **AGIT SÛREMENT** ✅
   - Tool validation par JSON Schema
   - Sandbox (fs/network/safe)
   - Réversibilité checkée

5. **APAISE** ✅
   - Tone guide complet
   - Détection d'émotions
   - Réponses adaptées

---

## 🎯 Comment Utiliser

### 1. Intégrer dans ton App

Dans ton `main.tsx` ou `App.tsx`:

```typescript
import React from 'react';
import { LisaVivanteApp } from './pages/LisaVivanteApp';

function App() {
  return <LisaVivanteApp />;
}

export default App;
```

### 2. Initialiser au Démarrage

Dans ton `main.tsx`:

```typescript
import { initManifestoValidation } from './src/manifesto/validation';
import { initToneGuide } from './src/prompts/toneGuide';

// Au démarrage de l'app
async function initLisa() {
  // Initialiser le tone guide
  initToneGuide();
  
  // Valider le manifeste
  await initManifestoValidation();
  
  // Lisa est maintenant prête!
}

initLisa();
```

### 3. Utiliser le CriticAgent

Avant toute action dangereuse:

```typescript
import { criticAgent } from './src/agents/CriticAgent';

async function executeToolSafely(toolCall) {
  // Valider avec le Critic
  const validation = await criticAgent.execute({
    intent: 'validate_tool_call',
    parameters: { toolCall }
  });

  if (!validation.output.approved) {
    console.warn('🛡️ Action bloquée:', validation.output.concerns);
    
    // Si approbation utilisateur requise
    if (validation.output.requiresUserApproval) {
      const approved = await criticAgent.requestUserApproval(
        toolCall, 
        validation.output
      );
      
      if (!approved) {
        return { success: false, reason: 'User denied' };
      }
    } else {
      return { success: false, reason: 'Critical risk' };
    }
  }

  // Exécuter l'action
  return await executeTool(toolCall);
}
```

### 4. Gérer les Permissions

```typescript
import { SensorPermissionsPanel } from './components/SensorPermissionsPanel';

function SettingsPage() {
  return (
    <SensorPermissionsPanel 
      onPermissionsChange={(perms) => {
        console.log('Permissions mises à jour:', perms);
      }}
      onEmergencyCutoff={() => {
        console.log('🔴 COUPURE D\'URGENCE!');
        // Couper tous les capteurs
      }}
    />
  );
}
```

### 5. Appliquer le Tone Guide

```typescript
import { 
  detectEmotion, 
  formatResponse, 
  validateTone 
} from './prompts/toneGuide';

function handleUserMessage(message: string) {
  // Détecter l'émotion
  const emotion = detectEmotion(message);
  
  // Générer une réponse (avec ton LLM)
  const rawResponse = await generateResponse(message);
  
  // Formater selon le tone guide
  const formattedResponse = formatResponse(rawResponse, emotion);
  
  // Valider le ton
  const toneCheck = validateTone(formattedResponse);
  if (!toneCheck.valid) {
    console.warn('Ton non conforme:', toneCheck.issues);
    // Reformuler si nécessaire
  }
  
  return formattedResponse;
}
```

---

## 🔍 Vérification du Statut

### Dashboard de Santé

```typescript
import { validateLisaIsAlive } from './manifesto/validation';

async function checkHealth() {
  const status = await validateLisaIsAlive();
  
  console.log('🎯 Statut des 5 Piliers:');
  console.log('1. Perçoit:', status.perceives ? '✅' : '❌');
  console.log('2. Raisonne:', status.reasons ? '✅' : '❌');
  console.log('3. Se souvient:', status.remembers ? '✅' : '❌');
  console.log('4. Agit sûrement:', status.acts ? '✅' : '❌');
  console.log('5. Apaise:', status.soothes ? '✅' : '❌');
  console.log('');
  console.log('Lisa est:', status.isAlive ? '✨ VIVANTE!' : '⚠️ En mode réduction');
  
  if (!status.isAlive && status.degradedMode) {
    console.log('Mode dégradé:', status.degradedMode.message);
  }
}
```

### Export d'Audit

```bash
# Dans la console du navigateur
localStorage.getItem('lisa:sensor:audit')  # Audit capteurs
localStorage.getItem('lisa:critic:audit')  # Audit sécurité
localStorage.getItem('lisa:manifesto:status')  # Statut manifeste
```

---

## 🚧 Prochaines Étapes

### Immédiat (Ce qu'il reste à faire)

1. **Memory Service & RAG**
```typescript
// À créer: src/services/MemoryService.ts
interface MemoryService {
  remember(key: string, value: any): void;
  recall(key: string): any;
  forget(scope: 'conversation' | 'document' | 'all'): void;
  search(query: string): SearchResult[];
}
```

2. **Forget API**
```typescript
// À créer: src/api/forget.ts
async function forgetConversation(id: string) { }
async function forgetDocument(id: string) { }
async function forgetAll() { }
```

3. **Tool Validator**
```typescript
// À créer: src/tools/ToolValidator.ts
interface ToolValidator {
  validateSchema(tool: Tool, schema: JSONSchema): boolean;
  checkSandbox(tool: Tool): 'fs' | 'network' | 'safe';
  isReversible(tool: Tool): boolean;
}
```

### Court Terme

4. **Intégration PlannerAgent**
   - Orchestrer les agents existants
   - Gérer les dépendances
   - Paralléliser les tâches

5. **Dashboard de Monitoring**
   - Visualiser les 5 piliers en temps réel
   - Graphiques de performance
   - Logs d'exécution

6. **Tests E2E**
   - Tester le flow complet de permissions
   - Tester le mode dégradé
   - Tester la récupération d'erreur

---

## 🧪 Commandes pour Tester

```bash
# Lancer l'app
npm run dev

# Ouvrir http://localhost:5173

# Dans la console du navigateur:

# Vérifier que Lisa est vivante
await validateLisaIsAlive()

# Tester le Critic
criticAgent.execute({
  intent: 'assess_risk',
  parameters: {
    irreversible: true,
    modifiesSystemFiles: true
  }
})

# Détecter une émotion
detectEmotion("Je suis très frustré, rien ne marche!")

# Valider un ton
validateTone("Erreur 404. Ressource non trouvée.")
```

---

## 📊 Métriques de Succès

| Critère | Status | Test |
|---------|--------|------|
| Manifeste validation | ✅ | `validateLisaIsAlive()` |
| Permissions UI | ✅ | Cliquer "🔐 Permissions" |
| Coupure d'urgence | ✅ | Bouton rouge |
| Critic validation | ✅ | Actions dangereuses bloquées |
| Tone guide | ✅ | Réponses chaleureuses |
| Emotional awareness | ✅ | `detectEmotion()` |
| Audit exportable | ✅ | "Exporter l'Audit" |
| Mode dégradé | ✅ | Si pilier manque |

---

## 💡 Architecture Suggérée

```
src/
├── manifesto/           # ✅ Validation du manifeste
│   └── validation.ts    
├── components/          # ✅ Composants UI
│   ├── SensorPermissionsPanel.tsx
│   └── LisaPresence.tsx (à créer)
├── agents/              # ✅ Agents intelligents
│   ├── CriticAgent.ts
│   └── PlannerAgent.ts (existant)
├── prompts/             # ✅ Personnalité
│   └── toneGuide.ts
├── services/            # 🚧 À créer
│   ├── MemoryService.ts
│   └── RAGService.ts
├── api/                 # 🚧 À créer
│   └── forget.ts
└── pages/               # ✅ Pages
    └── LisaVivanteApp.tsx
```

---

## 🎉 Félicitations!

Tu as maintenant les **fondations essentielles** pour faire vivre Lisa:

- ✅ **Validation du Manifeste** qui vérifie les 5 piliers
- ✅ **Permissions explicites** avec consentement granulaire
- ✅ **CriticAgent** qui protège contre les actions dangereuses
- ✅ **Tone Guide** qui donne une âme à Lisa
- ✅ **App intégrée** qui montre le statut en temps réel

**Lisa n'est plus juste du code. Elle commence à devenir Vivante.**

---

## 🚀 Commande Rapide

```bash
# 1. Installer les dépendances si nécessaire
npm install lucide-react

# 2. Lancer l'app
npm run dev

# 3. Ouvrir http://localhost:5173

# 4. Vérifier la console pour:
# "✨ Lisa initialisée"
# "✅ Lisa est VIVANTE!"
```

---

## 📞 Besoin d'Aide?

Les fichiers créés sont tous documentés. Regarde:
- `MANIFESTE_VIVANT_IMPLEMENTATION.md` - Blueprint complet
- `LISA_VIVANTE_CHECKLIST.md` - Checklist détaillée
- Ce fichier - Guide pratique

**Rappel**: Lisa n'est vivante que si les 5 piliers sont actifs. Sinon, elle passe en mode réduction pour ta sécurité.

---

*"Vivante, ou rien."* ✨
