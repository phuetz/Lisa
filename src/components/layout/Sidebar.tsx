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
  const [lightMode, setLightMode] = useState(() => localStorage.getItem('lisa-theme') === 'light');
  const { isAuthenticated, logout } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/') || (path === '/' && location.pathname === '');

  const handleThemeToggle = () => {
    const newMode = !lightMode;
    setLightMode(newMode);
    document.documentElement.classList.toggle('light', newMode);
    localStorage.setItem('lisa-theme', newMode ? 'light' : 'dark');
  };

  const cls = `lisa-sidebar ${collapsed ? 'collapsed' : 'expanded'}`;

  return (
    <aside role="navigation" aria-label="Menu principal" className={cls}>
      {/* Logo */}
      <div className="sidebar-logo">
        <Headphones size={24} className="sidebar-logo-icon icon-shrink" />
        {!collapsed && <span className="sidebar-logo-text">Lisa AI</span>}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navigationItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={`sidebar-nav-btn${active ? ' active' : ''}`}
            >
              <item.icon size={18} aria-hidden="true" className="icon-shrink" />
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="sidebar-bottom">
        <button
          onClick={() => navigate('/settings')}
          title={collapsed ? 'Paramètres' : undefined}
          className="sidebar-nav-btn"
        >
          <Settings size={18} aria-hidden="true" className="icon-shrink" />
          {!collapsed && 'Paramètres'}
        </button>

        <button
          onClick={handleThemeToggle}
          title={collapsed ? (lightMode ? 'Mode sombre' : 'Mode clair') : undefined}
          className="sidebar-nav-btn"
        >
          {lightMode ? (
            <Moon size={18} aria-hidden="true" className="icon-shrink" />
          ) : (
            <Sun size={18} aria-hidden="true" className="icon-shrink" />
          )}
          {!collapsed && (lightMode ? 'Mode sombre' : 'Mode clair')}
        </button>

        <button
          onClick={isAuthenticated ? logout : () => navigate('/settings')}
          title={collapsed ? (isAuthenticated ? 'Déconnexion' : 'Connexion') : undefined}
          className="sidebar-nav-btn"
        >
          {isAuthenticated ? (
            <LogOut size={18} aria-hidden="true" className="icon-shrink" />
          ) : (
            <LogIn size={18} aria-hidden="true" className="icon-shrink" />
          )}
          {!collapsed && (isAuthenticated ? 'Déconnexion' : 'Connexion')}
        </button>

        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Développer' : 'Réduire'}
          className="sidebar-nav-btn"
        >
          {collapsed ? (
            <ChevronRight size={18} aria-hidden="true" className="icon-shrink" />
          ) : (
            <ChevronLeft size={18} aria-hidden="true" className="icon-shrink" />
          )}
          {!collapsed && 'Réduire'}
        </button>
      </div>
    </aside>
  );
}
