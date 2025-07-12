import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import DrawWorker from '../workers/drawWorker.ts?worker';
import { useVisionAudioStore } from '../store/visionAudioStore';

interface Props {
  video?: HTMLVideoElement | null;
}

/**
 * Renders landmarks and detections from Zustand store over the provided video element.
 */
export default function LisaCanvas({ video }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { faces, hands, objects, poses, lastSilenceMs, audio, smileDetected, speechDetected } =
    useVisionAudioStore();
  const workerRef = useRef<Worker | null>(null);
  const useWorker = useRef<boolean>(false);
  const cheerUntilRef = useRef<number>(0);

  // Init worker & offscreen if supported
  useEffect(() => {
    if (!canvasRef.current) return;
    if ('transferControlToOffscreen' in canvasRef.current) {
      const off = (canvasRef.current as any).transferControlToOffscreen();
      workerRef.current = new DrawWorker();
      workerRef.current.postMessage({ canvas: off }, [off]);
      useWorker.current = true;
    }
  }, []);

  // Resize canvas to match video size on mount / resize
  useEffect(() => {
    if (!video || !canvasRef.current) return;
    const resize = () => {
      if (!canvasRef.current || !video) return;
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [video]);

  // Draw when store updates
  useEffect(() => {
    if (!video || !canvasRef.current) return;
    if (useWorker.current && workerRef.current) {
      workerRef.current.postMessage({
        width: canvasRef.current.width,
        height: canvasRef.current.height,
        faces,
        hands,
        objects,
        poses,
        smileDetected,
        speechDetected,
      });
      return;
    }
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Face boxes
    faces?.forEach((f) => {
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 2;
      ctx.strokeRect(f.boundingBox.x, f.boundingBox.y, f.boundingBox.width, f.boundingBox.height);
      ctx.fillStyle = 'yellow';
      ctx.fillText(f.score.toFixed(2), f.boundingBox.x, f.boundingBox.y - 4);
    });

    // Objects
    objects?.forEach((o) => {
      ctx.strokeStyle = 'lime';
      ctx.strokeRect(o.box.x, o.box.y, o.box.width, o.box.height);
      ctx.fillStyle = 'lime';
      ctx.fillText(`${o.category} (${o.score.toFixed(2)})`, o.box.x, o.box.y - 4);
    });

    // Hands boxes
    hands?.forEach((h) => {
      ctx.strokeStyle = h.handedness === 'Left' ? 'red' : 'blue';
      const xs = Array.from(h.landmarks).filter((_, i) => i % 3 === 0);
      const ys = Array.from(h.landmarks).filter((_, i) => i % 3 === 1);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      ctx.strokeRect(minX * ctx.canvas.width, minY * ctx.canvas.height, (maxX - minX) * ctx.canvas.width, (maxY - minY) * ctx.canvas.height);
    });

    // TODO: pose skeleton

    // Smile + voice animation
    if (smileDetected && speechDetected) {
      cheerUntilRef.current = Date.now() + 3000; // show 3s
    }
    if (Date.now() < cheerUntilRef.current) {
      ctx.font = '48px sans-serif';
      ctx.fillStyle = 'rgba(255,215,0,0.9)';
      ctx.fillText(t('smile_voice_overlay'), ctx.canvas.width / 2 - 100, 60);
    }

    // Silence banner
    if (lastSilenceMs >= 10000) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(10, 10, 260, 30);
      ctx.fillStyle = '#000';
      ctx.fillText(t('silence_banner'), 20, 30);
    }

    // Friendly greeting
    if (faces?.length && audio?.category === 'Speech') {
      ctx.fillStyle = '#0f0';
      ctx.fillText(t('greeting_overlay'), ctx.canvas.width - 100, 30);
    }
  }, [faces, hands, objects, poses, lastSilenceMs, audio, video]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />;
}
