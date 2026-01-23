# Lisa - Monorepo Modulaire

Architecture **pnpm workspaces** avec packages commercialisables.

## Structure

```
lisa-monorepo/
├── src/              # App React + Vite (racine)
├── apps/
│   └── mobile/       # Capacitor (Android/iOS)
├── packages/
│   ├── core/         # Types, utils, hooks
│   ├── code-executor/# Python via Pyodide (engine + react)
│   ├── markdown-renderer/
│   ├── vision-engine/# MediaPipe
│   └── audio-engine/ # Speech recognition/synthesis
└── pnpm-workspace.yaml
```

## Packages

| Package | Description | Subpaths |
|---------|-------------|----------|
| `@lisa/core` | Types, utils, hooks | - |
| `@lisa/code-executor` | Exécution Python | `/engine`, `/react` |
| `@lisa/markdown-renderer` | Rendu Markdown | - |
| `@lisa/vision-engine` | Vision (MediaPipe) | - |
| `@lisa/audio-engine` | Audio (Speech) | - |

## Installation

```bash
# Installer pnpm
npm install -g pnpm

# Installer les dépendances
pnpm install

# Build tous les packages
pnpm build:packages

# Dev server
pnpm dev
```

## Utilisation

### Code Executor (Engine)
```ts
import { executeCode, createExecutor } from '@lisa/code-executor/engine';

const result = await executeCode('print("Hello")');
```

### Code Executor (React)
```tsx
import { CodeCell, useCodeExecutor } from '@lisa/code-executor/react';

<CodeCell code="import numpy as np\nprint(np.array([1,2,3]))" />
```

### Markdown Renderer
```tsx
import { MarkdownRenderer } from '@lisa/markdown-renderer';

<MarkdownRenderer content="# Hello\n```python\nprint('Hi')\n```" />
```

### Vision Engine
```tsx
import { createFaceDetector } from '@lisa/vision-engine';

const detector = createFaceDetector({ minConfidence: 0.7 });
await detector.initialize();
const faces = await detector.detect(videoElement);
```

## Mobile (Capacitor)

```bash
# Build web d'abord
pnpm build

# Puis sync mobile
cd apps/mobile
npx cap add android
npx cap add ios
npx cap sync
npx cap open android
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Dev server |
| `pnpm build` | Build web |
| `pnpm build:packages` | Build packages |
| `pnpm mobile:sync` | Sync Capacitor |

## Publication

Chaque package peut être publié séparément :

```bash
cd packages/code-executor
pnpm build
npm publish --access public
```

## Licence

MIT © Lisa AI Team
