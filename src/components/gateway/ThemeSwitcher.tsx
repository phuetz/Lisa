/**
 * Lisa Theme Switcher
 * Quick theme toggle and selector
 */

import { useState, useEffect } from 'react';
import { getThemeManager } from '../../gateway';
import type { Theme } from '../../gateway';

interface ThemeSwitcherProps {
  compact?: boolean;
  showLabel?: boolean;
}

export function ThemeSwitcher({ compact = false, showLabel = true }: ThemeSwitcherProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const manager = getThemeManager();
    setCurrentTheme(manager.getCurrentTheme());
    setThemes(manager.listThemes());

    const handleChange = (theme: Theme) => {
      setCurrentTheme(theme);
    };

    manager.on('theme:changed', handleChange);
    return () => {
      manager.off('theme:changed', handleChange);
    };
  }, []);

  const handleToggle = () => {
    const manager = getThemeManager();
    manager.toggleTheme();
  };

  const handleSelect = (themeId: string) => {
    const manager = getThemeManager();
    manager.setTheme(themeId);
    setIsOpen(false);
  };

  if (!currentTheme) return null;

  const themeIcons: Record<string, string> = {
    'lisa-dark': '🌙',
    'lisa-light': '☀️',
    'midnight-purple': '💜',
    'ocean-blue': '🌊'
  };

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        style={styles.compactButton}
        title="Changer le thème"
      >
        {themeIcons[currentTheme.id] || '🎨'}
      </button>
    );
  }

  return (
    <div style={styles.container}>
      {showLabel && <span style={styles.label}>Thème</span>}
      
      <div style={styles.dropdown}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={styles.trigger}
        >
          <span style={styles.themeIcon}>{themeIcons[currentTheme.id] || '🎨'}</span>
          <span style={styles.themeName}>{currentTheme.name}</span>
          <span style={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <div style={styles.menu}>
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                style={{
                  ...styles.menuItem,
                  ...(theme.id === currentTheme.id ? styles.menuItemActive : {})
                }}
              >
                <span style={styles.themeIcon}>{themeIcons[theme.id] || '🎨'}</span>
                <div style={styles.themeInfo}>
                  <span style={styles.themeNameItem}>{theme.name}</span>
                  <span style={styles.themeType}>{theme.type}</span>
                </div>
                {theme.id === currentTheme.id && (
                  <span style={styles.checkmark}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleToggle}
        style={styles.toggleButton}
        title="Basculer clair/sombre"
      >
        {currentTheme.type === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  label: {
    fontSize: '13px',
    color: '#6a6a82'
  },
  dropdown: {
    position: 'relative'
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#252525',
    border: '1px solid #2d2d44',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    minWidth: '160px'
  },
  themeIcon: {
    fontSize: '16px'
  },
  themeName: {
    flex: 1,
    textAlign: 'left'
  },
  arrow: {
    fontSize: '10px',
    color: '#6a6a82'
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: '#252525',
    border: '1px solid #2d2d44',
    borderRadius: '8px',
    overflow: 'hidden',
    zIndex: 1000,
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left'
  },
  menuItemActive: {
    backgroundColor: '#2d2d44'
  },
  themeInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  themeNameItem: {
    fontWeight: 500
  },
  themeType: {
    fontSize: '11px',
    color: '#6a6a82',
    textTransform: 'capitalize'
  },
  checkmark: {
    color: '#3b82f6',
    fontWeight: 'bold'
  },
  toggleButton: {
    padding: '8px',
    backgroundColor: '#252525',
    border: '1px solid #2d2d44',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  compactButton: {
    padding: '8px 12px',
    backgroundColor: '#252525',
    border: '1px solid #2d2d44',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px'
  }
};

export default ThemeSwitcher;
