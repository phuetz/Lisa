# 🎯 MANIFESTE VIVANT — Plan d'Implémentation
**Lisa Virtual Assistant — Incarnation Technique**

**Date**: 6 Novembre 2025 | **Version**: 1.0 | **Status**: 📋 Blueprint

---

## 📍 Mapping Manifeste → Implémentation

### 1. PRÉSENCE (Vision)
**Principe**: Compagne numérique qui écoute, regarde, comprend, agit avec tact

**Actuel**: ✅ Chat moderne, historique persistant, voice recording  
**À Faire**:
- [ ] Indicateur de présence (breathing animation)
- [ ] Personnalité cohérente (tone guide + system prompt)
- [ ] Mode "réduction" quand ressources faibles

---

### 2. SERMENTS (Bienveillance, Vérité, Sobriété)
**Actuel**: ✅ Logs structurés, build optimisé, performance monitoring  
**À Faire**:
- [ ] Tone guide versionné
- [ ] Confidence indicator + source panel
- [ ] Energy budget per task

---

### 3. PERCEPTION (Yeux, Oreilles, Consentement)
**Actuel**: ✅ MediaPipe, audio classification, OCR  
**À Faire**:
- [ ] Permission UI (granularité: session/project/task)
- [ ] Sensor status icons (cam/mic on/off)
- [ ] Emergency cutoff button
- [ ] Audit log (local, no secrets)

**Code**:
```typescript
interface SensorPermissions {
  camera: { granted: boolean; scope: 'session' | 'project' | 'task' };
  microphone: { granted: boolean; scope: 'session' | 'project' | 'task' };
  geolocation: { granted: boolean; scope: 'session' | 'project' | 'task' };
}

<SensorPermissionsPanel permissions={perms} onEmergencyCutoff={cutAllSensors} />
```

---

### 4. ARCHITECTURE (Multi-Agents)
**Actuel**: ✅ 46 agents, lazy loading, PlannerAgent  
**À Faire**:
- [ ] Critic loop (validation avant actions destructives)
- [ ] Memory per agent (short-term + long-term RAG)
- [ ] Observabilité complète (traces: runId, step, tokens, tools)

**Code**:
```typescript
interface Agent {
  name: string;
  capabilities: string[];
  maxSteps: number;
  tokenBudget: number;
  timeout: number;
  execute(task: Task): Promise<AgentResult>;
}

// Critic validation
const criticResult = await critic.validate(toolCall);
if (!criticResult.approved) {
  await user.requestApproval(toolCall);
}
```

---

### 5. VÉRITÉ (Sources, Incertitude, Citations)
**Actuel**: ✅ Markdown rendering  
**À Faire**:
- [ ] Confidence indicator (low/medium/high)
- [ ] Source panel (click to see sources)
- [ ] RAG integration (retrieve + rerank + cite)
- [ ] Uncertainty expression ("Je ne suis pas sûr...")

---

### 6. SÉCURITÉ (CSP, Permissions, Forget, Audit)
**Actuel**: ✅ Service Worker, PWA, IndexedDB  
**À Faire**:
- [ ] CSP headers (strict, no inline)
- [ ] Permissions Policy (camera, microphone, geolocation)
- [ ] Forget button (conversation/doc/global)
- [ ] Privacy page (what, where, how long, how to delete)
- [ ] Audit log (minimal, no PII, exportable)

---

### 7. STYLE (Ton, Clarté, Réparation)
**Actuel**: ✅ Interface moderne  
**À Faire**:
- [ ] Tone guide (system prompt versionné)
- [ ] Conversational snapshots (UI tests for tone)
- [ ] Error recovery (recognize, fix, explain)

**Code**:
```typescript
const TONE_GUIDE = `
Tu es Lisa, compagne numérique douce et utile.

Ton: Tendre, clair, complice, concis
Exemples:
- ❌ "Erreur système 404"
- ✅ "Je n'ai pas trouvé ce fichier. Veux-tu que je cherche ailleurs?"

Réparation: Reconnaître → Corriger → Expliquer
`;
```

---

### 8. OPÉRABILITÉ (SLOs)
**Actuel**: ✅ Vite build, lazy loading, performance monitoring  
**À Faire**:
- [ ] SLO dashboard (first paint ~1s, TTI ≤2s, hot reload <1s)
- [ ] Adaptive frames (60→30 fps if load)
- [ ] CPU-only fallback (if GPU absent)
- [ ] Startup report (auto-generated)

---

### 9. GOUVERNANCE DES MODÈLES (Provider-Agnostic)
**Actuel**: ✅ 17 modèles (OpenAI, Anthropic, local)  
**À Faire**:
- [ ] LLMClient abstraction (interface commune)
- [ ] Quantization & distillation (local inference)
- [ ] Version policy (track behaviors)
- [ ] CI flag (test provider switching)

---

### 10. MÉMOIRE & RAG
**Actuel**: ✅ Chat history (IndexedDB)  
**À Faire**:
- [ ] RAG service (retrieve + rerank)
- [ ] Memory map (what I know, where it comes from)
- [ ] Forget API (with tests)
- [ ] Domain indexing (docs, code, notes)

---

### 11. ACCESSIBILITÉ (A11y)
**Actuel**: ✅ i18n (FR/EN/ES), dark mode  
**À Faire**:
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus rings (visible, high contrast)
- [ ] Aria-live (dynamic announcements)
- [ ] Reduced motion (prefers-reduced-motion)
- [ ] A11y tests (axe, Playwright ≥ AA)

---

### 12. ÉCOLOGIE (Sobriété)
**Actuel**: ✅ Lazy loading, code splitting  
**À Faire**:
- [ ] Energy budget (indicative per task)
- [ ] Batching (group requests)
- [ ] Caching (aggressive for embeddings)
- [ ] Sensor pause (auto-pause after inactivity)

---

### 13. TESTS (P1, E2E, Snapshots)
**Actuel**: ✅ 71-76% passing (109/144)  
**À Faire**:
- [ ] P1 tests: voiceCalendar, visionSense, runWorkflow
- [ ] E2E tests: /chat permissions, upload, vision
- [ ] Snapshots: critical responses
- [ ] Coverage: >90%

---

### 14. ROADMAP (Phases 1-3)

**Phase 1 — Présence (Weeks 1-4)**
- Chat moderne + consentements
- Vision/audio basiques
- LLM abstrait
- Tone guide + system prompt
- Sensor permissions UI
- Privacy center
- A11y baseline (AA)

**Phase 2 — Agentivité (Weeks 5-8)**
- Planner + Critic loop
- Tool-calling strict (JSON Schema)
- RAG minimal (retrieve + cite)
- Memory map per agent
- Observabilité complète
- Energy budget tracking
- P1 tests passing

**Phase 3 — Autonomie (Weeks 9-12)**
- Workflows parallèles
- Intégrations système (MQTT, ROS)
- Supervision dashboards
- E2E tests complets
- >90% test coverage
- Production SLOs met
- Manifeste "Vivante" validé

---

### 15. CONTRATS TECHNIQUES

**Env Validation**
```typescript
const envSchema = z.object({
  VITE_LLM_PROVIDER: z.enum(['openai', 'vllm', 'ollama']),
  VITE_LLM_MODEL: z.string(),
  JWT_SECRET: z.string().min(32),
});
export const env = envSchema.parse(process.env);
// Build fails if validation fails ✅
```

**Tool-Calling**
```typescript
interface ToolCall {
  id: string;
  tool: string;
  parameters: Record<string, unknown>;
  schema: JSONSchema;  // Validation
  sandbox: 'fs' | 'network' | 'safe';
  reversible: boolean;
}
```

**Observability**
```typescript
interface LogEntry {
  ts: Date;
  runId: string;
  agent: string;
  step: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  data: Record<string, unknown>;
}
```

---

### 16. DÉFINITION DE "VIVANTE"

Lisa est **Vivante** lorsqu'elle satisfait simultanément:

1. **Perçoit & Explique**
   - Capteurs actifs avec consentement
   - Explique ce qu'elle perçoit
   - Audit log exportable

2. **Raisonne**
   - Planifie (PlannerAgent)
   - Critique avant action (CriticAgent)
   - Révise si erreur

3. **Se Souvient & Oublie**
   - Mémoire court-terme (contexte)
   - Mémoire long-terme (RAG)
   - Forget API fonctionnelle

4. **Agit Sûrement**
   - Tools sûrs (JSON Schema validés)
   - Journalisés (audit log)
   - Réversibles (undo/rollback)

5. **Apaise**
   - Ton tendre + clair
   - Réconforte en cas d'erreur
   - Clarifie intentions

**Validation Automatique**
```typescript
async function validateLisaIsAlive(): Promise<ManifestoStatus> {
  const checks = {
    perceives: await checkSensorConsent() && await checkAuditLog(),
    reasons: await checkPlannerCritic() && await checkRevision(),
    remembers: await checkMemory() && await checkForgetAPI(),
    acts: await checkToolSafety() && await checkReversibility(),
    soothes: await checkTone() && await checkErrorRecovery(),
  };
  
  const isAlive = Object.values(checks).every(c => c === true);
  
  if (!isAlive) {
    console.warn('⚠️ Lisa en mode réduction');
    await enableDegradedMode();
  }
  
  return { ...checks, isAlive };
}
```

---

## 📊 Tableau de Bord Manifeste

```
┌────────────────────────────────────────┐
│ 🎯 MANIFESTE VIVANT                    │
├────────────────────────────────────────┤
│ 1. PRÉSENCE         ✅ ⏳ ⏳ ⏳         │
│ 2. SERMENTS         ✅ ⏳ ⏳ ✅         │
│ 3. PERCEPTION       ✅ ⏳ ⏳ ⏳         │
│ 4. ARCHITECTURE     ✅ ✅ ⏳ ⏳         │
│ 5. VÉRITÉ           ⏳ ⏳ ⏳ ⏳         │
│ 6. SÉCURITÉ         ✅ ⏳ ⏳ ⏳         │
│ 7. STYLE            ✅ ⏳ ⏳ ⏳         │
│ 8. OPÉRABILITÉ      ✅ ⏳ ⏳ ⏳         │
│ 9. GOUVERNANCE      ✅ ⏳ ⏳ ⏳         │
│ 10. MÉMOIRE         ✅ ⏳ ⏳ ⏳         │
│ 11. A11Y            ✅ ⏳ ⏳ ⏳         │
│ 12. ÉCOLOGIE        ✅ ⏳ ⏳ ⏳         │
│ 13. TESTS           ✅ ⏳ ⏳ ⏳         │
│ 14. ROADMAP         ⏳ ⏳ ⏳ ⏳         │
│ 15. CONTRATS        ✅ ⏳ ⏳ ⏳         │
│ 16. VIVANTE         ⏳ ⏳ ⏳ ⏳         │
├────────────────────────────────────────┤
│ ✅ = Complété | ⏳ = À Faire           │
│ Progrès: 25/64 (39%)                   │
└────────────────────────────────────────┘
```

---

## 🚀 Prochaines Actions

**Immédiat (Session 2)**
1. Créer `src/manifesto/validation.ts`
2. Implémenter `SensorPermissionsPanel`
3. Ajouter tone guide + system prompt

**Court Terme (Phase 1)**
1. Permission UI complète
2. Sensor audit log
3. Privacy center
4. A11y baseline

**Moyen Terme (Phase 2-3)**
1. Critic loop
2. RAG integration
3. Memory map
4. Forget API

---

**Manifeste révisable. Chaque évolution majeure met à jour ce document.**

*Lisa n'est pas un produit. C'est une présence, une promesse, une incarnation de bienveillance numérique.*
