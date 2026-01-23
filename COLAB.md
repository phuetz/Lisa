# 🤝 COLAB.md - Plan de Travail Collaboratif

**Status:** ✅ LOT 1 & 2 DELIVERED
**Dernière mise à jour:** 17 Janvier 2026
**Objectif Global:** Restructuration Lisa vers une architecture modulaire (Feature-Based) et implémenter les sens avancés.

---

## Synthèse de la Restructuration
L'application a été migrée avec succès vers une architecture par fonctionnalités (`src/features/*`).

---

## Plan de Développement Fonctionnel

### 👁️ Lot 1 : Vision Avancée (YOLOv8)
*   **Benchmark :** ✅ Terminé (`docs/vision/benchmark_v1.md`).
*   **Implémentation :** ✅ Terminée (`src/features/vision`).
*   **UI :** ✅ Overlay Canvas fonctionnel.

### 👂 Lot 2 : Audition Avancée (Whisper)
*   **Implémentation :** ✅ Terminée (`src/features/hearing`).
    *   Worker Whisper-tiny intégré (WASM).
    *   Gestion fallback Web Speech API.
    *   Capture audio brute (16kHz) pour mode avancé.
*   **Benchmark :** ⏩ Sauté (Whisper choisi par défaut).

### 🧠 Lot 3 : NLU & Workflow (Futur)
*   **Objectif :** Améliorer l'intelligence des agents.
*   **Statut :** ⏳ En attente

---

## Conventions
*   Nouveaux développements : DOIVENT se faire dans `src/features`.
