# @lisa-sdk/hearing

The standalone Hearing module for the Lisa SDK. Provides speech-to-text (Whisper), sentiment analysis, and audio processing.

## Features

- 🎙️ **Whisper Powered**: Runs OpenAI's Whisper model locally in the browser via WebAssembly.
- 🌊 **Audio Worklet**: Efficient audio processing pipeline.
- 🌐 **Web Speech Fallback**: Automatic fallback if WASM is not supported.
- 🧩 **Modular**: Decoupled from application state.

## Installation

```bash
npm install @lisa-sdk/hearing
```

## Usage

```tsx
import { useHearing } from '@lisa-sdk/hearing';

export const VoiceInput = () => {
  const { percepts, startListening, stopListening } = useHearing({
    features: { enableWhisper: true }
  });

  const lastTranscript = percepts.slice(-1)[0]?.payload.text;

  return (
    <div>
      <button onClick={startListening}>Listen</button>
      <button onClick={stopListening}>Stop</button>
      <p>Transcript: {lastTranscript}</p>
    </div>
  );
};
```