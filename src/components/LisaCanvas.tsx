import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import DrawWorker from '../workers/drawWorker.ts?worker';
import { useAppStore } from '../store/appStore'; // Changed from useVisionAudioStore
import { visionSense, Percept, VisionPayload, DetectionResult, MediaPipeFacePayload, MediaPipeHandPayload } from '../senses/vision';

interface Props {
  video?: HTMLVideoElement | null;
}

/**
 * Renders landmarks and detections from Zustand store over the provided video element.
 */
export default function LisaCanvas({ video }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { percepts, lastSilenceMs, audio, smileDetected, speechDetected, featureFlags } =
    useAppStore((s) => ({
      percepts: s.percepts,
      lastSilenceMs: s.lastSilenceMs,
      audio: s.audio,
      smileDetected: s.smileDetected,
      speechDetected: s.speechDetected,
      featureFlags: s.featureFlags,
    }));
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

  // Subscribe to visionSense percepts and update store
  useEffect(() => {
    const handleVisionPercept = (percept: Percept<VisionPayload>) => {
      useAppStore.setState((state) => ({
        percepts: [...(state.percepts || []), percept],
      }));
    };

    if (featureFlags.advancedVision) {
      visionSense.setOnPerceptCallback(handleVisionPercept);
      visionSense.start();
    } else {
      visionSense.stop();
    }

    return () => {
      visionSense.stop();
      visionSense.setOnPerceptCallback(null);
    };
  }, [featureFlags.advancedVision]);

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
    // Note: `faces` is not defined here. Assuming it comes from percepts now.
    // if (faces?.length && audio?.category === 'Speech') {
    //   ctx.fillStyle = '#0f0';
    //   ctx.fillText(t('greeting_overlay'), ctx.canvas.width - 100, 30);
    // }
  }, [percepts, lastSilenceMs, audio, video, smileDetected, speechDetected, featureFlags.advancedVision]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />;
}
