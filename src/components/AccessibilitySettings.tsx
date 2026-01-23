/**
 * ♿ Accessibility Settings - Paramètres d'Accessibilité
 * Permet à l'utilisateur de configurer les options d'accessibilité
 */

import React, { useState, useEffect } from 'react';
import { Settings, Eye, Zap, Type } from 'lucide-react';

interface AccessibilityConfig {
  enableKeyboardNav: boolean;
  enableAriaLive: boolean;
  enableReducedMotion: boolean;
  enableHighContrast: boolean;
  enableLargeText: boolean;
}

interface Props {
  onConfigChange?: (config: AccessibilityConfig) => void;
}

export const AccessibilitySettings: React.FC<Props> = ({ onConfigChange }) => {
  const [config, setConfig] = useState<AccessibilityConfig>({
    enableKeyboardNav: true,
    enableAriaLive: true,
    enableReducedMotion: false,
    enableHighContrast: false,
    enableLargeText: false
  });

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Charger depuis localStorage
    const saved = localStorage.getItem('lisa:a11y:config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      } catch (e) {
        console.error('Erreur parsing a11y config:', e);
      }
    }
  }, []);

  const handleToggle = (key: keyof AccessibilityConfig) => {
    const newConfig = {
      ...config,
      [key]: !config[key]
    };
    setConfig(newConfig);
    localStorage.setItem('lisa:a11y:config', JSON.stringify(newConfig));
    onConfigChange?.(newConfig);

    // Appliquer les changements
    applyAccessibilitySettings(newConfig);
  };

  const applyAccessibilitySettings = (cfg: AccessibilityConfig) => {
    const root = document.documentElement;

    // Reduced Motion
    if (cfg.enableReducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.style.setProperty('--animation-delay', '0.01ms');
      root.classList.add('motion-safe-none');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--animation-delay');
      root.classList.remove('motion-safe-none');
    }

    // High Contrast
    if (cfg.enableHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Large Text
    if (cfg.enableLargeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
  };

  return (
    <div className="relative">
      {/* Bouton d'Accessibilité */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Paramètres d'accessibilité"
        aria-expanded={showSettings}
        aria-controls="a11y-settings-panel"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Panel des Paramètres */}
      {showSettings && (
        <div
          id="a11y-settings-panel"
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50 border border-gray-200 dark:border-gray-700"
          role="region"
          aria-label="Paramètres d'accessibilité"
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Accessibilité
          </h2>

          <div className="space-y-4">
            {/* Keyboard Navigation */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableKeyboardNav}
                onChange={() => handleToggle('enableKeyboardNav')}
                className="w-4 h-4 rounded"
                aria-label="Activer la navigation au clavier"
              />
              <div>
                <p className="font-semibold text-sm">Navigation au Clavier</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Tab, Enter, Escape pour naviguer
                </p>
              </div>
            </label>

            {/* ARIA Live */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableAriaLive}
                onChange={() => handleToggle('enableAriaLive')}
                className="w-4 h-4 rounded"
                aria-label="Activer les annonces live"
              />
              <div>
                <p className="font-semibold text-sm">Annonces Live</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Lecteur d'écran annonce les changements
                </p>
              </div>
            </label>

            {/* Reduced Motion */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableReducedMotion}
                onChange={() => handleToggle('enableReducedMotion')}
                className="w-4 h-4 rounded"
                aria-label="Réduire les animations"
              />
              <div>
                <p className="font-semibold text-sm flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Mouvement Réduit
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Désactiver les animations et transitions
                </p>
              </div>
            </label>

            {/* High Contrast */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableHighContrast}
                onChange={() => handleToggle('enableHighContrast')}
                className="w-4 h-4 rounded"
                aria-label="Augmenter le contraste"
              />
              <div>
                <p className="font-semibold text-sm flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  Contraste Élevé
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Augmenter le contraste des couleurs
                </p>
              </div>
            </label>

            {/* Large Text */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableLargeText}
                onChange={() => handleToggle('enableLargeText')}
                className="w-4 h-4 rounded"
                aria-label="Augmenter la taille du texte"
              />
              <div>
                <p className="font-semibold text-sm flex items-center gap-1">
                  <Type className="w-4 h-4" />
                  Texte Plus Grand
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Augmenter la taille du texte de 25%
                </p>
              </div>
            </label>
          </div>

          {/* Informations */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              💡 Les paramètres sont sauvegardés automatiquement
            </p>
          </div>

          {/* Bouton Fermer */}
          <button
            onClick={() => setShowSettings(false)}
            className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Fermer les paramètres d'accessibilité"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
};
