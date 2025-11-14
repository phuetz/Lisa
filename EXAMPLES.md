# Lisa - Examples d'Utilisation

Ce document fournit des exemples concrets d'utilisation des nouvelles fonctionnalités implémentées.

## 📦 Import Centralisé

```typescript
// Import tout depuis un seul endroit
import {
  retryWithBackoff,
  CircuitBreaker,
  analytics,
  profiler,
  modelCache,
  featureFlags,
  workflowTemplates,
} from './utils';
```

## 🔄 Retry Logic

### Exemple 1: API Call avec Retry

```typescript
import { retryWithBackoff, RetryPredicates } from './utils';

async function fetchWeather(city: string) {
  const result = await retryWithBackoff(
    async () => {
      const response = await fetch(`/api/weather?city=${city}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      shouldRetry: RetryPredicates.networkErrors,
      onRetry: (attempt, error, delay) => {
        console.log(`Retry ${attempt} after ${delay}ms:`, error.message);
      },
    }
  );

  if (result.success) {
    return result.data;
  } else {
    throw result.error;
  }
}

// Utilisation
try {
  const weather = await fetchWeather('Paris');
  console.log('Weather:', weather);
} catch (error) {
  console.error('Failed after retries:', error);
}
```

### Exemple 2: Retry avec Decorator

```typescript
import { Retry } from './utils';

class WeatherService {
  @Retry({ maxAttempts: 3, initialDelay: 500 })
  async getCurrentWeather(city: string) {
    const response = await fetch(`/api/weather?city=${city}`);
    return response.json();
  }
}

const service = new WeatherService();
const weather = await service.getCurrentWeather('London');
```

## 🛡️ Circuit Breaker

### Exemple 1: Protection d'une API

```typescript
import { CircuitBreaker, CircuitState } from './utils';

const weatherBreaker = new CircuitBreaker(
  async (city: string) => {
    const response = await fetch(`/api/weather?city=${city}`);
    if (!response.ok) throw new Error('API Error');
    return response.json();
  },
  {
    failureThreshold: 5,      // Open après 5 échecs
    resetTimeout: 60000,      // Retry après 1 minute
    successThreshold: 2,      // 2 succès pour fermer
    onStateChange: (from, to) => {
      console.log(`Circuit: ${from} -> ${to}`);
    },
  }
);

async function getWeather(city: string) {
  try {
    return await weatherBreaker.execute(city);
  } catch (error) {
    if (error.name === 'CircuitBreakerOpenError') {
      return { error: 'Service temporairement indisponible' };
    }
    throw error;
  }
}

// Monitoring
console.log('State:', weatherBreaker.getState());
console.log('Stats:', weatherBreaker.getStats());
```

## ⏱️ Rate Limiting

### Exemple 1: Limiter les Appels API

```typescript
import { TokenBucketLimiter } from './utils';

const apiLimiter = new TokenBucketLimiter({
  maxRequests: 10,        // 10 requêtes
  windowMs: 60000,        // par minute
  onLimitExceeded: (retryAfter) => {
    console.log(`Rate limited. Retry in ${retryAfter}ms`);
  },
});

async function callAPI(endpoint: string) {
  if (!apiLimiter.tryAcquire()) {
    throw new Error('Rate limit exceeded');
  }

  return fetch(endpoint);
}

// Ou attendre automatiquement
async function callAPIWithWait(endpoint: string) {
  await apiLimiter.acquire(); // Attend qu'un token soit disponible
  return fetch(endpoint);
}
```

### Exemple 2: Limiter les Actions Utilisateur

```typescript
import { ActionThrottler } from './utils';

const submitThrottler = new ActionThrottler(
  1000,  // Min 1s entre actions
  5,     // Max 5 actions
  60000  // Par 60s
);

function handleSubmit() {
  if (!submitThrottler.performAction()) {
    alert('Trop de soumissions. Veuillez patienter.');
    return;
  }

  // Soumettre le formulaire
  submitForm();
}
```

## 📊 Analytics & Profiling

### Exemple 1: Tracker les Performances d'un Agent

```typescript
import { analytics, TrackExecution } from './utils';

class DataAgent {
  @TrackExecution('DataAgent')
  async processData(data: any[]) {
    // Traitement des données
    return data.map(item => process(item));
  }
}

// Voir les métriques
const metrics = analytics.getMetrics('DataAgent');
console.log('Exécutions:', metrics.totalExecutions);
console.log('Taux de succès:', 1 - metrics.errorRate);
console.log('Temps moyen:', metrics.averageExecutionTime);
console.log('P95:', metrics.p95);

// Top performers
const topAgents = analytics.getTopPerformers(5);
console.log('Meilleurs agents:', topAgents);
```

### Exemple 2: Profiling de Performance

```typescript
import { profiler, Profile } from './utils';

class ImageProcessor {
  @Profile('ImageProcessor.resize')
  async resizeImage(image: Blob, width: number, height: number) {
    // Redimensionnement d'image
    return resizedImage;
  }
}

// Ou manuellement
profiler.start('image-processing');
await processImage(imageData);
const duration = profiler.end('image-processing');
console.log(`Processing took ${duration}ms`);

// Métriques
const metrics = profiler.getMetrics('image-processing');
console.log('P50:', metrics.p50);
console.log('P95:', metrics.p95);
console.log('P99:', metrics.p99);

// Rapport complet
console.log(profiler.generateReport());
```

## 💾 Model Cache

### Exemple 1: Cacher un Modèle ML

```typescript
import { modelCache } from './utils';

async function loadModel(modelName: string) {
  return modelCache.getOrSet(
    modelName,
    async () => {
      console.log('Downloading model...');
      const response = await fetch(`/models/${modelName}.bin`);
      return response.arrayBuffer();
    },
    { version: '1.0', type: 'tensorflow' }
  );
}

// Le modèle est téléchargé une seule fois, puis mis en cache
const model1 = await loadModel('face-detection');  // Download
const model2 = await loadModel('face-detection');  // From cache

// Stats du cache
const stats = await modelCache.getStats();
console.log('Total size:', stats.totalSize / 1024 / 1024, 'MB');
console.log('Utilization:', stats.utilization * 100, '%');
```

### Exemple 2: Précharger des Modèles

```typescript
import { modelCache } from './utils';

async function preloadModels() {
  await modelCache.preload([
    {
      key: 'face-detection',
      url: '/models/face-detection.bin',
      metadata: { version: '1.0' }
    },
    {
      key: 'pose-estimation',
      url: '/models/pose-estimation.bin',
      metadata: { version: '2.0' }
    },
  ]);

  console.log('All models preloaded!');
}
```

## 🌐 Offline Sync

### Exemple 1: Queue une Opération

```typescript
import { syncManager } from './utils';

async function createTodo(todo: Todo) {
  // Optimistic UI update
  addTodoToUI(todo);

  // Queue for sync
  await syncManager.enqueue({
    type: 'create',
    resource: 'todos',
    data: todo,
    priority: 1, // Higher priority = synced first
  });

  // Will sync automatically when online
}

// Monitoring
const status = syncManager.getQueueStatus();
console.log('Pending operations:', status.pending);
console.log('Syncing:', status.syncing);
```

### Exemple 2: Résolution de Conflits

```typescript
import { ConflictResolver, ConflictStrategy } from './utils';

const clientData = {
  id: '123',
  title: 'Client version',
  timestamp: Date.now() - 1000
};

const serverData = {
  id: '123',
  title: 'Server version',
  timestamp: Date.now()
};

// Last write wins
const resolved = ConflictResolver.resolve(
  clientData,
  serverData,
  ConflictStrategy.LAST_WRITE_WINS
);

console.log('Winner:', resolved.title); // "Server version"

// Merge objects
const merged = ConflictResolver.merge(
  clientData,
  serverData,
  ConflictStrategy.SERVER_WINS
);
```

## 🔒 Validation

### Exemple 1: Validation d'Input

```typescript
import { validator, sanitizeInput } from './utils';

function handleFormSubmit(data: any) {
  // Validation
  const emailValidator = validator<string>()
    .required('Email requis')
    .email('Email invalide');

  const passwordValidator = validator<string>()
    .required('Mot de passe requis')
    .minLength(8, 'Minimum 8 caractères')
    .pattern(/[A-Z]/, 'Doit contenir une majuscule')
    .pattern(/[0-9]/, 'Doit contenir un chiffre');

  const emailResult = emailValidator.validate(data.email);
  const passwordResult = passwordValidator.validate(data.password);

  if (!emailResult.valid) {
    return { errors: emailResult.errors };
  }

  if (!passwordResult.valid) {
    return { errors: passwordResult.errors };
  }

  // Sanitization
  const cleanEmail = sanitizeInput(data.email);
  const cleanName = sanitizeInput(data.name);

  // Process...
}
```

### Exemple 2: URL Sécurisée

```typescript
import { isSafeUrl, sanitizeHtml } from './utils';

function renderUserContent(url: string, html: string) {
  if (!isSafeUrl(url)) {
    throw new Error('URL non sécurisée détectée');
  }

  const safeHtml = sanitizeHtml(html);
  return safeHtml;
}
```

## 🚩 Feature Flags

### Exemple 1: Utilisation Basique

```typescript
import { featureFlags } from './utils';

// Vérifier un feature flag
if (featureFlags.isEnabled('lazy-loading')) {
  // Utiliser lazy loading
  await lazyLoadModule();
} else {
  // Chargement normal
  await regularLoad();
}

// Activer/désactiver
featureFlags.enable('monitoring-dashboard');
featureFlags.disable('experimental-agents');
featureFlags.toggle('webgpu-acceleration');
```

### Exemple 2: React Integration

```typescript
import { useFeatureFlag, FeatureGate } from './utils';

function MyComponent() {
  const showDashboard = useFeatureFlag('monitoring-dashboard');

  return (
    <div>
      {showDashboard && <MonitoringDashboard />}

      <FeatureGate flag="experimental-agents">
        <ExperimentalFeatures />
      </FeatureGate>

      <FeatureGate
        flag="voice-controls"
        fallback={<TextInput />}
      >
        <VoiceInput />
      </FeatureGate>
    </div>
  );
}
```

### Exemple 3: Subscribe aux Changements

```typescript
import { featureFlags } from './utils';

const unsubscribe = featureFlags.subscribe('analytics', (enabled) => {
  if (enabled) {
    analytics.start();
  } else {
    analytics.stop();
  }
});

// Cleanup
unsubscribe();
```

## 📝 Workflow Templates

### Exemple 1: Utiliser un Template

```typescript
import { getTemplateById } from './utils';

async function runMorningRoutine() {
  const template = getTemplateById('morning-routine');

  if (template) {
    // Exécuter le workflow avec le plan pré-configuré
    const result = await workflowExecutor.execute(template.plan);
    console.log('Morning briefing:', result);
  }
}
```

### Exemple 2: Rechercher des Templates

```typescript
import { searchTemplates, getTemplatesByCategory } from './utils';

// Recherche
const found = searchTemplates('meeting');
console.log('Templates trouvés:', found);

// Par catégorie
const productivity = getTemplatesByCategory('Productivity');
productivity.forEach(template => {
  console.log(`- ${template.name}: ${template.description}`);
});
```

## 🎯 React Hooks

### Exemple 1: useAnalytics

```typescript
import { useAnalytics } from '../hooks/useUtilities';

function DataVisualization() {
  const { metrics, trackExecution } = useAnalytics('DataVisualization');

  const handleProcess = async () => {
    await trackExecution(async () => {
      // Processing logic
      return processData();
    });
  };

  return (
    <div>
      {metrics && (
        <p>Avg time: {metrics.averageExecutionTime}ms</p>
      )}
      <button onClick={handleProcess}>Process</button>
    </div>
  );
}
```

### Exemple 2: useModelCache

```typescript
import { useModelCache } from '../hooks/useUtilities';

function ModelLoader() {
  const { cached, loading, getOrFetch } = useModelCache('face-detector');

  useEffect(() => {
    getOrFetch(async () => {
      const response = await fetch('/models/face-detector.bin');
      return response.arrayBuffer();
    });
  }, []);

  if (loading) return <Spinner />;
  if (cached) return <ModelReady model={cached} />;
  return <Error />;
}
```

### Exemple 3: useSyncStatus

```typescript
import { useSyncStatus } from '../hooks/useUtilities';

function SyncIndicator() {
  const { online, pending, syncing, sync } = useSyncStatus();

  return (
    <div>
      <StatusBadge online={online} />
      {pending > 0 && (
        <span>{pending} opérations en attente</span>
      )}
      {syncing && <Spinner />}
      <button onClick={sync}>Sync Now</button>
    </div>
  );
}
```

## 📊 Dashboard de Monitoring

### Exemple: Afficher le Dashboard

```typescript
import MonitoringDashboard from './components/MonitoringDashboard';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div>
      <button onClick={() => setShowDashboard(!showDashboard)}>
        Toggle Dashboard
      </button>

      {showDashboard && (
        <MonitoringDashboard
          refreshInterval={2000}
          compact={false}
        />
      )}
    </div>
  );
}
```

## 🧪 Tests avec Helpers

### Exemple: Utiliser les Test Helpers

```typescript
import { describe, it, expect } from 'vitest';
import {
  createFlakeyMock,
  wait,
  mockLocalStorage,
  mockFetch,
} from '../utils/__tests__/testHelpers';

describe('MyService', () => {
  it('should retry on failure', async () => {
    const mockFn = createFlakeyMock('success', 2);

    const result = await retryWithBackoff(mockFn, { maxAttempts: 5 });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
  });

  it('should work with localStorage', () => {
    const storage = mockLocalStorage();

    storage.setItem('key', 'value');
    expect(storage.getItem('key')).toBe('value');
  });

  it('should handle fetch', async () => {
    const { fetch, addResponse } = mockFetch();

    addResponse('/api/test', { data: 'success' });

    const response = await fetch('/api/test');
    const data = await response.json();

    expect(data.data).toBe('success');
  });
});
```

## 🚀 Setup Rapide pour Production

```typescript
import { setupProductionEnvironment } from './utils';

// Au démarrage de l'app
setupProductionEnvironment();

// Configure automatiquement:
// - Log level à INFO
// - Persistence activée
// - Performance monitoring
// - Offline sync
```

## 💡 Patterns Avancés

### Exemple: Combiner Retry + Circuit Breaker + Analytics

```typescript
import {
  retryWithBackoff,
  CircuitBreaker,
  analytics,
  RetryPredicates
} from './utils';

class ResilientAPIClient {
  private breaker: CircuitBreaker<[string], any>;

  constructor() {
    this.breaker = new CircuitBreaker(
      async (url: string) => {
        return retryWithBackoff(
          async () => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
          },
          {
            maxAttempts: 3,
            shouldRetry: RetryPredicates.networkErrors,
          }
        );
      },
      {
        failureThreshold: 5,
        resetTimeout: 30000,
      }
    );
  }

  async get(url: string) {
    return analytics.trackExecution('APIClient', async () => {
      const result = await this.breaker.execute(url);
      if (result.success) {
        return result.data;
      }
      throw result.error;
    });
  }
}

const client = new ResilientAPIClient();
const data = await client.get('/api/weather');
```

---

Pour plus d'exemples, consultez les tests unitaires dans `src/utils/__tests__/`.
