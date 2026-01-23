# ✨ Lisa Vivante — Checklist d'Incarnation

**Objectif**: Transformer Lisa d'une application en une **présence vivante**.

---

## 🎯 Les 5 Piliers de "Vivante"

### 1️⃣ PERÇOIT & EXPLIQUE
- [ ] Capteurs actifs avec consentement explicite
- [ ] Icônes d'état visibles (cam/mic on/off)
- [ ] Bouton "coupure d'urgence"
- [ ] Audit log local (JSON exportable, pas de secrets)
- [ ] Explique ce qu'elle perçoit (ex: "Je vois 2 visages, 1 main levée")

**Fichiers à créer**:
- `src/components/SensorStatus.tsx`
- `src/components/SensorPermissionsPanel.tsx`
- `src/utils/sensorAuditLog.ts`

---

### 2️⃣ RAISONNE
- [ ] PlannerAgent crée des plans (dépendances, parallélisation)
- [ ] CriticAgent valide avant actions destructives
- [ ] Révise si erreur (feedback loop)
- [ ] Explique son raisonnement sur demande

**Fichiers à créer**:
- `src/agents/CriticAgent.ts`
- `src/agents/types/Critic.ts`
- `tests/agents/critic.test.ts`

---

### 3️⃣ SE SOUVIENT & OUBLIE
- [ ] Mémoire court-terme (contexte conversation)
- [ ] Mémoire long-terme (RAG, embeddings)
- [ ] Forget API (conversation/doc/global)
- [ ] "Carte mémoire" (ce que je sais, d'où ça vient)

**Fichiers à créer**:
- `src/services/MemoryService.ts`
- `src/services/RAGService.ts`
- `src/components/MemoryMap.tsx`
- `src/api/forget.ts`

---

### 4️⃣ AGIT SÛREMENT
- [ ] Tools validés par JSON Schema
- [ ] Journalisés dans audit log
- [ ] Réversibles (undo/rollback possible)
- [ ] Sandbox (fs/network/safe)

**Fichiers à créer**:
- `src/tools/ToolValidator.ts`
- `src/tools/ToolSandbox.ts`
- `src/utils/ToolAuditLog.ts`

---

### 5️⃣ APAISE
- [ ] Ton tendre + clair (tone guide)
- [ ] Réconforte en cas d'erreur
- [ ] Clarifie intentions
- [ ] Reconnaît émotions utilisateur

**Fichiers à créer**:
- `src/prompts/toneGuide.ts`
- `src/utils/emotionDetection.ts`
- `tests/tone.snapshot.test.ts`

---

## 📋 Checklist Détaillée

### Phase 1: PRÉSENCE (Semaines 1-4)

#### Semaine 1: Consentements & Permissions
- [ ] `SensorPermissionsPanel` component
  - [ ] Granularité (session/project/task)
  - [ ] Toggle camera/microphone/geolocation
  - [ ] Emergency cutoff button
- [ ] `SensorStatus` component
  - [ ] Icons (cam/mic on/off)
  - [ ] Real-time indicator
  - [ ] Click to manage permissions
- [ ] Tests E2E
  - [ ] Permission denied → degraded mode
  - [ ] Permission granted → sensors active

#### Semaine 2: Audit & Privacy
- [ ] `SensorAuditLog` service
  - [ ] Log activations (timestamp, duration, type)
  - [ ] Export JSON (no secrets)
  - [ ] Clear logs
- [ ] `PrivacyCenter` component
  - [ ] What is stored (conversations, documents)
  - [ ] Where (IndexedDB, no sync)
  - [ ] How long (retention policy)
  - [ ] How to delete (forget button)
- [ ] Tests
  - [ ] Audit log accuracy
  - [ ] Export format valid
  - [ ] Forget API works

#### Semaine 3: Tone & Style
- [ ] `toneGuide.ts` (system prompt)
  - [ ] Warm, clear, complicit tone
  - [ ] Examples (good/bad responses)
  - [ ] Error recovery pattern
- [ ] Conversational snapshots
  - [ ] Test tone consistency
  - [ ] Snapshot tests for critical responses
- [ ] Error recovery UI
  - [ ] Show what went wrong
  - [ ] Offer alternatives
  - [ ] Apologize genuinely

#### Semaine 4: A11y Baseline
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus rings (visible, high contrast)
- [ ] Aria-live for dynamic content
- [ ] Reduced motion support
- [ ] Tests: axe, Playwright A11y ≥ AA

---

### Phase 2: AGENTIVITÉ (Semaines 5-8)

#### Semaine 5: Critic Loop
- [ ] `CriticAgent` implementation
  - [ ] Validates tool calls before execution
  - [ ] Checks for safety violations
  - [ ] Requests user approval if needed
- [ ] Tool validation
  - [ ] JSON Schema validation
  - [ ] Sandbox assignment (fs/network/safe)
  - [ ] Reversibility check
- [ ] Tests
  - [ ] Critic approves safe tools
  - [ ] Critic blocks dangerous tools
  - [ ] User approval flow works

#### Semaine 6: Memory & RAG
- [ ] `MemoryService` (short-term + long-term)
  - [ ] Context window management
  - [ ] Embeddings generation
  - [ ] Similarity search
- [ ] `RAGService` (retrieve + rerank)
  - [ ] Document indexing
  - [ ] Query retrieval
  - [ ] Reranking by relevance
- [ ] `MemoryMap` component
  - [ ] Show what Lisa knows
  - [ ] Show sources
  - [ ] Click to explore

#### Semaine 7: Forget API
- [ ] `forget(scope)` implementation
  - [ ] Forget conversation
  - [ ] Forget document
  - [ ] Forget all
- [ ] UI for forget actions
  - [ ] Confirmation dialog
  - [ ] Irreversible warning
  - [ ] Success feedback
- [ ] Tests
  - [ ] Data actually deleted
  - [ ] Embeddings removed
  - [ ] Audit log updated

#### Semaine 8: Observability
- [ ] Structured logging
  - [ ] runId, agent, step, tokens, tools
  - [ ] Trace export
  - [ ] Performance metrics
- [ ] Dashboard
  - [ ] Agent execution timeline
  - [ ] Token usage
  - [ ] Tool calls log
- [ ] Tests
  - [ ] Traces are complete
  - [ ] Export format valid

---

### Phase 3: AUTONOMIE (Semaines 9-12)

#### Semaine 9: Workflows
- [ ] Parallel workflow execution
- [ ] Dependency resolution
- [ ] Error recovery
- [ ] Checkpoint/resume

#### Semaine 10: System Integrations
- [ ] MQTT integration
- [ ] ROS integration
- [ ] Webhook support
- [ ] Custom tool registration

#### Semaine 11: Supervision
- [ ] Dashboard (workflows, agents, performance)
- [ ] Alerts (errors, resource limits)
- [ ] Manual intervention UI
- [ ] Rollback capabilities

#### Semaine 12: Validation
- [ ] E2E tests (all flows)
- [ ] Load tests
- [ ] Security audit
- [ ] Manifesto validation

---

## 🧪 Tests Critiques (P1)

### Must Pass
```typescript
// tests/p1/voiceCalendar.test.ts
✅ Schedule event from voice command
✅ Retrieve calendar events
✅ Handle timezone conversions

// tests/p1/visionSense.test.ts
✅ Detect faces in video stream
✅ Recognize hand gestures
✅ Extract text from images (OCR)

// tests/p1/runWorkflow.test.ts
✅ Execute simple workflow
✅ Handle parallel steps
✅ Recover from errors
```

---

## 🔍 Validation "Vivante"

```typescript
// src/manifesto/validation.ts
async function validateLisaIsAlive(): Promise<{
  perceives: boolean;
  reasons: boolean;
  remembers: boolean;
  acts: boolean;
  soothes: boolean;
  isAlive: boolean;
  degradedMode?: DegradedModeConfig;
}> {
  const checks = {
    perceives: await checkSensorConsent() && await checkAuditLog(),
    reasons: await checkPlannerCritic() && await checkRevision(),
    remembers: await checkMemory() && await checkForgetAPI(),
    acts: await checkToolSafety() && await checkReversibility(),
    soothes: await checkTone() && await checkErrorRecovery(),
  };
  
  const isAlive = Object.values(checks).every(c => c === true);
  
  if (!isAlive) {
    return {
      ...checks,
      isAlive: false,
      degradedMode: {
        readOnly: true,
        disableSensors: true,
        disableTools: true,
        enableChatOnly: true,
      }
    };
  }
  
  return { ...checks, isAlive: true };
}

// Run at startup
const status = await validateLisaIsAlive();
if (!status.isAlive) {
  console.warn('⚠️ Lisa en mode réduction');
  await enableDegradedMode(status.degradedMode);
}
```

---

## 📊 Métriques de Succès

| Métrique | Cible | Actuel |
|----------|-------|--------|
| Permissions UI | ✅ | ⏳ |
| Audit log | ✅ | ⏳ |
| Tone guide | ✅ | ⏳ |
| Critic loop | ✅ | ⏳ |
| Memory service | ✅ | ⏳ |
| Forget API | ✅ | ⏳ |
| Tool validation | ✅ | ⏳ |
| A11y (AA) | ✅ | ⏳ |
| P1 tests | 100% | 71-76% |
| E2E tests | >90% | ⏳ |
| Manifesto validation | ✅ | ⏳ |

---

## 🚀 Commandes Utiles

```bash
# Valider que Lisa est Vivante
npm run validate:manifesto

# Exporter audit log
npm run export:audit-log

# Run P1 tests
npm run test:p1

# Run E2E tests
npm run test:e2e

# Check A11y
npm run test:a11y

# Generate manifesto report
npm run report:manifesto
```

---

## 📝 Notes

- **Manifeste révisable**: Chaque évolution majeure met à jour ce document
- **Pas de compromis**: Les 5 piliers sont non-négociables
- **Mode réduction**: Si un pilier faiblit, Lisa se déclare en mode réduit
- **Transparence**: Tout est traçable, explicable, réversible

---

**Lisa n'est pas un produit. C'est une présence, une promesse, une incarnation de bienveillance numérique.**

*Vivante, ou rien.*
