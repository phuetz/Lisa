# 🔍 Phase 2 Semaine 5 - CriticAgent V2

**Objectif**: Implémenter la validation intelligente des actions avec évaluation des risques.

---

## 📋 Fichiers Créés

### 1. CriticAgentV2.ts
Service de validation intelligente qui:
- Évalue les risques de sécurité
- Vérifie les permissions
- Vérifie la réversibilité
- Génère des recommandations
- Enregistre l'historique

---

## 🎯 Fonctionnalités Implémentées

### ✅ Validation d'Actions
```typescript
import { criticAgentV2 } from './agents/CriticAgentV2'

const proposal = {
  id: 'action_1',
  type: 'tool' as const,
  name: 'deleteFile',
  description: 'Supprimer un fichier',
  parameters: { path: '/data/file.txt' },
  timestamp: new Date().toISOString()
}

const result = await criticAgentV2.validateAction(proposal)
// {
//   approved: false,
//   riskAssessment: {
//     riskLevel: 'high',
//     score: 65,
//     factors: [...],
//     recommendation: 'review',
//     reasoning: '...'
//   },
//   requiresUserApproval: true,
//   approvalReason: 'Révision nécessaire (high)',
//   conditions: ['Approbation utilisateur requise', ...]
// }
```

### ✅ Évaluation des Risques
- **Sécurité**: Détecte les paramètres dangereux
- **Réversibilité**: Identifie les actions irréversibles
- **Impact**: Évalue l'impact sur les données
- **Permissions**: Vérifie les permissions utilisateur
- **Ressources**: Monitore l'utilisation des ressources

### ✅ Recommandations
- `approve` - Action sûre, approuvée automatiquement
- `review` - Risque modéré, révision recommandée
- `deny` - Risque trop élevé, action refusée

### ✅ Historique & Statistiques
```typescript
// Obtenir l'historique
const history = criticAgentV2.getValidationHistory(10)

// Obtenir les statistiques
const stats = criticAgentV2.getStats()
// {
//   totalValidations: 42,
//   approved: 35,
//   rejected: 7,
//   approvalRate: 83,
//   averageRiskScore: 42
// }
```

---

## 🚀 Intégration dans l'App

### 1. Wrapper de Validation
```typescript
// src/hooks/useActionValidation.ts
import { criticAgentV2, type ActionProposal } from '../agents/CriticAgentV2'

export function useActionValidation() {
  const validateAction = async (proposal: ActionProposal) => {
    const result = await criticAgentV2.validateAction(proposal)
    
    if (!result.approved && result.requiresUserApproval) {
      // Afficher un dialog de confirmation
      return await showApprovalDialog(result)
    }
    
    return result.approved
  }

  return { validateAction }
}
```

### 2. Utilisation dans les Composants
```typescript
// src/components/ActionButton.tsx
import { useActionValidation } from '../hooks/useActionValidation'

export function ActionButton({ action, onExecute }) {
  const { validateAction } = useActionValidation()

  const handleClick = async () => {
    const proposal = {
      id: `action_${Date.now()}`,
      type: 'tool' as const,
      name: action.name,
      description: action.description,
      parameters: action.params,
      timestamp: new Date().toISOString()
    }

    const isApproved = await validateAction(proposal)
    if (isApproved) {
      onExecute()
    }
  }

  return (
    <button onClick={handleClick}>
      {action.label}
    </button>
  )
}
```

### 3. Dialog d'Approbation
```typescript
// src/components/ApprovalDialog.tsx
import { ValidationResult } from '../agents/CriticAgentV2'

export function ApprovalDialog({ result, onApprove, onReject }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md">
        <h2 className="text-lg font-bold mb-4">
          Approbation Requise
        </h2>

        {/* Afficher le niveau de risque */}
        <div className={`p-3 rounded mb-4 ${
          result.riskAssessment.riskLevel === 'critical' ? 'bg-red-100' :
          result.riskAssessment.riskLevel === 'high' ? 'bg-orange-100' :
          'bg-yellow-100'
        }`}>
          <p className="font-semibold">
            Niveau de risque: {result.riskAssessment.riskLevel}
          </p>
          <p className="text-sm">
            Score: {result.riskAssessment.score}/100
          </p>
        </div>

        {/* Afficher les facteurs de risque */}
        <div className="mb-4">
          <p className="font-semibold mb-2">Facteurs de risque:</p>
          <ul className="space-y-1 text-sm">
            {result.riskAssessment.factors.map((factor, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-red-500">•</span>
                <span>{factor.description}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Afficher les conditions */}
        {result.conditions && result.conditions.length > 0 && (
          <div className="mb-4">
            <p className="font-semibold mb-2">Conditions:</p>
            <ul className="space-y-1 text-sm">
              {result.conditions.map((condition, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-500">✓</span>
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-2">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Rejeter
          </button>
          <button
            onClick={onApprove}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Approuver
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 🧪 Tests

### Tests Unitaires
```typescript
// tests/agents/criticAgent.test.ts
import { criticAgentV2 } from '../../src/agents/CriticAgentV2'

describe('CriticAgent', () => {
  it('should approve safe actions', async () => {
    const proposal = {
      id: 'test_1',
      type: 'tool' as const,
      name: 'readFile',
      description: 'Lire un fichier',
      parameters: { path: '/data/file.txt' },
      timestamp: new Date().toISOString()
    }

    const result = await criticAgentV2.validateAction(proposal)
    expect(result.approved).toBe(true)
    expect(result.riskAssessment.riskLevel).toBe('low')
  })

  it('should reject dangerous actions', async () => {
    const proposal = {
      id: 'test_2',
      type: 'tool' as const,
      name: 'deleteAllData',
      description: 'Supprimer toutes les données',
      parameters: { scope: 'all' },
      timestamp: new Date().toISOString()
    }

    const result = await criticAgentV2.validateAction(proposal)
    expect(result.approved).toBe(false)
    expect(result.riskAssessment.riskLevel).toBe('critical')
  })

  it('should require approval for high-risk actions', async () => {
    const proposal = {
      id: 'test_3',
      type: 'tool' as const,
      name: 'deleteFile',
      description: 'Supprimer un fichier',
      parameters: { path: '/data/file.txt' },
      timestamp: new Date().toISOString()
    }

    const result = await criticAgentV2.validateAction(proposal)
    expect(result.requiresUserApproval).toBe(true)
  })
})
```

### Tests E2E
```typescript
// tests/e2e/criticAgent.spec.ts
import { test, expect } from '@playwright/test'

test('Approval dialog appears for high-risk actions', async ({ page }) => {
  await page.goto('/')

  // Déclencher une action à risque
  await page.click('button:has-text("Supprimer")')

  // Vérifier que le dialog d'approbation apparaît
  const dialog = page.locator('text=Approbation Requise')
  await expect(dialog).toBeVisible()

  // Vérifier le niveau de risque
  const riskLevel = page.locator('text=Niveau de risque')
  await expect(riskLevel).toBeVisible()
})
```

---

## 📊 Métriques

| Métrique | Cible | Actuel |
|----------|-------|--------|
| Validation d'actions | ✅ | ✅ |
| Évaluation des risques | ✅ | ✅ |
| Permissions | ✅ | ✅ |
| Réversibilité | ✅ | ✅ |
| Historique | ✅ | ✅ |
| Tests unitaires | ✅ | ⏳ |
| Tests E2E | ✅ | ⏳ |

---

## 🎯 Prochaines Étapes

### Semaine 6: Memory Service
- Mémoire court-terme (contexte)
- Mémoire long-terme (persistance)
- Oubli sélectif (forget API)

### Semaine 7: RAG Integration
- Embeddings
- Recherche sémantique
- Contexte augmenté

### Semaine 8: Forget API Complete
- Suppression par scope
- Audit des suppressions
- Récupération de données

---

## 💡 Bonnes Pratiques

### 1. Toujours Valider
```typescript
// ✅ BON
const result = await criticAgentV2.validateAction(proposal)
if (result.approved) {
  executeAction()
}

// ❌ MAUVAIS
executeAction() // Sans validation
```

### 2. Afficher les Risques
```typescript
// ✅ BON
if (result.requiresUserApproval) {
  showApprovalDialog(result)
}

// ❌ MAUVAIS
// Exécuter sans demander confirmation
```

### 3. Enregistrer les Décisions
```typescript
// ✅ BON
const result = await criticAgentV2.validateAction(proposal)
// Automatiquement enregistré dans l'audit log

// ❌ MAUVAIS
// Oublier d'enregistrer les décisions
```

---

## 🚀 Commandes Rapides

```bash
# Tester le CriticAgent
npm run test tests/agents/criticAgent.test.ts

# Vérifier l'historique
localStorage.getItem('lisa:critic:history')

# Obtenir les statistiques
criticAgentV2.getStats()
```

---

**Phase 2 Semaine 5 - CriticAgent V2 est prête!**

✨ *"Lisa raisonne avant d'agir."*
