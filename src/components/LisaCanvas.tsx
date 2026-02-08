import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import DrawWorker from '../workers/drawWorker.ts?worker';
import { useAppStore } from '../store/appStore';

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
    useAppStore(useShallow((s) => ({
      faces: s.faces,
      hands: s.hands,
      objects: s.objects,
      poses: s.poses,
      lastSilenceMs: s.lastSilenceMs,
      audio: s.audio,
      smileDetected: s.smileDetected,
      speechDetected: s.speechDetected,
    })));
  const workerRef = useRef<Worker | null>(null);
  const useWorker = useRef<boolean>(false);
  const transferredRef = useRef<boolean>(false);
  const cheerUntilRef = useRef<number>(0);

  // Init worker & offscreen if supported — cleanup on unmount
  useEffect(() => {
    if (!canvasRef.current || transferredRef.current) return;
    if ('transferControlToOffscreen' in canvasRef.current) {
      try {
        const off = (canvasRef.current as HTMLCanvasElement & { transferControlToOffscreen(): OffscreenCanvas }).transferControlToOffscreen();
        workerRef.current = new DrawWorker();
        workerRef.current.postMessage({ canvas: off }, [off]);
        useWorker.current = true;
        transferredRef.current = true;
      } catch {
        console.warn('[LisaCanvas] OffscreenCanvas already transferred');
      }
    }
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Resize canvas to match video size on mount / resize
  useEffect(() => {
    if (!video) return;
    const resize = () => {
      if (!video) return;
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (useWorker.current && workerRef.current) {
        // Send resize to worker (canvas already transferred)
        workerRef.current.postMessage({ type: 'resize', width, height });
      } else if (canvasRef.current && !transferredRef.current) {
        // Direct DOM only if canvas not transferred
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
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
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally skip array/object refs to avoid excessive re-draws; store pushes updates via shallow equality
  }, [faces, hands, objects, poses, lastSilenceMs, audio, video, smileDetected, speechDetected, t]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />;
}
