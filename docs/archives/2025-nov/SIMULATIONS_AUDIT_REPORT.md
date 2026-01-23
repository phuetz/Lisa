# Audit des Fonctionnalités Simulées - Lisa
**Date:** 23 Novembre 2025

## Vue d'ensemble
Audit complet du code pour identifier les fonctionnalités simulées, incomplètes, ou utilisant des placeholders.

---

## ✅ Fonctionnalités Complètes (récemment implémentées)
- **Vision Avancée** : YOLOv8-n avec inférence réelle
- **Audition Avancée** : Whisper-tiny + Web Speech API fallback

---

## ⚠️ Agents avec Simulations

### 1. **PowerShellAgent** 🔴 SIMULATION COMPLÈTE
**Fichier:** `src/agents/PowerShellAgent.ts`
**Méthode:** `simulateCommandExecution()` (ligne 267-374)

**État:** Toutes les commandes PowerShell sont simulées
**Raison:** Impossible d'exécuter PowerShell depuis le navigateur

**Données simulées:**
- `Get-Process` → Faux processus Chrome, Edge, Explorer
- `Get-Service` → Faux services Windows
- `systeminfo` → Fausses infos système
- `Get-ChildItem` / `dir` → Faux fichiers
- `ping` → Fausses réponses réseau

**Solution:** Nécessite un backend API pour exécuter vraies commandes

---

### 2. **SystemIntegrationAgent** 🔴 SIMULATION COMPLÈTE
**Fichier:** `src/agents/SystemIntegrationAgent.ts`
**Méthodes simulées :**
- `simulateApiCall()` (ligne 448-470)
- `simulateWebhookCall()` (ligne 475-493)
- `simulateMqttOperation()` (ligne 498-514)
- `simulateHttpRequest()` (ligne 519-541)
- `simulateDatabaseOperation()` (ligne 546-588)
- `simulateFileOperation()` (ligne 593-637)
- `simulateShellExecution()` (ligne 642-658)

**État:** Toutes les intégrations système sont simulées
**Raison:** Sécurité et impossibilité d'exécuter depuis navigateur

**Solution:** Backend API nécessaire pour vraies intégrations

---

### 3. **ImageAnalysisAgent** 🔴 SIMULATION COMPLÈTE
**Fichier:** `src/agents/ImageAnalysisAgent.ts`

**Fonctionnalités simulées:**
- `recognizeObjects()` - TODO ligne 66 → Faux objets "person", "chair"
- `analyzeScene()` - TODO ligne 85 → Fausse scène "office"
- `extractText()` - TODO ligne 109 →  "[OCR text extraction pending]"
- `detectFaces()` - TODO ligne 127 → Fausses détections visage
- `analyzeColors()` - TODO ligne 149 → Fausses couleurs dominantes
- `classifyImage()` - TODO ligne 174 → Fausses catégories

**Solution:** 
- Utiliser MediaPipe Vision existant (déjà dans `src/workers/visionWorker.ts`)
- Tesseract.js pour OCR
- Modèles d'analyse couleurs

**Note:** On a implémenté YOLOv8 dans `visionWorker.ts` mais ImageAnalysisAgent ne l'utilise pas !

---

### 4. **HearingAgent** 🟡 PARTIELLEMENT SIMULÉ
**Fichier:** `src/agents/HearingAgent.ts`

**Fonctionnalités simulées:**
- `classifyAudio()` - TODO ligne 86 → Simulation classification
- `detectSound()` - TODO ligne 169 → Fausse détection "door_knock"
- `transcribeAudio()` - TODO ligne 235 → Simulation transcription
- `filterNoise()` - TODO ligne 265 → Pas de vrai filtrage

**Solution:** 
- Utiliser `hearingWorker.ts` existant (Whisper-tiny déjà implémenté)
- Web Audio API pour analyse fréquences

**Note:** On a implémenté Whisper mais HearingAgent ne l'utilise pas  !

---

### 5. **AudioAnalysisAgent** 🔴 SIMULATION COMPLÈTE
**Fichier:** `src/agents/AudioAnalysisAgent.ts`

**Fonctionnalités simulées:**
- `transcribeAudio()` - TODO ligne 65 → Besoin Whisper
- `recognizeEmotion()` - TODO ligne 84 → Besoin modèle émotion

**Solution:** Même que HearingAgent - utiliser `hearingWorker.ts`

---

### 6. **ContentGeneratorAgent** 🔴 SIMULATION COMPLÈTE
**Fichier:** `src/agents/ContentGeneratorAgent.ts`

**Toutes les méthodes retournent des textes simulés:**
- `summarizeText()` - ligne 390 → "[Ceci est un résumé simulé...]"
- `translateText()` - ligne 432 → "[Ceci est une traduction simulée...]"
- `rewriteText()` - ligne 452 → "[Ceci est une réécriture simulée...]"
- `generateContent()` - ligne 485 → "[Ceci est un contenu généré simulé...]"
- `draftEmail()` - ligne 515 → "[Ceci est un email simulé...]"
- `draftMessage()` - ligne 550 → "[Ceci est un message simulé...]"

**Solution:** Intégrer LLM API (Gemini, OpenAI, etc.)

---

### 7. **TranslationAgent** 🔴 NON IMPLÉMENTÉ
**Fichier:** `src/agents/TranslationAgent.ts`
**TODO:** Ligne 79 - "Integrate with translation API (Google Translate, DeepL)"

**État:** Pas d'implémentation réelle
**Solution:** API Google Translate ou DeepL

---

### 8. **EmailAgent** 🟡 PARTIELLEMENT SIMULÉ
**Fichier:** `src/agents/EmailAgent.ts`
**TODO:** Ligne 403 - Utiliser LLM pour meilleures réponses

**État:** Fonctionnel mais réponses basiques
**Solution:** Intégrer LLM pour améliorer rédaction

---

### 9. **IntegrationService** 🔴 SIMULATION COMPLÈTE
**Fichier:** `src/services/IntegrationService.ts`

**Méthodes simulées:**
- `simulateConnection()` - ligne 183
- `simulateSendMessage()` - ligne 194

**État:** Toutes les connexions externes simulées
**Solution:** Vraies intégrations Slack, Discord, etc.

---

### 10. **TransformAgent** 🟡 PLACEHOLDER
**Fichier:** `src/agents/TransformAgent.ts`
**Note:** Ligne 29 - "We'll simulate or require external code execution agent"

**État:** Transformations de données limitées
**Solution:** Sandboxed code execution (Worker + VM)

---

### 11. **WeatherAgent** 🟡 SIMULATION GEOCODING
**Fichier:** `src/agents/WeatherAgent.ts`
**Note:** Ligne 107 - Géocodage simulé pour villes

**État:** API météo fonctionnelle MAIS géocodage simulé
**Solution:** Ajouter vraie API géocodage

---

## 📋 TODOs Critiques

### Vision/Audition
1. ✅ **FAIT**: Inférence YOLOv8 réelle
2. ✅ **FAIT**: Web Speech API fallback
3. ⚠️ **TODO**: CPU fallback vision (ligne 31, `vision.ts`)
4. ⚠️ **TODO**: Pose skeleton rendering (ligne 211, `LisaCanvas.tsx`)

### Configuration
5. ⚠️ **TODO**: Custom wake word "lisa" (ligne 29, `useWakeWord.ts`)
6. ⚠️ **TODO**: ROS Bridge URL configurable (ligne 14, `RobotAgent.ts`)

### Workflow
7. ⚠️ **TODO**: Undo/redo historique (lignes 111, 115, 119 `useWorkflowStore.ts`)
8. ⚠️ **TODO**: Python execution (ligne 138, `WorkflowExecutor.ts`) - SIMULÉ

### Logging
9. ⚠️ **TODO**: Intégrer Sentry/DataDog (ligne 135, `structuredLogger.ts`)

### Agents Code
10. ⚠️ **TODO**: GeminiCodeAgent placeholder (ligne 108, `GeminiCodeAgent.ts`)
11. ⚠️ **TODO**: WindsurfAgent simplified logic (ligne 91, `WindsurfAgent.ts`)
12. ⚠️ **TODO**: AFlowOptimizerAgent MCTS placeholder (ligne 65, `AFlowOptimizerAgent.ts`)

---

## 🎯 Recommandations par Priorité

### Priorité 1 - CRITIQUE (fonctionnalités visibles utilisateur)
1. **ImageAnalysisAgent** : Connecter au `visionWorker.ts` existant
2. **HearingAgent** : Connecter au `hearingWorker.ts` existant
3. **ContentGeneratorAgent** 3: Intégrer API LLM (Gemini)

### Priorité 2 - HAUTE (backend nécessaire)
4. **PowerShellAgent** : Créer API backend sécurisée
5. **SystemIntegrationAgent** : Backend pour vraies intégrations
6. **TranslationAgent** : Intégrer Google Translate API

### Priorité 3 - MOYENNE (améliorations)
7. **CPU Fallback Vision** : MediaPipe sur main thread
8. **Custom Wake Word** : Entrainer modèle Porcupine "Lisa"
9. **WeatherAgent** : Ajouter géocodageAPI
10. **EmailAgent** : Améliorer avec LLM

### Priorité 4 - BASSE (nice-to-have)
11. **Workflow Undo/Redo** : Implémenter historique
12. **Logging** : Intégrer Sentry
13. **Pose Skeleton** : Rendu squelette pose

---

## 💡 Solutions Rapides

### 1. Connecter ImageAnalysisAgent au visionWorker ✅ FAISABLE
```typescript
// Dans ImageAnalysisAgent.ts
import { processVideoFrame } from '../senses/vision';

private async recognizeObjects(params: any): Promise<AgentExecuteResult> {
  const { imageData } = params;
  // Envoyer au worker YOLOv8 existant
  processVideoFrame(imageData);
  // Écouter les percepts du store
  const percepts = useAppStore.getState().percepts;
  //...
}
```

### 2. Connecter HearingAgent au hearingWorker ✅ FAISABLE
```typescript
// Dans HearingAgent.ts
import { hearingSense } from '../senses/hearing';

private async transcribeAudio(params: any): Promise<AgentExecuteResult> {
  await hearingSense.initialize();
  hearingSense.processAudio(audioData);
  // Récupérer percepts du callback
}
```

### 3. Intégrer Gemini pour ContentGenerator 🟡 BACKEND REQUIS
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const result = await model.generateContent(prompt);
```

---

## 📊 Statistiques

- **TODOs trouvés** 24
- **Méthodes `simulate*`** : 32
- **Agents avec simulations** : 10
- **Agents 100% simulés** : 6
- **Agents partiellement simulés** : 4

---

## ⚡ Action Immédiate Recommandée

**Étape 1 :** Connecter `ImageAnalysisAgent` et `HearingAgent` aux workers existants
- Pas de backend requis
- Utilise code déjà implémenté
- Impact utilisateur immédiat

**Étape 2 :** Intégrer Gemini API pour `ContentGeneratorAgent`
- API rest simple
- Amélioration majeure de l'expérience

**Étape 3 :** Créer backend API pour agents système
- PowerShell
- SystemIntegration
- Plus long terme

---

## Conclusion

**Bonnes nouvelles :**
- Vision et Audition avancées ✅ IMPLÉMENTÉES
- Infrastructure workers ✅ EN PLACE
- Architecture solide ✅

**Problèmes détectés :**
- Agents d'analyse n'utilisent PAS les workers existants 🔴
- Beaucoup de simulations nécessitent backend 🟡
- ContentGenerator nécessite LLM API 🟡

** Prochaine action suggérée:**
Implémenter connexion ImageAnalysisAgent → visionWorker (2h de travail max)
