# ⚡ Quick Commands - Lisa Vivante

**Commandes rapides pour développer et tester Lisa Vivante.**

---

## 🚀 Démarrage

```bash
# Installer les dépendances
npm install

# Démarrer l'app en développement
npm run dev

# Build production
npm run build

# Lancer les tests
npm run test

# Lint et type check
npm run lint
npm run type-check
```

---

## 🧪 Tests dans la Console

### Vérifier l'Initialisation
```javascript
// Vérifier que Lisa est initialisée
localStorage.getItem('lisa:state')

// Vérifier le session ID
JSON.parse(localStorage.getItem('lisa:state')).sessionId

// Vérifier le statut
await validateLisaIsAlive()
```

### Vérifier les Permissions
```javascript
// Afficher les permissions
JSON.parse(localStorage.getItem('lisa:sensor:permissions'))

// Afficher l'audit log des capteurs
JSON.parse(localStorage.getItem('lisa:sensor:audit'))
```

### Vérifier l'Audit
```javascript
// Importer le service
import { auditService } from './services/AuditService'

// Afficher les stats
auditService.getStats()

// Afficher les logs récents
auditService.getRecentLogs(10)

// Exporter l'audit
auditService.downloadLogs()
```

### Vérifier la Mémoire
```javascript
// Afficher la mémoire
JSON.parse(localStorage.getItem('lisa:memory:index'))

// Afficher les souvenirs
Object.keys(localStorage)
  .filter(k => k.startsWith('lisa:memory:'))
  .map(k => JSON.parse(localStorage.getItem(k)))
```

### Vérifier le Tone Guide
```javascript
// Importer le tone guide
import { detectEmotion, formatResponse, validateTone } from './prompts/toneGuide'

// Tester la détection d'émotion
detectEmotion("Je suis très frustré!")  // 'frustration'
detectEmotion("Je suis heureux!")       // 'happiness'

// Tester la validation du ton
validateTone("Erreur 404")              // { valid: false, issues: [...] }
validateTone("Je suis là pour t'aider") // { valid: true, issues: [] }
```

---

## 🎯 Actions d'Audit

```javascript
import { auditActions } from './services/AuditService'

// Capteurs
auditActions.sensorActivated('camera')
auditActions.sensorDeactivated('microphone')
auditActions.sensorPermissionGranted('geolocation')
auditActions.sensorPermissionDenied('camera')

// Tools
auditActions.toolExecuted('generateImage', { prompt: 'test' })
auditActions.toolBlocked('deleteFile', 'Permission denied')
auditActions.toolFailed('generateImage', 'API error')

// Mémoire
auditActions.memoryCreated('conversation', 'User asked about weather')
auditActions.memoryDeleted('conversation', 5)

// Confidentialité
auditActions.dataExported('conversations', 1024)
auditActions.dataDeleted('documents', 3)

// Sécurité
auditActions.securityEvent('Suspicious activity detected', { ip: '192.168.1.1' })
auditActions.securityBreach('Unauthorized access attempt', { user: 'unknown' })

// Erreurs
auditActions.errorOccurred('Database connection failed', { error: 'ECONNREFUSED' })
```

---

## 🔍 Validation du Manifeste

```javascript
import { validateLisaIsAlive, initManifestoValidation } from './manifesto/validation'

// Vérifier si Lisa est vivante
const status = await validateLisaIsAlive()
console.log(status)
// {
//   perceives: true,
//   reasons: true,
//   remembers: true,
//   acts: true,
//   soothes: true,
//   isAlive: true
// }

// Initialiser la validation
await initManifestoValidation()
```

---

## 🧠 Initialisation de Lisa

```javascript
import { initLisaVivante, getLisaState, getLisaStats } from './manifesto/initLisaVivante'

// Initialiser avec config personnalisée
const state = await initLisaVivante({
  enableSensors: true,
  enableAudit: true,
  enableMemory: true,
  debugMode: true,
  autoValidate: true,
  validationInterval: 30000
})

// Obtenir l'état
const currentState = getLisaState()

// Obtenir les stats
const stats = getLisaStats()
console.log(stats)
// {
//   initialized: true,
//   sessionId: 'session_...',
//   uptime: 123456,
//   uptimeFormatted: '2m 3s',
//   startTime: Date,
//   audit: { totalLogs: 42, ... },
//   config: { ... }
// }
```

---

## 🎨 Composants

### SensorStatus
```typescript
import { SensorStatus } from './components/SensorStatus'

// Compact
<SensorStatus compact onClick={() => console.log('clicked')} />

// Détaillé
<SensorStatus />
```

### SensorPermissionsPanel
```typescript
import { SensorPermissionsPanel } from './components/SensorPermissionsPanel'

<SensorPermissionsPanel 
  onPermissionsChange={(perms) => console.log(perms)}
  onEmergencyCutoff={() => window.location.reload()}
/>
```

### PrivacyCenter
```typescript
import { PrivacyCenter } from './components/PrivacyCenter'

<PrivacyCenter 
  onForget={async (scope) => {
    console.log(`Forget: ${scope}`)
  }}
/>
```

### MemoryMap
```typescript
import { MemoryMap } from './components/MemoryMap'

<MemoryMap 
  onMemoryClick={(memory) => console.log(memory)}
/>
```

### IncarnationDashboard
```typescript
import { IncarnationDashboard } from './components/IncarnationDashboard'

<IncarnationDashboard refreshInterval={5000} />
```

---

## 📊 Données localStorage

### Clés Principales
```javascript
// État de Lisa
lisa:state

// Permissions des capteurs
lisa:sensor:permissions

// Audit log des capteurs
lisa:sensor:audit

// Logs d'audit complets
lisa:audit:logs

// Tone guide
lisa:tone:guide

// Mémoire
lisa:memory:index
lisa:memory:embeddings
lisa:memory:*

// Statut du manifeste
lisa:manifesto:status

// Dernier statut
lisa:status  // 'alive' ou 'degraded'
```

### Nettoyer localStorage
```javascript
// Supprimer toutes les données Lisa
Object.keys(localStorage)
  .filter(k => k.startsWith('lisa:'))
  .forEach(k => localStorage.removeItem(k))

// Supprimer une clé spécifique
localStorage.removeItem('lisa:audit:logs')
```

---

## 🐛 Debugging

### Logs de Développement
```javascript
// Activer le mode debug
localStorage.setItem('lisa:debug', 'true')

// Voir tous les logs d'audit
auditService.getLogs().forEach(log => console.log(log))

// Voir les logs par catégorie
auditService.getLogsByCategory('sensor')
auditService.getLogsByCategory('tool')
auditService.getLogsByCategory('security')

// Voir les logs par sévérité
auditService.getLogsBySeverity('error')
auditService.getLogsBySeverity('critical')
```

### Vérifier les Erreurs
```javascript
// Voir les erreurs dans l'audit
auditService.getLogsBySeverity('error')

// Voir les événements critiques
auditService.getLogsBySeverity('critical')

// Exporter pour analyse
const logs = auditService.exportLogs()
console.log(logs)
```

---

## 🧪 Tests E2E (Playwright)

```bash
# Lancer les tests E2E
npx playwright test

# Lancer un test spécifique
npx playwright test tests/e2e/phase1.spec.ts

# Mode debug
npx playwright test --debug

# Voir le rapport
npx playwright show-report
```

### Exemple de Test
```typescript
import { test, expect } from '@playwright/test'

test('Phase 1 - Permissions', async ({ page }) => {
  await page.goto('http://localhost:5173')
  
  // Vérifier le dashboard
  await expect(page.locator('text=Lisa Vivante')).toBeVisible()
  
  // Cliquer sur permissions
  await page.click('button:has-text("🔐 Permissions")')
  
  // Vérifier le panel
  await expect(page.locator('text=Caméra')).toBeVisible()
})
```

---

## 📈 Performance

```bash
# Vérifier la taille du bundle
npm run build
# Vérifier dist/

# Analyser les imports
npm run analyze  # si configuré

# Vérifier les performances
npm run lighthouse  # si configuré
```

---

## 🔐 Sécurité

```javascript
// Vérifier les permissions
JSON.parse(localStorage.getItem('lisa:sensor:permissions'))

// Vérifier l'audit log
auditService.getLogsBySeverity('critical')

// Vérifier les événements de sécurité
auditService.getLogsByCategory('security')

// Exporter pour audit
auditService.downloadLogs()
```

---

## 📚 Documentation

```bash
# Voir la documentation
cat MANIFESTE_VIVANT_IMPLEMENTATION.md
cat LISA_VIVANTE_CHECKLIST.md
cat PHASE1_IMPLEMENTATION_GUIDE.md
cat INTEGRATION_CHECKLIST.md
cat LISA_VIVANTE_STATUS.md
```

---

## 🎯 Workflow Typique

### 1. Démarrer l'App
```bash
npm run dev
```

### 2. Ouvrir dans le Navigateur
```
http://localhost:5173
```

### 3. Ouvrir la Console (F12)
```javascript
// Vérifier l'initialisation
localStorage.getItem('lisa:state')

// Vérifier le statut
await validateLisaIsAlive()
```

### 4. Tester les Permissions
- Cliquer sur "🔐 Permissions"
- Activer la caméra
- Vérifier dans localStorage

### 5. Tester l'Audit
```javascript
auditService.getStats()
auditService.downloadLogs()
```

### 6. Tester le Tone Guide
```javascript
detectEmotion("Je suis frustré!")
validateTone("Erreur 404")
```

---

## 🚀 Raccourcis Utiles

```bash
# Alias pour démarrer
alias lisa-dev="npm run dev"
alias lisa-build="npm run build"
alias lisa-test="npm run test"

# Ouvrir dans l'éditeur
code .

# Voir les fichiers Lisa
find . -name "*lisa*" -o -name "*vivant*"
```

---

## 💡 Tips & Tricks

1. **Garder la console ouverte** pour voir les logs
2. **Utiliser les DevTools** pour inspecter localStorage
3. **Exporter régulièrement** les audit logs
4. **Tester les permissions** manuellement
5. **Vérifier les notifications** dans le coin bas-droit

---

## 🆘 Troubleshooting

### Lisa ne s'initialise pas
```javascript
// Vérifier les erreurs
localStorage.getItem('lisa:error')

// Réinitialiser
Object.keys(localStorage)
  .filter(k => k.startsWith('lisa:'))
  .forEach(k => localStorage.removeItem(k))

// Recharger
window.location.reload()
```

### Permissions ne fonctionnent pas
```javascript
// Vérifier les permissions
JSON.parse(localStorage.getItem('lisa:sensor:permissions'))

// Réinitialiser les permissions
localStorage.removeItem('lisa:sensor:permissions')
```

### Audit log vide
```javascript
// Vérifier les logs
auditService.getLogs()

// Vérifier les stats
auditService.getStats()
```

---

**Besoin d'aide? Consulte la documentation ou les fichiers créés!**

✨ *"Vivante, ou rien."*
