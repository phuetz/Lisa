/**
 * ♿ Accessibility Provider - Composant global d'accessibilité
 * Live region, skip links, et préférences utilisateur
 */

import type { ReactNode } from 'react';

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  return (
    <>
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="skip-link"
        style={{
          position: 'absolute',
          top: '-40px',
          left: '0',
          padding: '8px 16px',
          backgroundColor: '#f5a623',
          color: '#fff',
          zIndex: 10000,
          transition: 'top 0.2s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.top = '0';
        }}
        onBlur={(e) => {
          e.currentTarget.style.top = '-40px';
        }}
      >
        Aller au contenu principal
      </a>

      {/* Live region for screen reader announcements */}
      <div
        id="lisa-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
        }}
      />

      {/* Assertive live region for urgent announcements */}
      <div
        id="lisa-live-region-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
        }}
      />

      {/* Main content wrapper */}
      <main id="main-content" tabIndex={-1} style={{ outline: 'none' }}>
        {children}
      </main>

      {/* Global accessibility styles */}
      <style>
        {`
          /* Focus visible styles */
          :focus-visible {
            outline: 2px solid #f5a623;
            outline-offset: 2px;
          }

          /* Reduced motion */
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }

          /* High contrast mode */
          @media (prefers-contrast: high) {
            button, a, input, select, textarea {
              border: 2px solid currentColor !important;
            }
          }

          /* Screen reader only class */
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          }

          /* Skip link focus state */
          .skip-link:focus {
            top: 0 !important;
          }
        `}
      </style>
    </>
  );
}

export default AccessibilityProvider;
