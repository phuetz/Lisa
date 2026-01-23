# 💭 Phase 2 Semaine 6 - Memory Service

**Objectif**: Implémenter la gestion complète de la mémoire avec court-terme et long-terme.

---

## 📋 Fichiers Créés

### 1. MemoryService.ts
Service de gestion de la mémoire qui:
- Gère la mémoire court-terme (100 derniers souvenirs)
- Gère la mémoire long-terme (1000 derniers souvenirs)
- Promeut automatiquement les souvenirs pertinents
- Implémente la Forget API
- Calcule la pertinence
- Exporte/importe la mémoire

---

## 🎯 Fonctionnalités Implémentées

### ✅ Créer des Souvenirs
```typescript
import { memoryService } from './services/MemoryService'

// Créer un souvenir
const memory = memoryService.createMemory(
  'conversation',
  'L\'utilisateur a demandé comment utiliser Lisa',
  'chat_interface',
  ['lisa', 'usage', 'tutorial'],
  { userId: 'user_123' }
)

// Créer une préférence
memoryService.createMemory(
  'preference',
  'L\'utilisateur préfère les réponses courtes',
  'user_profile',
  ['preference', 'communication']
)

// Créer un fait
memoryService.createMemory(
  'fact',
  'Lisa est capable de traiter les images',
  'system_info',
  ['capability', 'vision']
)
```

### ✅ Récupérer les Souvenirs Pertinents
```typescript
// Récupérer les 10 souvenirs les plus pertinents
const relevant = memoryService.getRelevantMemories('Lisa vision', 10)

// Utiliser dans le contexte
const context = relevant.map(m => m.content).join('\n')
```

### ✅ Oublier des Souvenirs (Forget API)
```typescript
// Oublier toutes les conversations
const removed = memoryService.forgetMemories('conversation')
console.log(`${removed} conversations supprimées`)

// Oublier tous les documents
memoryService.forgetMemories('document')

// Oublier tout
memoryService.forgetMemories('all')
```

### ✅ Statistiques
```typescript
// Obtenir les statistiques
const stats = memoryService.getStats()
// {
//   totalMemories: 150,
//   byType: {
//     conversation: 80,
//     preference: 20,
//     fact: 30,
//     document: 15,
//     context: 5
//   },
//   averageRelevance: 65,
//   oldestMemory: '2025-11-01T10:00:00Z',
//   newestMemory: '2025-11-08T09:00:00Z',
//   totalSize: 524288
// }
```

### ✅ Contexte Actuel
```typescript
// Obtenir le contexte complet
const context = memoryService.getContext()
// {
//   shortTerm: [...],  // 100 derniers
//   longTerm: [...],   // 1000 derniers
//   stats: {...}
// }
```

### ✅ Export/Import
```typescript
// Exporter la mémoire
const exported = memoryService.exportMemory()
// Sauvegarder dans un fichier ou envoyer au serveur

// Importer la mémoire
memoryService.importMemory(exported)
```

### ✅ Nettoyage
```typescript
// Nettoyer les souvenirs de plus de 30 jours
const removed = memoryService.cleanupOldMemories(30)
console.log(`${removed} souvenirs supprimés`)
```

---

## 🚀 Intégration dans l'App

### 1. Hook de Mémoire
```typescript
// src/hooks/useMemory.ts
import { memoryService } from '../services/MemoryService'

export function useMemory() {
  const addMemory = (
    type: 'conversation' | 'document' | 'fact' | 'preference',
    content: string,
    source: string,
    tags?: string[]
  ) => {
    return memoryService.createMemory(type, content, source, tags)
  }

  const getContext = () => {
    return memoryService.getContext()
  }

  const forget = (scope: 'conversation' | 'document' | 'all') => {
    return memoryService.forgetMemories(scope)
  }

  return { addMemory, getContext, forget }
}
```

### 2. Utilisation dans le Chat
```typescript
// src/components/ChatInterface.tsx
import { useMemory } from '../hooks/useMemory'

export function ChatInterface() {
  const { addMemory, getContext } = useMemory()

  const handleUserMessage = async (message: string) => {
    // Ajouter le message à la mémoire
    addMemory('conversation', message, 'user_input', ['user_message'])

    // Récupérer le contexte pertinent
    const context = getContext()
    const relevantMemories = context.shortTerm.slice(0, 5)

    // Utiliser le contexte pour générer la réponse
    const response = await generateResponse(message, relevantMemories)

    // Ajouter la réponse à la mémoire
    addMemory('conversation', response, 'lisa_response', ['lisa_message'])

    return response
  }

  return (
    // ...
  )
}
```

### 3. Composant de Gestion de Mémoire
```typescript
// src/components/MemoryManager.tsx
import { useMemory } from '../hooks/useMemory'

export function MemoryManager() {
  const { getContext, forget } = useMemory()
  const [context, setContext] = useState(null)

  useEffect(() => {
    setContext(getContext())
  }, [])

  const handleForget = (scope: 'conversation' | 'document' | 'all') => {
    const removed = forget(scope)
    setContext(getContext())
    alert(`${removed} souvenirs supprimés`)
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Gestion de Mémoire</h2>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-blue-100 rounded">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold">{context?.stats.totalMemories}</p>
        </div>
        <div className="p-3 bg-green-100 rounded">
          <p className="text-sm text-gray-600">Pertinence Moy.</p>
          <p className="text-2xl font-bold">{context?.stats.averageRelevance}%</p>
        </div>
      </div>

      {/* Boutons d'Oubli */}
      <div className="space-y-2">
        <button
          onClick={() => handleForget('conversation')}
          className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Oublier les Conversations
        </button>
        <button
          onClick={() => handleForget('document')}
          className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Oublier les Documents
        </button>
        <button
          onClick={() => handleForget('all')}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Oublier Tout
        </button>
      </div>
    </div>
  )
}
```

---

## 🧪 Tests

### Tests Unitaires
```typescript
// tests/services/memoryService.test.ts
import { memoryService } from '../../src/services/MemoryService'

describe('MemoryService', () => {
  beforeEach(() => {
    // Nettoyer avant chaque test
    memoryService.forgetMemories('all')
  })

  it('should create memories', () => {
    const memory = memoryService.createMemory(
      'conversation',
      'Test message',
      'test_source',
      ['test']
    )

    expect(memory.id).toBeDefined()
    expect(memory.type).toBe('conversation')
    expect(memory.content).toBe('Test message')
  })

  it('should retrieve relevant memories', () => {
    memoryService.createMemory('conversation', 'Lisa is great', 'test', ['lisa'])
    memoryService.createMemory('conversation', 'Python is great', 'test', ['python'])

    const relevant = memoryService.getRelevantMemories('Lisa', 5)
    expect(relevant.length).toBeGreaterThan(0)
    expect(relevant[0].content).toContain('Lisa')
  })

  it('should forget memories', () => {
    memoryService.createMemory('conversation', 'Test 1', 'test', [])
    memoryService.createMemory('conversation', 'Test 2', 'test', [])

    const removed = memoryService.forgetMemories('conversation')
    expect(removed).toBe(2)

    const stats = memoryService.getStats()
    expect(stats.totalMemories).toBe(0)
  })

  it('should promote relevant memories to long-term', () => {
    // Créer 101 souvenirs pour forcer la promotion
    for (let i = 0; i < 101; i++) {
      memoryService.createMemory(
        'preference',
        `Preference ${i}`,
        'test',
        ['important']
      )
    }

    const context = memoryService.getContext()
    expect(context.longTerm.length).toBeGreaterThan(0)
  })

  it('should calculate relevance correctly', () => {
    const memory = memoryService.createMemory(
      'preference',
      'Important preference',
      'test',
      ['important']
    )

    expect(memory.relevance).toBeGreaterThan(50)
  })
})
```

---

## 📊 Architecture

### Mémoire Court-Terme
- **Capacité**: 100 souvenirs
- **Durée**: Session actuelle
- **Pertinence**: Moyenne à haute
- **Accès**: Rapide

### Mémoire Long-Terme
- **Capacité**: 1000 souvenirs
- **Durée**: Persistant
- **Pertinence**: Haute
- **Accès**: Plus lent

### Promotion
- Souvenirs avec pertinence > 50 sont promus
- Automatique quand la mémoire court-terme est pleine
- Basée sur le type et la pertinence

---

## 🎯 Prochaines Étapes

### Semaine 7: RAG Integration
- Embeddings pour les souvenirs
- Recherche sémantique
- Contexte augmenté pour les réponses

### Semaine 8: Forget API Complete
- Suppression granulaire
- Audit des suppressions
- Récupération de données

---

## 💡 Bonnes Pratiques

### 1. Ajouter du Contexte
```typescript
// ✅ BON
memoryService.createMemory(
  'conversation',
  'L\'utilisateur demande comment utiliser Lisa',
  'chat_interface',
  ['lisa', 'usage', 'question'],
  { userId: 'user_123', sessionId: 'session_456' }
)

// ❌ MAUVAIS
memoryService.createMemory('conversation', 'test', 'test')
```

### 2. Utiliser les Tags
```typescript
// ✅ BON
memoryService.createMemory(
  'preference',
  'Préfère les réponses courtes',
  'user_profile',
  ['preference', 'communication', 'style']
)

// ❌ MAUVAIS
memoryService.createMemory('preference', 'Préfère les réponses courtes', 'test', [])
```

### 3. Nettoyer Régulièrement
```typescript
// ✅ BON
// Nettoyer les souvenirs de plus de 30 jours
setInterval(() => {
  memoryService.cleanupOldMemories(30)
}, 24 * 60 * 60 * 1000)

// ❌ MAUVAIS
// Laisser la mémoire croître indéfiniment
```

---

## 🚀 Commandes Rapides

```bash
# Tester le Memory Service
npm run test tests/services/memoryService.test.ts

# Vérifier la mémoire
localStorage.getItem('lisa:memory:short-term')
localStorage.getItem('lisa:memory:long-term')

# Obtenir les statistiques
memoryService.getStats()

# Exporter la mémoire
const exported = memoryService.exportMemory()
console.log(JSON.stringify(exported, null, 2))
```

---

**Phase 2 Semaine 6 - Memory Service est prête!**

✨ *"Lisa se souvient de tout ce qui compte."*
