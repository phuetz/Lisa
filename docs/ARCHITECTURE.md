# Lisa AI - Architecture Documentation

> **Version**: 2.0.0
> **Date**: 2026-02-06
> **Status**: COMPLETE - Post Phase 4 Restructuration

---

## 1. Executive Summary

Lisa is a **multi-sensory AI assistant** that combines 5 senses (vision, hearing, touch, environment, proprioception) with 60+ specialized agents organized in a modular, feature-based architecture. The system supports visual workflow orchestration, real-time perception processing, and intelligent task automation across diverse integration types.

### Key Metrics (Post Phase 4)

| Metric | Value | Status |
|--------|-------|--------|
| Total TypeScript Lines | 119,093 | Modular |
| Specialized Agents | 60+ | Lazy-loaded |
| Agents with Test Coverage | 44+ | 73% |
| Total Unit Tests | 1,390+ | Comprehensive |
| Senses Integrated | 5 | Coordinated |
| Integration Types Supported | 8+ | Unified Registry |
| Build Time | ~52s | Optimized |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Lisa AI System Architecture                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  User Interface Layer (React 19)                 │
│  • Dashboard, Vision, Audio, Chat, Workflow, Tools, Documents  │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│              Perception Layer (5 Senses + Coordinator)           │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │ Vision   │ Hearing  │ Touch    │ Environment │ Proprioception │
│  │ (YOLOv8) │(Whisper) │(Binary)  │ (Sensors)   │ (Pose Est.)   │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│                                                                  │
│         ← SenseCoordinator (Unified Interface) →                │
└────────────────────┬────────────────────────────────────────────┘
                     │ Percepts (Modality, Payload, Confidence)
┌────────────────────▼────────────────────────────────────────────┐
│              Agent Registry (60+ Lazy-Loaded Agents)             │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Communication │ │Productivity│ │Integration│ │Analysis │    │
│  │  15 agents   │  │  12 agents │ │ 18 agents │ │14 agents │    │
│  └─────────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                                  │
│         ← AgentRegistry (Dynamic Loading + Stats) →             │
└────────────────────┬────────────────────────────────────────────┘
                     │ Agent Execution Results
┌────────────────────▼────────────────────────────────────────────┐
│           Workflow Engine (Visual + Programmatic)                │
│  ┌─────────────────┐  ┌──────────────────────────────┐         │
│  │ Visual Editor   │  │  WorkflowExecutor             │         │
│  │ Node-based UI   │  │  • Sequential/Parallel exec  │         │
│  │                 │  │  • Step-by-step debugging    │         │
│  │                 │  │  • SafeEvaluator (security)  │         │
│  └─────────────────┘  └──────────────────────────────┘         │
└────────────────────┬────────────────────────────────────────────┘
                     │ Workflow Results + Events
┌────────────────────▼────────────────────────────────────────────┐
│        Backend Services (Express 5 + Microservices)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Memory Layer │  │ Tool Registry│  │ Integration │         │
│  │ • Short-term │  │ • Execution  │  │ • API/HTTP  │         │
│  │ • Long-term  │  │ • Validation │  │ • MQTT/ROS  │         │
│  │ • RAG Index  │  │ • Logging    │  │ • GitHub    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Components

### 3.1 Agent System

#### Registry & Lazy Loading
```typescript
// Location: src/features/agents/core/registry.ts

class AgentRegistry {
  // Lazy-loads agents on-demand
  async getAgentAsync(name: string): Promise<BaseAgent>

  // Executes agent with priority handling
  async execute(name: string, props: AgentExecuteProps): Promise<AgentExecuteResult>

  // Provides statistics
  getStats(): AgentStats
}

// 60+ agents organized by domain
const AGENT_DOMAINS = {
  COMMUNICATION: 15,      // Email, SMS, Chat, etc.
  PRODUCTIVITY: 12,       // Todo, Calendar, Notes, etc.
  INTEGRATION: 18,        // GitHub, MQTT, ROS, etc.
  ANALYSIS: 14,           // Vision, Code, Data analysis
  CUSTOM: 1               // User-defined agents
}
```

#### Base Agent Interface
```typescript
interface BaseAgent {
  name: string;
  description: string;
  version: string;
  domain: AgentDomain;
  capabilities: string[];
  valid: boolean;

  execute(props: AgentExecuteProps): Promise<AgentExecuteResult>;
  getCapabilities?(): Promise<AgentCapability[]>;
}
```

#### Agent Categories

**Communication Agents (15)**
- EmailAgent, SMSAgent, ChatAgent, SlackAgent
- TelegramAgent, WhatsAppAgent, DiscordAgent
- TwitterAgent, LinkedInAgent, NotificationAgent
- TranslationAgent, SpeechSynthesisAgent
- LanguageAgent, MultimodalAgent

**Productivity Agents (12)**
- TodoAgent, CalendarAgent, NotesAgent
- ReminderAgent, SchedulerAgent, FileAgent
- DocumentAgent, DataAnalysisAgent
- ProjectManagementAgent, TimeTrackingAgent

**Integration Agents (18)**
- HTTPAgent, APIAgent, WebhookAgent
- GitHubAgent, SmartHomeAgent
- MQTTAgent, RosAgent, RobotAgent
- DatabaseAgent, SystemIntegrationAgent
- PowerShellAgent, SSHAgent, DockerAgent
- SlackbotAgent, TelegramBotAgent

**Analysis Agents (14)**
- VisionAgent, HearingAgent, OCRAgent
- ImageAnalysisAgent, AudioAnalysisAgent
- VideoAnalysisAgent, CodeAnalysisAgent
- DataAnalysisAgent, SentimentAnalysisAgent
- EmotionDetectionAgent, ScreenShareAgent

### 3.2 Perception Layer (5 Senses)

#### Vision Sense
```typescript
// Location: src/features/vision/api.ts
export const visionSense: VisionSenseAPI = {
  // YOLOv8 for object detection
  detectObjects(image: Canvas): ObjectDetection[]

  // MediaPipe for face/pose/hand detection
  detectFaces(image: Canvas): FaceDetection[]
  detectPose(image: Canvas): PoseDetection[]
  detectHands(image: Canvas): HandDetection[]

  // Scene understanding
  describeScene(image: Canvas): SceneDescription
}
```

#### Hearing Sense
```typescript
// Location: src/features/hearing/api.ts
export const hearingSense: HearingSenseAPI = {
  // Whisper for speech-to-text
  transcribeAudio(audio: AudioBuffer): Transcription

  // Sound classification
  classifySound(audio: AudioBuffer): SoundClassification[]

  // Speech detection
  detectSpeech(audio: AudioBuffer): SpeechDetection
}
```

#### Touch, Environment, Proprioception
```typescript
// Location: src/senses/
export const touchSense: Percept<TouchData>
export const environmentSense: Percept<EnvironmentData>
export const proprioceptionSense: Percept<ProprioceptionData>
```

#### SenseCoordinator
```typescript
// Location: src/features/senses/SenseCoordinator.ts
class SenseCoordinator {
  static getInstance(): SenseCoordinator

  async initialize(config: SensesConfig): Promise<void>
  subscribe(modality: SenseModality, callback: PerceptCallback): Unsubscribe
  subscribeAll(callback: AnyPerceptCallback): Unsubscribe

  getHealthStatus(): SenseHealthStatus
}
```

### 3.3 Workflow Engine

#### Visual Workflow Editor
```typescript
// Node types: Trigger, HTTP, Condition, ForEach, Set, Webhook, etc.
interface WorkflowNode {
  id: string;
  type: NodeType;
  data: Record<string, any>;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  data?: Record<string, any>;
}
```

#### Workflow Executor
```typescript
// Location: src/features/workflow/executor/WorkflowExecutor.ts
class WorkflowExecutor {
  async execute(workflow: Workflow, input: any): Promise<ExecutionResult>
  async executeStep(node: WorkflowNode, context: ExecutionContext): Promise<any>

  // Safe code execution
  async evaluateExpression(expr: string, context: any): Promise<any>
}
```

#### SafeEvaluator
```typescript
// Prevents dangerous operations like eval, Function constructors
// Whitelist-based approach for safe code execution
// 20+ security patterns blocked
```

### 3.4 State Management (Zustand)

#### Store Architecture
```typescript
// Location: src/store/appStore.ts
const appStore = create<AppState>((set) => ({
  // Vision slice
  visionPercepts: [],
  smileDetected: false,
  speechDetected: false,

  // Audio slice
  audioPercepts: [],
  audioEnabled: true,

  // Workflow slice (independent)
  workflowPlan: null,
  nodeStatus: {},

  // UI slice
  todos: [],
  alarms: [],
  timers: [],

  // Feature flags
  advancedVision: false,
  advancedHearing: false,
}))

// Independent stores also available:
export const workflowStore = create<WorkflowState>(...)
export const configStore = create<ConfigState>(...)
```

### 3.5 Tool Registry & Execution

```typescript
// Location: src/features/tools/ToolRegistry.ts
interface Tool {
  name: string;
  description: string;
  execute(params: Record<string, any>): Promise<any>;
}

class ToolRegistry {
  register(tool: Tool): void
  execute(name: string, params: any): Promise<any>
  list(): Tool[]
}
```

### 3.6 Memory System

#### Three-Tier Memory Architecture
```typescript
// Location: src/features/memory/MemoryManager.ts

// 1. Short-term (Session)
- Current percepts
- Active workflow context
- Recent user inputs

// 2. Long-term (Persistent)
- User preferences
- Historical interactions
- Learned patterns

// 3. Retrieval-Augmented (RAG)
- Indexed knowledge base
- Semantic search
- Context retrieval
```

---

## 4. Feature-Based Organization

### Directory Structure
```
src/
├── features/
│   ├── agents/              # Agent system (core + implementations)
│   │   ├── core/            # Registry, types, loader
│   │   ├── implementations/ # 60+ agent implementations
│   │   └── __tests__/       # 1,390+ tests (73% coverage)
│   ├── vision/              # YOLOv8 + MediaPipe
│   ├── hearing/             # Whisper + Web Speech API
│   ├── workflow/            # Visual editor + executor
│   ├── senses/              # SenseCoordinator
│   ├── tools/               # ToolRegistry
│   └── memory/              # MemoryManager
│
├── gateway/                 # Express API server
│   ├── core/                # Core endpoints
│   ├── ai/                  # AI endpoints
│   └── voice/               # Voice endpoints
│
├── services/                # 85+ utility services
├── store/                   # Zustand state stores
├── hooks/                   # 70+ React hooks
├── components/              # 200+ React components
├── tools/                   # 13 built-in tools
└── config/                  # Configuration files
```

---

## 5. Integration Types

Lisa supports **8 major integration types** through SystemIntegrationAgent:

### 1. **API Integration**
- REST APIs with authentication
- JSON request/response handling
- Rate limiting support

### 2. **Webhook Integration**
- Inbound webhook receivers
- Outbound event triggering
- Retry policies

### 3. **MQTT Integration**
- IoT device communication
- Topic subscription/publishing
- QoS levels (0, 1, 2)

### 4. **Socket Integration**
- WebSocket connections
- Real-time bidirectional communication
- Binary data support

### 5. **HTTP Integration**
- Custom HTTP methods
- Header management
- Timeout configuration

### 6. **Database Integration**
- SQL query execution
- CRUD operations
- Connection pooling

### 7. **File Operations**
- Read, write, delete
- Directory listing
- Path handling

### 8. **Shell Execution**
- Command execution (with whitelist)
- Process management
- Security sandboxing

---

## 6. Security Architecture

### Defense-in-Depth Strategy

```
┌─────────────────────────────────────┐
│ 1. Input Validation                 │
│    • Schema validation              │
│    • Type checking                  │
│    • Sanitization                   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 2. Authentication & Authorization   │
│    • JWT tokens                     │
│    • Rate limiting                  │
│    • CORS policies                  │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 3. Code Execution Sandbox           │
│    • SafeEvaluator                  │
│    • Blocked patterns (20+)         │
│    • No eval/Function constructor   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 4. Agent Capability Limits          │
│    • Whitelisted commands           │
│    • Permission checks              │
│    • Resource limits                │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 5. Data Protection                  │
│    • Credential encryption          │
│    • Sensitive data redaction       │
│    • Audit logging                  │
└─────────────────────────────────────┘
```

### Key Security Features

- **SafeEvaluator**: Blocks dangerous operations in workflows
- **Credential Management**: Never exposed in logs/responses
- **Command Whitelisting**: PowerShell/Shell commands validated
- **API Key Isolation**: Per-integration credential storage
- **CORS Protection**: Strict origin validation
- **Rate Limiting**: 100 req/min (API), 5 req/min (Auth)

---

## 7. Performance Optimization

### Build Optimization
```
Chunk Strategy:
1. React core bundle (~100KB gzip)
2. UI libraries (~75KB gzip)
3. State/store layer (~10KB gzip)
4. ML models (lazy-loaded, ~400KB for vision)
5. Heavy dependencies (Charts, Markdown - on-demand)

Result: ~2.2MB production bundle
```

### Runtime Optimization
- **Lazy Agent Loading**: Agents load on first use
- **Worker Threads**: Vision/Hearing processing in workers
- **Memoization**: React.memo for expensive components
- **Code Splitting**: Page-level and feature-level splits

### Database Optimization
- Connection pooling
- Query optimization
- Caching layer for RAG results

---

## 8. Testing Strategy

### Test Coverage by Category (Post Phase 4)

| Category | Agents | Tests | Coverage |
|----------|--------|-------|----------|
| Communication | 15 | 119 | 100% |
| Vision/Audio | 5 | 108 | 100% |
| Workflow | 9 | 583 | 100% |
| Integration | 7 | 580 | 100% |
| Remaining | 24 | 0 | 0% |
| **Total** | **60+** | **1,390+** | **73%** |

### Test Infrastructure
- **Framework**: Vitest 1.6.1
- **Mocking**: vi.mock() for external dependencies
- **Utilities**: AgentMocks, MediaPipeMocks, IntegrationMocks
- **Coverage**: `pnpm test:coverage` generates detailed reports

---

## 9. Deployment & Operations

### Supported Platforms
- **Web**: Chrome, Firefox, Safari (React 19)
- **Mobile**: Android/iOS (Capacitor)
- **Backend**: Node.js 18+ (Express 5)
- **Database**: PostgreSQL, MySQL, SQLite
- **Message Queue**: RabbitMQ, MQTT

### Environment Configuration
```env
# AI Providers
VITE_GEMINI_API_KEY=...
VITE_OPENAI_API_KEY=...
VITE_ANTHROPIC_API_KEY=...

# External Services
VITE_WEATHER_API_KEY=...
VITE_ROS_BRIDGE_URL=ws://localhost:9090
LISA_BRIDGE_API_KEY=...

# MCP Protocol
VITE_MCP_TOKEN=...
```

---

## 10. Future Roadmap

### Phase 5+: Post-Restructuration
- [ ] Task 5.1: Complete COLAB.md finalization
- [ ] Task 5.2: Migration guide for existing projects
- [ ] Multi-agent coordination layer
- [ ] Distributed execution across multiple servers
- [ ] Advanced RAG with vector databases
- [ ] Real-time collaborative workflows

### Known Limitations
- God component: App.tsx (331 lines) - slated for refactoring
- Mega-store: appStore with 5 unrelated slices
- 85 services without registry
- 24 agents without test coverage

---

## 11. Contributing Guidelines

### Adding a New Agent
1. Create `src/features/agents/implementations/YourAgent.ts`
2. Implement `BaseAgent` interface
3. Add to `src/features/agents/core/registry.ts`
4. Create test file with 50+ test cases
5. Document in CLAUDE.md

### Adding a New Sense
1. Create implementation in `src/features/senses/`
2. Export singleton from `src/features/senses/api.ts`
3. Register with SenseCoordinator
4. Add to unified `useSenses()` hook

### Adding an Integration Type
1. Extend SystemIntegrationAgent
2. Add simulation methods
3. Create comprehensive tests
4. Document in docs/INTEGRATIONS.md

---

## 12. References

- **CLAUDE.md**: Project guidelines and commands
- **COLAB.md**: Collaborative development rules
- **docs/**: Additional documentation
- **packages/**: Publishable SDK packages

---

**Last Updated**: 2026-02-06
**Maintained By**: Claude AI Team
**Version**: 2.0.0 (Post Phase 4 Restructuration)
