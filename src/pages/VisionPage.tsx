import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Eye, Camera, ScanLine, Palette, Users,
  Play, Square, AlertCircle, CheckCircle, AlertTriangle,
  Zap, ChevronDown, Upload, Copy, Download, Maximize2, Minimize2,
  History, Trash2
} from 'lucide-react';
import { agentRegistry } from '../features/agents/core/registry';
import type { VisionAgent, VisionTask, VisionResult } from '../agents/VisionAgent';
import type { OCRAgent, OCRResult } from '../agents/OCRAgent';
import { BodyPartsPanel } from '../components/vision/BodyPartsPanel';
import type { PoseLandmark } from '../components/vision/bodyPartsConstants';

// Select Component
const Select = ({
  label,
  value,
  onChange,
  options,
  icon: Icon
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  icon?: React.ElementType;
}) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{
      display: 'block',
      fontSize: '13px',
      color: 'var(--text-tertiary, #6a6a82)',
      marginBottom: '8px'
    }}>
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      {Icon && (
        <Icon size={18} color="var(--text-muted, #6a6a82)" style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)'
        }} />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: Icon ? '12px 14px 12px 40px' : '12px 14px',
          backgroundColor: 'var(--bg-tertiary, #1a1a26)',
          border: '1px solid var(--border-primary, #2d2d44)',
          borderRadius: '8px',
          color: 'var(--text-primary, #e8e8f0)',
          fontSize: '14px',
          outline: 'none',
          cursor: 'pointer',
          appearance: 'none'
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} color="var(--text-muted, #6a6a82)" style={{
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none'
      }} />
    </div>
  </div>
);

export default function VisionPage() {
  const [task, setTask] = useState<VisionTask>('general_description');
  const [isProcessing, setIsProcessing] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectorsReady, setDetectorsReady] = useState(false);
  const [initializingDetectors, setInitializingDetectors] = useState(true);
  const [realtimeMode, setRealtimeMode] = useState(false);
  const [realtimeStats, setRealtimeStats] = useState<{
    fps: number;
    objects: number;
    faces: number;
    poses: number;
    hands: number;
  }>({ fps: 0, objects: 0, faces: 0, poses: 0, hands: 0 });

  // Body pose landmarks for BodyPartsPanel
  const [detectedPoseLandmarks, setDetectedPoseLandmarks] = useState<PoseLandmark[] | null>(null);

  // Overlay display options
  const [overlayOptions, setOverlayOptions] = useState({
    showObjects: true,
    showFaces: true,
    showPoses: true,
    showHands: true,
    showLabels: true,
    showConfidence: true,
    showLandmarks: true,
    showStats: true,
  });

  // New features
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState<Array<{
    timestamp: number;
    type: 'object' | 'face' | 'pose' | 'hand';
    label: string;
    confidence?: number;
  }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [result, setResult] = useState<{
    description?: string;
    objects?: { name: string; confidence: number }[];
    faces?: number;
    colors?: { color: string; percentage: number }[];
    processingTime?: number;
  } | null>(null);

  // OCR State
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const lastStateUpdateRef = useRef<number>(0);
  const visionAgentRef = useRef<VisionAgent | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Get Vision Agent (async for lazy loading)
  const getVisionAgent = useCallback(async (): Promise<VisionAgent | null> => {
    try {
      const agent = await agentRegistry.getAgentAsync('VisionAgent');
      return agent as VisionAgent | null;
    } catch (err) {
      console.error('Erreur chargement VisionAgent:', err);
      return null;
    }
  }, []);

  // Initialize MediaPipe detectors on mount
  const initDetectors = useCallback(async () => {
    setInitializingDetectors(true);
    setError(null);
    try {
      const agent = await getVisionAgent();
      if (agent) {
        if (agent.waitForInitialization) {
          const ready = await agent.waitForInitialization();
          setDetectorsReady(ready);
          if (!ready) {
            setError('Les détecteurs MediaPipe n\'ont pas pu être initialisés. Vérifiez votre connexion internet.');
          }
        } else {
          setDetectorsReady(true);
        }
      } else {
        setError('VisionAgent non disponible');
        setDetectorsReady(false);
      }
    } catch (err) {
      console.error('Error initializing detectors:', err);
      setError(`Erreur d'initialisation: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      setDetectorsReady(false);
    } finally {
      setInitializingDetectors(false);
    }
  }, [getVisionAgent]);

  useEffect(() => {
    initDetectors();
  }, [initDetectors]);

  // Get OCR Agent (async for lazy loading)
  const getOCRAgent = useCallback(async (): Promise<OCRAgent | null> => {
    try {
      const agent = await agentRegistry.getAgentAsync('OCRAgent');
      return agent as OCRAgent | null;
    } catch (err) {
      console.error('Erreur chargement OCRAgent:', err);
      return null;
    }
  }, []);

  // Stop webcam - cleanup function
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  }, []);

  // Initialize webcam
  const initWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
              .then(() => resolve())
              .catch(reject);
          };
          videoRef.current.onerror = () => reject(new Error('Video error'));
        });
        setWebcamActive(true);
        setError(null);
      }
    } catch (err) {
      console.error('Webcam error:', err);
      setError('Impossible d\'accéder à la webcam. Vérifiez les permissions.');
      setWebcamActive(false);
    }
  }, []);

  // Toggle webcam
  const toggleWebcam = useCallback(() => {
    if (webcamActive) {
      stopWebcam();
      setRealtimeMode(false);
    } else {
      initWebcam();
    }
  }, [webcamActive, stopWebcam, initWebcam]);

  // Draw detection results on canvas overlay
  const drawDetections = useCallback((
    ctx: CanvasRenderingContext2D,
    detections: {
      objects: Array<{ name: string; confidence: number; box: { x: number; y: number; width: number; height: number } }>;
      faces: Array<{ box: { x: number; y: number; width: number; height: number }; landmarks?: { x: number; y: number }[] }>;
      poses: Array<{ landmarks: { x: number; y: number; z: number; visibility: number }[] }>;
      hands: Array<{ handedness: string; landmarks: { x: number; y: number; z: number }[] }>;
    },
    videoWidth: number,
    videoHeight: number,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const fingerNames = ['Poignet', 'Pouce1', 'Pouce2', 'Pouce3', 'Pouce',
      'Index1', 'Index2', 'Index3', 'Index', 'Majeur1', 'Majeur2', 'Majeur3', 'Majeur',
      'Annulaire1', 'Annulaire2', 'Annulaire3', 'Annulaire', 'Auriculaire1', 'Auriculaire2', 'Auriculaire3', 'Auriculaire'];

    const poseLandmarkNames = ['Nez', 'Œil G int', 'Œil G', 'Œil G ext', 'Œil D int', 'Œil D', 'Œil D ext',
      'Oreille G', 'Oreille D', 'Bouche G', 'Bouche D', 'Épaule G', 'Épaule D', 'Coude G', 'Coude D',
      'Poignet G', 'Poignet D', 'Petit doigt G', 'Petit doigt D', 'Index G', 'Index D', 'Pouce G', 'Pouce D',
      'Hanche G', 'Hanche D', 'Genou G', 'Genou D', 'Cheville G', 'Cheville D', 'Talon G', 'Talon D',
      'Pied G', 'Pied D'];

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const scaleX = canvasWidth / videoWidth;
    const scaleY = canvasHeight / videoHeight;

    // Draw objects (green boxes)
    if (overlayOptions.showObjects) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.font = 'bold 14px Inter, Arial, sans-serif';
      detections.objects.forEach(obj => {
        const x = obj.box.x * scaleX;
        const y = obj.box.y * scaleY;
        const w = obj.box.width * scaleX;
        const h = obj.box.height * scaleY;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();

        if (overlayOptions.showLabels) {
          const label = overlayOptions.showConfidence
            ? `${obj.name} ${Math.round(obj.confidence * 100)}%`
            : obj.name;
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
          ctx.beginPath();
          ctx.roundRect(x, y - 26, textWidth + 16, 24, 4);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(label, x + 8, y - 8);
        }
      });
    }

    // Draw faces (cyan boxes with face mesh)
    if (overlayOptions.showFaces) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      detections.faces.forEach((face, faceIdx) => {
        const x = face.box.x * scaleX;
        const y = face.box.y * scaleY;
        const w = face.box.width * scaleX;
        const h = face.box.height * scaleY;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();

        if (overlayOptions.showLabels) {
          const label = `Visage ${faceIdx + 1}`;
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
          ctx.beginPath();
          ctx.roundRect(x, y - 26, textWidth + 16, 24, 4);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(label, x + 8, y - 8);
        }

        // Draw face landmarks (mesh points)
        if (overlayOptions.showLandmarks && face.landmarks) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
          face.landmarks.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x * scaleX, point.y * scaleY, 2, 0, 2 * Math.PI);
            ctx.fill();
          });

          // Draw face contour
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
          ctx.lineWidth = 1;
          const faceContour = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
          if (face.landmarks.length > 400) {
            ctx.beginPath();
            faceContour.forEach((idx, i) => {
              if (face.landmarks && face.landmarks[idx]) {
                const px = face.landmarks[idx].x * scaleX;
                const py = face.landmarks[idx].y * scaleY;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
            });
            ctx.stroke();
          }
        }
      });
    }

    // Draw poses (purple skeleton with labels)
    if (overlayOptions.showPoses) {
      ctx.lineWidth = 3;
      const poseConnections = [
        [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
        [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
        [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
        [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
        [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
      ];

      detections.poses.forEach(pose => {
        poseConnections.forEach(([i, j]) => {
          if (pose.landmarks[i] && pose.landmarks[j]) {
            const a = pose.landmarks[i];
            const b = pose.landmarks[j];
            if (a.visibility > 0.5 && b.visibility > 0.5) {
              const ax = a.x * scaleX, ay = a.y * scaleY;
              const bx = b.x * scaleX, by = b.y * scaleY;

              const gradient = ctx.createLinearGradient(ax, ay, bx, by);
              gradient.addColorStop(0, '#8b5cf6');
              gradient.addColorStop(1, '#a78bfa');
              ctx.strokeStyle = gradient;

              ctx.beginPath();
              ctx.moveTo(ax, ay);
              ctx.lineTo(bx, by);
              ctx.stroke();
            }
          }
        });

        pose.landmarks.forEach((point, idx) => {
          if (point.visibility > 0.5) {
            const px = point.x * scaleX;
            const py = point.y * scaleY;

            ctx.fillStyle = '#8b5cf6';
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, 2 * Math.PI);
            ctx.fill();

            if (overlayOptions.showLabels && poseLandmarkNames[idx] && [0, 11, 12, 15, 16, 23, 24, 27, 28].includes(idx)) {
              ctx.font = 'bold 10px Inter, Arial, sans-serif';
              ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
              const label = poseLandmarkNames[idx];
              const textWidth = ctx.measureText(label).width;
              ctx.beginPath();
              ctx.roundRect(px + 6, py - 8, textWidth + 8, 16, 3);
              ctx.fill();
              ctx.fillStyle = '#fff';
              ctx.fillText(label, px + 10, py + 4);
            }
          }
        });
      });
    }

    // Draw hands (amber with finger labels)
    if (overlayOptions.showHands) {
      ctx.lineWidth = 2;
      const handConnections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [5, 9], [9, 13], [13, 17]
      ];

      detections.hands.forEach(hand => {
        ctx.strokeStyle = '#f59e0b';
        handConnections.forEach(([i, j]) => {
          if (hand.landmarks[i] && hand.landmarks[j]) {
            const ax = hand.landmarks[i].x * scaleX;
            const ay = hand.landmarks[i].y * scaleY;
            const bx = hand.landmarks[j].x * scaleX;
            const by = hand.landmarks[j].y * scaleY;

            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        });

        hand.landmarks.forEach((point, idx) => {
          const px = point.x * scaleX;
          const py = point.y * scaleY;

          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, 2 * Math.PI);
          ctx.fill();

          if (overlayOptions.showLabels && overlayOptions.showLandmarks && [4, 8, 12, 16, 20].includes(idx)) {
            ctx.font = 'bold 10px Inter, Arial, sans-serif';
            const label = fingerNames[idx] || `D${idx}`;
            ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
            const textWidth = ctx.measureText(label).width;
            ctx.beginPath();
            ctx.roundRect(px - textWidth/2 - 4, py - 22, textWidth + 8, 16, 3);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(label, px - textWidth/2, py - 10);
          }
        });

        if (overlayOptions.showLabels && hand.landmarks[0]) {
          const wx = hand.landmarks[0].x * scaleX;
          const wy = hand.landmarks[0].y * scaleY;
          const label = hand.handedness === 'Left' ? 'Main Gauche' : 'Main Droite';
          ctx.font = 'bold 12px Inter, Arial, sans-serif';
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
          ctx.beginPath();
          ctx.roundRect(wx - textWidth/2 - 8, wy + 10, textWidth + 16, 22, 4);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(label, wx - textWidth/2, wy + 26);
        }
      });
    }
  }, [overlayOptions]);

  // Real-time detection loop
  const runRealtimeDetection = useCallback(async () => {
    if (!realtimeMode || !webcamActive || !videoRef.current || !overlayCanvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    } else {
      animationFrameRef.current = requestAnimationFrame(runRealtimeDetection);
      return;
    }

    if (!visionAgentRef.current) {
      visionAgentRef.current = await getVisionAgent();
      if (visionAgentRef.current?.setRunningMode) {
        await visionAgentRef.current.setRunningMode('VIDEO');
      }
    }

    const agent = visionAgentRef.current;
    if (!agent || !agent.detectRealtime) {
      animationFrameRef.current = requestAnimationFrame(runRealtimeDetection);
      return;
    }

    const now = performance.now();
    const fps = lastFrameTimeRef.current ? Math.round(1000 / (now - lastFrameTimeRef.current)) : 0;
    lastFrameTimeRef.current = now;

    const detections = agent.detectRealtime(video);

    // Throttle state updates to every 150ms to prevent flickering
    const shouldUpdateState = (now - lastStateUpdateRef.current) > 150;

    if (shouldUpdateState) {
      lastStateUpdateRef.current = now;

      setRealtimeStats({
        fps,
        objects: detections.objects.length,
        faces: detections.faces.length,
        poses: detections.poses.length,
        hands: detections.hands.length,
      });

      if (detections.poses.length > 0 && detections.poses[0].landmarks) {
        setDetectedPoseLandmarks(detections.poses[0].landmarks as PoseLandmark[]);
      } else {
        setDetectedPoseLandmarks(null);
      }
    }

    drawDetections(ctx, detections, video.videoWidth, video.videoHeight, canvas.width, canvas.height);
    animationFrameRef.current = requestAnimationFrame(runRealtimeDetection);
  }, [realtimeMode, webcamActive, getVisionAgent, drawDetections, overlayOptions]);

  // Sync canvas size with video when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncCanvasSize = () => {
      if (overlayCanvasRef.current && video.videoWidth && video.videoHeight) {
        overlayCanvasRef.current.width = video.videoWidth;
        overlayCanvasRef.current.height = video.videoHeight;
      }
    };

    video.addEventListener('loadedmetadata', syncCanvasSize);
    video.addEventListener('resize', syncCanvasSize);

    if (video.videoWidth && video.videoHeight) {
      syncCanvasSize();
    }

    return () => {
      video.removeEventListener('loadedmetadata', syncCanvasSize);
      video.removeEventListener('resize', syncCanvasSize);
    };
  }, [webcamActive]);

  // Start/stop realtime detection when mode changes
  useEffect(() => {
    if (realtimeMode && webcamActive && detectorsReady) {
      if (videoRef.current && overlayCanvasRef.current) {
        if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
          overlayCanvasRef.current.width = videoRef.current.videoWidth;
          overlayCanvasRef.current.height = videoRef.current.videoHeight;
        }
      }
      runRealtimeDetection();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
      if (visionAgentRef.current?.setRunningMode && !realtimeMode) {
        visionAgentRef.current.setRunningMode('IMAGE');
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [realtimeMode, webcamActive, detectorsReady, runRealtimeDetection]);

  const toggleRealtimeMode = useCallback(() => {
    if (!detectorsReady) return;
    setRealtimeMode(prev => !prev);
  }, [detectorsReady]);

  const toggleFullscreen = useCallback(() => {
    const container = videoContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Capture screenshot with overlay
  const captureScreenshotWithOverlay = useCallback(() => {
    if (!videoRef.current || !overlayCanvasRef.current) return;

    const video = videoRef.current;
    const overlay = overlayCanvasRef.current;

    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = video.videoWidth;
    mergedCanvas.height = video.videoHeight;
    const ctx = mergedCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    ctx.drawImage(overlay, 0, 0, mergedCanvas.width, mergedCanvas.height);

    const link = document.createElement('a');
    link.download = `lisa-vision-${Date.now()}.png`;
    link.href = mergedCanvas.toDataURL('image/png');
    link.click();

    setDetectionHistory(prev => {
      const newEntry = { timestamp: Date.now(), type: 'object' as const, label: 'Capture sauvegardée' };
      return [newEntry, ...prev].slice(0, 50);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setDetectionHistory([]);
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Capture frame from webcam
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopWebcam();
  }, [stopWebcam]);

  // Analyze image with VisionAgent
  const analyzeImage = async () => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const visionAgent = await getVisionAgent();
      if (!visionAgent) {
        throw new Error('VisionAgent non disponible');
      }

      if (!webcamActive) {
        throw new Error('Veuillez d\'abord activer la webcam');
      }

      const imageData = captureFrame();
      if (!imageData) {
        throw new Error('Impossible de capturer l\'image');
      }

      const agentResult = await visionAgent.execute({
        intent: 'analyze_image',
        parameters: {
          source: 'webcam',
          task,
          imageData,
          options: {
            confidenceThreshold: 0.5,
            maxResults: 10
          }
        }
      });

      if (!agentResult.success) {
        throw new Error(agentResult.error as string || 'Erreur d\'analyse');
      }

      const visionResult = agentResult.output as VisionResult;

      setResult({
        description: visionResult.description,
        objects: visionResult.objects?.map(o => ({ name: o.name, confidence: o.confidence })),
        faces: visionResult.faceCount,
        colors: visionResult.dominantColors,
        processingTime: visionResult.processingTimeMs
      });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file selection for OCR
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setOcrResult(null);
      setOcrError(null);
    }
  };

  // Process OCR
  const processOCR = async () => {
    if (!selectedFile) {
      setOcrError('Veuillez sélectionner une image');
      return;
    }

    setOcrProcessing(true);
    setOcrError(null);
    setOcrResult(null);

    try {
      const ocrAgent = await getOCRAgent();
      if (!ocrAgent) {
        throw new Error('OCRAgent non disponible');
      }

      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const agentResult = await ocrAgent.execute({
        intent: 'extract_text',
        parameters: {
          source: 'file',
          imageData,
          options: {
            language: 'auto',
            enhanceImage: true
          }
        }
      });

      if (!agentResult.success) {
        throw new Error(agentResult.error as string || 'Erreur OCR');
      }

      setOcrResult(agentResult.output as OCRResult);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur OCR inconnue';
      setOcrError(errorMessage);
    } finally {
      setOcrProcessing(false);
    }
  };

  const copyOcrText = () => {
    if (ocrResult?.text) {
      navigator.clipboard.writeText(ocrResult.text);
    }
  };

  const taskIcons: Record<string, React.ElementType> = {
    general_description: Eye,
    object_detection: ScanLine,
    face_detection: Users,
    color_analysis: Palette
  };

  const TaskIcon = taskIcons[task] || Eye;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Vision</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Détection d'objets, visages et poses en temps réel</p>
        </div>
      </div>
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 1fr) minmax(280px, 480px)',
        gap: '20px',
        height: 'calc(100vh - 140px)',
        minHeight: '500px'
      }}>
        {/* ===== LEFT: Main Video Area ===== */}
        <div
          ref={videoContainerRef}
          style={{
            backgroundColor: 'var(--bg-surface, #12121a)',
            borderRadius: '12px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border-primary, #2d2d44)'
          }}
        >
          {/* Video + Canvas Overlay */}
          <div style={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ position: 'relative', display: webcamActive ? 'block' : 'none' }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
              <canvas
                ref={overlayCanvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  display: realtimeMode ? 'block' : 'none'
                }}
              />
            </div>

            {/* Stats overlay */}
            {webcamActive && realtimeMode && overlayOptions.showStats && (
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                backgroundColor: 'rgba(10, 10, 15, 0.85)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px',
                color: 'var(--text-primary, #e8e8f0)',
                fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-primary, #2d2d44)'
              }}>
                <div style={{ color: 'var(--color-accent, #f5a623)', fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
                  {realtimeStats.fps} FPS
                </div>
                <div style={{ display: 'grid', gap: '3px' }}>
                  {overlayOptions.showObjects && <div>Objets: <span style={{ color: 'var(--color-green, #22c55e)' }}>{realtimeStats.objects}</span></div>}
                  {overlayOptions.showFaces && <div>Visages: <span style={{ color: 'var(--color-info, #06b6d4)' }}>{realtimeStats.faces}</span></div>}
                  {overlayOptions.showPoses && <div>Poses: <span style={{ color: 'var(--color-purple, #8b5cf6)' }}>{realtimeStats.poses}</span></div>}
                  {overlayOptions.showHands && <div>Mains: <span style={{ color: 'var(--color-warning, #f59e0b)' }}>{realtimeStats.hands}</span></div>}
                </div>
              </div>
            )}

            {/* Fullscreen button overlay */}
            {webcamActive && (
              <button
                onClick={toggleFullscreen}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'rgba(10, 10, 15, 0.7)',
                  border: '1px solid var(--border-primary, #2d2d44)',
                  borderRadius: '8px',
                  color: 'var(--text-primary, #e8e8f0)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            )}

            {/* Webcam inactive placeholder */}
            {!webcamActive && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted, #6a6a82)',
                gap: '16px'
              }}>
                <Camera size={64} />
                <p style={{ fontSize: '16px', margin: 0 }}>Webcam non active</p>
                <button
                  onClick={toggleWebcam}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'var(--color-accent, #f5a623)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--bg-deep, #0a0a0f)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: 'inherit'
                  }}
                >
                  <Play size={16} />
                  Démarrer la webcam
                </button>
              </div>
            )}
          </div>

          {/* Bottom toolbar */}
          {webcamActive && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-panel, #1a1a26)',
              borderTop: '1px solid var(--border-subtle, #1e1e30)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              {/* Left: Realtime toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={toggleRealtimeMode}
                  disabled={!detectorsReady}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: realtimeMode ? 'var(--color-accent, #f5a623)' : 'var(--bg-surface, #12121a)',
                    border: realtimeMode ? '1px solid var(--color-accent, #f5a623)' : '1px solid var(--border-primary, #2d2d44)',
                    borderRadius: '6px',
                    color: realtimeMode ? 'var(--bg-deep, #0a0a0f)' : 'var(--text-tertiary, #6a6a82)',
                    cursor: detectorsReady ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: detectorsReady ? 1 : 0.5
                  }}
                >
                  <Zap size={14} />
                  {realtimeMode ? 'Détection ON' : 'Détection OFF'}
                </button>
              </div>

              {/* Center: Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {realtimeMode && (
                  <button
                    onClick={captureScreenshotWithOverlay}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-info, #06b6d4)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Download size={14} />
                    Capturer
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(prev => !prev)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: showHistory ? 'var(--color-warning, #f59e0b)' : 'var(--bg-surface, #12121a)',
                    border: '1px solid var(--border-primary, #2d2d44)',
                    borderRadius: '6px',
                    color: showHistory ? 'var(--bg-deep, #0a0a0f)' : 'var(--text-tertiary, #6a6a82)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <History size={14} />
                  Historique
                </button>
              </div>

              {/* Right: Stop button */}
              <button
                onClick={toggleWebcam}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-error, #ef4444)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Square size={14} />
                Arrêter
              </button>
            </div>
          )}
        </div>

        {/* ===== RIGHT: Controls Panel - 2 Columns ===== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          overflowY: 'auto',
          alignContent: 'start'
        }}>
          {/* Header - spans both columns */}
          <div style={{
            backgroundColor: 'var(--bg-surface, #12121a)',
            borderRadius: '12px',
            padding: '16px',
            gridColumn: '1 / -1',
            border: '1px solid var(--border-primary, #2d2d44)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(6, 182, 212, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Eye size={20} color="var(--color-info, #06b6d4)" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary, #e8e8f0)', margin: 0 }}>Vision Agent</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary, #6a6a82)', margin: 0 }}>Analyse temps réel</p>
              </div>
            </div>

            {/* MediaPipe Status */}
            {initializingDetectors ? (
              <div style={{
                padding: '10px',
                backgroundColor: 'rgba(6, 182, 212, 0.12)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--color-info, #06b6d4)'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid var(--color-info, #06b6d4)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Chargement MediaPipe...
              </div>
            ) : detectorsReady ? (
              <div style={{
                padding: '10px',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--color-green, #22c55e)'
              }}>
                <CheckCircle size={14} />
                Détecteurs prêts
              </div>
            ) : (
              <div style={{
                padding: '10px',
                backgroundColor: 'var(--color-error-subtle, rgba(239,68,68,0.12))',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--color-error, #ef4444)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertTriangle size={14} />
                  Erreur MediaPipe
                </div>
                <button
                  onClick={initDetectors}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: 'var(--color-error, #ef4444)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    fontFamily: 'inherit'
                  }}
                >
                  Réessayer
                </button>
              </div>
            )}
          </div>

          {/* Overlay Options */}
          {webcamActive && realtimeMode && (
            <div style={{
              backgroundColor: 'var(--bg-surface, #12121a)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid var(--border-primary, #2d2d44)'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-tertiary, #6a6a82)',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Affichage
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  { key: 'showObjects', label: 'Objets', color: '#22c55e' },
                  { key: 'showFaces', label: 'Visages', color: '#06b6d4' },
                  { key: 'showPoses', label: 'Poses', color: '#8b5cf6' },
                  { key: 'showHands', label: 'Mains', color: '#f59e0b' },
                  { key: 'showLabels', label: 'Labels', color: '#9898b0' },
                  { key: 'showConfidence', label: '%', color: '#9898b0' },
                  { key: 'showLandmarks', label: 'Points', color: '#9898b0' },
                  { key: 'showStats', label: 'Stats', color: '#9898b0' },
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setOverlayOptions(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    style={{
                      padding: '8px',
                      backgroundColor: overlayOptions[key as keyof typeof overlayOptions] ? `${color}20` : 'var(--bg-panel, #1a1a26)',
                      border: `1px solid ${overlayOptions[key as keyof typeof overlayOptions] ? color : 'var(--border-subtle, #1e1e30)'}`,
                      borderRadius: '6px',
                      color: overlayOptions[key as keyof typeof overlayOptions] ? color : 'var(--text-muted, #6a6a82)',
                      fontSize: '11px',
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Body Parts Panel - spans both columns */}
          {webcamActive && realtimeMode && overlayOptions.showPoses && (
            <div style={{ gridColumn: '1 / -1' }}>
              <BodyPartsPanel
                landmarks={detectedPoseLandmarks}
                showDetails={true}
                compact={false}
              />
            </div>
          )}

          {/* Detection History - spans both columns */}
          {showHistory && (
            <div style={{
              backgroundColor: 'var(--bg-surface, #12121a)',
              borderRadius: '12px',
              padding: '16px',
              minHeight: '150px',
              maxHeight: '200px',
              display: 'flex',
              flexDirection: 'column',
              gridColumn: '1 / -1',
              border: '1px solid var(--border-primary, #2d2d44)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary, #6a6a82)', textTransform: 'uppercase' }}>
                  Historique ({detectionHistory.length})
                </span>
                <button
                  onClick={clearHistory}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-error, #ef4444)',
                    borderRadius: '4px',
                    color: 'var(--color-error, #ef4444)',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={10} />
                  Effacer
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {detectionHistory.length === 0 ? (
                  <div style={{ color: 'var(--text-muted, #6a6a82)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                    Aucune détection
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {detectionHistory.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 8px',
                          backgroundColor: 'var(--bg-panel, #1a1a26)',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}
                      >
                        <span style={{
                          color: item.type === 'object' ? 'var(--color-green, #22c55e)' :
                                 item.type === 'face' ? 'var(--color-info, #06b6d4)' :
                                 item.type === 'pose' ? 'var(--color-purple, #8b5cf6)' : 'var(--color-warning, #f59e0b)'
                        }}>
                          {item.label}
                          {item.confidence && ` (${Math.round(item.confidence * 100)}%)`}
                        </span>
                        <span style={{ color: 'var(--text-muted, #6a6a82)', fontSize: '10px' }}>
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analysis Settings */}
          <div style={{
            backgroundColor: 'var(--bg-surface, #12121a)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid var(--border-primary, #2d2d44)'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-tertiary, #6a6a82)',
              marginBottom: '12px',
              textTransform: 'uppercase'
            }}>
              Analyse statique
            </div>

            <Select
              label="Type d'analyse"
              value={task}
              onChange={(v) => setTask(v as VisionTask)}
              icon={TaskIcon}
              options={[
                { value: 'general_description', label: 'Description générale' },
                { value: 'object_detection', label: 'Détection d\'objets' },
                { value: 'face_detection', label: 'Détection de visages' },
                { value: 'color_analysis', label: 'Analyse des couleurs' }
              ]}
            />

            <button
              onClick={analyzeImage}
              disabled={isProcessing || !detectorsReady || !webcamActive}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px',
                backgroundColor: (isProcessing || !detectorsReady || !webcamActive) ? 'var(--border-primary, #2d2d44)' : 'var(--color-accent, #f5a623)',
                border: 'none',
                borderRadius: '8px',
                color: (isProcessing || !detectorsReady || !webcamActive) ? 'var(--text-muted, #6a6a82)' : 'var(--bg-deep, #0a0a0f)',
                cursor: (isProcessing || !detectorsReady || !webcamActive) ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isProcessing ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid var(--bg-deep, #0a0a0f)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Analyse...
                </>
              ) : (
                <>
                  <TaskIcon size={16} />
                  Analyser
                </>
              )}
            </button>
          </div>

          {/* OCR Section */}
          <div style={{
            backgroundColor: 'var(--bg-surface, #12121a)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid var(--border-primary, #2d2d44)'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-tertiary, #6a6a82)',
              marginBottom: '12px',
              textTransform: 'uppercase'
            }}>
              OCR - Reconnaissance de texte
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--bg-panel, #1a1a26)',
                border: '1px dashed var(--border-primary, #2d2d44)',
                borderRadius: '8px',
                color: 'var(--text-tertiary, #6a6a82)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '12px'
              }}
            >
              <Upload size={16} />
              {selectedFile ? selectedFile.name : 'Sélectionner une image'}
            </button>

            <button
              onClick={processOCR}
              disabled={ocrProcessing || !selectedFile}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: (ocrProcessing || !selectedFile) ? 'var(--border-primary, #2d2d44)' : 'var(--color-info, #06b6d4)',
                border: 'none',
                borderRadius: '8px',
                color: (ocrProcessing || !selectedFile) ? 'var(--text-muted, #6a6a82)' : '#fff',
                cursor: (ocrProcessing || !selectedFile) ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {ocrProcessing ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #fff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Extraction...
                </>
              ) : (
                <>
                  <ScanLine size={16} />
                  Extraire le texte
                </>
              )}
            </button>

            {/* OCR Result */}
            {ocrResult && (
              <div style={{ marginTop: '12px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #6a6a82)' }}>
                    Confiance: {ocrResult.confidence ? `${Math.round(ocrResult.confidence * 100)}%` : 'N/A'}
                  </span>
                  <button
                    onClick={copyOcrText}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'var(--color-brand-subtle, rgba(245, 166, 35, 0.10))',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'var(--color-accent, #f5a623)',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Copy size={10} />
                    Copier
                  </button>
                </div>
                <div style={{
                  padding: '10px',
                  backgroundColor: 'var(--bg-panel, #1a1a26)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--text-secondary, #9898b0)',
                  lineHeight: 1.5,
                  maxHeight: '150px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {ocrResult.text || 'Aucun texte détecté'}
                </div>
              </div>
            )}

            {/* OCR Error */}
            {ocrError && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                backgroundColor: 'var(--color-error-subtle, rgba(239,68,68,0.12))',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={14} color="#ef4444" />
                <span style={{ fontSize: '11px', color: 'var(--color-error, #ef4444)' }}>{ocrError}</span>
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <div style={{
              backgroundColor: 'var(--bg-surface, #12121a)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid var(--border-primary, #2d2d44)'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-tertiary, #6a6a82)',
                marginBottom: '12px',
                textTransform: 'uppercase'
              }}>
                Résultats {result.processingTime && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent, #f5a623)' }}>({result.processingTime}ms)</span>}
              </div>
              {result.description && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary, #9898b0)', lineHeight: 1.5, margin: 0 }}>
                  {result.description}
                </p>
              )}
              {result.objects && result.objects.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  {result.objects.map((obj, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: i < result.objects!.length - 1 ? '1px solid var(--border-subtle, #1e1e30)' : 'none',
                      fontSize: '12px'
                    }}>
                      <span style={{ color: 'var(--color-accent, #f5a623)' }}>{obj.name}</span>
                      <span style={{ color: 'var(--text-tertiary, #6a6a82)', fontFamily: 'var(--font-mono)' }}>{Math.round(obj.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--color-error-subtle, rgba(239,68,68,0.12))',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              gridColumn: '1 / -1'
            }}>
              <AlertCircle size={16} color="#ef4444" />
              <span style={{ fontSize: '12px', color: 'var(--color-error, #ef4444)' }}>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
