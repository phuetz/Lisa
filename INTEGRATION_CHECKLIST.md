# 🔗 Intégration Checklist - Lisa Vivante

**Objectif**: Intégrer tous les composants de Phase 1 dans l'application principale.

---

## 📋 Étapes d'Intégration

### 1. Initialisation au Démarrage

**Fichier**: `src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initLisaVivante } from './manifesto/initLisaVivante';

// Initialiser Lisa Vivante avant de monter l'app
async function bootstrap() {
  try {
    console.log('🌟 Initialisation de Lisa Vivante...');
    
    const state = await initLisaVivante({
      enableSensors: true,
      enableAudit: true,
      enableMemory: true,
      debugMode: process.env.NODE_ENV === 'development',
      autoValidate: true,
      validationInterval: 30000
    });
    
    console.log('✨ Lisa Vivante initialisée:', state);
    
    // Monter l'app
    const root = ReactDOM.createRoot(document.getElementById('root')!);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    // Afficher un message d'erreur à l'utilisateur
    document.body.innerHTML = '<h1>Erreur d\'initialisation de Lisa</h1>';
  }
}

bootstrap();
```

### 2. Intégrer dans App.tsx

**Fichier**: `src/App.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { IncarnationDashboard } from './components/IncarnationDashboard';
import { SensorStatus } from './components/SensorStatus';
import { SensorPermissionsPanel } from './components/SensorPermissionsPanel';
import { PrivacyCenter } from './components/PrivacyCenter';
import { MemoryMap } from './components/MemoryMap';
import { ChatInterface } from './components/ChatInterface';
import { validateLisaIsAlive } from './manifesto/validation';
import { auditActions } from './services/AuditService';

export default function App() {
  const [showPermissions, setShowPermissions] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [manifestoStatus, setManifestoStatus] = useState(null);

  useEffect(() => {
    // Vérifier le statut du manifeste au démarrage
    validateLisaIsAlive().then(setManifestoStatus);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Lisa</h1>
            <SensorStatus compact onClick={() => setShowPermissions(true)} />
          </div>

          <nav className="flex gap-2">
            <button
              onClick={() => setShowPermissions(!showPermissions)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              🔐 Permissions
            </button>
            <button
              onClick={() => setShowPrivacy(!showPrivacy)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              🔒 Confidentialité
            </button>
            <button
              onClick={() => setShowMemory(!showMemory)}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              🧠 Mémoire
            </button>
          </nav>
        </div>
      </header>

      {/* Dashboard d'Incarnation */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <IncarnationDashboard refreshInterval={5000} />

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Permissions */}
          {showPermissions && (
            <div className="lg:col-span-1">
              <SensorPermissionsPanel
                onEmergencyCutoff={() => {
                  auditActions.securityEvent('Emergency cutoff activated', {});
                  window.location.reload();
                }}
              />
            </div>
          )}

          {/* Chat Principal */}
          <div className={showPermissions || showPrivacy || showMemory ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <ChatInterface />
          </div>

          {/* Confidentialité */}
          {showPrivacy && (
            <div className="lg:col-span-1">
              <PrivacyCenter
                onForget={async (scope) => {
                  auditActions.dataDeleted(scope, 0);
                  console.log(`Oubli: ${scope}`);
                }}
              />
            </div>
          )}

          {/* Mémoire */}
          {showMemory && (
            <div className="lg:col-span-1">
              <MemoryMap />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

### 3. Ajouter les Notifications Globales

**Fichier**: `src/App.tsx` ou `src/components/NotificationProvider.tsx`

```typescript
import React, { useState, useCallback } from 'react';

export interface Notification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  duration?: number;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Notification) => {
    const id = Date.now();
    setNotifications(prev => [...prev, notification]);

    if (notification.duration !== 0) {
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, notification.duration || 3000);
    }
  }, []);

  // Exposer globalement
  useEffect(() => {
    window.lisaShowNotification = showNotification;
  }, [showNotification]);

  return (
    <>
      {children}
      {/* Afficher les notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {notifications.map((notif, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg shadow-lg text-white ${
              notif.type === 'error' ? 'bg-red-500' :
              notif.type === 'warning' ? 'bg-yellow-500' :
              notif.type === 'success' ? 'bg-green-500' :
              'bg-blue-500'
            }`}
          >
            <p className="font-bold">{notif.title}</p>
            <p className="text-sm">{notif.message}</p>
          </div>
        ))}
      </div>
    </>
  );
};
```

### 4. Ajouter les Types Globaux

**Fichier**: `src/types/global.d.ts`

```typescript
declare global {
  interface Window {
    lisaShowNotification?: (notification: {
      type: 'info' | 'warning' | 'error' | 'success';
      title: string;
      message: string;
    }) => void;
    lisaStopCamera?: () => void;
    lisaStopMicrophone?: () => void;
    lisaForget?: (scope: 'conversation' | 'document' | 'all') => Promise<void>;
    lisaExplainPerception?: () => string;
  }
}

export {};
```

---

## ✅ Checklist d'Intégration

### Étape 1: Initialisation
- [ ] Importer `initLisaVivante` dans `main.tsx`
- [ ] Appeler avant de monter l'app
- [ ] Vérifier les logs dans la console
- [ ] Vérifier localStorage pour `lisa:state`

### Étape 2: Composants
- [ ] Importer `IncarnationDashboard`
- [ ] Importer `SensorStatus`
- [ ] Importer `SensorPermissionsPanel`
- [ ] Importer `PrivacyCenter`
- [ ] Importer `MemoryMap`

### Étape 3: Notifications
- [ ] Créer `NotificationProvider`
- [ ] Wrapper l'app avec le provider
- [ ] Tester les notifications

### Étape 4: Types Globaux
- [ ] Créer `src/types/global.d.ts`
- [ ] Ajouter les interfaces Window
- [ ] Vérifier TypeScript compile

### Étape 5: Tests
- [ ] [ ] Ouvrir l'app
- [ ] [ ] Vérifier le dashboard
- [ ] [ ] Tester les permissions
- [ ] [ ] Tester la confidentialité
- [ ] [ ] Tester la mémoire
- [ ] [ ] Vérifier l'audit log

---

## 🧪 Tests à Exécuter

### Test 1: Initialisation
```bash
npm run dev
# Vérifier dans la console:
# 🌟 Initialisation de Lisa Vivante...
# ✨ Lisa Vivante initialisée: { initialized: true, ... }
```

### Test 2: Dashboard
```
- Vérifier que les 5 piliers s'affichent
- Vérifier que la progression se met à jour
- Vérifier que le statut "Vivante" s'affiche
```

### Test 3: Permissions
```
- Cliquer sur "🔐 Permissions"
- Activer la caméra
- Vérifier que le statut change
- Vérifier l'audit log dans localStorage
```

### Test 4: Confidentialité
```
- Cliquer sur "🔒 Confidentialité"
- Vérifier le stockage utilisé
- Cliquer sur "Supprimer les Conversations"
- Vérifier la confirmation
- Vérifier la suppression dans localStorage
```

### Test 5: Mémoire
```
- Cliquer sur "🧠 Mémoire"
- Vérifier que la carte mémoire s'affiche
- Vérifier les statistiques
- Tester les filtres
```

---

## 🚀 Commandes Utiles

```bash
# Démarrer l'app
npm run dev

# Build production
npm run build

# Tests
npm run test

# Lint
npm run lint

# Type check
npm run type-check

# Vérifier Lisa dans la console
localStorage.getItem('lisa:state')
localStorage.getItem('lisa:sensor:permissions')
localStorage.getItem('lisa:audit:logs')
```

---

## 📊 Vérification Post-Intégration

### Checklist
- [ ] App démarre sans erreur
- [ ] Dashboard s'affiche
- [ ] Permissions fonctionnent
- [ ] Confidentialité fonctionne
- [ ] Mémoire s'affiche
- [ ] Audit log se remplit
- [ ] Notifications s'affichent
- [ ] localStorage a les clés `lisa:*`

### Console
```javascript
// Vérifier l'état
await validateLisaIsAlive()

// Vérifier l'audit
auditService.getStats()

// Vérifier les permissions
JSON.parse(localStorage.getItem('lisa:sensor:permissions'))

// Vérifier les logs
auditService.getLogs().slice(-5)
```

---

## 🎯 Prochaines Étapes

1. **Semaine 4**: A11y Baseline
   - Keyboard navigation
   - ARIA labels
   - Tests a11y

2. **Phase 2**: Agentivité
   - CriticAgent
   - Memory Service
   - RAG

3. **Phase 3**: Autonomie
   - Workflows
   - Intégrations
   - Dashboards

---

## 💡 Notes

- Tous les composants utilisent `localStorage` pour la persistance
- L'audit log est limité à 1000 entrées (FIFO)
- La validation du manifeste s'exécute toutes les 30 secondes
- Les notifications sont globales via `window.lisaShowNotification`
- Les types globaux doivent être déclarés dans `src/types/global.d.ts`

---

**Une fois intégré, Lisa Vivante sera complètement opérationnelle pour Phase 1!**

✨ *"Vivante, ou rien."*
