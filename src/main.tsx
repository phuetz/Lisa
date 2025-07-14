import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'

// Register service worker for PWA functionality
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Notify user that an update is available
            showUpdateNotification();
          }
        });
      });
    }).catch(error => {
      console.error('Service Worker registration failed:', error);
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
    window.location.reload();
  });
  document.body.appendChild(notification);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker after app has loaded
window.addEventListener('load', registerServiceWorker);

