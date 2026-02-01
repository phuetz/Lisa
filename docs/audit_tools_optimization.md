# Audit & Optimization Plan: Tool Usage in Lisa

**Date:** 2026-01-30
**Status:** DRAFT
**Context:** This audit evaluates the current implementation of "Tools" in the Lisa architecture against modern "Agentic AI" best practices (ReAct, ToolFormer, Dependency Injection).

## 1. Current State Analysis

### 1.1 Architecture
- **Structure**: Tools are standalone TypeScript classes (e.g., `WebSearchTool`, `WeatherTool`) located in `src/tools/`.
- **Registry**: A simple object map in `src/tools/index.ts` serves as a registry.
- **Consumption**: Agents (e.g., `WebSearchAgent`, `ResearchAgent`) instantiate tools directly in their constructors (`this.tool = new WebSearchTool()`).

### 1.2 Identified Issues (Critical)

1.  **Tight Coupling (Dependency Injection Violation)**:
    - Agents explicitly depend on concrete implementations.
    - *Impact*: Cannot easily swap tools (e.g., changing Search provider), mock tools for testing, or dynamically assign tools to agents at runtime.

2.  **Lack of LLM-Readable Schemas**:
    - Tools lack a defined JSON Schema or Zod definition exposed to the LLM.
    - *Impact*: The LLM inside `aiService` cannot "discover" tools dynamically. Current agents rely on hardcoded switch-cases (`ResearchAgent` lines 48-71) to route intents to tools, rather than letting the LLM decide which tool to call based on the prompt.

3.  **"Black Box" Logic**:
    - `WebSearchTool` internally calls OpenAI to summarize results.
    - *Impact*: Loss of granularity. An agent might want raw search results to process differently. The tool does too much (Search + Thinking), violating the Single Responsibility Principle.

4.  **No "ReAct" Loop**:
    - Current agents follow a linear path: `Input -> Intent Classifier -> Hardcoded Handler -> Output`.
    - *Optimal*: `Input -> Thought -> Tool Selection -> Action -> Observation -> Thought -> ... -> Output`.

## 2. Scientific Best Practices (Reference)

- **ReAct (Reasoning + Acting)**: Models should reason about *why* they need a tool before calling it, then observe the output.
- **ToolFormer**: Tools should be simple API calls; the "intelligence" belongs in the Agent, not the Tool.
- **Gorilla/Function Calling**: Tools must provide clear schemas (Name, Description, Parameters) for the LLM to construct valid calls.

## 3. Optimization Plan

### Phase 1: Standardization (The "Tool" Interface)
Create a robust interface that all tools must implement.

```typescript
import { z } from 'zod';

export interface Tool<P = any, R = any> {
  name: string;
  description: string;
  schema: z.ZodType<P>; // Runtime schema validation
  execute(params: P): Promise<R>;
}
```

### Phase 2: Decoupling (Dependency Injection)
Refactor Agents to accept tools via constructor.

```typescript
// Before
constructor() {
  this.tool = new WebSearchTool();
}

// After
constructor(tools: Tool[]) {
  this.tools = tools;
}
```

### Phase 3: Dynamic Tool Selection
Refactor simple agents to use a generic "Reasoning Loop" instead of hardcoded intent handlers.
- The Agent sends the user prompt + list of available tool schemas to the LLM.
- The LLM returns a "Tool Call" (JSON).
- The Agent executes the tool and feeds the output back to the LLM.

## 4. Recommendations for Next Steps

1.  **Refactor `WebSearchTool`**: Remove the internal OpenAI summarization. Make it purely a "Google Search API wrapper". Move the summarization logic into the **Agent** or a separate `SummarizerTool`.
2.  **Create `BaseTool` class**: Implement the Zod schema validation pattern.
3.  **Update `ResearchAgent`**: Refactor to use the new "ReAct" style loop for dynamic information gathering.

## Conclusion
The current implementation is functional but rigid ("Hard-coded Agent"). To achieve true "Agentic" behavior where Lisa can solve novel problems, we must transition to a Schema-driven Tool architecture.
