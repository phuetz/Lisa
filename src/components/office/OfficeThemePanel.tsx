/**
 * Office Theme Settings Panel
 * Beautiful theme customization panel inspired by Office 365
 */

import React, { useState } from 'react';
import {
  X,
  Sun,
  Moon,
  Monitor,
  Check,
  RotateCcw,
  Palette,
  Type,
  Accessibility,
  Sparkles,
} from 'lucide-react';
import { useOfficeThemeStore, useIsDarkMode } from '../../store/officeThemeStore';
import { officeThemes, type ThemeMode } from '../../theme/officeThemes';

interface OfficeThemePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfficeThemePanel: React.FC<OfficeThemePanelProps> = ({ isOpen, onClose }) => {
  const {
    themeId,
    mode,
    fontSize,
    fontFamily,
    borderRadius,
    compactMode,
    highContrast,
    reduceMotion,
    transitionsEnabled,
    setTheme,
    setMode,
    setFontSize,
    setFontFamily,
    setBorderRadius,
    toggleCompactMode,
    toggleHighContrast,
    toggleReduceMotion,
    toggleTransitions,
    resetToDefaults,
    getCurrentColors,
    getCurrentTheme,
  } = useOfficeThemeStore();

  const isDark = useIsDarkMode();
  const colors = getCurrentColors();
  const currentTheme = getCurrentTheme();

  const fontFamilies = [
    'Segoe UI',
    'Inter',
    'Roboto',
    'Arial',
    'Helvetica',
    'Open Sans',
  ];

  if (!isOpen) return null;

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      animation: 'fadeIn 0.2s ease',
    },
    panel: {
      backgroundColor: colors.dialog,
      borderRadius: 12,
      width: '100%',
      maxWidth: 720,
      maxHeight: '90vh',
      overflow: 'hidden',
      boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
      animation: 'slideUp 0.3s ease',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: `1px solid ${colors.divider}`,
    },
    title: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 18,
      fontWeight: 600,
      color: colors.dialogText,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      border: 'none',
      background: 'transparent',
      color: colors.editorSecondary,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s ease',
    },
    content: {
      padding: 24,
      overflowY: 'auto',
      maxHeight: 'calc(90vh - 140px)',
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 14,
      fontWeight: 600,
      color: colors.dialogText,
      marginBottom: 16,
    },
    modeCards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
    },
    modeCard: {
      padding: 16,
      borderRadius: 12,
      border: `2px solid ${colors.border}`,
      backgroundColor: colors.inputBg,
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s ease',
    },
    modeCardSelected: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}15`,
    },
    modeIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 8px',
    },
    modeLabel: {
      fontSize: 13,
      fontWeight: 500,
      color: colors.dialogText,
    },
    themeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12,
    },
    themeCard: {
      padding: 12,
      borderRadius: 12,
      border: `2px solid ${colors.border}`,
      backgroundColor: colors.inputBg,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative',
    },
    themeCardSelected: {
      borderColor: colors.accent,
    },
    themePreview: {
      height: 48,
      borderRadius: 8,
      marginBottom: 8,
      display: 'flex',
      overflow: 'hidden',
    },
    themeName: {
      fontSize: 12,
      fontWeight: 500,
      color: colors.dialogText,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    },
    checkBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: '50%',
      backgroundColor: colors.accent,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
    },
    label: {
      flex: 1,
      fontSize: 14,
      color: colors.dialogText,
    },
    select: {
      padding: '8px 12px',
      borderRadius: 8,
      border: `1px solid ${colors.inputBorder}`,
      backgroundColor: colors.inputBg,
      color: colors.dialogText,
      fontSize: 14,
      minWidth: 150,
      cursor: 'pointer',
      outline: 'none',
    },
    slider: {
      flex: 1,
      maxWidth: 200,
    },
    sliderValue: {
      fontSize: 13,
      color: colors.editorSecondary,
      minWidth: 40,
      textAlign: 'right',
    },
    toggle: {
      position: 'relative',
      width: 44,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.border,
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    },
    toggleActive: {
      backgroundColor: colors.accent,
    },
    toggleKnob: {
      position: 'absolute',
      top: 2,
      left: 2,
      width: 20,
      height: 20,
      borderRadius: '50%',
      backgroundColor: '#fff',
      transition: 'transform 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    toggleKnobActive: {
      transform: 'translateX(20px)',
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderTop: `1px solid ${colors.divider}`,
    },
    button: {
      padding: '10px 20px',
      borderRadius: 8,
      border: 'none',
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      transition: 'all 0.15s ease',
    },
    buttonPrimary: {
      backgroundColor: colors.accent,
      color: colors.accentText,
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      color: colors.editorSecondary,
    },
    preview: {
      padding: 16,
      borderRadius: 12,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.editor,
    },
    previewHeader: {
      height: 32,
      borderRadius: 6,
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 12,
      gap: 8,
    },
    previewContent: {
      display: 'flex',
      gap: 12,
    },
    previewButton: {
      padding: '8px 16px',
      borderRadius: borderRadius / 2,
      border: 'none',
      fontSize: fontSize === 'small' ? 12 : fontSize === 'large' ? 16 : 14,
      fontFamily: fontFamily,
      cursor: 'pointer',
    },
  };

  const modes: { id: ThemeMode; label: string; icon: React.ReactNode; bg: string }[] = [
    { id: 'light', label: 'Clair', icon: <Sun size={24} />, bg: '#fff' },
    { id: 'dark', label: 'Sombre', icon: <Moon size={24} />, bg: '#1e1e1e' },
    { id: 'system', label: 'Système', icon: <Monitor size={24} />, bg: 'linear-gradient(135deg, #fff 50%, #1e1e1e 50%)' },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>
            <Sparkles size={24} style={{ color: colors.accent }} />
            Personnaliser l'apparence
          </div>
          <button
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.sidebarHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Mode Selection */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Palette size={18} />
              Mode d'affichage
            </div>
            <div style={styles.modeCards}>
              {modes.map((m) => (
                <div
                  key={m.id}
                  style={{
                    ...styles.modeCard,
                    ...(mode === m.id ? styles.modeCardSelected : {}),
                  }}
                  onClick={() => setMode(m.id)}
                >
                  <div
                    style={{
                      ...styles.modeIcon,
                      background: m.bg,
                      color: m.id === 'dark' ? '#fff' : '#333',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {m.icon}
                  </div>
                  <div style={styles.modeLabel}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Theme Selection */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Palette size={18} />
              Thème de couleurs
            </div>
            <div style={styles.themeGrid}>
              {officeThemes.map((theme) => {
                const themeColors = isDark ? theme.dark : theme.light;
                return (
                  <div
                    key={theme.id}
                    style={{
                      ...styles.themeCard,
                      ...(themeId === theme.id ? styles.themeCardSelected : {}),
                    }}
                    onClick={() => setTheme(theme.id)}
                  >
                    {themeId === theme.id && (
                      <div style={styles.checkBadge}>
                        <Check size={12} />
                      </div>
                    )}
                    <div style={styles.themePreview}>
                      <div style={{ flex: 1, backgroundColor: themeColors.ribbon }} />
                      <div style={{ flex: 1, backgroundColor: themeColors.accent }} />
                    </div>
                    <div style={styles.themeName}>
                      <span>{theme.icon}</span>
                      {theme.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Typography */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Type size={18} />
              Typographie
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Police</span>
              <select
                style={{ ...styles.select, fontFamily }}
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              >
                {fontFamilies.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Taille du texte</span>
              <select
                style={styles.select}
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as 'small' | 'medium' | 'large')}
              >
                <option value="small">Petit</option>
                <option value="medium">Moyen</option>
                <option value="large">Grand</option>
              </select>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Arrondi des coins</span>
              <input
                type="range"
                min="0"
                max="24"
                step="2"
                value={borderRadius}
                onChange={(e) => setBorderRadius(Number(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>{borderRadius}px</span>
            </div>
          </div>

          {/* Accessibility */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Accessibility size={18} />
              Accessibilité
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Mode compact</span>
              <div
                style={{
                  ...styles.toggle,
                  ...(compactMode ? styles.toggleActive : {}),
                }}
                onClick={toggleCompactMode}
              >
                <div
                  style={{
                    ...styles.toggleKnob,
                    ...(compactMode ? styles.toggleKnobActive : {}),
                  }}
                />
              </div>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Contraste élevé</span>
              <div
                style={{
                  ...styles.toggle,
                  ...(highContrast ? styles.toggleActive : {}),
                }}
                onClick={toggleHighContrast}
              >
                <div
                  style={{
                    ...styles.toggleKnob,
                    ...(highContrast ? styles.toggleKnobActive : {}),
                  }}
                />
              </div>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Réduire les animations</span>
              <div
                style={{
                  ...styles.toggle,
                  ...(reduceMotion ? styles.toggleActive : {}),
                }}
                onClick={toggleReduceMotion}
              >
                <div
                  style={{
                    ...styles.toggleKnob,
                    ...(reduceMotion ? styles.toggleKnobActive : {}),
                  }}
                />
              </div>
            </div>

            <div style={styles.row}>
              <span style={styles.label}>Transitions fluides</span>
              <div
                style={{
                  ...styles.toggle,
                  ...(transitionsEnabled ? styles.toggleActive : {}),
                }}
                onClick={toggleTransitions}
              >
                <div
                  style={{
                    ...styles.toggleKnob,
                    ...(transitionsEnabled ? styles.toggleKnobActive : {}),
                  }}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Sparkles size={18} />
              Aperçu
            </div>
            <div style={styles.preview}>
              <div
                style={{
                  ...styles.previewHeader,
                  backgroundColor: colors.ribbon,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  }}
                />
                <span style={{ color: colors.ribbonText, fontSize: 13, fontFamily }}>
                  {currentTheme.name}
                </span>
              </div>
              <div style={styles.previewContent}>
                <button
                  style={{
                    ...styles.previewButton,
                    backgroundColor: colors.accent,
                    color: colors.accentText,
                  }}
                >
                  Principal
                </button>
                <button
                  style={{
                    ...styles.previewButton,
                    backgroundColor: 'transparent',
                    border: `1px solid ${colors.accent}`,
                    color: colors.accent,
                  }}
                >
                  Secondaire
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={resetToDefaults}
          >
            <RotateCcw size={16} />
            Réinitialiser
          </button>
          <button
            style={{ ...styles.button, ...styles.buttonPrimary }}
            onClick={onClose}
          >
            <Check size={16} />
            Appliquer
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default OfficeThemePanel;
