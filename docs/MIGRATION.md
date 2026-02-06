# Migration Guide - Lisa AI v2.0

> **From**: v1.0 (Monolithic with scattered registries)
> **To**: v2.0 (Modular with unified architecture)
> **Date**: 2026-02-06
> **Status**: Complete Phase 4 Restructuration

---

## Overview

This guide helps developers and teams migrate projects from Lisa v1.0 to v2.0, which features:
- **Unified agent registry** (instead of 3 duplicates)
- **SenseCoordinator** (instead of fragmented sense implementations)
- **ToolRegistry** (instead of 8 scattered services)
- **1,390+ unit tests** with 73% agent coverage
- **Modular feature-based organization**

---

## 1. Quick Start

### Minimum Changes Required

If you're just using Lisa as a library:

```typescript
// OLD v1.0
import { agentRegistry } from '../agents/registry';
import { visionSense } from '../senses/vision';
import { hearingSense } from '../senses/hearing';

// NEW v2.0
import { agentRegistry } from '@lisa/features/agents/core/registry';
import { visionSense } from '@lisa/features/vision/api';
import { hearingSense } from '@lisa/features/hearing/api';
```

**Breaking Changes**: None if you're using stable APIs
**Migration Time**: 5-15 minutes for most projects

---

## 2. Agent System Migration

### 2.1 Agent Registry Changes

#### Before (v1.0)
```typescript
// File 1: src/agents/registry.ts
export const registry = new AgentRegistry([
  new CoordinatorAgent(),
  new EmailAgent(),
  // ... manually registered agents
]);

// File 2: src/features/agents/core/registry.ts
export const agentRegistry = createRegistry([
  // ... another list of agents
]);

// File 3: src/features/agents/implementations/AgentRegistry.ts
// Third duplicate!
```

#### After (v2.0)
```typescript
// Single source of truth: src/features/agents/core/registry.ts
export const agentRegistry: AgentRegistry = new AgentRegistry();

// Agents defined in agentDefinitions array:
const agentDefinitions: [string, string][] = [
  ['CoordinatorAgent', '../implementations/CoordinatorAgent'],
  ['EmailAgent', '../implementations/EmailAgent'],
  // ... 60+ agents, lazy-loaded on demand
];
```

### 2.2 Using the Registry

#### Before (v1.0)
```typescript
// Unsafe - runtime errors if agent doesn't exist
const agent = registry.get('UnknownAgent'); // Could return undefined
await agent.execute(props); // May crash

// Multiple registries to check
const agent2 = agentRegistry.getAgent('SomeAgent');
const agent3 = from implementation.AgentRegistry...
```

#### After (v2.0)
```typescript
// Type-safe with lazy loading
const agent = await agentRegistry.getAgentAsync('EmailAgent');
if (agent) {
  const result = await agent.execute({ intent: 'send', parameters: {} });
  console.log(result.success); // Guaranteed to have success field
}

// Or direct execute (cleaner)
const result = await agentRegistry.execute('EmailAgent', {
  intent: 'send',
  parameters: { to: 'user@example.com', body: '...' }
});
```

### 2.3 Creating New Agents

#### Before (v1.0)
```typescript
// src/agents/MyAgent.ts
export class MyAgent implements BaseAgent {
  name = 'MyAgent';
  // ...
}

// Then manually register in:
// 1. src/agents/registry.ts
// 2. src/features/agents/core/registry.ts
// 3. src/features/agents/implementations/AgentRegistry.ts (maybe)
```

#### After (v2.0)
```typescript
// src/features/agents/implementations/MyAgent.ts
export class MyAgent implements BaseAgent {
  name = 'MyAgent';
  // ...
}

// Register in ONE place: src/features/agents/core/registry.ts
const agentDefinitions: [string, string][] = [
  // ...existing agents...
  ['MyAgent', '../implementations/MyAgent'], // Add here
];
```

---

## 3. Perception Layer Migration

### 3.1 Sense Imports

#### Before (v1.0)
```typescript
// Multiple import paths for same functionality
import { visionSense as vs1 } from '../senses/vision';
import { visionSense as vs2 } from '../features/vision/vision';
import { detectObjects } from '../features/vision/worker';

// Inconsistent usage
vs1.getPercepts();
vs2.getObjects();
detectObjects(canvas); // What's the difference?
```

#### After (v2.0)
```typescript
// Unified entry points
import { visionSense } from '@lisa/features/vision/api';
import { hearingSense } from '@lisa/features/hearing/api';
import { touchSense } from '@lisa/senses/touch';

// Consistent API
const objects = await visionSense.detectObjects(canvas);
const transcription = await hearingSense.transcribeAudio(buffer);
const touchData = touchSense.getPercepts();

// Or use unified hook
const { percepts } = useSenses({
  enableVision: true,
  enableHearing: true
});
```

### 3.2 SenseCoordinator Integration

#### Before (v1.0)
```typescript
// Managing senses separately
const visionPercepts = useVisionStore(state => state.percepts);
const audioPercepts = useAudioStore(state => state.percepts);
const touchData = getTouchData(); // Where's this coming from?

// Inconsistent state management
updateVisionPercepts(...);
setAudioPercepts(...);
// What about the others?
```

#### After (v2.0)
```typescript
// Unified sense management
const coordinator = SenseCoordinator.getInstance();

// Subscribe to all senses
const unsubscribe = coordinator.subscribeAll((percept) => {
  console.log(`${percept.modality}: ${percept.confidence}`);
});

// Or specific sense
coordinator.subscribe('vision', (vision: VisionPercept) => {
  console.log('Objects:', vision.objects);
});

// Health check
const health = coordinator.getHealthStatus();
console.log(`Vision: ${health.vision.status}`);
```

---

## 4. State Management Migration

### 4.1 Store Consolidation

#### Before (v1.0)
```typescript
// Scattered stores
import { visionAudioStore } from '../store/visionAudioStore';
import { appStore } from '../store/appStore';
import { configStore } from '../store/configStore';
import { workflowStore } from '../store/workflowStore';

// Mixed responsibilities
const todos = appStore.todos;
const visionPercepts = visionAudioStore.visionPercepts;
const workflows = workflowStore.workflows;

// Confusing ownership
const config = appStore.config; // or configStore.config?
```

#### After (v2.0)
```typescript
// Clear ownership
import { appStore } from '@lisa/store/appStore';      // UI state
import { workflowStore } from '@lisa/store/workflowStore'; // Workflows
import { configStore } from '@lisa/store/configStore';   // Config

// Clear responsibilities
const todos = appStore.todos;           // App state only
const workflows = workflowStore.workflows; // Workflow state only
const config = configStore.apiKeys;     // Config only

// No confusion about which store to use
```

### 4.2 Migrating Zustand Selectors

#### Before (v1.0)
```typescript
// Deep imports and unclear data flow
const todos = useAppStore((state) => state.appStore.todos);
const visionPercepts = useAppStore((state) => state.visionSlice.percepts);
const workflows = useAppStore((state) => state.workflowSlice.workflows);
```

#### After (v2.0)
```typescript
// Clear, direct imports
const todos = useAppStore((state) => state.todos);
const workflows = useWorkflowStore((state) => state.workflows);

// Or use hooks for convenience
const { todos } = useTodos();
const { workflows } = useWorkflows();
```

---

## 5. Tool Management Migration

### 5.1 Tool Registry

#### Before (v1.0)
```typescript
// Tools scattered across services
import { ToolCallingService } from '../services/ToolCallingService';
import { ToolValidator } from '../services/ToolValidator';
import { ToolSanitizer } from '../services/ToolSanitizer';

// Unclear how to register a tool
ToolCallingService.register(...);
ToolValidator.validate(...);
// Are these synchronized?
```

#### After (v2.0)
```typescript
// Unified registry
import { ToolRegistry } from '@lisa/features/tools';

const registry = ToolRegistry.getInstance();

// Register a tool
registry.register({
  name: 'my-tool',
  description: 'Does something',
  execute: async (params) => { ... }
});

// Execute a tool
const result = await registry.execute('my-tool', { ... });

// List available tools
const tools = registry.list();
```

---

## 6. Workflow Engine Migration

### 6.1 Visual Workflow API

#### Before (v1.0)
```typescript
// Unclear execution model
const result = await executeWorkflow(workflow);

// What's the status?
// How do I debug?
// Can I pause/resume?
```

#### After (v2.0)
```typescript
// Clear, feature-rich execution
const executor = new WorkflowExecutor();

const result = await executor.execute(workflow, input);

// With context and callbacks
const result = await executor.execute(workflow, input, {
  onStepComplete: (stepId, output) => {
    console.log(`Step ${stepId} completed with`, output);
  },
  onError: (stepId, error) => {
    console.error(`Step ${stepId} failed:`, error);
  }
});

// Safe evaluation
const value = await executor.evaluateExpression('input.x * 2', { x: 5 });
```

### 6.2 Safe Code Execution

#### Before (v1.0)
```typescript
// Dangerous default
const result = eval(`input.data.transform()`); // 💥 Security risk!
```

#### After (v2.0)
```typescript
// Safe evaluation
import { SafeEvaluator } from '@lisa/features/workflow/executor/SafeEvaluator';

const evaluator = SafeEvaluator.getInstance();
const result = await evaluator.evaluate('input.data.length', {
  input: { data: [...] }
});

// Blocks 20+ dangerous patterns:
// - eval, Function, new Function
// - window, document, global
// - process, require, module
// - __proto__, constructor
// ... and more
```

---

## 7. Testing Migration

### 7.1 Test Infrastructure

#### Before (v1.0)
```typescript
// Inconsistent testing
// Some agents had tests, others didn't
// No shared mocking utilities
// 926 tests total

describe('EmailAgent', () => {
  it('should send email', async () => {
    // How to mock external services?
    // What about cleanup?
  });
});
```

#### After (v2.0)
```typescript
// Comprehensive testing with shared utilities
import { AgentMocks, MediaPipeMocks } from '@lisa/mocks';

describe('EmailAgent', () => {
  let agent: EmailAgent;

  beforeEach(() => {
    agent = new EmailAgent();
  });

  it('should send email', async () => {
    const result = await agent.execute({
      intent: 'send',
      parameters: { to: 'test@example.com', body: '...' }
    });

    expect(result.success).toBe(true);
  });

  // Uses shared mock utilities
  it('should validate recipient', async () => {
    const invalid = await agent.execute({
      intent: 'send',
      parameters: { to: 'invalid', body: '...' }
    });

    expect(invalid.success).toBe(false);
  });
});

// 1,390+ tests, 73% agent coverage
```

### 7.2 Test Utilities

#### Before (v1.0)
```typescript
// Duplication across test files
// Each test reimplements mocks
// No shared testing patterns
```

#### After (v2.0)
```typescript
// Reusable mock utilities
import { AgentMocks } from '@lisa/mocks/AgentMocks';
import { MediaPipeMocks } from '@lisa/mocks/MediaPipeMocks';

const mockAgent = AgentMocks.createMockAgent('TestAgent', {
  name: 'TestAgent',
  capabilities: ['test']
});

const mockVision = MediaPipeMocks.createObjectDetectorMock([
  { label: 'person', confidence: 0.95 }
]);
```

---

## 8. Configuration Migration

### 8.1 Environment Variables

#### Before (v1.0)
```env
# Unclear which variables are required
VITE_API_KEY=...
VITE_SOME_TOKEN=...
VITE_ANOTHER_KEY=...
```

#### After (v2.0)
```env
# Well-documented required/optional variables
# REQUIRED (at least one AI provider)
VITE_GEMINI_API_KEY=...
VITE_OPENAI_API_KEY=...

# OPTIONAL
VITE_ANTHROPIC_API_KEY=...
VITE_WEATHER_API_KEY=...
VITE_ROS_BRIDGE_URL=ws://localhost:9090

# OPTIONAL (backend features)
LISA_BRIDGE_API_KEY=...
VITE_MCP_TOKEN=...
```

### 8.2 Feature Flags

#### Before (v1.0)
```typescript
// Hidden in various places
const advancedVision = process.env.VITE_VISION === 'advanced';
const useWorkers = config.workers?.enabled;
```

#### After (v2.0)
```typescript
// Centralized in store
const { advancedVision, advancedHearing } = configStore.getState();

// Enable/disable cleanly
configStore.setState({ advancedVision: true });

// Per-integration configuration
const integration = {
  type: 'api',
  enabled: true,
  configuration: { baseUrl: '...' },
  credentials: { token: '...' }
};
```

---

## 9. Breaking Changes Summary

### Critical (Must Fix)

| Change | Migration Path | Effort |
|--------|-----------------|--------|
| 3x Agent Registries → 1 | Update import paths, register once in core/registry | LOW |
| Scattered Senses → SenseCoordinator | Use unified coordinator, update percept access | LOW |
| 8 Tool Services → ToolRegistry | Single registry.execute() call | LOW |
| Appstore with 5 slices → Independent stores | Use specific store imports | MEDIUM |

### Deprecated (Will Warn)

- `src/agents/` re-exports (use `src/features/agents/core/`)
- `useVisionAudioStore` (use `visionStore` + `hearingSense`)
- Manual agent registration (use registry definitions array)

### Removed (Update Required)

- Old AgentRegistry duplicate in implementations/
- registryEnhanced.ts (merged into registry.ts)
- Individual sense store updates (use SenseCoordinator)

---

## 10. Step-by-Step Migration Checklist

### Phase 1: Update Imports
- [ ] Replace `from '../agents/registry'` with `from '@lisa/features/agents/core/registry'`
- [ ] Update vision imports to use `@lisa/features/vision/api`
- [ ] Update hearing imports to use `@lisa/features/hearing/api`
- [ ] Update store imports to use specific stores
- [ ] Replace tool service imports with ToolRegistry

### Phase 2: Update Agent Code
- [ ] Verify all agents are in implementations/
- [ ] Register all agents in core/registry.ts agentDefinitions
- [ ] Update agent tests to use v2.0 patterns
- [ ] Replace manual agent instantiation with registry.getAgentAsync()

### Phase 3: Update Perception Code
- [ ] Replace individual sense imports with SenseCoordinator
- [ ] Update percept access patterns
- [ ] Use useSenses() hook instead of multiple store hooks

### Phase 4: Update Workflows
- [ ] Replace eval() with SafeEvaluator
- [ ] Update WorkflowExecutor usage
- [ ] Test all workflow node types
- [ ] Verify expression evaluation

### Phase 5: Update Tests
- [ ] Add test files for agents without coverage
- [ ] Use shared mock utilities (AgentMocks, MediaPipeMocks)
- [ ] Update test patterns to match v2.0 style
- [ ] Aim for 50%+ agent test coverage

### Phase 6: Validation
- [ ] Run `pnpm typecheck` - should pass
- [ ] Run `pnpm test` - should pass all tests
- [ ] Run `pnpm build` - should complete without errors
- [ ] Manual testing in browser (localhost:5180)

---

## 11. Common Issues & Solutions

### Issue 1: "Cannot find module 'AgentRegistry'"
```typescript
// ❌ Wrong
import { AgentRegistry } from '../features/agents/implementations/AgentRegistry';

// ✅ Correct
import { agentRegistry } from '../features/agents/core/registry';
```

### Issue 2: "visionSense is undefined"
```typescript
// ❌ Wrong
import { visionSense } from '../senses/vision';

// ✅ Correct
import { visionSense } from '../features/vision/api';

// Or use the coordinator
const coordinator = SenseCoordinator.getInstance();
coordinator.subscribe('vision', (percept) => { ... });
```

### Issue 3: "appStore doesn't have visionPercepts"
```typescript
// ❌ Wrong
const percepts = appStore.visionPercepts;

// ✅ Correct
import { visionStore } from '@lisa/store/visionStore';
const percepts = visionStore.percepts;

// Or use SenseCoordinator
const { percepts } = useSenses();
```

### Issue 4: "Agent not found"
```typescript
// ❌ Wrong
const agent = agentRegistry.get('UnknownAgent');
await agent.execute(...); // May crash

// ✅ Correct
const agent = await agentRegistry.getAgentAsync('EmailAgent');
if (agent) {
  await agent.execute(...);
}

// Or use direct execute
const result = await agentRegistry.execute('EmailAgent', props);
```

### Issue 5: "eval() is not safe"
```typescript
// ❌ Wrong - SECURITY RISK!
const result = eval(userInput);

// ✅ Correct
import { SafeEvaluator } from '@lisa/features/workflow/executor/SafeEvaluator';
const evaluator = SafeEvaluator.getInstance();
const result = await evaluator.evaluate(userInput, context);
```

---

## 12. Support & Resources

### Documentation
- **ARCHITECTURE.md** - Detailed system design
- **CLAUDE.md** - Project guidelines
- **COLAB.md** - Collaborative development rules

### Test Examples
- `src/features/agents/__tests__/EmailAgent.test.ts` - Communication agent
- `src/features/agents/__tests__/VisionAgent.test.ts` - Perception agent
- `src/features/agents/__tests__/WorkflowCodeAgent.test.ts` - Workflow agent
- `src/features/agents/__tests__/SystemIntegrationAgent.test.ts` - Integration agent

### Getting Help
1. Check CLAUDE.md for common patterns
2. Review test files for usage examples
3. Look at git history for similar migrations
4. Post issues with migration blockers

---

## 13. Timeline & Rollout

### Recommended Migration Timeline

```
Week 1: Phase 1-2 (Imports + Agents)
Week 2: Phase 3-4 (Perception + Workflows)
Week 3: Phase 5-6 (Tests + Validation)

Critical Path: Update imports → Update agents → Validate
```

### Backward Compatibility

- **v1.0 imports**: Still work but show deprecation warnings
- **v1.0 APIs**: Redirected to v2.0 implementations
- **v1.0 tests**: Will need updates (no shared utilities)

### Support Period

- v1.0 bug fixes: Through 2026-03-31
- v1.0 new features: Not accepted
- v2.0 adoption: Fully supported

---

## 14. Post-Migration Checklist

- [ ] All imports updated to v2.0 paths
- [ ] All agents registered in core/registry.ts
- [ ] Agent test coverage > 50%
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` completes
- [ ] Browser testing (localhost:5180) successful
- [ ] No deprecation warnings in console
- [ ] Documentation updated for team

---

**Migration Version**: 2.0.0
**Last Updated**: 2026-02-06
**Estimated Effort**: 4-8 hours for typical project
**Success Criteria**: All checks pass, 50%+ test coverage achieved
