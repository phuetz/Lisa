/**
 * ThemeCustomizer - Custom themes and color settings
 * Allows users to customize Lisa's appearance
 */

import { useState } from 'react';
import { Palette, Check, Sun, Moon, Sparkles } from 'lucide-react';
import { useChatSettingsStore } from '../../store/chatSettingsStore';

interface ThemePreset {
  id: string;
  name: string;
  colors: {
    primary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  icon: React.ReactNode;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'dark',
    name: 'Sombre (Défaut)',
    colors: {
      primary: '#f5a623',
      background: '#0a0a0f',
      surface: '#1a1a26',
      text: '#e8e8f0',
      accent: '#06b6d4',
    },
    icon: <Moon size={18} />,
  },
  {
    id: 'light',
    name: 'Clair',
    colors: {
      primary: '#059669',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#1a1a1a',
      accent: '#2563eb',
    },
    icon: <Sun size={18} />,
  },
  {
    id: 'midnight',
    name: 'Minuit',
    colors: {
      primary: '#8b5cf6',
      background: '#0f0f1a',
      surface: '#1a1a2e',
      text: '#e0e0ff',
      accent: '#a855f7',
    },
    icon: <Sparkles size={18} />,
  },
  {
    id: 'ocean',
    name: 'Océan',
    colors: {
      primary: '#06b6d4',
      background: '#0a1929',
      surface: '#0d2137',
      text: '#e0f7fa',
      accent: '#0891b2',
    },
    icon: <Palette size={18} />,
  },
  {
    id: 'forest',
    name: 'Forêt',
    colors: {
      primary: '#22c55e',
      background: '#0a1a0a',
      surface: '#1a2f1a',
      text: '#e8f5e9',
      accent: '#16a34a',
    },
    icon: <Palette size={18} />,
  },
  {
    id: 'sunset',
    name: 'Coucher de soleil',
    colors: {
      primary: '#f97316',
      background: '#1a0a0a',
      surface: '#2d1a1a',
      text: '#fff3e0',
      accent: '#ea580c',
    },
    icon: <Palette size={18} />,
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      primary: '#ec4899',
      background: '#1a0a14',
      surface: '#2d1a24',
      text: '#fce7f3',
      accent: '#db2777',
    },
    icon: <Palette size={18} />,
  },
  {
    id: 'mono',
    name: 'Monochrome',
    colors: {
      primary: '#a0a0a0',
      background: '#0a0a0a',
      surface: '#1a1a26',
      text: '#e0e0e0',
      accent: '#707070',
    },
    icon: <Palette size={18} />,
  },
];

// Storage key for custom theme
const CUSTOM_THEME_KEY = 'lisa_custom_theme';

function loadCustomTheme(): ThemePreset['colors'] | null {
  try {
    const stored = localStorage.getItem(CUSTOM_THEME_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveCustomTheme(colors: ThemePreset['colors']): void {
  localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(colors));
}

function applyTheme(colors: ThemePreset['colors']): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-background', colors.background);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-text', colors.text);
  root.style.setProperty('--color-accent', colors.accent);
}

export const ThemeCustomizer = () => {
  const { theme } = useChatSettingsStore();
  const [selectedPreset, setSelectedPreset] = useState<string>(theme);
  const [customColors, setCustomColors] = useState<ThemePreset['colors']>(
    loadCustomTheme() || THEME_PRESETS[0].colors
  );
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetSelect = (preset: ThemePreset) => {
    setSelectedPreset(preset.id);
    applyTheme(preset.colors);
    saveCustomTheme(preset.colors);
  };

  const handleCustomColorChange = (key: keyof ThemePreset['colors'], value: string) => {
    const newColors = { ...customColors, [key]: value };
    setCustomColors(newColors);
    applyTheme(newColors);
    saveCustomTheme(newColors);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Presets */}
      <div>
        <h4 style={{ color: '#fff', fontSize: '14px', marginBottom: '12px' }}>
          Thèmes prédéfinis
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
        }}>
          {THEME_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                borderRadius: '10px',
                border: selectedPreset === preset.id ? `2px solid ${preset.colors.primary}` : '2px solid #12121a',
                backgroundColor: preset.colors.surface,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: preset.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}>
                {selectedPreset === preset.id ? <Check size={16} /> : preset.icon}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: preset.colors.text, fontSize: '13px', fontWeight: 500 }}>
                  {preset.name}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  marginTop: '4px',
                }}>
                  {Object.values(preset.colors).slice(0, 4).map((color, i) => (
                    <div
                      key={i}
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        backgroundColor: color,
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors Toggle */}
      <button
        onClick={() => setShowCustom(!showCustom)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #3d3d5c',
          backgroundColor: '#1a1a26',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        <Palette size={18} />
        Personnaliser les couleurs
      </button>

      {/* Custom Color Pickers */}
      {showCustom && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
          backgroundColor: '#1a1a26',
          borderRadius: '12px',
        }}>
          {Object.entries(customColors).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="color"
                value={value}
                onChange={(e) => handleCustomColorChange(key as keyof ThemePreset['colors'], e.target.value)}
                style={{
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              />
              <div>
                <div style={{ color: '#fff', fontSize: '13px', textTransform: 'capitalize' }}>
                  {key === 'primary' ? 'Couleur principale' :
                   key === 'background' ? 'Arrière-plan' :
                   key === 'surface' ? 'Surface' :
                   key === 'text' ? 'Texte' : 'Accent'}
                </div>
                <div style={{ color: '#8e8ea0', fontSize: '11px', fontFamily: 'monospace' }}>
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeCustomizer;
