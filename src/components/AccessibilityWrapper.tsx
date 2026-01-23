/**
 * ♿ Accessibility Wrapper - Wrapper d'Accessibilité
 * Fournit les fonctionnalités A11y de base pour tous les composants
 */

import React, { useEffect, useState } from 'react';

interface AccessibilityConfig {
  enableKeyboardNav: boolean;
  enableAriaLive: boolean;
  enableReducedMotion: boolean;
  enableHighContrast: boolean;
  enableLargeText: boolean;
}

interface Props {
  children: React.ReactNode;
  config?: Partial<AccessibilityConfig>;
}

const DEFAULT_CONFIG: AccessibilityConfig = {
  enableKeyboardNav: true,
  enableAriaLive: true,
  enableReducedMotion: false,
  enableHighContrast: false,
  enableLargeText: false
};

export const AccessibilityWrapper: React.FC<Props> = ({ children, config = {} }) => {
  const [a11yConfig, setA11yConfig] = useState<AccessibilityConfig>({
    ...DEFAULT_CONFIG,
    ...config
  });

  const [_prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [_prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    // Vérifier les préférences système
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');

    setPrefersReducedMotion(motionQuery.matches);
    setPrefersHighContrast(contrastQuery.matches);

    // Écouter les changements
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      setA11yConfig(prev => ({
        ...prev,
        enableReducedMotion: e.matches
      }));
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
      setA11yConfig(prev => ({
        ...prev,
        enableHighContrast: e.matches
      }));
    };

    motionQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  // Appliquer les styles d'accessibilité
  const wrapperStyle: React.CSSProperties = {
    ...(a11yConfig.enableReducedMotion && {
      '--animation-duration': '0.01ms',
      '--animation-delay': '0.01ms'
    } as React.CSSProperties),
    ...(a11yConfig.enableHighContrast && {
      '--text-color': '#000',
      '--bg-color': '#fff'
    } as React.CSSProperties),
    ...(a11yConfig.enableLargeText && {
      fontSize: '1.25rem'
    })
  };

  return (
    <div
      style={wrapperStyle}
      className={`
        ${a11yConfig.enableReducedMotion ? 'motion-safe-none' : ''}
        ${a11yConfig.enableHighContrast ? 'high-contrast' : ''}
        ${a11yConfig.enableLargeText ? 'large-text' : ''}
      `}
      role="main"
      aria-label="Application principale"
    >
      {children}

      {/* Lien d'accès rapide au contenu principal */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-blue-600 focus:text-white"
      >
        Aller au contenu principal
      </a>
    </div>
  );
};

/**
 * Hook pour utiliser la config d'accessibilité
 */
export function useAccessibility() {
  const [config, setConfig] = useState<AccessibilityConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    // Charger depuis localStorage
    const saved = localStorage.getItem('lisa:a11y:config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Erreur parsing a11y config:', e);
      }
    }
  }, []);

  const updateConfig = (newConfig: Partial<AccessibilityConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem('lisa:a11y:config', JSON.stringify(updated));
  };

  return { config, updateConfig };
}

/**
 * Classe utilitaire pour les styles screen-reader only
 */
export const srOnlyStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0'
};

/**
 * Composant Screen Reader Only
 */
export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={srOnlyStyles}>{children}</span>
);

/**
 * CSS pour l'accessibilité (à ajouter dans le CSS global)
 */
export const a11yStyles = `
  /* Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* High Contrast */
  @media (prefers-contrast: more) {
    body {
      color: #000;
      background-color: #fff;
    }
    
    button, a {
      border: 2px solid currentColor;
    }
  }

  /* Focus Visible */
  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 3px solid #4F46E5;
    outline-offset: 2px;
  }

  /* Skip Link */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .sr-only:focus-visible {
    position: static;
    width: auto;
    height: auto;
    padding: inherit;
    margin: inherit;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }

  /* Large Text */
  .large-text {
    font-size: 1.25rem;
    line-height: 1.5;
  }

  /* Motion Safe */
  .motion-safe-none {
    animation: none !important;
    transition: none !important;
  }
`;
