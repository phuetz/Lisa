# Contexte du Projet : Lisa

Ce document sert de guide pour les assistants IA et les développeurs travaillant sur le projet Lisa. Il décrit l'architecture, les conventions et les concepts fondamentaux du projet.

## 1. Vue d'ensemble du Projet

Lisa est une application web intelligente et interactive conçue comme un assistant personnel. Elle intègre des fonctionnalités d'IA avancées, notamment :
- Le traitement du langage naturel pour la compréhension des intentions.
- La reconnaissance vocale (wake word, commandes vocales).
- La vision par ordinateur (reconnaissance de gestes, d'objets).
- Un système de workflow dynamique permettant de créer et'exécuter des tâches complexes.

L'application est composée d'un frontend en React et d'un backend en Express.js.

## 2. Stack Technique

- **Langage** : TypeScript
- **Frontend** :
  - **Framework** : React 19
  - **Build Tool** : Vite
  - **Gestion d'état** : Zustand
  - **Routing** : React Router
  - **Styling** : CSS standard, Emotion (`@emotion/styled`)
  - **UI Components** : Material-UI (`@mui/material`)
- **Backend** :
  - **Framework** : Express.js
  - **Base de données** : Base de données SQL gérée via l'ORM Prisma.
- **Tests** : Vitest
- **Linting** : ESLint

## 3. Structure du Projet

Le code source principal se trouve dans le dossier `src/`.

- `src/`
  - `main.tsx`: Point d'entrée de l'application React.
  - `App.tsx`: Composant principal de l'application.
  - `components/`: Composants React réutilisables (UI).
  - `hooks/`: Hooks React personnalisés, qui contiennent une grande partie de la logique du frontend.
  - `store/`: Définitions des stores Zustand pour la gestion d'état globale.
  - `pages/` : Composants représentant les différentes vues/pages de l'application.
  - `services/`: Services pour la communication avec des API externes ou la logique métier.
  - `utils/`: Fonctions utilitaires génériques.
  - `types/`: Définitions des types TypeScript globaux.
  - `i18n.ts` & `locales/`: Configuration de l'internationalisation (i18next).

### Dossiers Spécifiques à l'IA

- `src/agents/`: **(CRUCIAL)** Contient la logique des différents "agents" IA. Chaque agent est spécialisé dans une tâche (ex: `WebSearchAgent`, `CodeInterpreterAgent`, `MetaHumanAgent`). C'est le cerveau de l'application.
- `src/workflow/`: **(CRUCIAL)** Contient tout ce qui est lié au système de workflows. Utilise `reactflow` pour l'interface visuelle. Comprend les `nodes` (nœuds), les `panels` de configuration et l'exécuteur de workflow (`WorkflowExecutor`).
- `src/tools/`: Outils réutilisables que les agents peuvent utiliser pour effectuer des actions concrètes (ex: lire une page web, exécuter une recherche).
- `src/hooks/use...`: De nombreux hooks sont dédiés à l'IA, comme `useIntentHandler`, `useWakeWord`, `useUserWorkflows`.
- `src/senses/`: **(NOUVEAU)** Modules pour les sens avancés (Vision, Audition).
- `src/workers/`: **(NOUVEAU)** Web Workers pour le traitement lourd (Vision, Audition) hors du thread principal.

### Dossiers Spécifiques à MetaHuman

- `src/components/MetaHumanCanvas.tsx`: Composant React pour le rendu 3D du MetaHuman.
- `src/components/ModelLoader.tsx`: Gère le chargement des modèles 3D (GLTF).
- `src/components/MetaHumanControlsPanel.tsx`: Panneau de contrôle UI pour interagir avec le MetaHuman.
- `src/store/metaHumanStore.ts`: Store Zustand pour gérer l'état du MetaHuman (expressions, poses, animations).

### Dossier Backend

- `src/api/`: Contient le code du serveur backend Express.
  - `server.ts` ou `index.ts`: Point d'entrée du serveur.
  - `routes/`: Définition des routes de l'API.
  - `controllers/`: Logique de gestion des requêtes.
  - `middleware/`: Middlewares Express (ex: authentification).
  - `services/`: Logique métier côté serveur.

- `prisma/`: Contient le schéma de la base de données (`schema.prisma`) et les migrations.

## 4. Concepts Fondamentaux

### Le Modèle "Agent"
L'architecture repose sur un ensemble d'agents spécialisés. Un agent est une unité de logique autonome qui peut comprendre une requête, utiliser des outils pour collecter des informations ou effectuer des actions, et produire un résultat.

### Le Moteur de Workflow
Le système de workflow permet de chaîner des actions (potentiellement exécutées par des agents) de manière visuelle et dynamique.

---

# ⬇️ CONTEXTE ACTUEL (NOVEMBRE 2025)

Tu travailles sur “Lisa”, une web-app déjà en production.
**État actuel (Audit du 23 Nov 2025) :**
- **Vision** : `src/senses/vision.ts` et `src/workers/visionWorker.ts` existent mais le worker utilise une **simulation** (dummy data) au lieu de l'inférence réelle YOLOv8. Le fallback CPU est manquant.
- **Audition** : `src/senses/hearing.ts` et `src/workers/hearingWorker.ts` sont en place (Whisper-tiny), mais nécessitent une validation technique et un fallback Web Speech API.
- **ROS** : `RosAgent` est implémenté et fonctionnel.
- **Config** : Fichier `config.json` manquant pour gérer les feature flags (`advancedVision`, etc.).

---

# 🎯 OBJECTIF GLOBAL
Ajouter progressivement des capacités “5 sens” **sans casser la base existante**.
Priorité immédiate : **Vision avancée** et **Audition avancée**.

---

# 🛠️ LOT 1 – VISION AVANCÉE ✅ TERMINÉ
1.  **Choix & test modèle** : `YOLOv8-n` (tfjs) sélectionné.
2.  **Module front** `src/senses/vision.ts` :
    - [x] Structure de base et Web Worker.
    - [x] **FAIT**: Inférence réelle implémentée dans `visionWorker.ts`.
    - [x] **FAIT**: Fallback CPU MediaPipe complet avec détection d'objets, poses, visages et mains.
3.  **Événement bus** :
    - [x] Type `Percept<V>` défini.
4.  **UI** :
    - [x] **FAIT**: Overlay affiche les bounding boxes (boîtes cyan), poses (magenta), visages (rose) et mains (jaune).
    - [x] **FAIT**: `config.ts` créé pour le toggle `advancedVision`.

# 🛠️ LOT 2 – AUDITION AVANCÉE ✅ TERMINÉ
1.  **STT** : `Whisper-tiny` (wasm/onnx) + NLU/SER.
2.  **Module front** `src/senses/hearing.ts` :
    - [x] Structure de base et Web Worker.
    - [x] **FAIT**: Fallback Web Speech API complet.
    - [x] **FAIT**: Validation et auto-redémarrage sur erreurs.

---

# ⏭️ PROCHAINE ACTION GEMINI
> **Status** : LOT 1 & 2 TERMINÉS ✅
> 
> **Améliorations futures** :
> - Hébergement local du modèle YOLOv8-n (fichiers .json et .bin dans /public/models)
> - Benchmarks de performance automatisés (via sandbox/vision-benchmark.html)
> - Intégration du Lot 3 (Toucher/Proprioception via MQTT/IoT)

**NB :** aucune suppression de code existant sans feature flag ; rétro-compatibilité prioritaire.
