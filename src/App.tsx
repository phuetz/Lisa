import { useEffect, useRef, useState } from 'react';
import { logComponent, startupLogger } from './utils/startupLogger';
import { Outlet } from 'react-router-dom';
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
import config from './config';

import useAlarmTimerScheduler from './hooks/useAlarmTimerScheduler';
import { useWakeWord } from './hooks/useWakeWord';
import { useWorkflowManager } from './hooks/useWorkflowManager';
import useSpeechSynthesis from './hooks/useSpeechSynthesis';
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useFallDetector } from './hooks/useFallDetector';
import { SkipLink } from './components/ui/SkipLink';
import { useIsMobile } from './hooks/useIsMobile';
import { AppOverlays, AppFooter, AppVideo } from './components/layout';

function App() {
  // Log only once on mount, not on every render
  useEffect(() => {
    logComponent('App', 'Component mounted');
    startupLogger.startTimer('app-component-init');
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioCtx] = useState(() => new AudioContext());
  const isMobile = useIsMobile();

  // Disable heavy features by default on mobile unless explicitly enabled in config
  const [advancedVision] = useState(config.features.advancedVision && !isMobile);
  const [advancedHearing] = useState(config.features.advancedHearing); // Hearing is less resource intensive

  const { isAuthenticated, isLoading, logout } = useAuth();

  // Fall detector integration
  const { lastEvent, dismissAlert, confirmAlert } = useFallDetector({
    enabled: config.features.fallDetector,
    onFallDetected: (event) => {
      console.log('[App] Chute détectée:', event);
    },
  });

  // Note: Media stream setup, vision processing loop, and audio processing
  // are now handled by SenseProvider in src/providers/SenseProvider.tsx

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
  // Note: micStream is now managed by SenseProvider
  useAudioClassifier(audioCtx, undefined, models.audioClassifier);
  useWakeWord(audioCtx, undefined);
  useSpeechResponder();
  useVoiceIntent();
  useAlarmTimerScheduler();
  useWorkflowManager();
  useSpeechSynthesis(); // Initialiser le hook de synthèse vocale

  // Note: Service initialization (proactiveSuggestionsService, healthMonitoringService, pyodideService)
  // is now handled by ServiceProvider in src/providers/ServiceProvider.tsx

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

        {/* Global overlays */}
        <AppOverlays
          isMobile={isMobile}
          lastEvent={lastEvent}
          onDismiss={dismissAlert}
          onConfirm={confirmAlert}
        />

        {/* Video feed for MediaPipe */}
        <AppVideo isMobile={isMobile} videoRef={videoRef} />

        {/* Auth footer buttons */}
        <AppFooter isAuthenticated={isAuthenticated} onLogout={logout} />

        {/* Main content - routed pages */}
        <main id="main-content" tabIndex={-1} className="outline-none" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
        }}>
          <Outlet />
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
