// eslint-disable-next-line no-restricted-globals
const ctxMap: { ctx?: OffscreenCanvasRenderingContext2D } = {};

interface DrawData {
  width: number;
  height: number;
  faces?: any[];
  hands?: any[];
  objects?: any[];
  pose?: any;
  smileDetected: boolean;
  speechDetected: boolean;
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
  ctx.strokeStyle = 'yellow';

  // draw objects boxes
  data.objects?.forEach((o) => {
    ctx.strokeRect(o.box.x, o.box.y, o.box.w, o.box.h);
  });

  // draw hands boxes
  data.hands?.forEach((h) => {
    ctx.strokeStyle = h.handedness === 'Left' ? 'red' : 'blue';
    ctx.strokeRect(h.box.x, h.box.y, h.box.w, h.box.h);
  });

  // simple smile/voice banner
  if (data.smileDetected && data.speechDetected) {
    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('😊 Coucou !', 20, 60);
  }
};
