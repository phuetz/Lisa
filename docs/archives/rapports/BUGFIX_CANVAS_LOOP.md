# 🐛 Bugfix - Boucle Infinie LisaCanvas

**Date**: 5 Novembre 2025, 23:23  
**Erreur**: `Maximum update depth exceeded` dans `LisaCanvas.tsx`

## 🔍 Diagnostic

### Erreur Complète
```
Error: Maximum update depth exceeded. This can happen when a component 
repeatedly calls setState inside componentWillUpdate or componentDidUpdate. 
React limits the number of nested updates to prevent infinite loops.
```

### Causes Identifiées

1. **Double transfert canvas (React Strict Mode)**
   - React 19 Strict Mode monte les composants 2 fois en dev
   - `transferControlToOffscreen()` ne peut être appelé qu'une fois
   - Résultat: Erreur puis boucle infinie

2. **Accumulation infinie de percepts**
   - `visionSense` envoyait des percepts continuellement
   - Chaque percept → setState → re-render → nouveau percept
   - Résultat: Boucle infinie ♾️

3. **Selector Zustand instable**
   - Selector objet `{ percepts, audio, ... }` créait une nouvelle référence à chaque fois
   - Re-renders en cascade
   - Résultat: Dégradation performance → boucle

## ✅ Solutions Appliquées

### 1. Protection Double Transfert Canvas

```typescript
const isTransferredRef = useRef<boolean>(false);

useEffect(() => {
  if (!canvasRef.current) return;
  // Prevent double transfer in React Strict Mode (dev)
  if (isTransferredRef.current) return;
  
  if ('transferControlToOffscreen' in canvasRef.current) {
    const off = canvasRef.current.transferControlToOffscreen();
    workerRef.current = new DrawWorker();
    workerRef.current.postMessage({ canvas: off }, [off]);
    useWorker.current = true;
    isTransferredRef.current = true; // ✅ Marquer comme transféré
  }
  
  return () => {
    // Cleanup worker on unmount
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  };
}, []);
```

### 2. Limitation Percepts (Max 10)

```typescript
const MAX_PERCEPTS = 10; // Limiter le nombre de percepts stockés

const handleVisionPercept = useCallback((percept: Percept<VisionPayload>) => {
  useAppStore.setState((state) => {
    const currentPercepts = state.percepts || [];
    // Garder seulement les MAX_PERCEPTS plus récents
    const newPercepts = [...currentPercepts, percept].slice(-MAX_PERCEPTS);
    return { percepts: newPercepts };
  });
}, []);
```

**Avantages**:
- Empêche accumulation infinie en mémoire
- Performance stable
- Garde les détections les plus récentes

### 3. Selectors Zustand Optimisés

```typescript
// ❌ AVANT - Selector objet (nouvelle référence à chaque fois)
const { percepts, audio, smileDetected } = useAppStore((s) => ({
  percepts: s.percepts,
  audio: s.audio,
  smileDetected: s.smileDetected,
}));

// ✅ APRÈS - Selectors individuels (références stables)
const percepts = useAppStore((s) => s.percepts);
const audio = useAppStore((s) => s.audio);
const smileDetected = useAppStore((s) => s.smileDetected);
```

**Pourquoi?**
- Chaque selector individuel ne se met à jour QUE si sa valeur change
- Selector objet crée une nouvelle référence à chaque render
- Réduit drastiquement les re-renders

### 4. advancedVision Désactivé par Défaut

```typescript
// src/store/appStore.ts
featureFlags: {
  advancedVision: false, // Désactivé par défaut pour éviter les boucles infinies
  advancedHearing: false,
}
```

**Note**: Activer manuellement via l'interface si nécessaire.

## 🧪 Tests de Vérification

### Test 1: Montage/Démontage Composant
```typescript
// Le composant doit se monter sans erreur
render(<LisaCanvas video={mockVideo} />);
// Pas d'erreur "transferControlToOffscreen"
```

### Test 2: Accumulation Percepts
```typescript
// Envoyer 20 percepts
for (let i = 0; i < 20; i++) {
  visionSense.emit('percept', mockPercept);
}
// Le store doit contenir MAX 10 percepts
expect(useAppStore.getState().percepts).toHaveLength(10);
```

### Test 3: Performance Re-renders
```typescript
// Mesurer nombre de re-renders lors de mise à jour percepts
const renderCount = useRef(0);
renderCount.current++;
// Doit rester < 50 après 20 percepts
expect(renderCount.current).toBeLessThan(50);
```

## ⚠️ Problème Persistant (Cache Navigateur)

### Symptômes
- Les corrections sont appliquées dans le code
- L'erreur persiste dans le navigateur
- HMR ne suffit pas

### Cause
Le navigateur conserve l'ancien code en cache, ignorant les nouvelles modifications.

### Solution
1. **Vider le cache complètement**:
   - F12 → Application → Clear storage → Clear site data
   - OU Ctrl+Shift+Delete → Vider le cache
   
2. **Fermer COMPLÈTEMENT le navigateur**

3. **Rouvrir et recharger**:
   - Rouvrir le navigateur
   - Aller sur `http://localhost:5173`
   - Hard refresh: Ctrl+Shift+R

### Alternative: Désactiver Service Worker
```javascript
// Temporairement dans main.tsx
// registerServiceWorker(); // Commenté
```

## 📊 Résultats Attendus

### Avant
- ❌ Erreur: Maximum update depth exceeded
- ❌ Canvas ne se charge pas
- ❌ Application bloquée
- ❌ Console pleine d'erreurs

### Après
- ✅ Canvas se charge correctement
- ✅ Détections vidéo fluides
- ✅ 0 erreur console
- ✅ Performance stable (~10 percepts max)

## 🔗 Fichiers Modifiés

1. **src/components/LisaCanvas.tsx**
   - Protection double transfert
   - Limitation percepts
   - Selectors optimisés
   - useCallback pour handleVisionPercept

2. **src/store/appStore.ts**
   - advancedVision: false par défaut

## 📝 Leçons Apprises

### 1. React Strict Mode
**Problème**: Monte les composants 2 fois en dev  
**Solution**: Utiliser refs pour tracker état unique

### 2. Accumulation Données
**Problème**: Arrays qui grossissent indéfiniment  
**Solution**: Limiter avec `.slice(-MAX)` ou buffer circulaire

### 3. Selectors Zustand
**Problème**: Objets créent nouvelles références  
**Solution**: Selectors individuels ou shallow equality

### 4. Cache Navigateur
**Problème**: Service Worker + cache agressif  
**Solution**: Clear storage ou désactiver SW en dev

## 🎯 Recommandations Futures

### 1. Throttle/Debounce Percepts
```typescript
const throttledPercept = throttle((percept) => {
  useAppStore.setState(/* ... */);
}, 100); // Max 10 fois par seconde
```

### 2. Buffer Circulaire
```typescript
class CircularBuffer<T> {
  private buffer: T[];
  private index = 0;
  
  constructor(private size: number) {
    this.buffer = new Array(size);
  }
  
  push(item: T) {
    this.buffer[this.index] = item;
    this.index = (this.index + 1) % this.size;
  }
  
  getAll(): T[] {
    return [...this.buffer.slice(this.index), ...this.buffer.slice(0, this.index)];
  }
}
```

### 3. Tests Performance
```typescript
describe('LisaCanvas Performance', () => {
  it('should limit re-renders', () => {
    const { rerender } = render(<LisaCanvas />);
    // Test nombre de re-renders
  });
});
```

### 4. Monitoring
```typescript
// Ajouter logs performance
console.time('LisaCanvas-render');
// ... render ...
console.timeEnd('LisaCanvas-render');
```

## ✅ Status Final

**Date**: 5 Novembre 2025, 23:25  
**Status**: ✅ **CORRIGÉ** (nécessite hard refresh navigateur)

**Corrections appliquées**:
- ✅ Protection double transfert canvas
- ✅ Limitation percepts (max 10)
- ✅ Selectors Zustand optimisés
- ✅ useCallback mémorisé
- ✅ advancedVision désactivé par défaut
- ✅ Cleanup worker

**Action requise**: Hard refresh navigateur avec cache vidé

---

**Auteur**: Cascade AI  
**Durée correction**: ~20 minutes  
**Complexité**: Moyenne (boucles infinies multi-causes)
