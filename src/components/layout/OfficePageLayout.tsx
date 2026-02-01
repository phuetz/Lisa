/**
 * Office Page Layout Component
 * IT-002: Unified page layout using Office theme system
 *
 * This layout provides consistent styling for all pages using the Office theme.
 * It replaces the need for separate "Beautiful" and "Modern" page variants.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Home,
  Bot,
  Eye,
  Mic,
  Workflow,
  Settings,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Heart,
  FileText,
  Code,
  HomeIcon,
  X,
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
} from 'lucide-react';
import { useOfficeThemeStore, useIsDarkMode } from '../../store/officeThemeStore';
import { officeThemes } from '../../theme/officeThemes';
import { useIsMobile } from '../../hooks/useIsMobile';

interface OfficePageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showSidebar?: boolean;
  action?: React.ReactNode;
  headerContent?: React.ReactNode;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navigationItems: NavItem[] = [
  { icon: MessageSquare, label: 'Chat', path: '/' },
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: Eye, label: 'Vision', path: '/vision' },
  { icon: Mic, label: 'Audio', path: '/audio' },
  { icon: Bot, label: 'Agents', path: '/agents' },
  { icon: Workflow, label: 'Workflows', path: '/workflows' },
  { icon: HomeIcon, label: 'Maison', path: '/smart-home' },
  { icon: Heart, label: 'Sante', path: '/health' },
  { icon: FileText, label: 'Documents', path: '/documents' },
  { icon: Code, label: 'Code', path: '/code-assistant' },
  { icon: Settings, label: 'Parametres', path: '/settings' },
];

export const OfficePageLayout: React.FC<OfficePageLayoutProps> = ({
  children,
  title = 'Lisa',
  subtitle,
  showSidebar = true,
  action,
  headerContent,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  // Get theme colors and actions
  const { getCurrentColors, transitionsEnabled, themeId, mode, setTheme, setMode } = useOfficeThemeStore();
  const isDark = useIsDarkMode();
  const colors = getCurrentColors();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const transition = transitionsEnabled ? 'all 0.2s ease' : 'none';
  const sidebarWidth = sidebarCollapsed ? 64 : 260;

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      height: '100vh',
      backgroundColor: colors.editor,
      color: colors.editorText,
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden',
    },
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 40,
      opacity: sidebarOpen && isMobile ? 1 : 0,
      pointerEvents: sidebarOpen && isMobile ? 'auto' : 'none',
      transition,
    },
    sidebar: {
      width: isMobile ? (sidebarOpen ? 280 : 0) : sidebarWidth,
      minWidth: isMobile ? (sidebarOpen ? 280 : 0) : sidebarWidth,
      height: '100%',
      backgroundColor: colors.sidebar,
      borderRight: `1px solid ${colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      position: isMobile ? 'fixed' : 'relative',
      left: 0,
      top: 0,
      zIndex: isMobile ? 50 : 1,
      transition,
      overflow: 'hidden',
    },
    sidebarHeader: {
      padding: sidebarCollapsed ? '16px 12px' : '16px 20px',
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: sidebarCollapsed ? 'center' : 'space-between',
      minHeight: 56,
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    logoText: {
      fontSize: 18,
      fontWeight: 600,
      color: colors.accent,
      display: sidebarCollapsed ? 'none' : 'block',
    },
    collapseButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32,
      borderRadius: 6,
      border: 'none',
      background: 'transparent',
      color: colors.sidebarText,
      cursor: 'pointer',
      transition,
    },
    nav: {
      flex: 1,
      padding: '12px 8px',
      overflowY: 'auto',
      overflowX: 'hidden',
    },
    navItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: sidebarCollapsed ? '12px' : '10px 16px',
      marginBottom: 4,
      borderRadius: 8,
      border: 'none',
      background: 'transparent',
      color: colors.sidebarText,
      cursor: 'pointer',
      width: '100%',
      textAlign: 'left',
      fontSize: 14,
      fontWeight: 400,
      transition,
      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
    },
    navItemActive: {
      backgroundColor: colors.sidebarActive,
      color: colors.accent,
      fontWeight: 500,
    },
    navItemHover: {
      backgroundColor: colors.sidebarHover,
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      minWidth: 0,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: `1px solid ${colors.border}`,
      backgroundColor: colors.sidebar,
      minHeight: 64,
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    },
    menuButton: {
      display: isMobile ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 40,
      borderRadius: 8,
      border: 'none',
      background: 'transparent',
      color: colors.editorText,
      cursor: 'pointer',
    },
    titleContainer: {
      display: 'flex',
      flexDirection: 'column',
    },
    title: {
      margin: 0,
      fontSize: 20,
      fontWeight: 600,
      color: colors.editorText,
    },
    subtitle: {
      margin: 0,
      fontSize: 13,
      color: colors.editorSecondary,
      marginTop: 2,
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: 24,
    },
    themeButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 40,
      borderRadius: 8,
      border: `1px solid ${colors.border}`,
      background: colors.sidebar,
      color: colors.editorText,
      cursor: 'pointer',
      transition,
      marginRight: 8,
    },
    themeDropdown: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 8,
      width: 280,
      backgroundColor: colors.dialog,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      zIndex: 100,
      overflow: 'hidden',
    },
    dropdownHeader: {
      padding: '12px 16px',
      borderBottom: `1px solid ${colors.border}`,
      fontSize: 13,
      fontWeight: 600,
      color: colors.editorSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    modeSection: {
      padding: '12px 16px',
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      gap: 8,
    },
    modeButton: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '8px 12px',
      borderRadius: 8,
      border: `1px solid ${colors.border}`,
      background: 'transparent',
      color: colors.editorText,
      cursor: 'pointer',
      fontSize: 13,
      transition,
    },
    modeButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      color: '#ffffff',
    },
    themeList: {
      maxHeight: 300,
      overflowY: 'auto' as const,
      padding: '8px',
    },
    themeItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      borderRadius: 8,
      border: 'none',
      background: 'transparent',
      color: colors.editorText,
      cursor: 'pointer',
      width: '100%',
      textAlign: 'left' as const,
      transition,
    },
    themeItemActive: {
      backgroundColor: colors.sidebarActive,
    },
    themeIcon: {
      fontSize: 20,
      width: 28,
      textAlign: 'center' as const,
    },
    themeInfo: {
      flex: 1,
    },
    themeName: {
      fontSize: 14,
      fontWeight: 500,
      marginBottom: 2,
    },
    themeDesc: {
      fontSize: 12,
      color: colors.editorSecondary,
    },
  };

  return (
    <div style={styles.container}>
      {/* Mobile overlay */}
      {showSidebar && (
        <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <aside style={styles.sidebar}>
          {/* Header */}
          <div style={styles.sidebarHeader}>
            {!sidebarCollapsed && (
              <div style={styles.logo}>
                <Bot size={24} color={colors.accent} />
                <span style={styles.logoText}>Lisa</span>
              </div>
            )}
            {sidebarCollapsed && <Bot size={24} color={colors.accent} />}
            {!isMobile && (
              <button
                style={styles.collapseButton}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.sidebarHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                title={sidebarCollapsed ? 'Expand' : 'Collapse'}
              >
                {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}
            {isMobile && (
              <button
                style={styles.collapseButton}
                onClick={() => setSidebarOpen(false)}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav style={styles.nav}>
            {navigationItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  style={{
                    ...styles.navItem,
                    ...(active ? styles.navItemActive : {}),
                  }}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = colors.sidebarHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon size={20} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>
      )}

      {/* Main content */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              style={styles.menuButton}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div style={styles.titleContainer}>
              <h1 style={styles.title}>{title}</h1>
              {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Theme Switcher */}
            <div ref={themeDropdownRef} style={{ position: 'relative' }}>
              <button
                style={styles.themeButton}
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.sidebarHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.sidebar)}
                title="Changer le theme"
              >
                <Palette size={20} />
              </button>

              {themeDropdownOpen && (
                <div style={styles.themeDropdown as React.CSSProperties}>
                  <div style={styles.dropdownHeader}>Mode</div>
                  <div style={styles.modeSection}>
                    <button
                      style={{
                        ...styles.modeButton,
                        ...(mode === 'light' ? styles.modeButtonActive : {}),
                      }}
                      onClick={() => setMode('light')}
                    >
                      <Sun size={16} />
                      Clair
                    </button>
                    <button
                      style={{
                        ...styles.modeButton,
                        ...(mode === 'dark' ? styles.modeButtonActive : {}),
                      }}
                      onClick={() => setMode('dark')}
                    >
                      <Moon size={16} />
                      Sombre
                    </button>
                    <button
                      style={{
                        ...styles.modeButton,
                        ...(mode === 'system' ? styles.modeButtonActive : {}),
                      }}
                      onClick={() => setMode('system')}
                    >
                      <Monitor size={16} />
                      Auto
                    </button>
                  </div>

                  <div style={styles.dropdownHeader}>Theme</div>
                  <div style={styles.themeList as React.CSSProperties}>
                    {officeThemes.map((theme) => (
                      <button
                        key={theme.id}
                        style={{
                          ...styles.themeItem,
                          ...(themeId === theme.id ? styles.themeItemActive : {}),
                        }}
                        onClick={() => {
                          setTheme(theme.id);
                          setThemeDropdownOpen(false);
                        }}
                        onMouseEnter={(e) => {
                          if (themeId !== theme.id) {
                            e.currentTarget.style.backgroundColor = colors.sidebarHover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (themeId !== theme.id) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <span style={styles.themeIcon as React.CSSProperties}>{theme.icon}</span>
                        <div style={styles.themeInfo}>
                          <div style={styles.themeName}>{theme.name}</div>
                          <div style={styles.themeDesc}>{theme.description}</div>
                        </div>
                        {themeId === theme.id && <Check size={16} color={colors.accent} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {headerContent || action}
          </div>
        </header>

        {/* Content */}
        <div style={styles.content}>{children}</div>
      </main>
    </div>
  );
};

export default OfficePageLayout;
