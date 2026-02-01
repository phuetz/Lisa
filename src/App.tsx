import { useEffect, useRef, useState } from 'react';
import { logComponent, startupLogger } from './utils/startupLogger';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import './App.css';
import './styles/fluentAnimations.css';
import {
  useFaceLandmarker,
  useHandLandmarker,
  useObjectDetector,
  usePoseLandmarker,
  useAudioClassifier,
  useImageClassifier,
  useGestureRecognizer,
  useImageSegmenter,
  useImageEmbedder,
  useSpeechResponder,
  useVoiceIntent,
  useMediaPipeModels,
} from './hooks';
import { useAppStore } from './store/appStore';
import { hearingSense } from './features/hearing/api';
import { visionSense, processVideoFrame } from './features/vision/api';
import { proprioceptionSense } from './senses/proprioception';
import { touchSense } from './senses/touch';
import { environmentSense } from './senses/environment';
import type { Percept } from './types';
import config from './config';



import MicIndicator from './components/MicIndicator';
import useAlarmTimerScheduler from './hooks/useAlarmTimerScheduler';
import { useWakeWord } from './hooks/useWakeWord';
import { useWorkflowManager } from './hooks/useWorkflowManager';
import useSpeechSynthesis from './hooks/useSpeechSynthesis';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useFallDetector } from './hooks/useFallDetector';
import { FallAlert, FallDetectorBadge } from './components/health/FallAlert';
import { SkipLink } from './components/ui/SkipLink';
import { ErrorToastContainer } from './components/ui/ErrorToast';
import { proactiveSuggestionsService } from './services/ProactiveSuggestionsService';
import { healthMonitoringService } from './services/HealthMonitoringService';
import { pyodideService } from './services/PyodideService';
import { SdkVisionMonitor } from './components/SdkVisionMonitor';
import { useIsMobile } from './hooks/useIsMobile';
import { VisionOverlay } from './components/vision/VisionOverlay';

function App() {
  // Log only once on mount, not on every render
  useEffect(() => {
    logComponent('App', 'Component mounted');
    startupLogger.startTimer('app-component-init');
  }, []);

  // Subscribe to all senses
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateStore = (percept: Percept<any>) => {
      useAppStore.setState((state) => ({
        percepts: [...(state.percepts || []), percept].slice(-100),
      }));
    };

    // Proprioception
    proprioceptionSense.setOnPerceptCallback(updateStore);
    proprioceptionSense.initialize();

    // Touch
    touchSense.setOnPerceptCallback(updateStore);
    touchSense.initialize();

    // Environment
    environmentSense.setOnPerceptCallback(updateStore);
    environmentSense.initialize();

    return () => {
      proprioceptionSense.terminate();
      touchSense.terminate();
      environmentSense.terminate();
    };
  }, []);


  const videoRef = useRef<HTMLVideoElement>(null);
  const [micStream, setMicStream] = useState<MediaStream>();
  const [audioCtx] = useState(() => new AudioContext());
  const isMobile = useIsMobile();
  
  // Disable heavy features by default on mobile unless explicitly enabled in config
  const [advancedVision] = useState(config.features.advancedVision && !isMobile);
  const [advancedHearing] = useState(config.features.advancedHearing); // Hearing is less resource intensive
  
  const [showAuthForm, setShowAuthForm] = useState<'login' | 'register' | null>(null);
  const { isAuthenticated, isLoading, logout } = useAuth();

  // Fall detector integration
  const { lastEvent, dismissAlert, confirmAlert } = useFallDetector({
    enabled: config.features.fallDetector,
    onFallDetected: (event) => {
      console.log('[App] Chute détectée:', event);
    },
  });

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: { width: 640, height: 360, facingMode: 'user' },
        audio: true,
      })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        setMicStream(stream);
      });
  }, [advancedVision]);

  // Advanced Vision integration
  useEffect(() => {
    if (!advancedVision) return;

    visionSense.start();

    let rafId: number;
    const processLoop = () => {
      // Pause processing if document is hidden to save resources
      if (document.visibilityState === 'hidden') {
        rafId = requestAnimationFrame(processLoop);
        return;
      }
      
      if (videoRef.current && videoRef.current.readyState >= 2) {
        processVideoFrame(videoRef.current);
      }
      rafId = requestAnimationFrame(processLoop);
    };
    rafId = requestAnimationFrame(processLoop);

    return () => {
      visionSense.stop();
      cancelAnimationFrame(rafId);
    };
  }, [advancedVision]);

  // Subscribe to hearingSense percepts and update store
  useEffect(() => {
    let audioWorkletNode: AudioWorkletNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    const startAudioProcessing = async () => {
      if (micStream && audioCtx) {
        try {
          const { getAudioProcessorUrl } = await import('./senses/runtime/hearing.factory');
          await audioCtx.audioWorklet.addModule(getAudioProcessorUrl());
          source = audioCtx.createMediaStreamSource(micStream);
          audioWorkletNode = new AudioWorkletNode(audioCtx, 'audio-processor');
          
          audioWorkletNode.port.onmessage = (event) => {
             // Pause processing if document is hidden
            if (document.visibilityState === 'hidden') return;
            
            const audioData = event.data as Float32Array;
            hearingSense.processAudio(audioData);
          };

          source.connect(audioWorkletNode);
        } catch (e) {
          console.error('[App] Failed to initialize AudioWorklet for HearingSense:', e);
        }
      }
    };

    if (advancedHearing) {
      hearingSense.start();
      startAudioProcessing();
    } else {
      hearingSense.stop();
    }

    return () => {
      hearingSense.stop();
      source?.disconnect();
      audioWorkletNode?.disconnect();
    };
  }, [advancedHearing, audioCtx, micStream]);

  // Load MediaPipe models
  const { models } = useMediaPipeModels();

  // Activate hooks - must be called unconditionally at top level
  // MediaPipe Vision Tasks - Only run if advanced vision is NOT taking over these specific tasks
  useFaceLandmarker(videoRef.current ?? undefined, models.faceLandmarker);
  useHandLandmarker(videoRef.current ?? undefined, models.handLandmarker);
  
  // These are handled by visionSense when advancedVision is true
  useObjectDetector(advancedVision ? undefined : (videoRef.current ?? undefined), models.objectDetector);
  usePoseLandmarker(advancedVision ? undefined : (videoRef.current ?? undefined), models.poseLandmarker);
  
  useImageClassifier(videoRef.current, models.imageClassifier);
  useGestureRecognizer(videoRef.current, models.gestureRecognizer);
  useImageSegmenter(videoRef.current, models.imageSegmenter);
  useImageEmbedder(models.imageEmbedder);

  // MediaPipe Audio Tasks
  useAudioClassifier(audioCtx, micStream, models.audioClassifier);
  useWakeWord(audioCtx, micStream);
  useSpeechResponder();
  useVoiceIntent();
  useAlarmTimerScheduler();
  useWorkflowManager();
  useSpeechSynthesis(); // Initialiser le hook de synthèse vocale

  // Démarrer les services proactifs et précharger Pyodide
  useEffect(() => {
    proactiveSuggestionsService.start();
    healthMonitoringService.start();
    
    // Précharger Pyodide en arrière-plan (pour les artefacts Python)
    pyodideService.preload().catch(() => {
      // Ignorer les erreurs de préchargement - sera rechargé à la demande
    });
    
    return () => {
      proactiveSuggestionsService.stop();
      healthMonitoringService.stop();
    };
  }, []);

  // Afficher le loading pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>🤖 Lisa</h2>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
        <div className="relative min-h-screen">
        {/* Skip Link pour accessibilité - WCAG 2.4.1 */}
        <SkipLink targetId="main-content" label="Aller au contenu principal" />
        
        {/* Formulaires d'authentification */}
        {!isAuthenticated && showAuthForm === 'login' && (
          <LoginForm
            onSuccess={() => setShowAuthForm(null)}
            onSwitchToRegister={() => setShowAuthForm('register')}
          />
        )}
        {!isAuthenticated && showAuthForm === 'register' && (
          <RegisterForm
            onSuccess={() => setShowAuthForm(null)}
            onSwitchToLogin={() => setShowAuthForm('login')}
          />
        )}

        {/* Video feed caché pour MediaPipe - hidden on mobile */}
        {!isMobile && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ position: 'fixed', bottom: 10, right: 10, width: 120, height: 90, borderRadius: 8, zIndex: 40, opacity: 0.8 }}
          />
        )}

        {/* Composants système globaux (overlays) */}
        <Toaster />
        <ErrorToastContainer />
        <MicIndicator />
        {/* Vision overlays - hidden on mobile */}
        {!isMobile && <VisionOverlay />}
        {!isMobile && <SdkVisionMonitor />}
        
        {/* Fall detection - overlay uniquement */}
        <FallDetectorBadge />
        {lastEvent && (
          <FallAlert
            event={lastEvent}
            onDismiss={dismissAlert}
            onConfirm={confirmAlert}
          />
        )}

        {/* Auth buttons - discret en bas */}
        {isAuthenticated ? (
          <button
            onClick={logout}
            className="fixed bottom-4 left-4 z-50 px-3 py-1 text-xs bg-slate-900/50 hover:bg-slate-900 text-white rounded transition-colors"
          >
            Déconnexion
          </button>
        ) : (
          <button
            onClick={() => setShowAuthForm('login')}
            className="fixed bottom-4 left-4 z-50 px-3 py-1 text-xs bg-slate-900/50 hover:bg-slate-900 text-white rounded transition-colors"
          >
            🔐 Connexion
          </button>
        )}

        {/* Main content - pages routed - Accès direct sans auth */}
        <main id="main-content" tabIndex={-1} className="outline-none" style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden'
        }}>
          <Outlet />
        </main>
        </div>
    </ErrorBoundary>
  );
}

export default App;
