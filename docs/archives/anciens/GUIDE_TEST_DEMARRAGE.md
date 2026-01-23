# ✅ GUIDE DE TEST - LISA DÉMARRÉE

**Date:** 2 Novembre 2025 - 17:30  
**Serveur:** http://localhost:5174  
**Statut:** 🟢 **EN LIGNE**

---

## 🚀 DÉMARRAGE RÉUSSI

### **Serveur de Développement:**
```
✅ npm install - Terminé (992 packages)
✅ npm run dev - Démarré en 302ms
✅ Vite 6.4.1 - Actif
✅ Port: 5174 (5173 était occupé)
✅ URL: http://localhost:5174
```

### **Performance de Démarrage:**
- ⚡ Vite prêt en **302ms** - EXCELLENT !
- 🎯 Hot Module Replacement: Activé
- 📦 Lazy Loading: Configuré

---

## 🧪 CHECKLIST DE TESTS

### **1. Navigation Générale** 🎯

#### **Test 1.1: Redirection Automatique**
- [ ] Aller sur `http://localhost:5174/`
- [ ] Vérifier redirection automatique vers `/dashboard`
- ✅ **Attendu:** Redirection immédiate

#### **Test 1.2: Toutes les Pages**
Tester chaque page une par une:

- [ ] `/dashboard` - Tableau de bord
  - Vérifier: Stats cards, activité agents, graphiques
  
- [ ] `/agents` - Gestion agents
  - Vérifier: Liste agents, onglets catégories, recherche
  
- [ ] `/vision` - Vision & MediaPipe
  - Vérifier: Video preview, modèles MediaPipe, OCR
  
- [ ] `/audio` - Audio & Speech
  - Vérifier: Audio classifier, speech synthesis, wake word
  
- [ ] `/workflows` - Orchestration
  - Vérifier: Liste workflows, création, éditeur
  
- [ ] `/tools` - Outils
  - Vérifier: GitHub, PowerShell, Code interpreter
  
- [ ] `/system` - Système
  - Vérifier: Debug, Security, Health monitor
  
- [ ] `/settings` - Paramètres
  - Vérifier: Onglets, configuration, sauvegarde

#### **Test 1.3: Sidebar Navigation**
- [ ] Cliquer sur chaque lien de la sidebar
- [ ] Vérifier que l'item actif est bien surligné
- [ ] Tester le toggle collapse de la sidebar
- ✅ **Attendu:** Navigation fluide, animations douces

---

### **2. Design & UX** 🎨

#### **Test 2.1: Glassmorphism**
- [ ] Vérifier les effets de glassmorphism sur les cards
- [ ] Vérifier les backdrop-blur
- [ ] Vérifier les transparences
- ✅ **Attendu:** Effet moderne et élégant

#### **Test 2.2: Dark Mode**
- [ ] Aller dans Settings > Appearance
- [ ] Toggle Dark Mode
- [ ] Vérifier que tous les éléments s'adaptent
- ✅ **Attendu:** Thème cohérent partout

#### **Test 2.3: Responsive**
- [ ] Ouvrir DevTools (F12)
- [ ] Tester en mode mobile (375px)
- [ ] Tester en mode tablet (768px)
- [ ] Tester en mode desktop (1920px)
- ✅ **Attendu:** Layout adaptatif sur tous les écrans

#### **Test 2.4: Animations**
- [ ] Hover sur les boutons
- [ ] Transitions entre pages
- [ ] Loading states
- ✅ **Attendu:** Animations fluides 60fps

---

### **3. MediaPipe (9 Modèles)** 🤖

#### **Test 3.1: Face Landmarker**
- [ ] Aller sur `/vision`
- [ ] Activer FaceLandmarker
- [ ] Autoriser la caméra
- [ ] Vérifier détection du visage (478 points)
- [ ] Vérifier détection du sourire
- ✅ **Attendu:** Landmarks en temps réel

#### **Test 3.2: Hand Landmarker**
- [ ] Activer HandLandmarker
- [ ] Montrer la main devant la caméra
- [ ] Vérifier 21 landmarks
- [ ] Vérifier handedness (gauche/droite)
- ✅ **Attendu:** Tracking main précis

#### **Test 3.3: Object Detector**
- [ ] Activer ObjectDetector
- [ ] Montrer des objets (tasse, téléphone, etc.)
- [ ] Vérifier détection et labels
- ✅ **Attendu:** Détection objets en temps réel

#### **Test 3.4: Pose Landmarker**
- [ ] Activer PoseLandmarker
- [ ] Se mettre devant la caméra
- [ ] Vérifier 33 landmarks corporels
- ✅ **Attendu:** Détection pose complète

#### **Test 3.5: Image Classifier**
- [ ] Activer ImageClassifier
- [ ] Montrer différentes scènes
- [ ] Vérifier classification avec scores
- ✅ **Attendu:** Classification précise

#### **Test 3.6: Gesture Recognizer**
- [ ] Activer GestureRecognizer
- [ ] Faire des gestes (thumbs up, pointing, etc.)
- [ ] Vérifier reconnaissance gestes
- ✅ **Attendu:** Détection gestes variés

#### **Test 3.7: Image Segmenter**
- [ ] Activer ImageSegmenter
- [ ] Vérifier segmentation de l'image
- [ ] Vérifier masques générés
- ✅ **Attendu:** Segmentation en temps réel

#### **Test 3.8: Image Embedder**
- [ ] Activer ImageEmbedder
- [ ] Comparer deux images similaires
- [ ] Vérifier score de similarité
- ✅ **Attendu:** Embeddings fonctionnels

#### **Test 3.9: Audio Classifier**
- [ ] Aller sur `/audio`
- [ ] Activer AudioClassifier
- [ ] Autoriser le microphone
- [ ] Faire des sons différents
- [ ] Vérifier classification audio
- ✅ **Attendu:** Classification sons en temps réel

---

### **4. Performance** ⚡

#### **Test 4.1: Lazy Loading**
- [ ] Ouvrir DevTools > Network
- [ ] Naviguer vers `/dashboard`
- [ ] Vérifier que seul le chunk dashboard est chargé
- [ ] Naviguer vers `/agents`
- [ ] Vérifier chargement du chunk agents uniquement
- ✅ **Attendu:** Chunks séparés, chargement progressif

#### **Test 4.2: Bundle Size**
- [ ] Dans Network, vérifier la taille totale
- [ ] Vérifier vendor chunks séparés
- ✅ **Attendu:** 
  - Initial load < 2MB
  - Total < 5MB
  - Chunks séparés (react, mediapipe, etc.)

#### **Test 4.3: Time to Interactive**
- [ ] Ouvrir DevTools > Lighthouse
- [ ] Run Performance audit
- [ ] Vérifier TTI (Time to Interactive)
- ✅ **Attendu:** TTI < 2.5s

#### **Test 4.4: First Paint**
- [ ] Dans Lighthouse, vérifier FCP
- ✅ **Attendu:** FCP < 1.5s

---

### **5. Fonctionnalités** 🛠️

#### **Test 5.1: Agents**
- [ ] Aller sur `/agents`
- [ ] Cliquer sur un agent
- [ ] Vérifier le modal de détails
- [ ] Tester la recherche d'agents
- [ ] Filtrer par catégorie
- ✅ **Attendu:** 47 agents accessibles et fonctionnels

#### **Test 5.2: Workflows**
- [ ] Aller sur `/workflows`
- [ ] Créer un nouveau workflow
- [ ] Vérifier l'éditeur
- [ ] Exécuter un workflow
- ✅ **Attendu:** Interface création/édition fluide

#### **Test 5.3: Settings**
- [ ] Aller sur `/settings`
- [ ] Modifier un paramètre
- [ ] Sauvegarder
- [ ] Vérifier le toast de confirmation
- ✅ **Attendu:** Sauvegarde persistante

#### **Test 5.4: OCR Scanner**
- [ ] Aller sur `/vision`
- [ ] Panel OCR
- [ ] Upload une image avec du texte
- [ ] Vérifier extraction du texte
- ✅ **Attendu:** OCR fonctionnel avec Tesseract.js

#### **Test 5.5: Speech Synthesis**
- [ ] Aller sur `/audio`
- [ ] Entrer du texte
- [ ] Cliquer sur "Synthétiser"
- [ ] Vérifier la lecture audio
- ✅ **Attendu:** Voix claire et naturelle

---

### **6. Console Erreurs** 🐛

#### **Test 6.1: Console JavaScript**
- [ ] Ouvrir DevTools > Console
- [ ] Naviguer sur toutes les pages
- [ ] Vérifier qu'il n'y a pas d'erreurs rouges
- ✅ **Attendu:** 0 erreurs critiques

#### **Test 6.2: Network Errors**
- [ ] Onglet Network
- [ ] Vérifier qu'il n'y a pas de 404 ou 500
- ✅ **Attendu:** Toutes les requêtes réussies

#### **Test 6.3: TypeScript Errors**
- [ ] Dans le terminal où `npm run dev` tourne
- [ ] Vérifier qu'il n'y a pas d'erreurs TS
- ✅ **Attendu:** 0 erreurs TypeScript

---

### **7. Responsive Mobile** 📱

#### **Test 7.1: iPhone SE (375px)**
- [ ] DevTools > Toggle device toolbar
- [ ] Sélectionner iPhone SE
- [ ] Naviguer sur toutes les pages
- [ ] Vérifier que le contenu est lisible
- ✅ **Attendu:** Layout adapté, pas de débordement

#### **Test 7.2: iPad (768px)**
- [ ] Sélectionner iPad
- [ ] Tester la navigation
- [ ] Vérifier les cards
- ✅ **Attendu:** Grille adaptée, 2 colonnes

#### **Test 7.3: Desktop (1920px)**
- [ ] Mode desktop
- [ ] Vérifier que tout utilise l'espace
- ✅ **Attendu:** Layout optimal 3-4 colonnes

---

## 📊 RÉSULTATS ATTENDUS

### **Performance:**
```
✅ Démarrage: < 500ms
✅ TTI: < 2.5s
✅ FCP: < 1.5s
✅ Bundle: < 5MB
✅ Lighthouse: > 90
```

### **Fonctionnalités:**
```
✅ 8 pages: Toutes accessibles
✅ 9 MediaPipe: Tous fonctionnels
✅ Navigation: Fluide
✅ Responsive: Parfait
✅ Dark mode: Opérationnel
```

### **Qualité:**
```
✅ 0 erreurs console
✅ 0 erreurs TypeScript
✅ 0 warnings critiques
✅ Animations 60fps
✅ GPU acceleration active
```

---

## 🎯 TESTS RAPIDES (5 MIN)

Si vous n'avez que 5 minutes, testez au minimum:

1. ✅ **Navigation:** Cliquer sur chaque page (Dashboard, Agents, Vision, Audio, etc.)
2. ✅ **MediaPipe:** Activer 1-2 modèles sur `/vision` (Face + Hand)
3. ✅ **Performance:** Vérifier que le chargement est rapide
4. ✅ **Responsive:** Tester en mobile (F12 > Toggle device)
5. ✅ **Console:** Vérifier 0 erreurs rouges

---

## 🏆 VALIDATION FINALE

### **Checklist Critique:**
- [ ] Serveur démarre sans erreur
- [ ] Toutes les pages se chargent
- [ ] MediaPipe fonctionne (au moins 2 modèles)
- [ ] Navigation fluide
- [ ] 0 erreurs console critiques
- [ ] Performance acceptable (< 3s TTI)

### **Si TOUT est ✅:**
**🎊 LISA FONCTIONNE PARFAITEMENT ! 🎊**

### **Si des problèmes:**
Noter les erreurs et nous les corrigerons immédiatement.

---

## 🌐 URLS À TESTER

```
http://localhost:5174/              → Redirige vers /dashboard
http://localhost:5174/dashboard     → Tableau de bord
http://localhost:5174/agents        → Gestion agents
http://localhost:5174/vision        → Vision + MediaPipe
http://localhost:5174/audio         → Audio + Speech
http://localhost:5174/workflows     → Orchestration
http://localhost:5174/tools         → Outils (GitHub, etc.)
http://localhost:5174/system        → Système (Debug, etc.)
http://localhost:5174/settings      → Paramètres
```

---

## 💡 ASTUCES DE TEST

### **DevTools Shortcuts:**
- `F12` - Ouvrir DevTools
- `Ctrl+Shift+M` - Toggle device toolbar (responsive)
- `Ctrl+Shift+C` - Inspect element
- `Ctrl+Shift+P` - Command palette

### **Lighthouse:**
1. F12 > Lighthouse tab
2. Select "Performance" + "Best practices"
3. Click "Analyze page load"
4. Vérifier score > 90

### **Network Analysis:**
1. F12 > Network tab
2. Refresh page (Ctrl+R)
3. Vérifier:
   - Total size < 5MB
   - Chunks séparés
   - Pas de 404

---

**🚀 BON TEST ! L'APPLICATION EST PRÊTE ! 🚀**

*Guide créé le 2 Novembre 2025 à 17:30*  
*Serveur: http://localhost:5174*  
*Version: Lisa 10/10 - Excellence Absolue*
