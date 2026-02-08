import { useState, useRef, useEffect, useCallback } from 'react';
import { OfficePageLayout } from '../components/layout/OfficePageLayout';
import { useOfficeThemeStore } from '../store/officeThemeStore';
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

// Toggle Switch Component (reserved for future use)
const _ToggleSwitch = ({ 
  checked, 
  onChange, 
  label 
}: { 
  checked: boolean; 
  onChange: (checked: boolean) => void; 
  label: string;
}) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid var(--border-primary, #424242)'
  }}>
    <span style={{ fontSize: '14px', color: 'var(--text-primary, #ececec)' }}>{label}</span>
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: checked ? 'var(--color-brand, #10a37f)' : 'var(--border-primary, #424242)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background-color 0.2s ease'
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: 'var(--text-primary, #ececec)',
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        transition: 'left 0.2s ease'
      }} />
    </button>
  </div>
);

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
      color: 'var(--text-tertiary, #888)', 
      marginBottom: '8px' 
    }}>
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      {Icon && (
        <Icon size={18} color="#888" style={{ 
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
          backgroundColor: 'var(--bg-tertiary, #1a1a1a)',
          border: '1px solid var(--border-primary, #424242)',
          borderRadius: '8px',
          color: 'var(--text-primary, #ececec)',
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
      <ChevronDown size={16} color="#888" style={{ 
        position: 'absolute', 
        right: '12px', 
        top: '50%', 
        transform: 'translateY(-50%)',
        pointerEvents: 'none'
      }} />
    </div>
  </div>
);

// Result Card Component (reserved for future use)
const _ResultCard = ({ 
  title, 
  children, 
  processingTime 
}: { 
  title: string; 
  children: React.ReactNode; 
  processingTime?: number;
}) => (
  <div style={{
    backgroundColor: 'var(--bg-tertiary, #1a1a1a)',
    borderRadius: '10px',
    padding: '16px',
    marginTop: '16px'
  }}>
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginBottom: '12px'
    }}>
      <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #ececec)', margin: 0 }}>{title}</h4>
      {processingTime && (
        <span style={{ fontSize: '12px', color: 'var(--text-muted, #666)' }}>{processingTime}ms</span>
      )}
    </div>
    {children}
  </div>
);

// Detection Tag Component (reserved for future use)
const _DetectionTag = ({ 
  label, 
  confidence, 
  color = 'var(--color-brand, #10a37f)'
}: { 
  label: string; 
  confidence: number; 
  color?: string;
}) => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: `${color}20`,
    borderRadius: '6px',
    marginRight: '8px',
    marginBottom: '8px'
  }}>
    <span style={{ fontSize: '13px', color: 'var(--text-primary, #ececec)' }}>{label}</span>
    <span style={{ 
      fontSize: '11px', 
      color: color,
      backgroundColor: `${color}30`,
      padding: '2px 6px',
      borderRadius: '4px'
    }}>
      {Math.round(confidence * 100)}%
    </span>
  </div>
);

export default function VisionPage() {
  const { getCurrentColors } = useOfficeThemeStore();
  const colors = getCurrentColors();

  const [source, _setSource] = useState('webcam');
  const [task, setTask] = useState<VisionTask>('general_description');
  const [_advancedVision, _setAdvancedVision] = useState(false);
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
      console.log('[VisionPage] Loading VisionAgent...');
      const agent = await getVisionAgent();
      if (agent) {
        console.log('[VisionPage] VisionAgent loaded, waiting for initialization...');
        if (agent.waitForInitialization) {
          const ready = await agent.waitForInitialization();
          console.log('[VisionPage] Detectors ready:', ready);
          setDetectorsReady(ready);
          if (!ready) {
            setError('Les détecteurs MediaPipe n\'ont pas pu être initialisés. Vérifiez votre connexion internet.');
          }
        } else {
          // Agent exists but no waitForInitialization - consider it ready
          console.log('[VisionPage] No waitForInitialization, assuming ready');
          setDetectorsReady(true);
        }
      } else {
        console.error('[VisionPage] VisionAgent not found');
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
        // Attendre que les métadonnées soient chargées avant de jouer
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
    // Finger names for hand landmarks
    const fingerNames = ['Poignet', 'Pouce1', 'Pouce2', 'Pouce3', 'Pouce', 
      'Index1', 'Index2', 'Index3', 'Index', 'Majeur1', 'Majeur2', 'Majeur3', 'Majeur',
      'Annulaire1', 'Annulaire2', 'Annulaire3', 'Annulaire', 'Auriculaire1', 'Auriculaire2', 'Auriculaire3', 'Auriculaire'];
    
    // Pose landmark names
    const poseLandmarkNames = ['Nez', 'Œil G int', 'Œil G', 'Œil G ext', 'Œil D int', 'Œil D', 'Œil D ext',
      'Oreille G', 'Oreille D', 'Bouche G', 'Bouche D', 'Épaule G', 'Épaule D', 'Coude G', 'Coude D',
      'Poignet G', 'Poignet D', 'Petit doigt G', 'Petit doigt D', 'Index G', 'Index D', 'Pouce G', 'Pouce D',
      'Hanche G', 'Hanche D', 'Genou G', 'Genou D', 'Cheville G', 'Cheville D', 'Talon G', 'Talon D',
      'Pied G', 'Pied D'];

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Scale factors for coordinate transformation
    const scaleX = canvasWidth / videoWidth;
    const scaleY = canvasHeight / videoHeight;

    // Draw objects (green boxes)
    if (overlayOptions.showObjects) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.font = 'bold 14px Arial';
      detections.objects.forEach(obj => {
        const x = obj.box.x * scaleX;
        const y = obj.box.y * scaleY;
        const w = obj.box.width * scaleX;
        const h = obj.box.height * scaleY;
        
        // Draw box with rounded corners
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();
        
        if (overlayOptions.showLabels) {
          const label = overlayOptions.showConfidence 
            ? `${obj.name} ${Math.round(obj.confidence * 100)}%`
            : obj.name;
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
          ctx.beginPath();
          ctx.roundRect(x, y - 26, textWidth + 16, 24, 4);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(label, x + 8, y - 8);
        }
      });
    }

    // Draw faces (blue boxes with face mesh)
    if (overlayOptions.showFaces) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      detections.faces.forEach((face, faceIdx) => {
        const x = face.box.x * scaleX;
        const y = face.box.y * scaleY;
        const w = face.box.width * scaleX;
        const h = face.box.height * scaleY;
        
        // Draw face box
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();
        
        if (overlayOptions.showLabels) {
          const label = `Visage ${faceIdx + 1}`;
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
          ctx.beginPath();
          ctx.roundRect(x, y - 26, textWidth + 16, 24, 4);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(label, x + 8, y - 8);
        }
        
        // Draw face landmarks (mesh points)
        if (overlayOptions.showLandmarks && face.landmarks) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
          face.landmarks.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x * scaleX, point.y * scaleY, 2, 0, 2 * Math.PI);
            ctx.fill();
          });
          
          // Draw face contour (connect key points)
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
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
        // Draw connections with gradient
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
        
        // Draw points with labels
        pose.landmarks.forEach((point, idx) => {
          if (point.visibility > 0.5) {
            const px = point.x * scaleX;
            const py = point.y * scaleY;
            
            // Draw point
            ctx.fillStyle = '#8b5cf6';
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw label for key points
            if (overlayOptions.showLabels && poseLandmarkNames[idx] && [0, 11, 12, 15, 16, 23, 24, 27, 28].includes(idx)) {
              ctx.font = 'bold 10px Arial';
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

    // Draw hands (orange with finger labels)
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
        // Draw connections
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
        
        // Draw points with finger names
        hand.landmarks.forEach((point, idx) => {
          const px = point.x * scaleX;
          const py = point.y * scaleY;
          
          // Draw point
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw finger tip labels
          if (overlayOptions.showLabels && overlayOptions.showLandmarks && [4, 8, 12, 16, 20].includes(idx)) {
            ctx.font = 'bold 10px Arial';
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
        
        // Draw handedness label at wrist
        if (overlayOptions.showLabels && hand.landmarks[0]) {
          const wx = hand.landmarks[0].x * scaleX;
          const wy = hand.landmarks[0].y * scaleY;
          const label = hand.handedness === 'Left' ? '🤚 Main Gauche' : '✋ Main Droite';
          ctx.font = 'bold 12px Arial';
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
      console.log('[Vision] Detection loop stopped:', { realtimeMode, webcamActive, hasVideo: !!videoRef.current, hasCanvas: !!overlayCanvasRef.current });
      return;
    }

    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[Vision] Could not get canvas 2D context');
      return;
    }

    // Ensure canvas has proper dimensions
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log('[Vision] Canvas resized to:', canvas.width, 'x', canvas.height);
      }
    } else {
      console.warn('[Vision] Video dimensions not ready:', video.videoWidth, 'x', video.videoHeight);
      animationFrameRef.current = requestAnimationFrame(runRealtimeDetection);
      return;
    }

    // Get or cache vision agent
    if (!visionAgentRef.current) {
      console.log('[Vision] Loading VisionAgent for realtime...');
      visionAgentRef.current = await getVisionAgent();
      if (visionAgentRef.current?.setRunningMode) {
        console.log('[Vision] Setting VIDEO mode...');
        await visionAgentRef.current.setRunningMode('VIDEO');
      }
      if (visionAgentRef.current) {
        console.log('[Vision] VisionAgent ready, isReady:', visionAgentRef.current.isReady);
      }
    }

    const agent = visionAgentRef.current;
    if (!agent || !agent.detectRealtime) {
      console.warn('[Vision] Agent not ready or no detectRealtime method');
      animationFrameRef.current = requestAnimationFrame(runRealtimeDetection);
      return;
    }

    // Calculate FPS
    const now = performance.now();
    const fps = lastFrameTimeRef.current ? Math.round(1000 / (now - lastFrameTimeRef.current)) : 0;
    lastFrameTimeRef.current = now;

    // Run detection
    const detections = agent.detectRealtime(video);
    
    const totalDetections = detections.objects.length + detections.faces.length + detections.poses.length + detections.hands.length;

    // Debug: Log detection counts every second
    if (fps > 0 && Math.floor(now / 1000) !== Math.floor((now - 1000/fps) / 1000)) {
      console.log('[Vision] Detections:', {
        objects: detections.objects.length,
        faces: detections.faces.length,
        poses: detections.poses.length,
        hands: detections.hands.length,
        total: totalDetections,
        canvasSize: `${canvas.width}x${canvas.height}`,
        overlayOptions: overlayOptions
      });
    }

    // Throttle state updates to every 150ms to prevent flickering
    const shouldUpdateState = (now - lastStateUpdateRef.current) > 150;
    
    if (shouldUpdateState) {
      lastStateUpdateRef.current = now;
      
      // Update stats (throttled)
      setRealtimeStats({
        fps,
        objects: detections.objects.length,
        faces: detections.faces.length,
        poses: detections.poses.length,
        hands: detections.hands.length,
      });

      // Update pose landmarks for BodyPartsPanel (throttled)
      if (detections.poses.length > 0 && detections.poses[0].landmarks) {
        setDetectedPoseLandmarks(detections.poses[0].landmarks as PoseLandmark[]);
      } else {
        setDetectedPoseLandmarks(null);
      }
    }

    // Draw on canvas with proper scaling
    drawDetections(ctx, detections, video.videoWidth, video.videoHeight, canvas.width, canvas.height);

    // Continue loop
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
        console.log('[Vision] Canvas synced:', video.videoWidth, 'x', video.videoHeight);
      }
    };

    video.addEventListener('loadedmetadata', syncCanvasSize);
    video.addEventListener('resize', syncCanvasSize);
    
    // Also sync immediately if video already has dimensions
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
      // Ensure canvas size matches video
      if (videoRef.current && overlayCanvasRef.current) {
        if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
          overlayCanvasRef.current.width = videoRef.current.videoWidth;
          overlayCanvasRef.current.height = videoRef.current.videoHeight;
        }
      }
      runRealtimeDetection();
    } else {
      // Stop detection loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Clear canvas
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
      // Reset to IMAGE mode
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

  // Toggle realtime mode
  const toggleRealtimeMode = useCallback(() => {
    if (!detectorsReady) return;
    setRealtimeMode(prev => !prev);
  }, [detectorsReady]);

  // Toggle fullscreen mode
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

  // Listen for fullscreen changes
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
    
    // Create a temporary canvas to merge video + overlay
    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = video.videoWidth;
    mergedCanvas.height = video.videoHeight;
    const ctx = mergedCanvas.getContext('2d');
    if (!ctx) return;
    
    // Draw video frame
    ctx.drawImage(video, 0, 0);
    
    // Draw overlay on top
    ctx.drawImage(overlay, 0, 0, mergedCanvas.width, mergedCanvas.height);
    
    // Download image
    const link = document.createElement('a');
    link.download = `lisa-vision-${Date.now()}.png`;
    link.href = mergedCanvas.toDataURL('image/png');
    link.click();
    
    // Add to history
    setDetectionHistory(prev => {
      const newEntry = { timestamp: Date.now(), type: 'object' as const, label: '📸 Capture sauvegardée' };
      return [newEntry, ...prev].slice(0, 50);
    });
  }, []);

  // Add detection to history (available for future use in realtime detection loop)
  const _addToHistory = useCallback((type: 'object' | 'face' | 'pose' | 'hand', label: string, confidence?: number) => {
    setDetectionHistory(prev => {
      const newEntry = { timestamp: Date.now(), type, label, confidence };
      const updated = [newEntry, ...prev].slice(0, 50); // Keep last 50
      return updated;
    });
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setDetectionHistory([]);
  }, []);

  // Format timestamp for display
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Capture frame from webcam
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) {
      console.warn('[Vision] captureFrame: video or canvas ref not available');
      return null;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Vérifier que la vidéo a des dimensions valides
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('[Vision] captureFrame: video dimensions are 0');
      return null;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[Vision] captureFrame: could not get 2d context');
      return null;
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopWebcam();
  }, [stopWebcam]);

  // Analyze image with real VisionAgent
  const analyzeImage = async () => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    
    try {
      const visionAgent = await getVisionAgent();
      
      if (!visionAgent) {
        throw new Error('VisionAgent non disponible');
      }

      let imageData: string | null = null;

      // Get image based on source
      if (source === 'webcam') {
        if (!webcamActive) {
          throw new Error('Veuillez d\'abord activer la webcam');
        }
        imageData = captureFrame();
      } else if (source === 'screenshot') {
        // Request screenshot
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const video = document.createElement('video');
          video.srcObject = stream;
          await new Promise(resolve => { video.onloadedmetadata = resolve; });
          video.play();
          
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            imageData = canvas.toDataURL('image/png');
          }
          stream.getTracks().forEach(t => t.stop());
        } catch {
          throw new Error('Capture d\'écran annulée ou non autorisée');
        }
      }

      if (!imageData) {
        throw new Error('Impossible de capturer l\'image');
      }

      // Call VisionAgent
      const agentResult = await visionAgent.execute({
        intent: 'analyze_image',
        parameters: {
          source,
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

      // Convert file to base64
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

  // Copy OCR text to clipboard
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
    <OfficePageLayout title="Vision" subtitle="Detection d'objets, visages et poses en temps reel">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 600px',
        gap: '20px',
        height: 'calc(100vh - 140px)',
        minHeight: '500px'
      }}>
        {/* ===== LEFT: Main Video Area ===== */}
        <div 
          ref={videoContainerRef}
          style={{
            backgroundColor: 'var(--bg-surface, #0d0d0d)',
            borderRadius: '12px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
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
                backgroundColor: 'rgba(0,0,0,0.85)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px',
                color: 'var(--text-primary, #ececec)',
                fontFamily: 'monospace',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ color: 'var(--color-brand, #10a37f)', fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
                  ⚡ {realtimeStats.fps} FPS
                </div>
                <div style={{ display: 'grid', gap: '3px' }}>
                  {overlayOptions.showObjects && <div>🟢 Objets: <span style={{ color: 'var(--color-brand, #10a37f)' }}>{realtimeStats.objects}</span></div>}
                  {overlayOptions.showFaces && <div>🔵 Visages: <span style={{ color: 'var(--color-info, #3b82f6)' }}>{realtimeStats.faces}</span></div>}
                  {overlayOptions.showPoses && <div>🟣 Poses: <span style={{ color: 'var(--color-purple, #8b5cf6)' }}>{realtimeStats.poses}</span></div>}
                  {overlayOptions.showHands && <div>🟠 Mains: <span style={{ color: 'var(--color-warning, #f59e0b)' }}>{realtimeStats.hands}</span></div>}
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
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: 'var(--text-primary, #ececec)',
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
                color: 'var(--text-muted, #666)',
                gap: '16px'
              }}>
                <Camera size={64} />
                <p style={{ fontSize: '16px', margin: 0 }}>Webcam non active</p>
                <button
                  onClick={toggleWebcam}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'var(--color-brand, #10a37f)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--text-primary, #ececec)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
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
              backgroundColor: 'var(--bg-tertiary, #1a1a1a)',
              borderTop: '1px solid var(--border-subtle, #333)',
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
                    backgroundColor: realtimeMode ? 'var(--color-brand, #10a37f)' : 'var(--bg-secondary, #2d2d2d)',
                    border: realtimeMode ? '1px solid var(--color-brand, #10a37f)' : '1px solid var(--border-primary, #424242)',
                    borderRadius: '6px',
                    color: realtimeMode ? 'var(--text-primary, #ececec)' : 'var(--text-tertiary, #888)',
                    cursor: detectorsReady ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    fontWeight: 500,
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
                      backgroundColor: 'var(--color-info, #3b82f6)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'var(--text-primary, #ececec)',
                      cursor: 'pointer',
                      fontSize: '12px',
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
                    backgroundColor: showHistory ? 'var(--color-warning, #f59e0b)' : 'var(--bg-secondary, #2d2d2d)',
                    border: '1px solid var(--border-primary, #424242)',
                    borderRadius: '6px',
                    color: showHistory ? 'var(--text-primary, #ececec)' : 'var(--text-tertiary, #888)',
                    cursor: 'pointer',
                    fontSize: '12px',
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
                  color: 'var(--text-primary, #ececec)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
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
            backgroundColor: 'var(--bg-secondary, #2d2d2d)',
            borderRadius: '12px',
            padding: '16px',
            gridColumn: '1 / -1'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Eye size={20} color="#3b82f6" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary, #ececec)', margin: 0 }}>Vision Agent</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary, #888)', margin: 0 }}>Analyse temps réel</p>
              </div>
            </div>

            {/* MediaPipe Status */}
            {initializingDetectors ? (
              <div style={{
                padding: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--color-info, #3b82f6)'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid var(--color-info, #3b82f6)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Chargement MediaPipe...
              </div>
            ) : detectorsReady ? (
              <div style={{
                padding: '10px',
                backgroundColor: 'var(--color-brand-subtle, rgba(16,163,127,0.12))',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--color-brand, #10a37f)'
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
                    color: 'var(--text-primary, #ececec)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  🔄 Réessayer
                </button>
              </div>
            )}
          </div>

          {/* Overlay Options */}
          {webcamActive && realtimeMode && (
            <div style={{
              backgroundColor: 'var(--bg-secondary, #2d2d2d)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                color: 'var(--text-tertiary, #888)', 
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Affichage
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  // Raw hex needed: used in template literals like `${color}20`
                  { key: 'showObjects', label: '🟢 Objets', color: '#10a37f' },
                  { key: 'showFaces', label: '🔵 Visages', color: '#3b82f6' },
                  { key: 'showPoses', label: '🟣 Poses', color: '#8b5cf6' },
                  { key: 'showHands', label: '🟠 Mains', color: '#f59e0b' },
                  { key: 'showLabels', label: '📝 Labels', color: '#6b7280' },
                  { key: 'showConfidence', label: '📊 %', color: '#6b7280' },
                  { key: 'showLandmarks', label: '📍 Points', color: '#6b7280' },
                  { key: 'showStats', label: '📈 Stats', color: '#6b7280' },
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setOverlayOptions(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    style={{
                      padding: '8px',
                      backgroundColor: overlayOptions[key as keyof typeof overlayOptions] ? `${color}20` : 'var(--bg-tertiary, #1a1a1a)',
                      border: `1px solid ${overlayOptions[key as keyof typeof overlayOptions] ? color : 'var(--border-subtle, #333)'}`,
                      borderRadius: '6px',
                      color: overlayOptions[key as keyof typeof overlayOptions] ? color : 'var(--text-muted, #666)',
                      fontSize: '11px',
                      fontWeight: 500,
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

          {/* Body Parts Panel - Show when pose is detected - spans both columns */}
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
              backgroundColor: 'var(--bg-secondary, #2d2d2d)',
              borderRadius: '12px',
              padding: '16px',
              minHeight: '150px',
              maxHeight: '200px',
              display: 'flex',
              flexDirection: 'column',
              gridColumn: '1 / -1'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary, #888)', textTransform: 'uppercase' }}>
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
                  <div style={{ color: 'var(--text-muted, #666)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
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
                          backgroundColor: 'var(--bg-tertiary, #1a1a1a)',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}
                      >
                        <span style={{
                          color: item.type === 'object' ? 'var(--color-brand, #10a37f)' :
                                 item.type === 'face' ? 'var(--color-info, #3b82f6)' :
                                 item.type === 'pose' ? 'var(--color-purple, #8b5cf6)' : 'var(--color-warning, #f59e0b)'
                        }}>
                          {item.label}
                          {item.confidence && ` (${Math.round(item.confidence * 100)}%)`}
                        </span>
                        <span style={{ color: 'var(--text-muted, #666)', fontSize: '10px' }}>
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
            backgroundColor: 'var(--bg-secondary, #2d2d2d)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: 'var(--text-tertiary, #888)', 
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
                backgroundColor: (isProcessing || !detectorsReady || !webcamActive) ? 'var(--border-primary, #424242)' : 'var(--color-brand, #10a37f)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--text-primary, #ececec)',
                cursor: (isProcessing || !detectorsReady || !webcamActive) ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
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
                    border: '2px solid var(--text-primary, #ececec)',
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
            backgroundColor: 'var(--bg-secondary, #2d2d2d)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: 'var(--text-tertiary, #888)', 
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
                backgroundColor: 'var(--bg-tertiary, #1a1a1a)',
                border: '1px dashed var(--border-primary, #424242)',
                borderRadius: '8px',
                color: 'var(--text-tertiary, #888)',
                cursor: 'pointer',
                fontSize: '13px',
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
                backgroundColor: (ocrProcessing || !selectedFile) ? 'var(--border-primary, #424242)' : 'var(--color-info, #3b82f6)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--text-primary, #ececec)',
                cursor: (ocrProcessing || !selectedFile) ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
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
                    border: '2px solid var(--text-primary, #ececec)',
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
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #888)' }}>
                    Confiance: {ocrResult.confidence ? `${Math.round(ocrResult.confidence * 100)}%` : 'N/A'}
                  </span>
                  <button
                    onClick={copyOcrText}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'var(--color-brand-subtle, rgba(16,163,127,0.12))',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'var(--color-brand, #10a37f)',
                      cursor: 'pointer',
                      fontSize: '10px',
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
                  backgroundColor: 'var(--bg-tertiary, #1a1a1a)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--text-secondary, #b4b4b4)',
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
              backgroundColor: 'var(--bg-secondary, #2d2d2d)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                color: 'var(--text-tertiary, #888)', 
                marginBottom: '12px',
                textTransform: 'uppercase'
              }}>
                Résultats {result.processingTime && `(${result.processingTime}ms)`}
              </div>
              {result.description && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary, #b4b4b4)', lineHeight: 1.5, margin: 0 }}>
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
                      borderBottom: i < result.objects!.length - 1 ? '1px solid var(--border-subtle, #333)' : 'none',
                      fontSize: '12px'
                    }}>
                      <span style={{ color: 'var(--color-brand, #10a37f)' }}>{obj.name}</span>
                      <span style={{ color: 'var(--text-tertiary, #888)' }}>{Math.round(obj.confidence * 100)}%</span>
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
              gap: '10px'
            }}>
              <AlertCircle size={16} color="#ef4444" />
              <span style={{ fontSize: '12px', color: 'var(--color-error, #ef4444)' }}>{error}</span>
            </div>
          )}
        </div>
      </div>
    </OfficePageLayout>
  );
}
