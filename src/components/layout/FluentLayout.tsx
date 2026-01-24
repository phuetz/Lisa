/**
 * Fluent Layout Component
 *
 * Layout principal style Office 365 avec Fluent Design
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Menu, Home, Bot, Eye, Mic, Workflow, Settings,
  Bell, MessageSquare, Heart, FileText, Code, HomeIcon,
  Sun, Moon, Search, MoreVertical, Plus
} from 'lucide-react';
import { FluentSidebar, FluentCommandBar } from '../fluent';
import type { FluentSidebarSection, FluentSidebarItem } from '../fluent/FluentSidebar';
import type { FluentCommandGroup, FluentCommandItem } from '../fluent/FluentCommandBar';
import { themeService } from '../../services/ThemeService';
import { fluentColors, fluentTypography, fluentSpacing, fluentMotion, fluentElevation, fluentBorderRadius } from '../../styles/fluentTokens';

interface FluentLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSidebar?: boolean;
  showCommandBar?: boolean;
  commandGroups?: FluentCommandGroup[];
  action?: React.ReactNode;
}

export const FluentLayout: React.FC<FluentLayoutProps> = ({
  children,
  title = 'Lisa',
  showSidebar = true,
  showCommandBar = false,
  commandGroups,
  action,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const [isDark, setIsDark] = useState(themeService.isDark);
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Sync with theme service
  useEffect(() => {
    const unsubscribe = themeService.subscribe((state) => {
      setIsDark(state.resolved === 'dark');
    });
    return unsubscribe;
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  const toggleTheme = useCallback(() => {
    const currentMode = themeService.mode;
    if (currentMode === 'fluentLight') {
      themeService.setMode('fluentDark');
    } else if (currentMode === 'fluentDark') {
      themeService.setMode('fluentLight');
    } else {
      // Switch to Fluent theme
      themeService.setMode(isDark ? 'fluentLight' : 'fluentDark');
    }
  }, [isDark]);

  // Navigation items for sidebar
  const navigationSections: FluentSidebarSection[] = [
    {
      id: 'main',
      title: 'Navigation',
      items: [
        {
          id: 'chat',
          label: 'Chat',
          icon: <MessageSquare size={20} />,
          onClick: () => navigate('/chat'),
        },
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <Home size={20} />,
          onClick: () => navigate('/dashboard'),
        },
      ],
    },
    {
      id: 'senses',
      title: 'Senses',
      items: [
        {
          id: 'vision',
          label: 'Vision',
          icon: <Eye size={20} />,
          onClick: () => navigate('/vision'),
        },
        {
          id: 'audio',
          label: 'Audio',
          icon: <Mic size={20} />,
          onClick: () => navigate('/audio'),
        },
      ],
    },
    {
      id: 'tools',
      title: 'Tools',
      items: [
        {
          id: 'agents',
          label: 'Agents',
          icon: <Bot size={20} />,
          onClick: () => navigate('/agents'),
          badge: 50,
        },
        {
          id: 'workflows',
          label: 'Workflows',
          icon: <Workflow size={20} />,
          onClick: () => navigate('/workflows'),
        },
        {
          id: 'documents',
          label: 'Documents',
          icon: <FileText size={20} />,
          onClick: () => navigate('/documents'),
        },
        {
          id: 'code',
          label: 'Code',
          icon: <Code size={20} />,
          onClick: () => navigate('/code'),
        },
      ],
    },
    {
      id: 'life',
      title: 'Life',
      items: [
        {
          id: 'smart-home',
          label: 'Maison',
          icon: <HomeIcon size={20} />,
          onClick: () => navigate('/smart-home'),
        },
        {
          id: 'health',
          label: 'Santé',
          icon: <Heart size={20} />,
          onClick: () => navigate('/health'),
        },
      ],
    },
  ];

  // Get active item from path
  const getActiveItemId = () => {
    const path = location.pathname;
    const pathMap: Record<string, string> = {
      '/chat': 'chat',
      '/dashboard': 'dashboard',
      '/vision': 'vision',
      '/audio': 'audio',
      '/agents': 'agents',
      '/workflows': 'workflows',
      '/smart-home': 'smart-home',
      '/health': 'health',
      '/documents': 'documents',
      '/code': 'code',
      '/settings': 'settings',
    };
    return pathMap[path] || 'chat';
  };

  // Default command groups for CommandBar
  const defaultCommandGroups: FluentCommandGroup[] = [
    {
      id: 'actions',
      items: [
        {
          id: 'new',
          label: 'New',
          icon: <Plus size={16} />,
          onClick: () => navigate('/chat'),
        },
      ],
    },
  ];

  // Sidebar header
  const sidebarHeader = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: fluentSpacing.m,
      width: '100%',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: fluentBorderRadius.medium,
        background: `linear-gradient(135deg, ${fluentColors.primary.light} 0%, ${fluentColors.primary.hover} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Bot size={18} color="#fff" />
      </div>
      {!sidebarCollapsed && (
        <span style={{
          fontSize: fluentTypography.sizes.subtitle,
          fontWeight: fluentTypography.weights.semibold,
          color: `var(--color-text-primary, ${fluentColors.neutral.text})`,
        }}>
          Lisa
        </span>
      )}
    </div>
  );

  // Sidebar footer
  const sidebarFooter = (
    <div
      onClick={() => navigate('/settings')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: fluentSpacing.m,
        padding: `${fluentSpacing.s} 0`,
        cursor: 'pointer',
        color: location.pathname === '/settings'
          ? `var(--color-accent, ${fluentColors.primary.light})`
          : `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
      }}
    >
      <Settings size={20} />
      {!sidebarCollapsed && <span>Paramètres</span>}
    </div>
  );

  // Container styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    height: '100dvh',
    minHeight: '-webkit-fill-available',
    backgroundColor: `var(--color-bg-primary, ${isDark ? fluentColors.neutral.backgroundDark : fluentColors.neutral.background})`,
    color: `var(--color-text-primary, ${isDark ? fluentColors.neutral.textDark : fluentColors.neutral.text})`,
    fontFamily: fluentTypography.fontFamily,
    overflow: 'hidden',
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: `all ${fluentMotion.duration.normal} ${fluentMotion.easing.standard}`,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${fluentSpacing.m} ${fluentSpacing.xl}`,
    backgroundColor: `var(--color-bg-secondary, ${isDark ? fluentColors.neutral.surfaceDark : fluentColors.neutral.surface})`,
    borderBottom: `1px solid var(--color-border, ${isDark ? fluentColors.neutral.dividerDark : fluentColors.neutral.divider})`,
    minHeight: '56px',
  };

  const titleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: fluentSpacing.m,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    backgroundColor: `var(--color-bg-primary, ${isDark ? fluentColors.neutral.backgroundDark : fluentColors.neutral.background})`,
  };

  const innerContentStyle: React.CSSProperties = {
    padding: fluentSpacing.xl,
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const iconButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: fluentBorderRadius.medium,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: `var(--color-text-secondary, ${isDark ? fluentColors.neutral.textSecondaryDark : fluentColors.neutral.textSecondary})`,
    transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
    position: 'relative',
  };

  const searchContainerStyle: React.CSSProperties = {
    display: isMobile ? 'none' : 'flex',
    alignItems: 'center',
    gap: fluentSpacing.s,
    padding: `${fluentSpacing.s} ${fluentSpacing.m}`,
    backgroundColor: `var(--color-bg-tertiary, ${isDark ? fluentColors.neutral.surfaceHoverDark : fluentColors.neutral.surfaceHover})`,
    borderRadius: fluentBorderRadius.medium,
    minWidth: '240px',
  };

  const notificationBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '8px',
    height: '8px',
    backgroundColor: fluentColors.semantic.error,
    borderRadius: fluentBorderRadius.circular,
  };

  return (
    <div style={containerStyle} className="fluent-layout fluent-page-enter">
      {/* Mobile overlay */}
      {showSidebar && isMobile && !sidebarCollapsed && (
        <div
          onClick={() => setSidebarCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 40,
            transition: `opacity ${fluentMotion.duration.normal} ${fluentMotion.easing.standard}`,
          }}
          className="fluent-overlay-enter"
        />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div style={{
          position: isMobile ? 'fixed' : 'relative',
          left: 0,
          top: 0,
          height: '100%',
          zIndex: isMobile ? 50 : 'auto',
          display: isMobile && sidebarCollapsed ? 'none' : 'block',
        }}>
          <FluentSidebar
            sections={navigationSections}
            activeItemId={getActiveItemId()}
            collapsed={sidebarCollapsed && !isMobile}
            onCollapsedChange={setSidebarCollapsed}
            header={sidebarHeader}
            footer={sidebarFooter}
            width={260}
            collapsedWidth={56}
          />
        </div>
      )}

      {/* Main content area */}
      <div style={mainStyle}>
        {/* Command Bar (optional) */}
        {showCommandBar && (
          <FluentCommandBar
            groups={commandGroups || defaultCommandGroups}
            search={{
              placeholder: 'Search...',
              value: searchValue,
              onChange: setSearchValue,
            }}
            farItems={[
              {
                id: 'theme',
                label: isDark ? 'Light mode' : 'Dark mode',
                icon: isDark ? <Sun size={16} /> : <Moon size={16} />,
                onClick: toggleTheme,
              },
            ]}
          />
        )}

        {/* Header */}
        <header style={headerStyle}>
          <div style={titleStyle}>
            {/* Mobile menu button */}
            {isMobile && showSidebar && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                style={iconButtonStyle}
                className="fluent-reveal"
                aria-label="Toggle sidebar"
              >
                <Menu size={20} />
              </button>
            )}

            {/* Desktop collapse button */}
            {!isMobile && showSidebar && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                style={iconButtonStyle}
                className="fluent-reveal"
                aria-label="Toggle sidebar"
              >
                <Menu size={20} />
              </button>
            )}

            <h1 style={{
              fontSize: fluentTypography.sizes.title2,
              fontWeight: fluentTypography.weights.semibold,
              margin: 0,
              color: `var(--color-text-primary, ${isDark ? fluentColors.neutral.textDark : fluentColors.neutral.text})`,
            }}>
              {title}
            </h1>

            {action}
          </div>

          {/* Search */}
          <div style={searchContainerStyle}>
            <Search size={16} style={{ opacity: 0.6 }} />
            <input
              type="text"
              placeholder="Search Lisa..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: fluentTypography.sizes.body,
                fontFamily: fluentTypography.fontFamily,
                color: 'inherit',
              }}
            />
            <kbd style={{
              padding: '2px 6px',
              fontSize: fluentTypography.sizes.caption2,
              backgroundColor: `var(--color-bg-secondary, ${isDark ? fluentColors.neutral.surfaceDark : fluentColors.neutral.surface})`,
              borderRadius: fluentBorderRadius.small,
              border: `1px solid var(--color-border, ${isDark ? fluentColors.neutral.dividerDark : fluentColors.neutral.divider})`,
              opacity: 0.6,
            }}>
              ⌘K
            </kbd>
          </div>

          {/* Header actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: fluentSpacing.xs }}>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={iconButtonStyle}
              className="fluent-reveal"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={iconButtonStyle}
              className="fluent-reveal"
              title="Notifications"
            >
              <Bell size={18} />
              <span style={notificationBadgeStyle} />
            </button>

            {/* More options */}
            <button
              style={iconButtonStyle}
              className="fluent-reveal"
              title="More options"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={contentStyle} id="main-content">
          <div style={innerContentStyle} className="fluent-page-enter">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        .fluent-layout button:hover {
          background: var(--color-bg-tertiary, ${isDark ? fluentColors.neutral.surfaceHoverDark : fluentColors.neutral.surfaceHover}) !important;
          color: var(--color-accent, ${fluentColors.primary.light}) !important;
        }
        .fluent-layout button:active {
          transform: scale(0.98);
        }
        .fluent-layout button:focus-visible {
          outline: 2px solid var(--color-accent, ${fluentColors.primary.light});
          outline-offset: 2px;
        }
        .fluent-layout input::placeholder {
          color: var(--color-text-secondary, ${isDark ? fluentColors.neutral.textSecondaryDark : fluentColors.neutral.textSecondary});
        }
      `}</style>
    </div>
  );
};

export default FluentLayout;
