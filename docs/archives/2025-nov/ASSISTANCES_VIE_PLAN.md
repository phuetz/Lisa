# Plan d'Assistances de Vie - Lisa

## 🏥 Fonctionnalités Implémentées

### 1. ✅ Détection de Chute
- Surveillance posturale continue
- Alerte automatique après 3s au sol
- Appel d'urgence avec countdown

---

## 🎯 Nouvelles Assistances Prioritaires

### 2. 💊 Rappels de Médicaments
**Besoin**: Prise régulière de traitements
**Fonctionnalités**:
- Configuration horaires de prise
- Alerte visuelle + vocale + sonore
- Confirmation de prise (vision: geste OK)
- Rapport hebdomadaire d'observance
- Alertes si oubli > 30min

**UI**: 
- Modal avec photo/nom du médicament
- Liste des prises du jour
- Historique graphique (calendrier)

### 3. 🚰 Rappels d'Hydratation
**Besoin**: Prévention déshydratation
**Fonctionnalités**:
- Objectif quotidien configurable (ex: 1.5L)
- Rappel toutes les 2h si pas de prise détectée
- Détection visuelle (verre porté à la bouche)
- Suivi quantité via compteur manuel
- Encouragements vocaux

**UI**:
- Widget progression (gauge circulaire)
- Animation goutte d'eau
- Notification douce

### 4. 🔇 Détection d'Inactivité Prolongée
**Besoin**: Sécurité en cas de malaise sans chute
**Fonctionnalités**:
- Alarme si aucun mouvement détecté > 4h (jour) / 12h (nuit)
- Détection de présence via caméra
- Check-in vocal: "Tout va bien ?"
- Escalade automatique: 1) Lisa demande → 2) Alerte contact → 3) Urgences

**UI**:
- Indicateur "Dernière activité: il y a Xmin"
- Badge vert "Actif" / orange "Inactif"

### 5. 📞 Appels d'Urgence Simplifés
**Besoin**: Contact rapide en cas de détresse
**Fonctionnalités**:
- Commande vocale: "Lisa, appelle les urgences"
- Bouton SOS physique (grand, rouge, accessible)
- Liste de contacts d'urgence (famille, médecin)
- Géolocalisation envoyée automatiquement
- Message pré-enregistré: "J'ai besoin d'aide à [adresse]"

**UI**:
- Bouton SOS flottant permanent (coin écran)
- Modal confirmation avec countdown 5s
- Liste contacts avec photos

### 6. 🔍 Localisation d'Objets Perdus
**Besoin**: Retrouver clés, lunettes, télécommande
**Fonctionnalités**:
- Vision: Mémorisation emplacement des objets courants
- Commande: "Lisa, où sont mes lunettes ?"
- Réponse visuelle: Flèche pointant vers dernier emplacement
- Historique des 10 derniers emplacements par objet
- Mode recherche: Lisa guide vocalement ("Plus à gauche...")

**UI**:
- Carte 2D de la pièce avec icônes
- Timeline des déplacements d'objets
- Mode AR (flèche overlay caméra)

### 7. 🏃 Suivi d'Activité Physique
**Besoin**: Maintien autonomie et santé
**Fonctionnalités**:
- Compteur de pas (via pose tracking)
- Temps debout vs assis
- Exercices guidés (vidéo + correction posture)
- Objectifs hebdomadaires adaptés
- Encouragements positifs

**UI**:
- Dashboard avec graphiques
- Badges de réussite (gamification)
- Suggestions d'exercices

### 8. 🍽️ Rappels de Repas
**Besoin**: Nutrition régulière
**Fonctionnalités**:
- Rappels petit-déj, déjeuner, dîner
- Détection visuelle: personne à table
- Suggestion recettes (selon stocks détectés)
- Alerte si > 6h sans repas

**UI**:
- Notification avec emoji 🍽️
- Timer jusqu'au prochain repas
- Recettes vocales guidées

### 9. 🌡️ Surveillance Environnement
**Besoin**: Confort et sécurité
**Fonctionnalités**:
- Température ambiante (si capteur disponible)
- Détection fumée (via vision: motifs flous + mouvement)
- Détection fuite d'eau (via audio: gouttes répétées)
- Qualité d'air (si capteur)
- Alerte canicule/grand froid

**UI**:
- Indicateurs temps réel
- Alertes critiques (modal)

### 10. 🛌 Routine Sommeil
**Besoin**: Repos de qualité
**Fonctionnalités**:
- Rappel heure de coucher
- Détection lever nocturne (sécu: lumières auto)
- Analyse qualité sommeil (mouvements)
- Sons apaisants (méditation, nature)
- Réveil progressif (lumière + son doux)

**UI**:
- Timeline sommeil
- Score qualité (0-100)
- Conseils personnalisés

---

## 📊 Priorisation (Phase 1 - Cette session)

### Implémentation Immédiate
1. 💊 **Rappels Médicaments** (critique santé)
2. 🚰 **Hydratation** (simple + impact)
3. 📞 **Bouton SOS** (sécurité)
4. 🔇 **Détection Inactivité** (complète détection chute)

### Phase 2 (Prochaine itération)
5. 🔍 Localisation objets
6. 🍽️ Rappels repas
7. 🏃 Suivi activité

### Phase 3 (Avancé)
8. 🌡️ Surveillance environnement
9. 🛌 Routine sommeil
10. Intégration domotique (lumières, volets)

---

## 🔧 Architecture Technique

### Nouveau Dossier: `src/assistances/`
```
assistances/
├── MedicationReminder.ts
├── HydrationTracker.ts
├── InactivityDetector.ts
├── SOSButton.tsx
├── ObjectLocator.ts
├── MealReminder.ts
└── index.ts
```

### Store Zustand Extension
```typescript
interface AssistanceState {
  medications: Medication[];
  hydrationLog: HydrationEntry[];
  lastActivityTime: number;
  emergencyContacts: Contact[];
  lostObjects: ObjectHistory[];
}
```

---

## 🎨 Design Cohérent

**Palette Assistance de Vie**:
- 💊 Médicaments: Bleu médical `#3B82F6`
- 🚰 Hydratation: Cyan `#06B6D4`
- 🔴 Urgence: Rouge `#EF4444`
- 🟢 OK/Actif: Vert `#10B981`
- 🟡 Attention: Orange `#F59E0B`

**Accessibilité**:
- Boutons ultra-grands (min 80px)
- Contraste AAA (4.5:1)
- Voix prioritaire sur visuel
- Confirmation gestuelle (évite clics accidents)

---

## ✅ Prochaines Actions

1. Créer service `MedicationReminder`
2. Créer composant `MedicationAlert`
3. Créer service `HydrationTracker`
4. Créer widget `HydrationGauge`
5. Créer service `InactivityDetector`
6. Créer composant `SOSButton`
