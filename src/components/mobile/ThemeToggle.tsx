/**
 * ThemeToggle Component
 * Toggle pour changer le thème clair/sombre
 */

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useMobile } from '../../hooks/useMobile';
import type { ThemeMode } from '../../services/themeService';

interface ThemeToggleProps {
  showLabel?: boolean;
  showSystemOption?: boolean;
}

export const ThemeToggle = ({ showLabel = false, showSystemOption = true }: ThemeToggleProps) => {
  const { mode, isDark, setMode, toggle } = useTheme();
  const { hapticTap } = useMobile();

  const handleToggle = () => {
    hapticTap();
    toggle();
  };

  const handleSetMode = (newMode: ThemeMode) => {
    hapticTap();
    setMode(newMode);
  };

  // Simple toggle button
  if (!showSystemOption) {
    return (
      <button
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: showLabel ? '8px 16px' : '8px',
          backgroundColor: 'rgba(86, 88, 105, 0.2)',
          border: '1px solid rgba(86, 88, 105, 0.3)',
          borderRadius: '10px',
          color: isDark ? '#fbbf24' : '#6366f1',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
        {showLabel && <span style={{ color: '#e8e8f0', fontSize: '14px' }}>{isDark ? 'Sombre' : 'Clair'}</span>}
      </button>
    );
  }

  // Full options with system
  return (
    <div
      style={{
        display: 'flex',
        backgroundColor: 'rgba(86, 88, 105, 0.2)',
        borderRadius: '10px',
        padding: '4px',
        gap: '4px',
      }}
    >
      <ThemeModeButton
        mode="light"
        icon={<Sun size={16} />}
        active={mode === 'light'}
        onClick={() => handleSetMode('light')}
        label={showLabel ? 'Clair' : undefined}
      />
      <ThemeModeButton
        mode="system"
        icon={<Monitor size={16} />}
        active={mode === 'system'}
        onClick={() => handleSetMode('system')}
        label={showLabel ? 'Auto' : undefined}
      />
      <ThemeModeButton
        mode="dark"
        icon={<Moon size={16} />}
        active={mode === 'dark'}
        onClick={() => handleSetMode('dark')}
        label={showLabel ? 'Sombre' : undefined}
      />
    </div>
  );
};

interface ThemeModeButtonProps {
  mode: ThemeMode;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label?: string;
}

const ThemeModeButton = ({ icon, active, onClick, label }: ThemeModeButtonProps) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: label ? '8px 12px' : '8px',
      backgroundColor: active ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
      border: 'none',
      borderRadius: '8px',
      color: active ? '#10b981' : '#8e8ea0',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: '13px',
    }}
  >
    {icon}
    {label && <span>{label}</span>}
  </button>
);

export default ThemeToggle;
