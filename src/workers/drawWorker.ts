// eslint-disable-next-line no-restricted-globals
const ctxMap: { ctx?: OffscreenCanvasRenderingContext2D } = {};

import { Percept, VisionPayload, MediaPipeFacePayload, MediaPipeHandPayload, DetectionResult } from '../types';

interface DrawData {
  width: number;
  height: number;
  percepts?: Percept<VisionPayload>[];
  smileDetected: boolean;
  speechDetected: boolean;
  featureFlags: { advancedVision: boolean };
}

self.onmessage = (e: MessageEvent) => {
  if (e.data.canvas) {
    // Initial handshake, receive OffscreenCanvas
    const canvas: OffscreenCanvas = e.data.canvas;
    ctxMap.ctx = canvas.getContext('2d')!;
    return;
  }

  const data: DrawData = e.data;
  const ctx = ctxMap.ctx;
  if (!ctx) return;
  ctx.clearRect(0, 0, data.width, data.height);
  ctx.lineWidth = 2;

  // Draw percepts
  data.percepts?.forEach((p) => {
    if (p.modality === 'vision') {
      if (data.featureFlags.advancedVision && (p.payload as DetectionResult).boxes) {
        // Advanced Vision (YOLOv8-n or similar)
        const payload = p.payload as DetectionResult;
        payload.boxes.forEach((box, i) => {
          const [x1, y1, x2, y2] = box;
          const width = x2 - x1;
          const height = y2 - y1;
          ctx.strokeStyle = '#00FFFF'; // Cyan for advanced vision
          ctx.strokeRect(x1 * data.width, y1 * data.height, width * data.width, height * data.height);
          ctx.fillStyle = '#00FFFF';
          ctx.fillText(`${payload.classes[i]} (${(payload.scores[i] * 100).toFixed(0)}%)`, x1 * data.width, y1 * data.height - 4);
        });
      } else if ((p.payload as MediaPipeFacePayload).type === 'face') {
        // MediaPipe Face Detection
        const payload = p.payload as MediaPipeFacePayload;
        payload.boxes.forEach(box => {
          const [x, y, width, height] = box;
          ctx.strokeStyle = 'yellow';
          ctx.strokeRect(x, y, width, height);
          ctx.fillStyle = 'yellow';
          ctx.fillText(`Face (${(payload.scores[0] * 100).toFixed(0)}%)`, x, y - 4);
        });
      } else if ((p.payload as MediaPipeHandPayload).type === 'hand') {
        // MediaPipe Hand Detection
        const payload = p.payload as MediaPipeHandPayload;
        payload.boxes.forEach(box => {
          const [x, y, width, height] = box;
          ctx.strokeStyle = payload.handedness === 'Left' ? 'red' : 'blue';
          ctx.strokeRect(x, y, width, height);
          ctx.fillStyle = payload.handedness === 'Left' ? 'red' : 'blue';
          ctx.fillText(`${payload.handedness} Hand (${(payload.scores[0] * 100).toFixed(0)}%)`, x, y - 4);
        });
      } else if ((p.payload as any).type === 'object') { // Existing MediaPipe Object Detection
        ctx.strokeStyle = 'lime';
        ctx.strokeRect((p.payload as any).box.x, (p.payload as any).box.y, (p.payload as any).box.width, (p.payload as any).box.height);
        ctx.fillStyle = 'lime';
        ctx.fillText(`${(p.payload as any).category} (${(p.payload as any).score.toFixed(2)})`, (p.payload as any).box.x, (p.payload as any).box.y - 4);
      }
    }
  });

  // simple smile/voice banner
  if (data.smileDetected && data.speechDetected) {
    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('😊 Coucou !', 20, 60);
  }
};
