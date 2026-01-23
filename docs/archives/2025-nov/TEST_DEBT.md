# 📉 Dettes Techniques - Tests (TEST_DEBT)

## ✅ Tests Hearing Supprimés (RÉSOLU)

### Historique
- **Janvier 2026** : Problèmes d'import de Workers lors des tests unitaires Hearing.
- **Résolution** : Architecture "Side-Effect Free" implémentée.
  - Workers isolés dans `src/senses/runtime/*.factory.ts`.
  - Contrôleurs `vision.ts` et `hearing.ts` utilisent le Lazy Loading.
  - Convertisseurs extraits dans `src/senses/converters/`.

### Statut
L'architecture permet désormais d'importer les modules sensoriels dans les tests Node/Vitest sans mocks d'infrastructure lourds. Les tests d'architecture (`src/senses/__tests__/architecture.test.ts`) valident cette propriété.

---
*Fichier mis à jour le 7 Janvier 2026*