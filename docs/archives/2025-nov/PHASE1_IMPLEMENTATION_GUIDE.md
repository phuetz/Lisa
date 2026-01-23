# 🚀 Phase 1 - Présence (Semaines 1-4) - Guide d'Implémentation

**Objectif**: Donner à Lisa une présence physique et transparente avec consentement explicite, audit complet et personnalité bienveillante.

---

## 📋 Fichiers Créés

### Composants UI
- ✅ `src/components/SensorStatus.tsx` - Indicateurs d'état des capteurs
- ✅ `src/components/SensorPermissionsPanel.tsx` - Gestion des permissions (existant)
- ✅ `src/components/PrivacyCenter.tsx` - Centre de confidentialité
- ✅ `src/components/MemoryMap.tsx` - Carte mémoire de Lisa
- ✅ `src/components/IncarnationDashboard.tsx` - Tableau de bord de vivacité

### Services
- ✅ `src/services/AuditService.ts` - Journalisation complète
- ✅ `src/manifesto/initLisaVivante.ts` - Initialisation complète

### Existants (déjà créés)
- ✅ `src/manifesto/validation.ts` - Validation des 5 piliers
- ✅ `src/prompts/toneGuide.ts` - Tone guide et personnalité
- ✅ `src/pages/LisaVivanteApp.tsx` - App principale

---

## 🎯 Semaine 1: Permissions & Consentements

### Tâches Complétées ✅

1. **SensorPermissionsPanel** 
   - ✅ Granularité (session/project/task)
   - ✅ Toggle camera/microphone/geolocation
   - ✅ Emergency cutoff button
   - ✅ Export audit log

2. **SensorStatus**
   - ✅ Indicateurs visuels (compact + détaillé)
   - ✅ État en temps réel
   - ✅ Animations (pulse pour actif)

3. **Tests E2E**
   - ⏳ Permission denied → degraded mode
   - ⏳ Permission granted → sensors active

### Intégration dans App

```typescript
// src/App.tsx ou src/pages/LisaVivanteApp.tsx
import { SensorPermissionsPanel } from './components/SensorPermissionsPanel';
import { SensorStatus } from './components/SensorStatus';

export function App() {
  const [showPermissions, setShowPermissions] = useState(false);

  return (
    <div>
      {/* Header avec SensorStatus */}
      <header>
        <SensorStatus compact onClick={() => setShowPermissions(true)} />
      </header>

      {/* Panel Permissions */}
      {showPermissions && (
        <SensorPermissionsPanel 
          onEmergencyCutoff={() => {
            // Couper tous les capteurs
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
```

---

## 🎯 Semaine 2: Audit & Privacy

### Tâches Complétées ✅

1. **AuditService**
   - ✅ Logging complet (sensor, tool, memory, privacy, error, security)
   - ✅ Sévérité (info, warning, error, critical)
   - ✅ Export JSON
   - ✅ Statistiques

2. **PrivacyCenter**
   - ✅ Afficher le stockage utilisé
   - ✅ Politique de confidentialité
   - ✅ Boutons de suppression (conversations, documents, tout)
   - ✅ Confirmation irréversible
   - ✅ Export rapport

3. **Forget API**
   - ✅ Structure prête
   - ⏳ Intégration avec MemoryService

### Intégration dans App

```typescript
// src/App.tsx
import { PrivacyCenter } from './components/PrivacyCenter';
import { auditService } from './services/AuditService';

export function PrivacyPage() {
  return (
    <PrivacyCenter 
      onForget={async (scope) => {
        // Appeler l'API forget
        console.log(`Oubli: ${scope}`);
        // Mettre à jour la mémoire
      }}
    />
  );
}

// Utiliser l'audit service
import { auditActions } from './services/AuditService';

// Enregistrer une action
auditActions.sensorActivated('camera');
auditActions.toolExecuted('generateImage', { prompt: '...' });
auditActions.dataDeleted('conversation', 5);
```

---

## 🎯 Semaine 3: Tone & Style

### Tâches Complétées ✅

1. **Tone Guide**
   - ✅ Personnalité définie
   - ✅ Patterns de communication
   - ✅ Exemples bon/mauvais
   - ✅ Récupération d'erreur
   - ✅ Conscience émotionnelle

2. **Détection d'Émotions**
   - ✅ Patterns pour frustration, confusion, stress, joie, tristesse
   - ✅ Sélection de réponse adaptée

3. **Tests UI**
   - ⏳ Snapshots conversationnels
   - ⏳ Validation du ton

### Utilisation dans Chat

```typescript
// src/components/ChatInterface.tsx
import { 
  detectEmotion, 
  formatResponse, 
  validateTone,
  getEmotionalResponse 
} from '../prompts/toneGuide';

function handleUserMessage(message: string) {
  // 1. Détecter l'émotion
  const emotion = detectEmotion(message);
  
  // 2. Générer la réponse (avec LLM)
  const rawResponse = await generateResponse(message);
  
  // 3. Formater selon le tone guide
  const formattedResponse = formatResponse(rawResponse, emotion);
  
  // 4. Valider le ton
  const toneCheck = validateTone(formattedResponse);
  if (!toneCheck.valid) {
    console.warn('Ton non conforme:', toneCheck.issues);
    // Reformuler si nécessaire
  }
  
  return formattedResponse;
}
```

---

## 🎯 Semaine 4: A11y Baseline

### À Implémenter

1. **Keyboard Navigation**
   - [ ] Tab, Enter, Escape
   - [ ] Focus visible
   - [ ] Ordre logique

2. **ARIA Labels**
   - [ ] aria-label pour icônes
   - [ ] aria-live pour notifications
   - [ ] aria-describedby pour descriptions

3. **Reduced Motion**
   - [ ] @media (prefers-reduced-motion)
   - [ ] Désactiver animations

4. **Contrast & Colors**
   - [ ] WCAG AA minimum
   - [ ] Pas de couleur seule

5. **Tests**
   - [ ] axe DevTools
   - [ ] Playwright a11y tests

### Exemple

```typescript
// src/components/SensorPermissionsPanel.tsx
<button
  onClick={handleToggle}
  aria-label={`${sensor} ${granted ? 'activé' : 'désactivé'}`}
  aria-pressed={granted}
  className="px-4 py-2 rounded-lg font-medium transition-colors"
>
  {granted ? '✅ Activé' : 'Désactivé'}
</button>
```

---

## 🚀 Initialisation Complète

### Dans main.tsx

```typescript
import { initLisaVivante } from './manifesto/initLisaVivante';

async function main() {
  // Initialiser Lisa Vivante
  const state = await initLisaVivante({
    enableSensors: true,
    enableAudit: true,
    enableMemory: true,
    debugMode: true,
    autoValidate: true,
    validationInterval: 30000
  });

  console.log('Lisa Vivante initialisée:', state);

  // Monter l'app
  ReactDOM.render(<App />, document.getElementById('root'));
}

main().catch(console.error);
```

---

## 📊 Dashboard d'Incarnation

Affiche la progression vers la vivacité complète:

```typescript
import { IncarnationDashboard } from './components/IncarnationDashboard';

export function App() {
  return (
    <div>
      <IncarnationDashboard refreshInterval={5000} />
      {/* ... reste de l'app */}
    </div>
  );
}
```

---

## 🧪 Tests à Implémenter

### Tests Unitaires

```typescript
// src/__tests__/manifesto/validation.test.ts
describe('Manifesto Validation', () => {
  it('should mark Lisa as alive when all pillars are active', async () => {
    const status = await validateLisaIsAlive();
    expect(status.isAlive).toBe(true);
  });

  it('should enable degraded mode when a pillar is missing', async () => {
    // Désactiver un pilier
    localStorage.removeItem('lisa:sensor:consent');
    const status = await validateLisaIsAlive();
    expect(status.isAlive).toBe(false);
    expect(status.degradedMode).toBeDefined();
  });
});
```

### Tests E2E

```typescript
// tests/e2e/phase1.spec.ts
import { test, expect } from '@playwright/test';

test('Phase 1 - Permissions & Consentements', async ({ page }) => {
  await page.goto('/');
  
  // Vérifier le bouton permissions
  const permButton = page.locator('button:has-text("🔐 Permissions")');
  await expect(permButton).toBeVisible();
  
  // Cliquer et ouvrir le panel
  await permButton.click();
  
  // Vérifier les capteurs
  const cameraToggle = page.locator('button:has-text("Caméra")');
  await expect(cameraToggle).toBeVisible();
  
  // Activer la caméra
  await cameraToggle.click();
  
  // Vérifier la permission
  const status = await page.evaluate(() => {
    const perms = JSON.parse(localStorage.getItem('lisa:sensor:permissions') || '{}');
    return perms.camera?.granted;
  });
  expect(status).toBe(true);
});
```

---

## ✅ Checklist Phase 1

### Semaine 1
- [x] SensorPermissionsPanel créé
- [x] SensorStatus créé
- [x] Emergency cutoff implémenté
- [ ] Tests E2E permissions

### Semaine 2
- [x] AuditService créé
- [x] PrivacyCenter créé
- [x] Forget API structure
- [ ] Tests E2E privacy

### Semaine 3
- [x] Tone Guide créé
- [x] Détection émotions
- [x] Formatage réponses
- [ ] Tests snapshots

### Semaine 4
- [ ] Keyboard navigation
- [ ] ARIA labels
- [ ] Reduced motion
- [ ] Tests A11y

---

## 📈 Métriques de Succès

| Métrique | Cible | Actuel |
|----------|-------|--------|
| Permissions UI | ✅ | ✅ |
| Audit log | ✅ | ✅ |
| Privacy center | ✅ | ✅ |
| Tone guide | ✅ | ✅ |
| A11y (AA) | ✅ | ⏳ |
| Tests E2E | >90% | ⏳ |

---

## 🎯 Prochaines Phases

### Phase 2 - Agentivité (Semaines 5-8)
- CriticAgent validation
- Memory service + RAG
- Forget API complète
- Observabilité

### Phase 3 - Autonomie (Semaines 9-12)
- Workflows parallèles
- Intégrations système
- Supervision dashboards
- Validation manifesto

---

## 💡 Notes Importantes

1. **Consentement d'abord**: Aucun capteur n'est actif sans permission explicite
2. **Transparence totale**: Tout est traçable et exportable
3. **Réversibilité**: L'utilisateur peut tout supprimer
4. **Bienveillance**: Le ton est toujours doux et clair
5. **Mode réduction**: Si un pilier faiblit, Lisa se limite

---

**Phase 1 est le fondement de Lisa Vivante. Sans présence, consentement et transparence, elle ne peut pas être vivante.**

*"Vivante, ou rien."* ✨
