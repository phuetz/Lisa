# @lisa-sdk/vision

The standalone Computer Vision module for the Lisa SDK. Use this package to add advanced vision capabilities (Object Detection, Pose Estimation) to any React application.

## Features

- 🚀 **Hardware Accelerated**: Uses WebGL via TensorFlow.js for YOLOv8 inference.
- 🔄 **CPU Fallback**: Automatic fallback to MediaPipe (WASM) if WebGL is unavailable.
- 🧩 **Modular**: Decoupled from application state.
- ⚛️ **React Ready**: Includes hooks and overlay components.

## Installation

```bash
npm install @lisa-sdk/vision
```

## Usage

### 1. Basic Hook Usage

```tsx
import React, { useRef } from 'react';
import { useVision, VisionOverlay } from '@lisa-sdk/vision';

export const CameraView = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Initialize vision system
  const { percepts } = useVision(videoRef, {
    features: { enablePose: true }
  });

  return (
    <div className="relative">
      <video ref={videoRef} autoPlay playsInline muted />
      <VisionOverlay percepts={percepts} />
    </div>
  );
};
```

### 2. Manual Service Usage

```typescript
import { VisionService } from '@lisa-sdk/vision';

const vision = new VisionService();
await vision.initialize();

vision.onPercept((percept) => {
  console.log('Detected:', percept);
});

// Process a frame manually
vision.processFrame(document.querySelector('video'));
```

## Configuration

You can customize the models and thresholds:

```typescript
const config = {
  models: {
    yolo: {
      url: 'https://your-custom-model-url/model.json',
      confidence: 0.7
    }
  }
};
```