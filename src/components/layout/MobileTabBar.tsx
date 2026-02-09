import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, Bot, Wrench, Settings } from 'lucide-react';

const tabs = [
  { icon: MessageSquare, label: 'Chat', path: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Bot, label: 'Agents', path: '/agents' },
  { icon: Wrench, label: 'Outils', path: '/tools' },
  { icon: Settings, label: 'Réglages', path: '/settings' },
];

export function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || (path === '/' && location.pathname === '');

  return (
    <nav
      role="tablist"
      aria-label="Navigation mobile"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 50,
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <button
            key={tab.path}
            role="tab"
            aria-selected={active}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: active ? 'var(--color-accent)' : 'var(--text-muted)',
              fontSize: '10px',
              fontFamily: 'inherit',
              fontWeight: active ? 600 : 400,
              transition: 'color var(--transition-fast)',
            }}
          >
            <tab.icon size={20} aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
