# Quick Start - Vision & Audition Avancée

## Activation
Les deux fonctionnalités sont **activées par défaut** dans `src/config.ts` :
```typescript
features: {
  advancedVision: true,   // YOLOv8-n
  advancedHearing: true,  // Whisper-tiny + NLU/SER
}
```

## Démarrage Rapide

### 1. Installer les dépendances
```bash
npm install
```

### 2. Lancer l'application
```bash
npm run dev
```

### 3. Ouvrir le navigateur
- URL : http://localhost:5173 (ou le port affiché)
- **Autoriser l'accès** à la caméra et au microphone

## Test Vision Avancée (YOLOv8)

### Console Browser
Vérifier les messages :
```
[VisionWorker] Loading YOLOv8-n model...
[VisionWorker] Model loaded successfully
[Vision] Model loaded successfully in worker
```

### Test Visuel
1. Pointer la caméra vers des objets (personne, chaise, ordinateur, etc.)
2. Observer les **boîtes cyan** autour des objets détectés
3. Lire les labels : `person (95%)`, `laptop (88%)`, etc.

### Objets COCO Supportés (80 classes)
person, bicycle, car, motorcycle, airplane, bus, train, truck, boat, chair, couch, laptop, mouse, keyboard, cell phone, etc.

### Performance Attendue
- **FPS** : ~10 FPS (traitement d'1 frame sur 3)
- **Latence** : 50-150ms par frame
- **WebGL** : Accélération GPU automatique

## Test Audition Avancée (Whisper)

### Console Browser
**Mode Worker (si supporté)** :
```
[HearingWorker] Loading Whisper-tiny STT model...
[HearingWorker] Whisper-tiny STT model loaded successfully
[HearingWorker] All models loaded successfully
[Hearing] Models loaded successfully in worker
```

**Mode Fallback (Web Speech API)** :
```
[Hearing] Advanced hearing is disabled in config. Using Web Speech API fallback.
[Hearing] Web Speech API fallback initialized
```

### Test Audio
1. Parler dans le microphone
2. Observer la transcription dans l'interface `HearingPanel`
3. Vérifier les métadonnées :
   - **text** : transcription
   - **sentiment** : POSITIVE/NEGATIVE (si worker)
   - **emotion** : happy/sad/angry/neutral (si worker)

### Fallback Automatique
Le système bascule automatiquement sur Web Speech API si :
- Web Workers non disponibles
- Modèles Whisper échouent à charger
- Config `advancedHearing` = false

## Désactivation

### Désactiver Vision
```typescript
// src/config.ts
features: {
  advancedVision: false,  // ← Désactiver YOLOv8
}
```

### Désactiver Audition
```typescript
// src/config.ts
features: {
  advancedHearing: false,  // ← Force Web Speech API
}
```

## Dépannage

### Vision ne fonctionne pas
1. **Console** : Vérifier les erreurs de chargement du modèle
2. **WebGL** : Tester avec `chrome://gpu`
3. **URL Modèle** : Le modèle YOLOv8-n doit être téléchargeable depuis TensorFlow Hub
4. **Fallback** : Pas de fallback CPU implémenté pour l'instant

### Audition ne fonctionne pas
1. **Microphone** : Vérifier les permissions navigateur
2. **Fallback actif** : Si "Web Speech API fallback initialized" → mode simple sans NLU/SER
3. **Langue** : Web Speech API configuré en `fr-FR` par défaut

### Performances faibles
1. **Vision** : Réduire le taux de traitement dans `useAdvancedVision.ts` (ligne 25)
   ```typescript
   if (frameCountRef.current % 5 === 0)  // Au lieu de 3
   ```
2. **GPU** : Vérifier WebGL avec `chrome://gpu`
3. **Mémoire** : Limiter le nombre de percepts dans le store (déjà à MAX=10)

## Architecture

```
Camera → useAdvancedVision → visionWorker (YOLOv8) → Percepts → LisaCanvas (cyan boxes)
Mic    → hearingSense      → hearingWorker (Whisper) → Percepts → HearingPanel
                              ↓ (fallback)
                           Web Speech API
```

## Fichiers Clés

- **Config** : `src/config.ts`
- **Vision** : `src/senses/vision.ts` + `src/workers/visionWorker.ts`
- **Audition** : `src/senses/hearing.ts` + `src/workers/hearingWorker.ts`
- **UI** : `src/components/LisaCanvas.tsx` + `src/components/HearingPanel.tsx`

## Prochaines Étapes

1. **Production** : Héberger le modèle YOLOv8-n localement (éviter dépendance TFHub)
2. **CPU Fallback** : Implémenter MediaPipe sur thread principal pour vision
3. **Benchmarks** : Mesurer FPS, latence, mémoire en conditions réelles
4. **Langue** : Rendre configurable la langue de Web Speech API
5. **Optimisation** : Tester autres backends TensorFlow.js (WebGPU, WASM)
