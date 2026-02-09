import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { logComponent, startupLogger } from './utils/startupLogger';
import { Outlet } from 'react-router-dom';
import './App.css';
import './styles/fluentAnimations.css';
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
import { MainLayout } from './components/layout/MainLayout';

// Lazy-load MediaPipe hooks to reduce main bundle (~180KB savings)
const MediaPipeManager = lazy(() => import('./components/MediaPipeManager'));

function App() {
  // Log only once on mount, not on every render
  useEffect(() => {
    logComponent('App', 'Component mounted');
    startupLogger.startTimer('app-component-init');
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioCtx] = useState(() => new AudioContext());
  const isMobile = useIsMobile();

  const { isAuthenticated, isLoading, logout } = useAuth();

  // Fall detector integration
  const { lastEvent, dismissAlert, confirmAlert } = useFallDetector({
    enabled: config.features.fallDetector,
    onFallDetected: (event) => {
      console.log('[App] Chute détectée:', event);
    },
  });

  // Lightweight hooks that stay in the main bundle
  useWakeWord(audioCtx, undefined);
  useAlarmTimerScheduler();
  useWorkflowManager();
  useSpeechSynthesis();

  // Afficher le loading pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-deep, #0a0a0f)',
        color: 'var(--text-primary, #e8e8f0)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', color: 'var(--color-accent, #f5a623)' }}>Lisa</div>
          <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
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

        {/* Lazy-loaded MediaPipe hooks - code-split into separate chunk */}
        <Suspense fallback={null}>
          <MediaPipeManager videoRef={videoRef} />
        </Suspense>

        {/* Auth footer buttons */}
        <AppFooter isAuthenticated={isAuthenticated} onLogout={logout} />

        {/* Main content - AudioReader Studio layout */}
        <MainLayout>
          <div id="main-content" tabIndex={-1} className="outline-none" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </div>
        </MainLayout>
      </div>
    </ErrorBoundary>
  );
}

export default App;
