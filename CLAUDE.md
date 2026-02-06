# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lisa** is a multi-sensory AI assistant that combines 5 senses (vision, hearing, touch, environment, proprioception) with 50+ specialized agents and a visual workflow system. The project is a monorepo using pnpm workspaces with React 19, TypeScript 5.8, and Vite 6.

## Commands

### Development
```bash
pnpm dev                  # Start dev server (port 5180)
pnpm build                # Build for production
pnpm preview              # Preview production build (port 4173)
```

### Testing
```bash
pnpm test                 # Run all unit tests (Vitest)
pnpm test:watch           # Run tests in watch mode
pnpm test -- src/path/to/file.test.ts  # Run single test file
pnpm test -- -t "test name"            # Run tests matching pattern
pnpm test:e2e             # Run E2E tests (Playwright, requires build first)
pnpm test:e2e:ui          # Run E2E tests with UI
pnpm typecheck            # Type check without emitting
pnpm lint                 # Lint with ESLint
```

### Mobile Development
```bash
pnpm build && pnpm mobile:sync  # Build and sync to native
pnpm mobile:android             # Open Android Studio
pnpm mobile:ios                 # Open Xcode
```

### API Server
```bash
pnpm start-api            # Start Express API server
pnpm build:api            # Build API TypeScript
pnpm test:api             # Run API tests
```

### Monorepo Packages
```bash
pnpm build:packages       # Build all workspace packages
pnpm release:sdk          # Publish SDK packages
```

## Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────────┐
│                   5 Senses Layer                        │
│  Vision | Hearing | Touch | Environment | Proprioception│
└────────────────────┬────────────────────────────────────┘
                     │ Percepts
┌────────────────────▼────────────────────────────────────┐
│              Agent Registry (50+ Agents)                 │
│  Lazy-loaded, domain-categorized, stats-tracked         │
└────────────────────┬────────────────────────────────────┘
                     │ Execute
┌────────────────────▼────────────────────────────────────┐
│           Workflow Executor + Visual Editor              │
│  Sequential/parallel execution, step-by-step mode        │
└──────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns

#### 0. Providers Layer (`src/providers/`)

Application-level providers compose in `RootProviders` (wrapped in `main.tsx`):
- **ServiceProvider** - Initializes background services (Pyodide, HealthMonitoring, ProactiveSuggestions)
- **SenseProvider** - Initializes 5 senses (vision, hearing, touch, environment, proprioception)
- **AuthProvider** - Handles authentication state and login/register forms

```
main.tsx → RootProviders → ServiceProvider → SenseProvider → AuthProvider → RouterProvider
```

**IMPORTANT**: `providers/index.tsx` uses `import` (not `export ... from`) to make providers available locally in `RootProviders`. See Common Gotchas #8.

#### 1. Feature-Based Organization (`src/features/`)

The codebase uses feature-based organization:

**Agents** (`src/features/agents/`):
- `core/registry.ts` - Singleton registry with lazy-loading factories
- `core/types.ts` - BaseAgent interface and types
- `implementations/` - All agent implementations (50+)
- Access via: `agentRegistry.getAgentAsync(name)` or `agentRegistry.execute(name, props)`

**Vision** (`src/features/vision/`):
- `api.ts` - Main entry point, exports `visionSense` singleton
- `worker.ts` - Web Worker for YOLOv8 processing
- `converters/vision.converter.ts` - SDK to legacy type conversion
- Uses `VisionAdapter` service for SDK integration

**Hearing** (`src/features/hearing/`):
- `api.ts` - Main entry point, exports `hearingSense` singleton
- `worker.ts` - Web Worker for Whisper processing
- Falls back to Web Speech API when advanced features disabled

**Workflow** (`src/features/workflow/`):
- `executor/WorkflowExecutor.ts` - Executes visual workflows
- `nodes/` - Node type definitions (HTTP, Condition, ForEach, Set, Webhook)
- `store/useWorkflowStore.ts` - Workflow-specific Zustand store

#### 2. Senses System (`src/senses/`)

Base sense implementations (touch, environment, proprioception):
- `index.ts` - Re-exports all senses and types
- Each sense exports singleton and helper functions
- Percepts typed as `Percept<T>` with modality, payload, confidence, timestamp
- Unified access via `useSenses()` hook

#### 3. Artifact System (Chat)

Claude.ai-style artifact rendering integrated into the chat:
- **artifactParser.ts** - Detects code artifacts in AI responses (HTML, React, JS, TS, CSS, Python, SVG, Mermaid)
- **ChatMessages.tsx** → `MessageContent` component parses artifacts and renders clickable cards
- **ArtifactPanel.tsx** - Modal playground with Monaco editor + live preview + console output
- **chatHistoryStore.ts** → `useArtifactPanelStore()` manages artifact panel state (open/close/view mode)

Artifacts are automatically detected from fenced code blocks in assistant messages. Users click the card to open the interactive panel.

#### 4. Zustand Store (`src/store/appStore.ts`)

Centralized state with slices:
- **VisionSlice**: Percepts array, smile/speech detection
- **AudioSlice**: Hearing percepts, audio enabled state
- **WorkflowSlice**: Plan, node/edge execution status
- **UiSlice**: Todos, alarms, timers, feature flags, medications, emergency contacts

#### 5. Tool Calling & AI Services

- **aiService.ts** - Unified AI service supporting OpenAI, Gemini, Anthropic, LM Studio providers
- **AIWithToolsService.ts** - LLM with automatic tool calling loop (web search, todos, datetime)
- **ToolCallingService.ts** - Provider-agnostic tool/function calling interface
- **ComputerControlService.ts** - Desktop automation API (requires `lisa-desktop` backend on port 8765)

#### 6. Monorepo Packages (`packages/`)

SDK packages (use `workspace:*` protocol):
- **@lisa-sdk/core** - Types and interfaces
- **@lisa-sdk/vision-engine** - Computer vision SDK (YOLOv8, MediaPipe)
- **@lisa-sdk/audio-engine** - Audio processing
- **@lisa-sdk/ui-kit** - UI components
- **@lisa-sdk/code-executor** - Code execution
- **@lisa-sdk/markdown-renderer** - Markdown rendering

### API Server (`src/api/server.ts`)

Express 5 server:
- JWT authentication via `authenticateToken` middleware
- Rate limiting (API: 100/min, Auth: 5/min)
- Prometheus metrics at `/metrics`, health at `/health`
- Bridge API for ChatGPT/Claude at `/api/bridge`

## Important Implementation Details

### Creating a New Agent

1. Create `src/features/agents/implementations/YourAgent.ts`:
```typescript
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../core/types';

export class YourAgent implements BaseAgent {
  name = 'YourAgent';
  description = 'Brief description';
  version = '1.0.0';
  domain = 'custom';
  capabilities = ['capability1'];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    return { success: true, output: result };
  }
}
```

2. Add to `src/features/agents/core/registry.ts` in `agentDefinitions` array:
```typescript
['YourAgent', '../implementations/YourAgent'],
```

### Working with Senses

```typescript
// Feature API (recommended)
import { visionSense } from './features/vision/api';
import { hearingSense } from './features/hearing/api';

// Or via unified hook
import { useSenses } from './hooks/useSenses';
const { percepts, enableSense, disableSense } = useSenses({
  enableVision: true,
  enableHearing: true
});
```

### Feature Flags

Control advanced features in `src/config.ts` or via store:
- `advancedVision` - Enables YOLOv8 Worker (vs MediaPipe adapter)
- `advancedHearing` - Enables Whisper Worker (vs Web Speech API)
- `fallDetector` - Enables fall detection

## Configuration

### Environment Variables

Copy `.env.example` to `.env`:

```env
# Required (at least one)
VITE_GEMINI_API_KEY=...    # Google Gemini
VITE_OPENAI_API_KEY=...    # OpenAI GPT

# Optional
VITE_ANTHROPIC_API_KEY=... # Anthropic Claude
VITE_WEATHER_API_KEY=...   # Weather data
VITE_ROS_BRIDGE_URL=ws://localhost:9090
LISA_BRIDGE_API_KEY=...    # External bridge access
VITE_MCP_TOKEN=...         # MCP protocol auth
```

### Build Configuration

- **Dev Port**: 5180 (strict)
- **Preview Port**: 4173
- **LM Studio Proxy**: `/lmstudio` → `localhost:1234`
- **Chunk Strategy**: React core → UI libs → State → ML models (lazy)

## Common Gotchas

1. **Agent Registration**: Must add to `registry.ts` `agentDefinitions` array, not just create the file
2. **Sense Singletons**: Use exported singletons (`visionSense`, `hearingSense`), don't instantiate
3. **Mobile Network**:
   - Uses `CapacitorHttp` plugin to bypass CORS (in `LMStudioService.ts`)
   - Physical devices need PC's LAN IP in `src/config/networkConfig.ts`
   - Emulators use `adb reverse tcp:1234 tcp:1234`
4. **Feature Workers**: Vision/Hearing workers only load when `advancedVision`/`advancedHearing` flags enabled
5. **E2E Tests**: Require `pnpm build` first - Playwright uses preview server at port 4173
6. **Workspace Imports**: Use `workspace:*` protocol for internal packages
7. **Android Bundle Sync**: After code changes, always run `pnpm build && cd apps/mobile && npx cap sync android` before testing on Android
8. **Re-export vs Import**: `export { X } from './module'` is a pure re-export — it does NOT make `X` available locally. If you need `X` in the same file, use `import { X } from './module'` then `export { X }` separately
9. **PyodideService**: Uses `preload()` method (not `initialize()`) for initialization
10. **ChatPage Layout**: `ChatPage.tsx` renders `ChatLayoutSimple` (not `ChatLayout`) — both exist but Simple is the active one
11. **Vite Cache**: When debugging stale module issues, clear `node_modules/.vite` before rebuilding

## Mobile Development (Capacitor)

### Android LM Studio Connection

The app uses a different network strategy for web vs mobile:

```
Web:     fetch('/lmstudio/v1/...') → Vite proxy → localhost:1234
Mobile:  CapacitorHttp.request('http://localhost:1234/v1/...') → ADB reverse → PC
```

**Key files for mobile networking:**
- `src/config/networkConfig.ts` - Platform detection and URL configuration
- `src/services/LMStudioService.ts` - CapacitorHttp integration for mobile
- `src/services/aiService.ts` - Delegates to LMStudioService for LM Studio provider

### Testing on Android Emulator

```bash
# 1. Build and sync
pnpm build && cd apps/mobile && npx cap sync android

# 2. Configure port forwarding (run once per emulator session)
adb reverse tcp:1234 tcp:1234

# 3. Open Android Studio and run the app
npx cap open android
```

### Debugging Android

View JavaScript console logs:
```bash
adb logcat -s "Capacitor/Console:I" | grep -E "LMStudioService|NetworkConfig|AIService"
```

Expected logs when LM Studio connection works:
```
[NetworkConfig] isNative: true hostname: lisa.ai
[AIService] Delegating stream to LMStudioService
[LMStudioService] chatStream starting (mobile fallback)
[LMStudioService] CapacitorHttp response status: 200
```

## Key Files Reference

| Path | Purpose |
|------|---------|
| `src/providers/index.tsx` | RootProviders composition (ServiceProvider > SenseProvider > AuthProvider) |
| `src/providers/ServiceProvider.tsx` | Background service initialization (Pyodide, Health, Suggestions) |
| `src/features/agents/core/registry.ts` | Agent lazy-loading system |
| `src/features/vision/api.ts` | Vision sense entry point |
| `src/features/hearing/api.ts` | Hearing sense entry point |
| `src/features/workflow/executor/WorkflowExecutor.ts` | Workflow execution |
| `src/senses/` | Touch, environment, proprioception senses |
| `src/store/appStore.ts` | Centralized Zustand store |
| `src/store/chatHistoryStore.ts` | Chat conversations + artifact panel state |
| `src/components/chat/ChatLayoutSimple.tsx` | Active chat layout (with ArtifactPanel) |
| `src/components/chat/ArtifactPanel.tsx` | Interactive code artifact panel (Monaco + preview) |
| `src/utils/artifactParser.ts` | Detects artifacts in AI responses |
| `src/services/aiService.ts` | Unified AI provider service |
| `src/services/AIWithToolsService.ts` | LLM with tool calling loop |
| `src/hooks/useSenses.ts` | Unified sense access hook |
| `src/api/server.ts` | Express API entry point |
| `packages/` | Publishable SDK packages |
| `apps/mobile/` | Capacitor mobile app |

## Accessibility

WCAG 2.1 AA compliant. When adding UI:
- Use semantic HTML with ARIA attributes
- Ensure focus indicators and keyboard navigation
- Use `AccessibilityWrapper` for contrast verification
- Respect `prefers-reduced-motion`
