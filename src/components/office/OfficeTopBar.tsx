/**
 * Office-style Top App Bar
 * Inspired by Microsoft Office 365 / Teams
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Grid3X3,
  Bell,
  Settings,
  Moon,
  Sun,
  User,
  LogOut,
  HelpCircle,
  ChevronDown,
  MessageSquare,
  X,
  Keyboard,
} from 'lucide-react';
import { useOfficeThemeStore, useIsDarkMode } from '../../store/officeThemeStore';

interface AppItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  path?: string;
  onClick?: () => void;
}

interface OfficeTopBarProps {
  appName?: string;
  appIcon?: React.ReactNode;
  appColor?: string;
  onSearch?: (query: string) => void;
  onNavigate?: (path: string) => void;
  apps?: AppItem[];
  showNotifications?: boolean;
  notificationCount?: number;
}

export const OfficeTopBar: React.FC<OfficeTopBarProps> = ({
  appName = 'Lisa',
  appIcon,
  appColor,
  onSearch,
  onNavigate,
  apps,
  showNotifications = true,
  notificationCount = 0,
}) => {
  const [waffleOpen, setWaffleOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const waffleRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { mode, setMode, getCurrentColors, getCurrentTheme } = useOfficeThemeStore();
  const isDark = useIsDarkMode();
  const colors = getCurrentColors();
  const theme = getCurrentTheme();

  // Default apps if not provided
  const defaultApps: AppItem[] = apps || [
    { id: 'chat', name: 'Chat', icon: <MessageSquare size={24} />, color: '#6264a7' },
    { id: 'settings', name: 'Paramètres', icon: <Settings size={24} />, color: '#0078d4' },
    { id: 'help', name: 'Aide', icon: <HelpCircle size={24} />, color: '#107c41' },
  ];

  // Keyboard shortcut for search (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setWaffleOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (waffleRef.current && !waffleRef.current.contains(e.target as Node)) {
        setWaffleOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery);
    }
    setSearchOpen(false);
    setSearchQuery('');
  };

  const toggleTheme = () => {
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  };

  const themeIcon = mode === 'dark' ? <Moon size={16} /> : mode === 'light' ? <Sun size={16} /> : <Settings size={16} />;

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 48,
      backgroundColor: appColor || colors.ribbon,
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 8,
      zIndex: 1200,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    iconButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 40,
      borderRadius: 4,
      border: 'none',
      background: 'transparent',
      color: colors.ribbonText,
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      position: 'relative',
    },
    appInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginLeft: 4,
    },
    appName: {
      fontSize: 16,
      fontWeight: 600,
      color: colors.ribbonText,
    },
    searchBar: {
      flex: 1,
      maxWidth: 500,
      margin: '0 auto',
      height: 32,
      backgroundColor: colors.ribbonHover,
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 8,
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
    },
    searchText: {
      flex: 1,
      fontSize: 13,
      color: colors.ribbonText,
      opacity: 0.8,
    },
    shortcut: {
      fontSize: 11,
      color: colors.ribbonText,
      opacity: 0.6,
      backgroundColor: 'rgba(255,255,255,0.1)',
      padding: '2px 6px',
      borderRadius: 3,
    },
    rightActions: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    },
    badge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 16,
      height: 16,
      borderRadius: '50%',
      backgroundColor: '#d13438',
      color: '#fff',
      fontSize: 10,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      backgroundColor: colors.accent,
      color: colors.accentText,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 600,
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      marginTop: 4,
      backgroundColor: colors.dialog,
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      border: `1px solid ${colors.border}`,
      overflow: 'hidden',
      zIndex: 1300,
    },
    waffleGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 4,
      padding: 12,
      width: 280,
    },
    waffleItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      border: 'none',
      background: 'transparent',
    },
    waffleIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    waffleName: {
      fontSize: 11,
      color: colors.dialogText,
      textAlign: 'center',
    },
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      border: 'none',
      background: 'transparent',
      width: '100%',
      textAlign: 'left',
      color: colors.dialogText,
      fontSize: 14,
    },
    menuDivider: {
      height: 1,
      backgroundColor: colors.divider,
      margin: '4px 0',
    },
    searchModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: 100,
      zIndex: 2000,
    },
    searchBox: {
      width: '100%',
      maxWidth: 600,
      backgroundColor: colors.dialog,
      borderRadius: 12,
      boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
      overflow: 'hidden',
    },
    searchInput: {
      width: '100%',
      padding: '16px 20px',
      fontSize: 18,
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
      color: colors.dialogText,
    },
    searchHint: {
      padding: '12px 20px',
      borderTop: `1px solid ${colors.divider}`,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: colors.editorSecondary,
      fontSize: 13,
    },
  };

  return (
    <>
      <header style={styles.container}>
        {/* Waffle Menu */}
        <div ref={waffleRef} style={{ position: 'relative' }}>
          <button
            style={styles.iconButton}
            onClick={() => setWaffleOpen(!waffleOpen)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.ribbonHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            title="Applications"
          >
            <Grid3X3 size={20} />
          </button>

          {waffleOpen && (
            <div style={{ ...styles.dropdown, left: 0 }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.divider}` }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.dialogText }}>
                  Applications
                </span>
              </div>
              <div style={styles.waffleGrid}>
                {defaultApps.map((app) => (
                  <button
                    key={app.id}
                    style={styles.waffleItem}
                    onClick={() => {
                      if (app.onClick) app.onClick();
                      else if (app.path && onNavigate) onNavigate(app.path);
                      setWaffleOpen(false);
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.sidebarHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ ...styles.waffleIcon, backgroundColor: `${app.color}20`, color: app.color }}>
                      {app.icon}
                    </div>
                    <span style={styles.waffleName}>{app.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* App Icon & Name */}
        <div style={styles.appInfo}>
          {appIcon && <span style={{ color: colors.ribbonText }}>{appIcon}</span>}
          <span style={styles.appName}>{appName}</span>
        </div>

        {/* Search Bar */}
        <div
          style={styles.searchBar}
          onClick={() => setSearchOpen(true)}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.ribbonActive)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.ribbonHover)}
        >
          <Search size={16} style={{ color: colors.ribbonText, opacity: 0.7 }} />
          <span style={styles.searchText}>Rechercher...</span>
          <span style={styles.shortcut}>Ctrl+K</span>
        </div>

        {/* Right Actions */}
        <div style={styles.rightActions}>
          {/* Theme Toggle */}
          <button
            style={styles.iconButton}
            onClick={toggleTheme}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.ribbonHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            title={`Thème: ${mode === 'light' ? 'Clair' : mode === 'dark' ? 'Sombre' : 'Système'}`}
          >
            {themeIcon}
          </button>

          {/* Notifications */}
          {showNotifications && (
            <button
              style={styles.iconButton}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.ribbonHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              title="Notifications"
            >
              <Bell size={18} />
              {notificationCount > 0 && <span style={styles.badge}>{notificationCount}</span>}
            </button>
          )}

          {/* Settings */}
          <button
            style={styles.iconButton}
            onClick={() => onNavigate?.('/settings')}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.ribbonHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            title="Paramètres"
          >
            <Settings size={18} />
          </button>

          {/* User Menu */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              style={{ ...styles.iconButton, padding: 4 }}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.ribbonHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={styles.avatar}>U</div>
            </button>

            {userMenuOpen && (
              <div style={{ ...styles.dropdown, right: 0, minWidth: 220 }}>
                <div style={{ padding: 16, borderBottom: `1px solid ${colors.divider}` }}>
                  <div style={{ fontWeight: 600, color: colors.dialogText, marginBottom: 4 }}>
                    Utilisateur
                  </div>
                  <div style={{ fontSize: 12, color: colors.editorSecondary }}>
                    utilisateur@lisa.local
                  </div>
                </div>
                <div style={{ padding: '4px 0' }}>
                  <button
                    style={styles.menuItem}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.sidebarHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <User size={18} />
                    Mon compte
                  </button>
                  <button
                    style={styles.menuItem}
                    onClick={() => onNavigate?.('/settings')}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.sidebarHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Settings size={18} />
                    Paramètres
                  </button>
                  <button
                    style={styles.menuItem}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.sidebarHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Keyboard size={18} />
                    Raccourcis
                  </button>
                  <div style={styles.menuDivider} />
                  <button
                    style={styles.menuItem}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.sidebarHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <LogOut size={18} />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div style={styles.searchModal} onClick={() => setSearchOpen(false)}>
          <div style={styles.searchBox} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearch}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher dans Lisa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
                autoFocus
              />
            </form>
            <div style={styles.searchHint}>
              <Keyboard size={14} />
              <span>Appuyez sur Entrée pour rechercher, Échap pour fermer</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OfficeTopBar;
