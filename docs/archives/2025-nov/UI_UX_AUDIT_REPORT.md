# Audit des IHM - Application Lisa (24 Novembre 2025)

## 📊 Vue d'ensemble

Lisa dispose de **89 composants UI** mais présente plusieurs problèmes d'accessibilité, d'UX et de cohérence visuelle.

---

## 🔴 Problèmes Critiques

### 1. **Accessibilité (WCAG)**
- **Contraste insuffisant** : Vidéo avec `opacity` non conforme
- **Pas de skip links** : Navigation au clavier difficile
- **Labels manquants** : Plusieurs boutons sans attribut `aria-label`
- **Focus trap** : Pas de gestion du focus dans les modales

### 2. **Responsive Design**
- **ChatInterface** : Width fixe `w-96` (384px) - ne s'adapte pas aux mobiles
- **Video feed** : Position absolue qui peut déborder sur petits écrans
- **MetaHumanCanvas** : Pas de breakpoints définis

### 3. **UX (Expérience Utilisateur)**
- **Trop de composants simultanés** : Surcharge cognitive (89 composants !)
- **Feedback visuel absent** : Pas d'indication de chargement pour les agents
- **Notifications incohérentes** : Utilise `sonner` mais pas partout
- **États d'erreur non gérés** : Échec d'API silencieux

### 4. **Performance UI**
- **Pas de virtualisation** : Listes longues (messages, workflows) non optimisées
- **Animations lourdes** : `animate-pulse` sur plusieurs éléments simultanément
- **Re-renders inutiles** : Selectors Zustand non mémorisés dans certains hooks

---

## 🟠 Problèmes Modérés

### 5. **Design System Inexistant**
- **Couleurs hardcodées** : `#667eea`, `bg-blue-600` partout
- **Spacing incohérent** : Mélange de `px-4`, `p-3`, styles inline
- **Typographie** : Pas de hiérarchie claire (h1 48px mais style inline)

### 6. **Dark Mode**
- **Implémentation partielle** : `dark:` classes présentes mais pas de toggle
- **Pas de persistance** : Préférence utilisateur non sauvegardée

### 7. **Internationalisation (i18n)**
- **Textes hardcodés** : "Tapez votre message..." non traduit dans ChatInterface
- **Dates non localisées** : `toLocaleTimeString` sans fallback

---

## 🟢 Améliorations Proposées

### Court Terme (Sprint 1-2 semaines)

1. **Design System (`src/design/`)**
   ```ts
   // tokens.ts
   export const colors = {
     primary: { 50: '#f0f9ff', ..., 900: '#0c4a6e' },
     semantic: { success: '#10b981', error: '#ef4444', warning: '#f59e0b' }
   }
   ```

2. **Composants Accessibles**
   - Wrapper `<Button>` avec focus ring automatique
   - `<Modal>` avec focus trap (react-focus-lock)
   - `<Toast>` unifié (migration complète vers sonner)

3. **Responsive**
   - ChatInterface : `className="w-96 md:w-80 lg:w-96"`
   - Video : Media queries pour masquer sur mobile

### Moyen Terme (Sprint 3-4 semaines)

4. **Dashboard de Contrôle**
   - Panneau central pour activer/désactiver modules
   - Indicateurs de santé (CPU, RAM, FPS)
   - Toggle Dark Mode persistant

5. **Optimisation Performance**
   - `react-window` pour listes longues
   - Lazy loading des panneaux (Suspense)
   - Debounce sur input de chat (300ms)

6. **Gestion d'Erreurs**
   - Error Boundary par module (pas seulement global)
   - Retry automatique (3 tentatives)
   - Logs structurés (Sentry/DataDog ready)

---

## 🚨 Fonctionnalité Demandée : Détecteur de Chute

### Implémentation via Pose Detection

**Fichier à créer** : `src/services/FallDetector.ts`

**Algorithme** :
1. Analyser landmarks de pose (hanches, épaules, genoux)
2. Calculer angle du torse par rapport au sol
3. Détecter mouvement brusque (vélocité > seuil)
4. Vérifier persistance (personne au sol > 3s)
5. Déclencher alerte (notification + appel d'urgence optionnel)

**Seuils** :
- Angle torse < 30° = Position allongée
- Variation angle > 60°/s = Chute potentielle
- Temps au sol > 3s = Alerte confirmée

**UI** :
- Badge dans coin supérieur droit : 🟢 Surveillance active
- Notification toast si chute détectée
- Modal avec bouton "Annuler fausse alerte" (countdown 10s)

---

## 📋 Checklist de Validation

- [ ] Audit accessibilité (Lighthouse > 90)
- [ ] Test responsive (320px - 2560px)
- [ ] Dark mode fonctionnel
- [ ] i18n 100% (FR/EN)
- [ ] Performance (FCP < 2s, TTI < 3.5s)
- [ ] Détecteur de chute testé (10 scénarios)

---

## 🎯 Priorité d'Implémentation

1. **P0 (Cette semaine)** : Détecteur de chute + Dashboard de santé
2. **P1 (2 semaines)** : Design System + Accessibilité
3. **P2 (1 mois)** : Optimisations performance + Dark mode
