# 📊 Audit du Démarrage de l'Application - Instructions

**Date**: 5 Novembre 2025, 23:42  
**Objectif**: Diagnostiquer et corriger les problèmes de démarrage avec un système de logs complet

## ✅ Système de Logs Installé

### Instrumentation Complète

Le système de logs a été installé dans les composants critiques:

1. **`src/main.tsx`** - Point d'entrée de l'application
   - Logs de démarrage React
   - Logs Service Worker
   - Timer global d'initialisation
   - Résumé automatique après 3 secondes

2. **`src/App.tsx`** - Composant principal
   - Logs de montage du composant
   - Timer d'initialisation du composant

3. **`src/components/LisaCanvas.tsx`** - Canvas et Workers
   - Logs d'initialisation du worker
   - Logs de transfert OffscreenCanvas
   - Logs de vision sense
   - Logs de resize

4. **`src/workers/drawWorker.ts`** - Worker de dessin
   - Gestion du resize via postMessage

## 🚀 Comment Utiliser

### 1. Démarrer l'Application

```bash
npm run dev
```

### 2. Ouvrir la Console du Navigateur

Appuyez sur **F12** pour ouvrir les DevTools

### 3. Observer les Logs

Les logs apparaissent automatiquement avec:
- **Couleurs** par niveau (info=bleu, warn=orange, error=rouge)
- **Timestamps** relatifs (+XXXms depuis le démarrage)
- **Catégories** (startup, component, worker, performance)
- **Composants** identifiés

### 4. Résumé Automatique

Après **3 secondes**, un résumé complet s'affiche automatiquement:
```
📊 Startup Logs Summary
⏱️  Total startup time: XXXXms
📝 Total logs: XX
❌ Errors: X
⚠️  Warnings: X
```

### 5. Commandes Console Disponibles

```javascript
// Afficher le résumé à tout moment
printStartupSummary()

// Exporter les logs en JSON
exportStartupLogs()

// Nettoyer les logs
startupLogger.clear()

// Accéder au logger directement
startupLogger.getLogs()
startupLogger.getLogsByCategory('component')
startupLogger.getLogsByLevel('error')
```

## 📋 Checklist d'Audit

### Phase 1: Collecter les Logs

- [ ] Démarrer l'application en navigation privée (cache vide)
- [ ] Attendre 3 secondes pour le résumé automatique
- [ ] Noter le temps de démarrage total
- [ ] Noter le nombre d'erreurs et warnings
- [ ] Exporter les logs: `exportStartupLogs()`

### Phase 2: Analyser les Problèmes

- [ ] Identifier les erreurs critiques (rouge)
- [ ] Identifier les warnings (orange)
- [ ] Vérifier les temps de performance (>1000ms = problème)
- [ ] Vérifier l'ordre d'initialisation des composants
- [ ] Vérifier les boucles infinies (logs répétitifs)

### Phase 3: Catégories à Vérifier

#### Startup
- [ ] Application initialization
- [ ] React render
- [ ] Service Worker registration
- [ ] Window load event

#### Component
- [ ] App mounting
- [ ] LisaCanvas mounting
- [ ] Canvas worker initialization
- [ ] Vision sense initialization

#### Worker
- [ ] DrawWorker creation
- [ ] OffscreenCanvas transfer
- [ ] Worker messages

#### Performance
- [ ] app-init duration
- [ ] react-render duration
- [ ] canvas-worker-init duration
- [ ] vision-sense-start duration

### Phase 4: Problèmes Connus à Vérifier

#### 1. Canvas Transfer
```
❌ Error: Cannot transfer control from a canvas for more than one time
```
**Solution appliquée**: Protection avec `isTransferredRef`

#### 2. Canvas Resize
```
❌ Error: Cannot resize canvas after call to transferControlToOffscreen()
```
**Solution appliquée**: Envoi dimensions via postMessage au worker

#### 3. Boucle Infinie Percepts
```
❌ Error: Maximum update depth exceeded
```
**Solution appliquée**: Limitation à 10 percepts max + useCallback

#### 4. Service Worker
```
⚠️  Warning: Service Worker not supported
```
**Normal en HTTP** - Nécessite HTTPS en production

## 🔍 Analyse des Logs

### Logs Normaux (Attendus)

```
[startup] +0ms Application initialization started
[startup] +5ms React version { version: '19.1.0' }
[startup] +10ms Creating React root
[startup] +50ms React app rendered successfully
[component/App] +60ms Component mounting
[component/LisaCanvas] +80ms Component mounting { hasVideo: false }
[component/LisaCanvas] +85ms Transferring canvas to OffscreenCanvas
[performance] +120ms canvas-worker-init completed { duration: '35ms' }
[component/LisaCanvas] +125ms Worker initialized successfully
[startup] +200ms Window loaded event fired
[startup] +250ms Registering Service Worker
[performance] +300ms service-worker-registration completed { duration: '50ms' }
[performance] +3000ms app-init completed { duration: '3000ms' }
```

### Logs Problématiques

```
❌ [component/LisaCanvas] Failed to initialize canvas worker
   Error: Cannot transfer control from a canvas for more than one time

⚠️  [component/LisaCanvas] Canvas already transferred (Strict Mode protection)
   → Normal en dev avec React Strict Mode

❌ [startup] Service Worker registration failed
   Error: SecurityError: Failed to register a ServiceWorker
   → Normal en HTTP, nécessite HTTPS

⚠️  [component/LisaCanvas] Timer "vision-sense-start" not found
   → Possible si vision sense désactivé
```

## 📊 Métriques de Performance Cibles

| Métrique | Cible | Acceptable | Problématique |
|----------|-------|------------|---------------|
| **app-init** | <2000ms | 2000-3000ms | >3000ms |
| **react-render** | <100ms | 100-200ms | >200ms |
| **canvas-worker-init** | <50ms | 50-100ms | >100ms |
| **service-worker-registration** | <100ms | 100-200ms | >200ms |
| **Total startup** | <3000ms | 3000-5000ms | >5000ms |

## 🛠️ Actions Correctives

### Si Erreurs Canvas

1. Vérifier que `isTransferredRef` fonctionne
2. Vérifier qu'il n'y a pas de double montage
3. Vérifier les logs: "Canvas already transferred"

### Si Boucle Infinie

1. Vérifier les logs répétitifs
2. Vérifier `MAX_PERCEPTS = 10`
3. Vérifier `useCallback` sur `handleVisionPercept`

### Si Performance Lente

1. Identifier le composant lent dans les logs
2. Vérifier les timers de performance
3. Optimiser le composant identifié

### Si Service Worker Échoue

1. Vérifier HTTPS (nécessaire en production)
2. Vérifier `/service-worker.js` existe
3. Acceptable en dev (HTTP)

## 📝 Template de Rapport

```markdown
# Audit Démarrage - [DATE]

## Résumé
- **Temps total**: XXXXms
- **Erreurs**: X
- **Warnings**: X
- **Status**: ✅ OK / ⚠️ Acceptable / ❌ Problématique

## Métriques
- app-init: XXXms
- react-render: XXms
- canvas-worker-init: XXms
- service-worker-registration: XXms

## Erreurs Identifiées
1. [Erreur 1]
   - Composant: XXX
   - Message: XXX
   - Solution: XXX

## Warnings Identifiés
1. [Warning 1]
   - Composant: XXX
   - Message: XXX
   - Impact: XXX

## Recommandations
1. [Recommandation 1]
2. [Recommandation 2]

## Logs Complets
```json
[Coller le résultat de exportStartupLogs()]
```
```

## 🎯 Prochaines Étapes

1. **Collecter les logs** - Démarrer l'app et exporter les logs
2. **Analyser** - Identifier les problèmes dans les logs
3. **Corriger** - Appliquer les solutions nécessaires
4. **Vérifier** - Redémarrer et confirmer les corrections
5. **Documenter** - Générer le rapport d'audit final

## 💡 Conseils

- **Navigation privée** recommandée pour éviter le cache
- **Console ouverte** dès le démarrage pour tout capturer
- **Attendre 3 secondes** pour le résumé automatique
- **Exporter immédiatement** les logs après le démarrage
- **Comparer** avec les métriques cibles ci-dessus

---

**Système de logs créé par**: Cascade AI  
**Date**: 5 Novembre 2025  
**Version**: 1.0
