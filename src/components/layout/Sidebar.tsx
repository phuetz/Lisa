import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, LayoutDashboard, Eye, Mic, Bot, Workflow,
  Home, Heart, FileText, Code, Wrench, Brain, Activity, Zap,
  Database, Settings, Headphones, ChevronLeft, ChevronRight, Sun, Moon,
  LogOut, LogIn, Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const navigationItems = [
  { icon: MessageSquare, label: 'Chat', path: '/' },
  { icon: Sparkles, label: 'Copilote', path: '/copilot' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Eye, label: 'Vision', path: '/vision' },
  { icon: Mic, label: 'Audio', path: '/audio' },
  { icon: Bot, label: 'Agents', path: '/agents' },
  { icon: Workflow, label: 'Workflows', path: '/workflows' },
  { icon: Home, label: 'Maison', path: '/smart-home' },
  { icon: Heart, label: 'Santé', path: '/health' },
  { icon: FileText, label: 'Documents', path: '/documents' },
  { icon: Code, label: 'Playground', path: '/playground' },
  { icon: Wrench, label: 'Outils', path: '/tools' },
  { icon: Brain, label: 'Personas', path: '/personas' },
  { icon: Activity, label: 'Monitoring', path: '/monitoring' },
  { icon: Zap, label: '5 Sens', path: '/senses' },
  { icon: Database, label: 'Mémoire', path: '/memory' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [lightMode, setLightMode] = useState(false);
  const { isAuthenticated, logout } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path || (path === '/' && location.pathname === '');

  const handleThemeToggle = () => {
    setLightMode(!lightMode);
    document.documentElement.classList.toggle('light', !lightMode);
  };

  return (
    <aside
      role="navigation"
      aria-label="Menu principal"
      style={{
        width: collapsed ? '64px' : '224px',
        minWidth: collapsed ? '64px' : '224px',
        height: '100%',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? '16px 0' : '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          height: '56px',
          minHeight: '56px',
        }}
      >
        <Headphones size={24} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
        {!collapsed && (
          <span
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}
          >
            Lisa AI
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: collapsed ? '8px 6px' : '8px',
        }}
      >
        {navigationItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom: '2px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                backgroundColor: active ? 'var(--color-brand-subtle)' : 'transparent',
                color: active ? 'var(--color-accent)' : 'var(--text-tertiary)',
                borderRight: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                transition: 'background-color var(--transition-fast), color var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                }
              }}
            >
              <item.icon size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: collapsed ? '8px 6px' : '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          title={collapsed ? 'Paramètres' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: collapsed ? '10px 0' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'inherit',
            backgroundColor: 'transparent',
            color: 'var(--text-tertiary)',
            transition: 'background-color var(--transition-fast), color var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <Settings size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
          {!collapsed && 'Paramètres'}
        </button>

        {/* Theme toggle */}
        <button
          onClick={handleThemeToggle}
          title={collapsed ? (lightMode ? 'Mode sombre' : 'Mode clair') : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: collapsed ? '10px 0' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'inherit',
            backgroundColor: 'transparent',
            color: 'var(--text-tertiary)',
            transition: 'background-color var(--transition-fast), color var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          {lightMode ? (
            <Moon size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
          ) : (
            <Sun size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
          )}
          {!collapsed && (lightMode ? 'Mode sombre' : 'Mode clair')}
        </button>

        {/* Auth button */}
        <button
          onClick={isAuthenticated ? logout : () => navigate('/settings')}
          title={collapsed ? (isAuthenticated ? 'Déconnexion' : 'Connexion') : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: collapsed ? '10px 0' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'inherit',
            backgroundColor: 'transparent',
            color: 'var(--text-tertiary)',
            transition: 'background-color var(--transition-fast), color var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          {isAuthenticated ? (
            <LogOut size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
          ) : (
            <LogIn size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
          )}
          {!collapsed && (isAuthenticated ? 'Déconnexion' : 'Connexion')}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Développer' : 'Réduire'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: collapsed ? '10px 0' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'inherit',
            backgroundColor: 'transparent',
            color: 'var(--text-tertiary)',
            transition: 'background-color var(--transition-fast), color var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          {collapsed ? (
            <ChevronRight size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
          ) : (
            <ChevronLeft size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
          )}
          {!collapsed && 'Réduire'}
        </button>
      </div>
    </aside>
  );
}
