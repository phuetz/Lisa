import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { logComponent, startupLogger } from './utils/startupLogger';
import { Outlet } from 'react-router-dom';
import './App.css';
import './styles/lisa.css';
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
import { AppOverlays, AppVideo } from './components/layout';
import { MainLayout } from './components/layout/MainLayout';

// Lazy-load MediaPipe hooks to reduce main bundle (~180KB savings)
const MediaPipeManager = lazy(() => import('./components/MediaPipeManager'));

// Lazy-load PromptCommander integration components
const CommandPalette = lazy(() => import('./components/common/CommandPalette'));
const OnboardingWizard = lazy(() => import('./components/common/OnboardingWizard'));

function App() {
  // Log only once on mount, not on every render
  useEffect(() => {
    logComponent('App', 'Component mounted');
    startupLogger.startTimer('app-component-init');
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioCtx] = useState(() => new AudioContext());
  const isMobile = useIsMobile();

  // ─── PromptCommander integration: DB init, onboarding, command palette ───
  const [dbReady, setDbReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Initialize Dexie DB + settings store + run migration
  useEffect(() => {
    (async () => {
      try {
        const { initializeDatabase } = await import('./db/database');
        const { runMigrationIfNeeded } = await import('./db/migrations');
        const { useSettingsStore } = await import('./store/settingsStore');

        await initializeDatabase();
        await runMigrationIfNeeded();
        await useSettingsStore.getState().init();

        // Check onboarding
        const { loadSettings } = await import('./db/settings');
        const settings = loadSettings();
        if (!settings.onboardingCompleted) {
          setShowOnboarding(true);
        }

        // Load MCP servers (non-blocking)
        import('./mcp/mcpClientStore').then(({ useMCPClientStore }) => {
          useMCPClientStore.getState().loadServers();
          useMCPClientStore.getState().refreshTools();
        }).catch(() => {});

        setDbReady(true);
      } catch (error) {
        console.error('[App] DB initialization failed:', error);
        setDbReady(true); // Continue anyway — features degrade gracefully
      }
    })();
  }, []);

  // Global keyboard shortcuts: Ctrl+K → Command Palette
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {/* ignore */});
      }
    };
  }, [audioCtx]);

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

        {/* PromptCommander: Onboarding Wizard */}
        {showOnboarding && (
          <Suspense fallback={null}>
            <OnboardingWizard onComplete={handleOnboardingComplete} />
          </Suspense>
        )}

        {/* PromptCommander: Command Palette (Ctrl+K) */}
        <Suspense fallback={null}>
          <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
        </Suspense>

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
