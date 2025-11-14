# Migration Guide

This guide helps you upgrade from previous versions of Lisa to the latest version with all improvements.

## Table of Contents

- [Quick Migration](#quick-migration)
- [From v3.0.0 to v3.3.0](#from-v300-to-v330)
- [Breaking Changes](#breaking-changes)
- [Step-by-Step Migration](#step-by-step-migration)
- [Testing Your Migration](#testing-your-migration)
- [Rollback Instructions](#rollback-instructions)

## Quick Migration

For most users, migration is automatic:

```typescript
import { autoMigrate } from './utils/migration';

// Add to your app initialization
async function initApp() {
  await autoMigrate(); // Handles all migrations automatically
  // Rest of your app initialization...
}
```

## From v3.0.0 to v3.3.0

### Overview of Changes

This upgrade adds 22 major improvements across:
- Performance & Optimization (4 features)
- Reliability & Fault Tolerance (3 features)
- Monitoring & Analytics (3 features)
- Security (1 feature)
- Offline & Sync (1 feature)
- Developer Experience (10 features)

### Automatic Migration

The migration system will automatically:
1. ✅ Migrate old logs to structured format
2. ✅ Initialize analytics system
3. ✅ Set up feature flags
4. ✅ Configure IndexedDB cache
5. ✅ Initialize offline sync

### Manual Steps Required

#### 1. Update Your Imports

**Before (v3.0.0):**
```typescript
import { logEvent } from './utils/logger';
import { retryWithBackoff } from './utils/retry';
import { CircuitBreaker } from './utils/circuitBreaker';
```

**After (v3.3.0):**
```typescript
// Option 1: Use central export
import { logEvent, retryWithBackoff, CircuitBreaker } from './utils';

// Option 2: Use convenience bundles
import { reliabilityBundle, loggingBundle } from './utils';
const { retry, CircuitBreaker } = reliabilityBundle;
const { logEvent } = loggingBundle;
```

#### 2. Wrap Your App with Error Boundary

**Add to your root component:**
```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      enableRetry={true}
      maxRetries={3}
      resetTimeout={5000}
    >
      <YourApp />
    </ErrorBoundary>
  );
}
```

#### 3. Initialize Feature Flags (Optional)

```typescript
import { featureFlags } from './utils';

// In your app initialization
function initApp() {
  // Enable features you want
  featureFlags.enable('analytics');
  featureFlags.enable('performance-profiling');
  featureFlags.enable('monitoring-dashboard');

  // Or use categories
  // featureFlags.enableExperimental();
}
```

#### 4. Add Monitoring Dashboard (Optional)

```tsx
import MonitoringDashboard from './components/MonitoringDashboard';
import { useFeatureFlag } from './utils';

function DeveloperTools() {
  const showDashboard = useFeatureFlag('monitoring-dashboard');

  if (!showDashboard) return null;

  return <MonitoringDashboard refreshInterval={2000} />;
}
```

## Breaking Changes

### ⚠️ Breaking Changes in v3.3.0

None! All changes are backward compatible.

### ⚠️ Breaking Changes in v3.2.0

None! All changes are additive.

### ⚠️ Breaking Changes in v3.1.0

#### Logger API Enhanced (Non-breaking)

The old logger API still works, but new structured logging is recommended:

**Old API (still works):**
```typescript
import { logEvent } from './utils/logger';
logEvent('info', {}, 'Message');
```

**New API (recommended):**
```typescript
import { logInfo, logError, logWarn } from './utils/logger';
logInfo('Message', 'Context', { data });
logError('Error occurred', 'Context', error);
```

## Step-by-Step Migration

### Step 1: Backup Your Data

```bash
# Backup localStorage data
# Open browser console and run:
const backup = {
  logs: localStorage.getItem('lisa_logs'),
  analytics: localStorage.getItem('lisa_agent_analytics'),
  cache: localStorage.getItem('lisa_cache'),
};
console.log(JSON.stringify(backup));
# Save this output
```

### Step 2: Update Dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Run Automatic Migration

Add to your app's entry point (`src/main.tsx` or similar):

```typescript
import { autoMigrate } from './utils/migration';
import { setupProductionEnvironment } from './utils';

async function bootstrap() {
  try {
    // Run migrations
    await autoMigrate();

    // Setup environment
    setupProductionEnvironment();

    // Start your app
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <App />
    );
  } catch (error) {
    console.error('Bootstrap failed:', error);
  }
}

bootstrap();
```

### Step 4: Update Service Worker

The Service Worker is automatically updated. Users will see a notification:

```typescript
// The app handles this automatically, but you can customize:
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'SW_UPDATE_AVAILABLE') {
      // Show custom UI
      showUpdateNotification();
    }
  });
}
```

### Step 5: Migrate API Calls

Replace manual retry logic with utilities:

**Before:**
```typescript
async function fetchData() {
  let attempts = 0;
  while (attempts < 3) {
    try {
      return await fetch('/api/data');
    } catch (error) {
      attempts++;
      await new Promise(r => setTimeout(r, 1000 * attempts));
    }
  }
  throw new Error('Max retries exceeded');
}
```

**After:**
```typescript
import { retryWithBackoff, RetryPredicates } from './utils';

async function fetchData() {
  const result = await retryWithBackoff(
    () => fetch('/api/data'),
    {
      maxAttempts: 3,
      shouldRetry: RetryPredicates.networkErrors,
    }
  );

  if (result.success) {
    return result.data;
  }
  throw result.error;
}
```

### Step 6: Add Circuit Breakers to Critical Services

```typescript
import { CircuitBreaker } from './utils';

class APIClient {
  private breaker = new CircuitBreaker(
    async (endpoint: string) => fetch(endpoint),
    {
      failureThreshold: 5,
      resetTimeout: 60000,
    }
  );

  async get(endpoint: string) {
    return this.breaker.execute(endpoint);
  }
}
```

### Step 7: Implement Input Validation

```typescript
import { validator, sanitizeInput } from './utils';

function handleUserInput(data: any) {
  const emailValidator = validator<string>()
    .required()
    .email();

  const result = emailValidator.validate(data.email);

  if (!result.valid) {
    throw new Error(result.errors.join(', '));
  }

  const clean = sanitizeInput(data.message);
  // Process clean data...
}
```

### Step 8: Enable Analytics

```typescript
import { analytics } from './utils';

class MyAgent {
  async execute(input: any) {
    return analytics.trackExecution('MyAgent', async () => {
      // Your agent logic
      return processInput(input);
    });
  }
}
```

### Step 9: Set Up Offline Sync

```typescript
import { syncManager } from './utils';

async function saveData(data: any) {
  // Optimistic update
  updateUI(data);

  // Queue for sync
  await syncManager.enqueue({
    type: 'create',
    resource: 'items',
    data,
    priority: 1,
  });
}
```

### Step 10: Test Everything

See [Testing Your Migration](#testing-your-migration) below.

## Testing Your Migration

### 1. Check Migration Status

```typescript
import { migrationManager } from './utils/migration';

console.log('Current version:', migrationManager.getState().currentVersion);
console.log('Completed migrations:', migrationManager.getState().migrations);
console.log('Needs migration:', migrationManager.needsMigration());
```

### 2. Test Feature Flags

```typescript
import { featureFlags } from './utils';

console.log('Enabled flags:', featureFlags.getEnabledFlags());
console.log('All flags:', featureFlags.getAllFlags());
```

### 3. Test Analytics

```typescript
import { analytics } from './utils';

// Generate some test data
await analytics.trackExecution('TestAgent', async () => {
  await new Promise(r => setTimeout(r, 100));
  return 'success';
});

// Check metrics
const metrics = analytics.getMetrics('TestAgent');
console.log('Test metrics:', metrics);
```

### 4. Test Offline Sync

```typescript
import { syncManager } from './utils';

// Queue a test operation
await syncManager.enqueue({
  type: 'create',
  resource: 'test',
  data: { test: true },
  priority: 1,
});

// Check queue
const status = syncManager.getQueueStatus();
console.log('Queue status:', status);
```

### 5. Test Service Worker

```typescript
if ('serviceWorker' in navigator) {
  const registration = await navigator.serviceWorker.ready;
  console.log('Service Worker version:', registration.active?.scriptURL);

  // Test cache
  registration.active?.postMessage({
    type: 'CACHE_URLS',
    urls: ['/test.html'],
  });
}
```

### 6. Run Unit Tests

```bash
npm test
# or
yarn test
```

Expected output: All tests should pass.

### 7. Check Browser Console

Open DevTools and check for:
- ✅ No migration errors
- ✅ Service Worker installed correctly
- ✅ Feature flags initialized
- ✅ Analytics recording events

## Rollback Instructions

If you encounter issues, you can rollback:

### Option 1: Rollback Migrations

```typescript
import { migrationManager } from './utils/migration';

// Rollback to specific version
await migrationManager.rollback('3.0.0');
```

### Option 2: Reset Everything

```typescript
import { migrationManager, analytics, featureFlags } from './utils';

// Clear all data
migrationManager.reset();
analytics.clear();
featureFlags.reset();

// Clear caches
localStorage.clear();
indexedDB.deleteDatabase('LisaModelCache');
indexedDB.deleteDatabase('LisaOfflineDB');
```

### Option 3: Git Rollback

```bash
# Rollback code changes
git checkout v3.0.0

# Reinstall dependencies
npm install

# Clear browser data manually
# Then refresh the app
```

## Common Migration Issues

### Issue: Service Worker not updating

**Solution:**
```typescript
// Force update
if ('serviceWorker' in navigator) {
  const registration = await navigator.serviceWorker.ready;
  await registration.update();

  // Or skip waiting
  registration.active?.postMessage({ type: 'SKIP_WAITING' });
}
```

### Issue: LocalStorage quota exceeded

**Solution:**
```typescript
// Clear old caches
const oldKeys = Object.keys(localStorage)
  .filter(key => key.startsWith('lisa_old_'));

oldKeys.forEach(key => localStorage.removeItem(key));
```

### Issue: IndexedDB not available

**Solution:**
```typescript
import { featureFlags } from './utils';

// Disable model cache if IndexedDB unavailable
if (!window.indexedDB) {
  featureFlags.disable('model-cache');
}
```

### Issue: Migration fails midway

**Solution:**
```typescript
import { migrationManager } from './utils/migration';

// Check which migration failed
const state = migrationManager.getState();
console.log('Last completed:', state.lastMigration);

// Manually run specific migration
const migration = migrationManager.getAllMigrations()
  .find(m => m.version === '3.1.0');

if (migration) {
  await migration.up();
}
```

## Performance Checklist

After migration, verify performance improvements:

- [ ] Bundle size reduced (check Network tab)
- [ ] Models loading from cache (check IndexedDB in DevTools)
- [ ] Lazy loading working (check Network tab, code splitting)
- [ ] Analytics tracking (check localStorage)
- [ ] Offline sync working (go offline and test)
- [ ] Error recovery working (force an error and check recovery)

## Feature Adoption Checklist

Enable features progressively:

### Week 1: Core Features
- [ ] Enable structured logging
- [ ] Enable analytics tracking
- [ ] Enable retry logic
- [ ] Add error boundaries

### Week 2: Reliability Features
- [ ] Enable circuit breakers
- [ ] Enable rate limiting
- [ ] Enable offline sync

### Week 3: Performance Features
- [ ] Enable model cache
- [ ] Enable lazy loading
- [ ] Enable performance profiling

### Week 4: Advanced Features
- [ ] Enable monitoring dashboard
- [ ] Enable feature flags for A/B testing
- [ ] Enable experimental features (optional)

## Support

If you encounter issues:

1. Check the [EXAMPLES.md](./EXAMPLES.md) for usage examples
2. Review [IMPROVEMENTS.md](./IMPROVEMENTS.md) for technical details
3. Check browser console for error messages
4. Open an issue on GitHub with:
   - Current version
   - Migration state
   - Error logs
   - Browser and OS info

## Success Criteria

Migration is complete when:

1. ✅ `migrationManager.needsMigration()` returns `false`
2. ✅ All unit tests pass
3. ✅ No errors in browser console
4. ✅ Feature flags are initialized
5. ✅ Analytics is tracking
6. ✅ Service Worker is active (v3)
7. ✅ App functions normally

---

**Next Steps:** See [EXAMPLES.md](./EXAMPLES.md) for usage examples of all new features.
