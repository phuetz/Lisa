/**
 * ChatLayoutAuto - Sélection automatique du layout Web/Mobile
 * Détecte le type d'appareil et charge le layout approprié
 */

import { lazy, Suspense } from 'react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

// Lazy load des layouts pour optimiser le bundle
const ChatLayoutSimple = lazy(() => import('./ChatLayoutSimple'));
const ChatLayoutMobile = lazy(() => import('./ChatLayoutMobile'));

// Loading fallback
const LoadingFallback = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12121a',
    color: '#fff'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '3px solid #2d2d44',
        borderTopColor: '#10b981',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }} />
      <p style={{ color: '#888', fontSize: '14px' }}>Chargement...</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

export const ChatLayoutAuto = () => {
  const { isMobile } = useDeviceDetection();

  return (
    <Suspense fallback={<LoadingFallback />}>
      {isMobile ? <ChatLayoutMobile /> : <ChatLayoutSimple />}
    </Suspense>
  );
};

export default ChatLayoutAuto;
