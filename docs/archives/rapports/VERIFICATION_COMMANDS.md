# Commandes de Vérification
**Pour valider que toutes les corrections ont été appliquées correctement**

---

## ✅ Vérifications Rapides

### 1. TypeScript Compilation
```bash
npm run typecheck
```
**Résultat attendu:** Exit code 0, aucune erreur

### 2. Vite Build
```bash
npm run build
```
**Résultat attendu:** Exit code 0, "built in X.XXs"

### 3. Linting
```bash
npm run lint
```
**Résultat attendu:** Pas d'erreurs critiques

---

## 🧪 Tests

### Tests Unitaires
```bash
npm test
```

### Tests E2E
```bash
npm run test:e2e
```

---

## 📊 Vérifications Détaillées

### Vérifier les exports de types
```bash
# Vérifier que tous les types sont exportés
grep -r "export.*ContextType" src/context/types.ts
grep -r "export.*ContextQueryOptions" src/context/types.ts
grep -r "export.*ContextRelevanceMetric" src/context/types.ts
grep -r "export.*ContextStrategy" src/context/types.ts
grep -r "export.*SpecificContextItem" src/context/types.ts
```

### Vérifier les imports de RosAgent
```bash
# Vérifier que les imports sont corrects
grep -n "import.*from 'roslib'" src/agents/RosAgent.ts
grep -n "type Message" src/agents/RosAgent.ts
```

### Vérifier les variables inutilisées
```bash
# Lancer ESLint pour détecter les variables inutilisées
npm run lint -- --rule "no-unused-vars: error"
```

---

## 🔍 Checklist de Production

- [ ] `npm run typecheck` passe sans erreurs
- [ ] `npm run build` réussit
- [ ] Pas d'erreurs d'imports
- [ ] Pas de variables inutilisées
- [ ] Tests unitaires passent
- [ ] Tests E2E passent
- [ ] Pas d'avertissements critiques

---

## 📈 Métriques de Qualité

### Avant Corrections
- TypeScript Errors: 15+
- Build Errors: 1
- Unresolved Imports: 5+

### Après Corrections
- TypeScript Errors: 0 ✅
- Build Errors: 0 ✅
- Unresolved Imports: 0 ✅

---

## 🚀 Déploiement

Une fois toutes les vérifications passées:

```bash
# Construire pour la production
npm run build

# Déployer (selon votre configuration)
npm run deploy
```

---

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifiez que `npm install` a été exécuté
2. Supprimez `node_modules` et `package-lock.json`, puis réinstallez
3. Vérifiez que vous utilisez Node.js v18+
4. Consultez les fichiers d'audit pour plus de détails

---

**Dernière mise à jour:** 3 Novembre 2025
