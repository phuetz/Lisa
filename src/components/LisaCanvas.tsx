import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import DrawWorker from '../workers/drawWorker.ts?worker';
import { useAppStore } from '../store/appStore'; // Changed from useVisionAudioStore
import { visionSense } from '../features/vision/api';
import { useAdvancedVision } from '../hooks/useAdvancedVision';
import type { Percept, VisionPayload, DetectionResult, MediaPipeFacePayload, MediaPipeHandPayload, MediaPipePosePayload } from '../features/vision/api';
import { logComponent, logError, startupLogger } from '../utils/startupLogger';

const MAX_PERCEPTS = 10; // Limiter le nombre de percepts stockés

interface Props {
  video?: HTMLVideoElement | null;
}

/**
 * Renders landmarks and detections from Zustand store over the provided video element.
 */
export default function LisaCanvas({ video }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  logComponent('LisaCanvas', 'Component mounting', { hasVideo: !!video });

  // Séparer les selectors pour éviter re-renders inutiles
  const percepts = useAppStore((s) => s.percepts);
  const lastSilenceMs = useAppStore((s) => s.lastSilenceMs);
  const audio = useAppStore((s) => s.audio);
  const smileDetected = useAppStore((s) => s.smileDetected);
  const speechDetected = useAppStore((s) => s.speechDetected);
  const featureFlags = useAppStore((s) => s.featureFlags);
  const workerRef = useRef<Worker | null>(null);
  const useWorker = useRef<boolean>(false);
  const cheerUntilRef = useRef<number>(0);
  const isTransferredRef = useRef<boolean>(false);

  // Feed video frames to advanced vision worker is now handled in App.tsx
  
  // Init worker & offscreen if supported
  useEffect(() => {
    if (!canvasRef.current) {
      logComponent('LisaCanvas', 'Canvas ref not ready');
      return;
    }

    // Prevent double transfer in React Strict Mode (dev)
    if (isTransferredRef.current) {
      logComponent('LisaCanvas', 'Canvas already transferred (Strict Mode protection)');
      return;
    }

    startupLogger.startTimer('canvas-worker-init');

    if ('transferControlToOffscreen' in canvasRef.current && import.meta.env.PROD) {
      try {
        logComponent('LisaCanvas', 'Transferring canvas to OffscreenCanvas');
        const off = (canvasRef.current as HTMLCanvasElement & { transferControlToOffscreen: () => OffscreenCanvas }).transferControlToOffscreen();
        workerRef.current = new DrawWorker();
        workerRef.current.postMessage({ canvas: off }, [off]);
        useWorker.current = true;
        isTransferredRef.current = true;

        startupLogger.endTimer('canvas-worker-init', 'component', 'LisaCanvas');
        logComponent('LisaCanvas', 'Worker initialized successfully');
      } catch (error) {
        logError('component', 'Failed to initialize canvas worker', error, 'LisaCanvas');
      }
    } else {
      const reason = !('transferControlToOffscreen' in canvasRef.current)
        ? 'OffscreenCanvas not supported'
        : 'Dev mode (Strict Mode) - OffscreenCanvas disabled';
      logComponent('LisaCanvas', `${reason}, using main thread`);
    }

    return () => {
      // Cleanup worker on unmount
      if (workerRef.current) {
        logComponent('LisaCanvas', 'Terminating worker');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Subscription to vision percepts is now handled centrally in App.tsx or directly via store updates in visionSense

  // Resize canvas to match video size on mount / resize
  useEffect(() => {
    if (!video || !canvasRef.current) return;
    const resize = () => {
      if (!canvasRef.current || !video) return;

      // If the canvas was transferred, never mutate width/height directly
      if (isTransferredRef.current) {
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'resize',
            width: video.videoWidth,
            height: video.videoHeight
          });
        }
        return;
      }

      // Otherwise, safe to set size directly
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
        percepts,
        smileDetected,
        speechDetected,
        featureFlags,
      });
      return;
    }
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Percepts
    percepts?.forEach((p) => {
      if (p.modality === 'vision') {
        if (featureFlags.advancedVision && (p.payload as DetectionResult).boxes) {
          // Advanced Vision (YOLOv8-n or similar)
          const payload = p.payload as DetectionResult;
          payload.boxes.forEach((box, i) => {
            const [x1, y1, x2, y2] = box;
            const width = x2 - x1;
            const height = y2 - y1;
            ctx.strokeStyle = '#00FFFF'; // Cyan for advanced vision
            ctx.lineWidth = 2;
            ctx.strokeRect(x1 * ctx.canvas.width, y1 * ctx.canvas.height, width * ctx.canvas.width, height * ctx.canvas.height);
            ctx.fillStyle = '#00FFFF';
            ctx.fillText(`${payload.classes[i]} (${(payload.scores[i] * 100).toFixed(0)}%)`, x1 * ctx.canvas.width, y1 * ctx.canvas.height - 4);
          });
        } else if ((p.payload as MediaPipeFacePayload).type === 'face') {
          // MediaPipe Face Detection
          const payload = p.payload as MediaPipeFacePayload;
          payload.boxes.forEach(box => {
            const [x, y, width, height] = box;
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
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
            ctx.lineWidth = 2;
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

    // Pose Skeleton
    percepts?.forEach((p) => {
      if (p.modality === 'vision' && (p.payload as MediaPipePosePayload).type === 'pose') {
        const payload = p.payload as MediaPipePosePayload;
        const landmarks = payload.landmarks as Array<{ x: number; y: number; visibility: number }>;

        if (landmarks && landmarks.length > 0) {
          const POSE_CONNECTIONS = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Upper body
            [11, 23], [12, 24], [23, 24], // Torso
            [23, 25], [25, 27], [27, 29], [29, 31], // Left leg
            [24, 26], [26, 28], [28, 30], [30, 32]  // Right leg
          ];

          ctx.lineWidth = 2;
          ctx.strokeStyle = '#00FF00'; // Green for skeleton

          // Draw connections
          POSE_CONNECTIONS.forEach(([start, end]) => {
            const startPt = landmarks[start];
            const endPt = landmarks[end];

            if (startPt && endPt && (startPt.visibility > 0.5) && (endPt.visibility > 0.5)) {
              ctx.beginPath();
              ctx.moveTo(startPt.x * ctx.canvas.width, startPt.y * ctx.canvas.height);
              ctx.lineTo(endPt.x * ctx.canvas.width, endPt.y * ctx.canvas.height);
              ctx.stroke();
            }
          });

          // Draw landmarks
          ctx.fillStyle = '#FF0000'; // Red for joints
          landmarks.forEach((lm) => {
            if (lm.visibility > 0.5) {
              ctx.beginPath();
              ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, 3, 0, 2 * Math.PI);
              ctx.fill();
            }
          });
        }
      }
    });

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
    // Note: `faces` is not defined here. Assuming it comes from percepts now.
    // if (faces?.length && audio?.category === 'Speech') {
    //   ctx.fillStyle = '#0f0';
    //   ctx.fillText(t('greeting_overlay'), ctx.canvas.width - 100, 30);
    // }
  }, [percepts, lastSilenceMs, audio, video, smileDetected, speechDetected, featureFlags.advancedVision, t, featureFlags]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />;
}
