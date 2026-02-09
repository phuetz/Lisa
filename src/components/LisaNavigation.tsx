/**
 * Navigation Lisa Vivante
 * Navigation principale pour accéder aux différentes phases
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Brain,
  Settings,
  Shield,
  Activity,
  Home,
  Lock,
  Database,
  Sparkles,
  BarChart3,
  Menu,
  X
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  category?: string;
}

export function LisaNavigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { path: '/', label: 'Accueil', icon: <Home className="w-4 h-4" /> },

    // Phase 1 - Présence
    { path: '/permissions', label: 'Permissions', icon: <Lock className="w-4 h-4" />, category: 'Phase 1' },
    { path: '/privacy', label: 'Privacy', icon: <Shield className="w-4 h-4" />, category: 'Phase 1' },
    { path: '/memory', label: 'Memory', icon: <Database className="w-4 h-4" />, category: 'Phase 1' },
    { path: '/incarnation', label: 'Incarnation', icon: <Sparkles className="w-4 h-4" />, category: 'Phase 1' },
    { path: '/accessibility', label: 'Accessibilité', icon: <Settings className="w-4 h-4" />, category: 'Phase 1' },

    // Phase 2 - Agentivité
    { path: '/agentivity', label: 'Agentivité', icon: <Brain className="w-4 h-4" />, category: 'Phase 2' },

    // Phase 3 - Autonomie
    { path: '/autonomy', label: 'Autonomie', icon: <Activity className="w-4 h-4" />, category: 'Phase 3' },

    // Dashboard
    { path: '/dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={isMobileMenuOpen}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{ background: 'var(--bg-panel, #1a1a26)', color: 'var(--text-primary, #e8e8f0)', boxShadow: 'var(--shadow-elevated, 0 4px 20px rgba(0,0,0,0.4))' }}
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Navigation Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-40
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ background: 'var(--bg-sidebar, #171717)', boxShadow: 'var(--shadow-elevated, 0 4px 20px rgba(0,0,0,0.4))' }}
        role="navigation"
        aria-label="Navigation principale"
      >
        <div className="p-6">
          {/* Logo/Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-accent, #f5a623)' }}>
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary, #e8e8f0)' }}>Lisa Vivante</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted, #6a6a82)' }}>Manifeste Vivant</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {navItems.map((item, index) => (
              <div key={item.path}>
                {/* Category Header */}
                {item.category && (
                  (!navItems[index - 1] || navItems[index - 1].category !== item.category) && (
                    <h3 className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--text-muted, #6a6a82)' }}>
                      {item.category}
                    </h3>
                  )
                )}

                {/* Nav Link */}
                <Link
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg transition-all"
                  style={isActive(item.path)
                    ? { background: 'var(--color-accent, #f5a623)', color: '#fff' }
                    : { color: 'var(--text-secondary, #9898b0)' }
                  }
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              </div>
            ))}
          </nav>

          {/* Status */}
          <div className="mt-8 p-4 rounded-lg" style={{ background: 'var(--color-accent-subtle, rgba(245,166,35,0.12))' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-accent, #f5a623)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-accent, #f5a623)' }}>
                Lisa est Vivante
              </p>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted, #6a6a82)' }}>
              5 piliers actifs
            </p>
          </div>

          {/* Les 5 Piliers */}
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[
              { emoji: '👁️', title: 'PERÇOIT' },
              { emoji: '🧠', title: 'RAISONNE' },
              { emoji: '💭', title: 'SE SOUVIENT' },
              { emoji: '🛡️', title: 'AGIT' },
              { emoji: '✨', title: 'APAISE' }
            ].map(pillar => (
              <div
                key={pillar.title}
                className="text-center p-2 rounded-lg"
                title={pillar.title}
                style={{ background: 'var(--bg-surface, #12121a)' }}
              >
                <p className="text-lg" aria-hidden="true">{pillar.emoji}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          aria-hidden="true"
        />
      )}
    </>
  );
}
