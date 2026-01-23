# @lisa-sdk/ui

The Premium UI Component library for the Lisa SDK. Build beautiful AI interfaces in minutes.

## Features

- 💎 **Premium Design**: Material UI based components with a modern AI look and feel.
- 🧱 **Pure Components**: Stateless components, easy to integrate with any state management.
- ♿ **Accessible**: WCAG compliant.
- 🌓 **Theming**: Supports Dark and Light modes out of the box.

## Installation

```bash
npm install @lisa-sdk/ui @mui/material @emotion/react @emotion/styled lucide-react
```

## Usage

### Chat Message

```tsx
import { ChatMessage } from '@lisa-sdk/ui';

<ChatMessage 
  sender="assistant" 
  content="Hello! How can I help you?" 
  timestamp={Date.now()} 
/>
```

### Mic Indicator

```tsx
import { MicIndicator } from '@lisa-sdk/ui';

<MicIndicator 
  isListening={true} 
  volume={0.5} 
  onClick={() => console.log('Mic clicked')} 
/>
```
