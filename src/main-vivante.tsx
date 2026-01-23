import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import './i18n'
import { router } from './router'
import { startupLogger, logStartup } from './utils/startupLogger'
import { initLisaVivante } from './manifesto/initLisaVivante'

// Initialiser Lisa Vivante
const initializeApp = async () => {
  // Démarrer le logging
  startupLogger.startTimer('app-init');
  logStartup('Application initialization started');
  logStartup('React version', { version: '19.1.0' });
  logStartup('Environment', { mode: import.meta.env.MODE, dev: import.meta.env.DEV });

  try {
    // Initialiser Lisa Vivante
    startupLogger.startTimer('lisa-vivante-init');
    logStartup('Initializing Lisa Vivante...');
    
    const lisaState = await initLisaVivante({
      enableSensors: true,
      enableAudit: true,
      enableMemory: true,
      debugMode: import.meta.env.DEV,
      autoValidate: true,
      validationInterval: 30000 // 30 secondes
    });

    startupLogger.endTimer('lisa-vivante-init', 'startup');
    logStartup('Lisa Vivante initialized', {
      sessionId: lisaState.sessionId,
      status: lisaState.status,
      pillars: lisaState.pillars
    });

    // Vérifier que Lisa est vivante
    if (lisaState.status === 'alive') {
      logStartup('✅ Lisa is ALIVE! All pillars active.');
    } else {
      logStartup('⚠️ Lisa in degraded mode', { status: lisaState.status });
    }

  } catch (error) {
    startupLogger.error('startup', 'Failed to initialize Lisa Vivante', error);
    console.error('Failed to initialize Lisa Vivante:', error);
  }
};

// Register service worker for PWA functionality (production only)
const registerServiceWorker = async () => {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    startupLogger.startTimer('service-worker-registration');
    logStartup('Registering Service Worker');
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      startupLogger.endTimer('service-worker-registration', 'startup');
      logStartup('Service Worker registered', { scope: registration.scope });
      // If there's a waiting service worker, activate it immediately
      if (registration.waiting) {
        logStartup('Activating waiting Service Worker');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          logStartup('Service Worker update found');
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logStartup('New Service Worker installed, refreshing...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    } catch (error) {
      startupLogger.error('startup', 'Service Worker registration failed', error);
    }
  } else {
    logStartup('Service Worker not registered (dev mode or unsupported)', { prod: import.meta.env.PROD });
  }
};

// Initialiser l'application
initializeApp().then(() => {
  logStartup('Creating React root');
  startupLogger.startTimer('react-render');

  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    createRoot(rootElement).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
    
    startupLogger.endTimer('react-render', 'startup');
    logStartup('React app rendered successfully');
  } catch (error) {
    startupLogger.error('startup', 'Failed to render React app', error);
  }
});

// Register service worker after app has loaded (production only)
window.addEventListener('load', () => {
  logStartup('Window loaded event fired');
  if (import.meta.env.PROD) {
    registerServiceWorker();
  }
  
  // Afficher le résumé après 3 secondes
  setTimeout(() => {
    startupLogger.endTimer('app-init', 'startup');
    startupLogger.printSummary();
  }, 3000);
});

// In development, avoid auto-reload via Service Worker controller changes
if (import.meta.env.PROD) {
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    logStartup('Service Worker controller changed, reloading...');
    window.location.reload();
  });
}
