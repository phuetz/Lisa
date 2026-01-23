# @lisa-sdk/markdown

An advanced Markdown renderer optimized for AI-generated content. Supports GFM, syntax highlighting, and HTML.

## Installation

```bash
npm install @lisa-sdk/markdown
```

## Usage

```tsx
import { Markdown } from '@lisa-sdk/markdown';

const content = `
# Plan
1. **Analyze** the data.
2. *Generate* report.
`;

<Markdown content={content} />
```