import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { migrationManager, logInfo, logError, setupProductionEnvironment } from './utils'

// Initialize production environment (logging, analytics, monitoring)
setupProductionEnvironment();

// Run migrations on startup
migrationManager.migrate().then(() => {
  logInfo('Application migrations completed successfully', 'Startup');
}).catch((error) => {
  logError('Migration failed during startup', 'Startup', error);
});

// Register service worker for PWA functionality
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
      logInfo('Service Worker registered successfully', 'PWA', { scope: registration.scope });

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Notify user that an update is available
            showUpdateNotification();
            logInfo('Service Worker update available', 'PWA');
          }
        });
      });
    }).catch(error => {
      logError('Service Worker registration failed', 'PWA', error);
    });
  }
};

function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <p>Une nouvelle version de Lisa est disponible!</p>
    <button>Mettre à jour</button>
  `;
  notification.querySelector('button')?.addEventListener('click', () => {
    logInfo('User initiated app update', 'PWA');
    window.location.reload();
  });
  document.body.appendChild(notification);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      maxRetries={3}
      onError={(error, errorInfo) => {
        logError('React Error Boundary caught error', 'App', { error, errorInfo });
      }}
      onReset={() => {
        logInfo('Error Boundary reset triggered', 'App');
      }}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Register service worker after app has loaded
window.addEventListener('load', registerServiceWorker);

