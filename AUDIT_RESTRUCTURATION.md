# 🔍 AUDIT & RESTRUCTURATION REPORT

**Date:** 17 Janvier 2026
**Projet:** Lisa

## 1. Analyse Codebase

L'application Lisa est une PWA complexe intégrant IA, Vision, et Workflow.
L'architecture actuelle est en transition :
*   **Legacy:** Une structure classique React (components, hooks, services).
*   **Domaine:** Une logique métier lourde concentrée dans `src/agents` et `src/workflow`.
*   **State:** Gestion d'état centralisée via Zustand (`src/store`).

### Modules Critiques
1.  **Agents (`src/agents`)**: Le "cerveau". Contient ~50 agents. Problème : `AgentRegistry` (et `registry.ts`) agit comme un "God Object" qui couple tous les agents, rendant le tree-shaking difficile et augmentant le temps de démarrage.
2.  **Workflow (`src/workflow`)**: Moteur visuel (ReactFlow) fortement couplé aux agents.
3.  **Senses (`src/senses`)**: Contenait la logique Vision/Hearing. En cours de migration vers `src/features/`.
4.  **Vision (`src/features/vision`)**: Vient d'être déplacé. Dépendances internes à stabiliser.

## 2. Points Forts & Faibles

### ✅ Points Forts
*   **Modularité des Agents:** Chaque agent a une responsabilité relativement claire.
*   **Stack Moderne:** React 19, Vite, TypeScript, Zustand.
*   **Capacités IA:** Intégration locale (TensorFlow.js, MediaPipe) et API.

### ⚠️ Points Faibles & Risques
*   **Couplage Fort:** `AgentRegistry` importe explicitement tous les fichiers d'agents. Une modification dans un agent peut casser le registre.
*   **Structure Plate:** Le dossier `src/agents` est devenu illisible (>50 fichiers).
*   **Imports Circulaires:** Risque élevé entre `Agents` <-> `Workflow`.
*   **Mélange des Responsabilités:** Certains agents contiennent de la logique UI ou API directe.

## 3. Plan de Restructuration (Architecture Cible)

Adoption d'une architecture **Feature-Sliced (simplifiée)** :

```text
src/
  features/           # Domaines fonctionnels autonomes
    vision/           # API, Worker, Components, Types
    hearing/          # API, Worker, Components
    workflow/         # Engine, Nodes, UI Panels
    agents/           # Cœur du système d'agents
      core/           # Interfaces, Registry (dynamique si possible)
      implementations/# Les agents eux-mêmes, groupés ?
  shared/             # Code partagé inter-features (UI Kit, Utils)
  app/                # Configuration globale (App.tsx, store root, routing)
```

### Principes
1.  **Colocation:** Tout ce qui concerne la "Vision" reste dans `features/vision`.
2.  **API Publique:** Chaque feature expose un `index.ts` ou `api.ts`. Les autres modules ne doivent importer que via cette porte d'entrée.
3.  **Isolation:** Minimiser les dépendances inter-features. Utiliser le `EventBus` ou le `Store` pour la communication.

---
Ce plan est piloté via le fichier `COLAB.md`.
