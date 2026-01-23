# BACKEND_REQUIRED.md

## Agents Requiring Backend Implementation

Les agents suivants **ne peuvent pas être implémentés en frontend** pour des raisons de sécurité et de limitations techniques du navigateur.

---

## 🔴 PowerShellAgent

**Fichier :** `src/agents/PowerShellAgent.ts`

**Problème :** Exécution de commandes système = **DANGER SÉCURITÉ**

**État actuel :** Toutes les commandes sont simulées (méthode `simulateCommandExecution`)

**Pourquoi frontend impossible ?**
- Accès direct au système d'exploitation interdit dans le navigateur
- Risque de sécurité majeur (injection de commandes)
- Pas d'API Web pour PowerShell/Bash

**Solution recommandée :**
```
Client (React) → API Backend → PowerShell Executor
```

**Implémentation backend :**
1. Créer endpoint `/api/powershell/execute`
2. Whitelist stricte de commandes autorisées
3. Authentification + autorisation requise
4. Exécution dans container/VM isolé
5. Timeout et limites de ressources

---

## 🔴 SystemIntegrationAgent

**Fichier :** `src/agents/SystemIntegrationAgent.ts`

**Problème :** 7 types d'intégrations nécessitant accès réseau/système

**État actuel :** Toutes les intégrations sont simulées :
- `simulateApiCall()`
- `simulateWebhookCall()`
- `simulateMqttOperation()`
- `simulateHttpRequest()`
- `simulateDatabaseOperation()`
- `simulateFileOperation()`
- `simulateShellExecution()`

** Pourquoi frontend impossible ?**
- CORS bloque appels API directs
- Pas d'accès au système de fichiers local
- Pas de connexion MQTT native
- Pas d'accès aux bases de données

**Solution recommandée :**
```
Client → API Gateway → Microservices
   ├─ API Integration Service
   ├─ Webhook Service
   ├─ MQTT Bridge
   ├─ Database Proxy
   └─ File System Service
```

---

## 🔴 TransformAgent

**Fichier :** `src/agents/TransformAgent.ts`

**Problème :** Exécution de code arbitraire

**État actuel :** Code execution simulé (ligne 29)

**Pourquoi frontend impossible ?**
- Exécution de code utilisateur = risque XSS
- Pas de sandboxing sécurisé dans navigateur
- Accès potentiel aux données sensibles

**Solution recommandée :**
```
Client → Code Executor API → Sandboxed Runner (Docker/VM)
```

**Implémentation backend :**
1. Utiliser content de code (Docker, Firecracker)
2. Limites strictes (CPU, RAM, temps)
3. Pas d'accès réseau
4. Validation du code avant exécution

---

## 🔴 WorkflowExecutor (Python)

**Fichier :** `src/workflow/executor/WorkflowExecutor.ts` (ligne 138)

**Problème :** Exécution Python simulée

**État actuel :**
```typescript
case 'pythonExecute':
  return { result: { success: true, message: "Python execution simulated" } };
```

**Pourquoi frontend impossible ?**
- Pas de runtime Python dans le navigateur
- Pyodide trop lourd pour workflows complexes
- Sécurité (code injection)

**Solution recommandée :**
```
Client → Python Runner API → Jupyter Kernel / Python Sandbox
```

---

## 📋 Résumé

| Agent | Méthodes simulées | Raison | Backend requis |
|-------|-------------------|---------|----------------|
| PowerShellAgent | 100% | Sécurité système | ✅ Critique |
| SystemIntegrationAgent | 100% | CORS, accès réseau | ✅ Critique |
| TransformAgent | Code exec | Sandboxing | ✅ Haute |
| WorkflowExecutor | Python | Runtime | ✅ Moyenne |

---

## 🚀 Pour Activer ces Fonctionnalités

### Option 1 : Backend complet Lisa

Déployer le backend Lisa avec :
- Node.js + Express
- Docker pour isolation
- PostgreSQL pour persistence
- Redis pour cache
- NGINX comme reverse proxy

### Option 2 : Services cloud

Utiliser services managés :
- AWS Lambda pour code execution
- Firebase Functions pour intégrations
- Supabase pour base de données

### Option 3 : Mode désactivé

Laisser ces agents désactivés et documenter :
```typescript
// Dans le frontend
if (agent.requiresBackend && !backendAvailable) {
  return {
    success: false,
    error: 'This agent requires backend deployment. See BACKEND_REQUIRED.md'
  };
}
```

---

## 🎯 Prochaines Étapes

1. ✅ Documenter limitations (ce fichier)
2. ⏳ Concevoir architecture backend
3. ⏳ Implémenter API Gateway
4. ⏳ Déployer services backend
5. ⏳ Mettre à jour frontend pour utiliser APIs

---

## Contact

Pour questions sur l'implémentation backend, consulter :
- Architecture document (à créer)
- API specification (à créer)
- Deployment guide (à créer)
