# @lisa-sdk/core

The foundational type definitions and interfaces for the Lisa ecosystem.
This package contains **zero dependencies** (except Zod) and defines the contract that all Lisa modules must respect.

## Installation

```bash
npm install @lisa-sdk/core
```

## Key Concepts

### Agents

Agents must implement the `Agent` interface and use `AgentContext` instead of global state.

```typescript
import { Agent, AgentContext } from '@lisa-sdk/core';

export class MyAgent implements Agent {
  name = 'MyAgent';
  domain = 'productivity';

  async execute(props: any, context: AgentContext) {
    // Access data via context, not store imports
    const lang = context.language;
    return { success: true, output: `Hello in ${lang}` };
  }
}
```

### Percepts

All sensory data (Vision, Hearing) flows through the system as `Percept` objects.

```typescript
import { Percept } from '@lisa-sdk/core';

const visualInput: Percept = {
  modality: 'vision',
  timestamp: Date.now(),
  confidence: 0.98,
  payload: { objects: [...] }
};
```
