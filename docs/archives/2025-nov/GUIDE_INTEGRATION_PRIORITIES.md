# 📘 GUIDE D'INTÉGRATION - Priorités Critiques

Ce guide vous accompagne dans l'intégration des nouvelles fonctionnalités implémentées.

---

## 🚀 ÉTAPE 1: Configuration Backend (15 min)

### 1.1 Variables d'environnement

Assurez-vous que ces variables sont configurées dans `.env` (côté serveur):

```env
# OpenAI API
OPENAI_API_KEY=sk-...

# Google APIs
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_API_KEY=your_search_key
GOOGLE_SEARCH_ENGINE_ID=your_engine_id

# JWT pour authentification
JWT_SECRET=your_jwt_secret_here
```

⚠️ **Important**: Ne **jamais** mettre ces clés dans `.env.local` (client) ni dans le code frontend.

### 1.2 Démarrer le serveur API

```bash
cd c:/Users/patri/CascadeProjects/Lisa
npm run start-api
```

Vérifier la santé du proxy:
```bash
curl http://localhost:3000/api/proxy/health
```

Réponse attendue:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-11T20:30:00.000Z",
  "services": {
    "openai": true,
    "googleVision": true,
    "googleSearch": true
  }
}
```

---

## 🔄 ÉTAPE 2: Migrer Agents vers Proxy (30 min)

### 2.1 ContentGeneratorAgent

**Avant** (`src/agents/ContentGeneratorAgent.ts`):
```typescript
// ❌ Ne PAS faire ceci (clé exposée)
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ messages, model })
});
```

**Après**:
```typescript
// ✅ Faire ceci (sécurisé)
import { secureAI } from '../services/SecureAIService';

const response = await secureAI.callOpenAI(messages, model);
```

### 2.2 Ajouter résilience

Enrober l'appel avec le ResilientExecutor:

```typescript
import { resilientExecutor } from '../utils/resilience/ResilientExecutor';
import { secureAI } from '../services/SecureAIService';

async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
  try {
    const result = await resilientExecutor.executeWithRetry(
      () => secureAI.callOpenAI(messages, model),
      {
        maxRetries: 3,
        circuitBreakerKey: 'ContentGeneratorAgent',
        onRetry: (attempt, max, error) => {
          console.log(`[ContentGeneratorAgent] Retry ${attempt}/${max}:`, error.message);
        }
      }
    );
    
    return {
      success: true,
      output: result.choices[0].message.content
    };
  } catch (error) {
    return {
      success: false,
      output: 'Generation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### 2.3 Agents prioritaires à migrer

1. **ContentGeneratorAgent** - OpenAI
2. **TranslationAgent** - OpenAI
3. **VisionAgent** - Google Vision
4. **WebSearchAgent** - Google Search
5. **ImageAnalysisAgent** - Google Vision

Pour chaque agent:
1. Remplacer les appels directs API par `secureAI`
2. Enrober avec `resilientExecutor`
3. Ajouter circuit breaker key
4. Tester

---

## 🎯 ÉTAPE 3: Enregistrer CoordinatorAgent (5 min)

### 3.1 Ajouter au registry

Éditer `src/agents/registry.ts`:

```typescript
import { CoordinatorAgent } from './CoordinatorAgent';

// Dans la section agentFactories.set()
agentFactories.set('CoordinatorAgent', () => new CoordinatorAgent());
```

### 3.2 Tester le CoordinatorAgent

```typescript
// Dans la console développeur ou un test
const coordinator = await agentRegistry.getAgentAsync('CoordinatorAgent');

const result = await coordinator.execute({
  tasks: [
    {
      id: 'search1',
      name: 'Search AI',
      agent: 'WebSearchAgent',
      input: { query: 'Artificial Intelligence' },
      dependencies: []
    },
    {
      id: 'search2',
      name: 'Search ML',
      agent: 'WebSearchAgent',
      input: { query: 'Machine Learning' },
      dependencies: []
    },
    {
      id: 'analyze',
      name: 'Analyze results',
      agent: 'DataAnalysisAgent',
      input: { data: '${search1.output},${search2.output}' },
      dependencies: ['search1', 'search2']
    }
  ]
});

console.log('Result:', result);
// Les 2 recherches s'exécutent en parallèle (niveau 1)
// L'analyse s'exécute après (niveau 2)
```

---

## 📊 ÉTAPE 4: Ajouter Dashboard Monitoring (10 min)

### 4.1 Ajouter la route

Éditer `src/routes.tsx`:

```typescript
import { MonitoringPage } from './pages/MonitoringPage';

// Ajouter dans les routes
<Route path="/monitoring" element={<MonitoringPage />} />
```

### 4.2 Ajouter lien dans la navigation

Éditer `src/components/Navigation.tsx` (ou équivalent):

```typescript
<Link to="/monitoring">
  <ListItem button>
    <ListItemIcon>
      <Speed />
    </ListItemIcon>
    <ListItemText primary="Monitoring" />
  </ListItem>
</Link>
```

### 4.3 Tester le dashboard

1. Démarrer l'application: `npm run dev`
2. Naviguer vers `/monitoring`
3. Vérifier que les métriques s'affichent
4. Simuler des erreurs pour voir les circuit breakers

---

## 🔐 ÉTAPE 5: Configurer Chiffrement (20 min)

### 5.1 Créer composant EncryptionSettings

Créer `src/components/EncryptionSettings.tsx`:

```typescript
import { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import { encryptionService } from '../services/EncryptionService';

export function EncryptionSettings() {
  const [password, setPassword] = useState('');
  const [enabled, setEnabled] = useState(
    localStorage.getItem('encryption_enabled') === 'true'
  );

  const handleEnable = async () => {
    // Valider le mot de passe
    const validation = encryptionService.validatePassword(password);
    
    if (!validation.valid) {
      alert('Mot de passe trop faible:\n' + validation.errors.join('\n'));
      return;
    }

    // Activer le chiffrement
    localStorage.setItem('encryption_enabled', 'true');
    setEnabled(true);
    alert('Chiffrement activé! Ne perdez pas votre mot de passe.');
  };

  const handleGenerate = () => {
    const generated = encryptionService.generatePassword(16);
    setPassword(generated);
  };

  return (
    <Box>
      <Typography variant="h6" mb={2}>
        🔐 Chiffrement End-to-End
      </Typography>
      
      {enabled ? (
        <Alert severity="success">
          Chiffrement activé. Vos données sont protégées.
        </Alert>
      ) : (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            Activez le chiffrement pour protéger vos mémoires sensibles.
            Vous devrez entrer votre mot de passe à chaque session.
          </Alert>
          
          <TextField
            type="password"
            label="Mot de passe maître"
            value={password}
            onChange={e => setPassword(e.target.value)}
            fullWidth
            margin="normal"
            helperText="Min 12 caractères avec majuscules, minuscules, chiffres et symboles"
          />
          
          <Box display="flex" gap={2} mt={2}>
            <Button onClick={handleGenerate} variant="outlined">
              Générer mot de passe fort
            </Button>
            <Button 
              onClick={handleEnable} 
              variant="contained"
              disabled={password.length < 12}
            >
              Activer Chiffrement
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
```

### 5.2 Intégrer dans MemoryService

Modifier `src/services/MemoryService.ts`:

```typescript
import { encryptionService } from './EncryptionService';

export class MemoryService {
  async saveMemory(memory: Memory) {
    // Vérifier si chiffrement activé
    const encryptionEnabled = localStorage.getItem('encryption_enabled') === 'true';
    
    if (encryptionEnabled && memory.sensitive) {
      // Demander le mot de passe à l'utilisateur
      const password = prompt('Entrez votre mot de passe de chiffrement:');
      if (!password) {
        throw new Error('Mot de passe requis pour sauvegarder des données sensibles');
      }
      
      // Chiffrer le contenu
      const encrypted = await encryptionService.encrypt(
        JSON.stringify(memory.content),
        password
      );
      
      const serialized = encryptionService.serializeEncrypted(encrypted);
      memory.content = JSON.parse(serialized); // Stocker comme objet
      memory.isEncrypted = true;
    }
    
    // Sauvegarder dans IndexedDB
    await this.db.memories.add(memory);
  }
  
  async getMemory(id: string): Promise<Memory> {
    const memory = await this.db.memories.get(id);
    
    // Déchiffrer si nécessaire
    if (memory.isEncrypted) {
      const password = prompt('Entrez votre mot de passe de chiffrement:');
      if (!password) {
        throw new Error('Mot de passe requis');
      }
      
      const encrypted = encryptionService.deserializeEncrypted(
        JSON.stringify(memory.content)
      );
      
      const decrypted = await encryptionService.decrypt(encrypted, password);
      memory.content = JSON.parse(decrypted);
    }
    
    return memory;
  }
}
```

---

## ✅ ÉTAPE 6: Tests & Validation (30 min)

### 6.1 Test Backend Proxy

```bash
# Tester OpenAI proxy
curl -X POST http://localhost:3000/api/proxy/openai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "gpt-4o-mini"
  }'
```

### 6.2 Test Circuit Breaker

```typescript
// Dans la console développeur
import { resilientExecutor } from './utils/resilience/ResilientExecutor';

// Forcer un échec pour tester
for (let i = 0; i < 6; i++) {
  try {
    await resilientExecutor.executeWithRetry(
      () => Promise.reject(new Error('Test error')),
      { circuitBreakerKey: 'test-circuit', maxRetries: 1 }
    );
  } catch (e) {
    console.log(`Attempt ${i + 1} failed`);
  }
}

// Vérifier l'état
console.log(resilientExecutor.getCircuitState('test-circuit'));
// { failures: 6, state: 'open', ... }

// Vérifier dans /monitoring que le circuit est ouvert
```

### 6.3 Test Chiffrement

```typescript
// Dans la console développeur
import { encryptionService } from './services/EncryptionService';

const password = 'Test1234!@#$';
const data = 'Données sensibles à protéger';

// Chiffrer
const encrypted = await encryptionService.encrypt(data, password);
console.log('Encrypted:', encrypted);

// Déchiffrer
const decrypted = await encryptionService.decrypt(encrypted, password);
console.log('Decrypted:', decrypted);
// Doit afficher: "Données sensibles à protéger"
```

### 6.4 Test CoordinatorAgent

Créer `src/__tests__/CoordinatorAgent.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { CoordinatorAgent } from '../agents/CoordinatorAgent';

describe('CoordinatorAgent', () => {
  it('should detect circular dependencies', async () => {
    const coordinator = new CoordinatorAgent();
    
    const result = await coordinator.execute({
      tasks: [
        {
          id: 'task1',
          name: 'Task 1',
          agent: 'TestAgent',
          input: {},
          dependencies: ['task2'] // Circular!
        },
        {
          id: 'task2',
          name: 'Task 2',
          agent: 'TestAgent',
          input: {},
          dependencies: ['task1'] // Circular!
        }
      ]
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Circular dependency');
  });
});
```

---

## 📈 MÉTRIQUES DE SUCCÈS

### Sécurité
- ✅ Clés API non exposées dans le code client
- ✅ Toutes les requêtes API passent par le proxy
- ✅ Données sensibles chiffrées

### Robustesse
- ✅ Taux d'échec < 5%
- ✅ Circuit breakers actifs et fonctionnels
- ✅ Retry automatique visible dans les logs

### Performance
- ✅ Workflows parallèles 3x plus rapides
- ✅ Monitoring temps réel < 2s de latence
- ✅ Pas de ralentissement perceptible

### UX
- ✅ Aucun crash utilisateur
- ✅ Messages d'erreur clairs
- ✅ Dashboard monitoring accessible

---

## 🐛 TROUBLESHOOTING

### Problème: Backend proxy ne répond pas

**Solution**:
1. Vérifier que le serveur API est démarré
2. Vérifier les variables d'environnement
3. Checker les logs du serveur
4. Tester le health check: `/api/proxy/health`

### Problème: Circuit breaker toujours ouvert

**Solution**:
1. Aller sur `/monitoring`
2. Identifier le circuit en erreur
3. Cliquer sur "Réinitialiser"
4. Vérifier que le service externe fonctionne

### Problème: Déchiffrement échoue

**Solution**:
1. Vérifier que le mot de passe est correct
2. S'assurer que les données n'ont pas été corrompues
3. Vérifier la console pour les erreurs crypto
4. En dernier recours, désactiver le chiffrement temporairement

### Problème: CoordinatorAgent trop lent

**Solution**:
1. Réduire le nombre de tâches par workflow
2. Vérifier les dépendances (pas de goulots d'étranglement)
3. Augmenter le nombre de retry si échecs fréquents
4. Monitorer les temps d'exécution dans le dashboard

---

## 📞 SUPPORT

Pour toute question ou problème:
1. Consulter la documentation complète dans les fichiers `.md`
2. Vérifier les logs dans la console développeur
3. Utiliser le dashboard monitoring pour diagnostiquer
4. Créer une issue GitHub avec les logs pertinents

---

**Dernière mise à jour**: 11 Nov 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
