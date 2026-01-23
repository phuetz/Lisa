# @lisa/code-executor

> Execute Python and JavaScript code directly in the browser. No server required.

## Features

- **Python via Pyodide** - Full Python 3.11 runtime in WebAssembly
- **JavaScript Sandbox** - Secure isolated execution environment
- **Package Support** - Install and use popular packages (numpy, pandas, matplotlib...)
- **Rich Outputs** - Text, images, charts, DataFrames
- **React Hooks** - Easy integration with `useCodeExecutor()`

## Installation

```bash
npm install @lisa/code-executor
# or
pnpm add @lisa/code-executor
```

## Quick Start

```typescript
import { CodeExecutor } from '@lisa/code-executor';

const executor = new CodeExecutor();

// Execute Python
const result = await executor.execute(`
import numpy as np
print(np.array([1, 2, 3]) * 2)
`, 'python');

console.log(result.output); // [2 4 6]
```

## React Integration

```tsx
import { useCodeExecutor } from '@lisa/code-executor/react';

function CodeCell() {
  const { execute, result, isRunning } = useCodeExecutor();

  return (
    <div>
      <button onClick={() => execute('print("Hello!")', 'python')}>
        Run
      </button>
      {isRunning && <span>Running...</span>}
      {result && <pre>{result.output}</pre>}
    </div>
  );
}
```

## API

### `CodeExecutor`

```typescript
class CodeExecutor {
  execute(code: string, language: 'python' | 'javascript'): Promise<ExecutionResult>;
  installPackage(name: string): Promise<void>;
  interrupt(): void;
}
```

### `ExecutionResult`

```typescript
interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  outputs: OutputItem[];
}
```

## Supported Packages

Python packages available via Pyodide:
- numpy, pandas, scipy, scikit-learn
- matplotlib, plotly
- requests, beautifulsoup4
- And 100+ more...

## License

MIT © Lisa AI
