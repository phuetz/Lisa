/**
 * 📱 MobileNavigation Component
 * 
 * Navigation mobile responsive avec bottom tabs et drawer menu.
 * Optimisé pour les gestes tactiles et le retour haptique.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  Eye, 
  Mic, 
  Settings, 
  Menu, 
  X,
  Workflow,
  Bot,
  FileText,
  Cpu,
  ChevronRight
} from 'lucide-react';
import { useHaptics, usePlatform } from '../../hooks/usePlatform';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

interface DrawerItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  description?: string;
}

const mainNavItems: NavItem[] = [
  { id: 'home', label: 'Accueil', icon: <Home className="w-5 h-5" />, path: '/' },
  { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" />, path: '/chat' },
  { id: 'vision', label: 'Vision', icon: <Eye className="w-5 h-5" />, path: '/vision' },
  { id: 'audio', label: 'Audio', icon: <Mic className="w-5 h-5" />, path: '/audio' },
  { id: 'more', label: 'Plus', icon: <Menu className="w-5 h-5" />, path: '#menu' },
];

const drawerItems: DrawerItem[] = [
  { id: 'workflows', label: 'Workflows', icon: <Workflow className="w-5 h-5" />, path: '/workflows', description: 'Automatisations' },
  { id: 'agents', label: 'Agents', icon: <Bot className="w-5 h-5" />, path: '/agents', description: '47+ agents IA' },
  { id: 'documents', label: 'Documents', icon: <FileText className="w-5 h-5" />, path: '/documents', description: 'Gestion fichiers' },
  { id: 'system', label: 'Système', icon: <Cpu className="w-5 h-5" />, path: '/system', description: 'Intégrations' },
  { id: 'settings', label: 'Paramètres', icon: <Settings className="w-5 h-5" />, path: '/settings', description: 'Configuration' },
];

export function MobileNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { vibrate } = useHaptics();
  const { hasNotch, isMobile } = usePlatform();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNavClick = useCallback((item: NavItem) => {
    vibrate('light');
    
    if (item.path === '#menu') {
      setIsDrawerOpen(true);
    } else {
      navigate(item.path);
    }
  }, [navigate, vibrate]);

  const handleDrawerItemClick = useCallback((item: DrawerItem) => {
    vibrate('light');
    setIsDrawerOpen(false);
    navigate(item.path);
  }, [navigate, vibrate]);

  const closeDrawer = useCallback(() => {
    vibrate('light');
    setIsDrawerOpen(false);
  }, [vibrate]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Don't render on desktop
  if (!isMobile) return null;

  return (
    <>
      {/* Bottom Navigation Bar - Modern Glass Design */}
      <nav 
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-gradient-to-t from-slate-950 via-slate-900/98 to-slate-900/95
          backdrop-blur-xl border-t border-slate-700/50
          shadow-[0_-4px_30px_rgba(0,0,0,0.3)]
          safe-bottom
          ${hasNotch ? 'pb-6' : 'pb-2'}
        `}
      >
        <div className="flex items-center justify-around pt-2 px-2">
          {mainNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`
                relative flex flex-col items-center gap-1 px-4 py-2 rounded-2xl
                transition-all duration-300 min-w-[64px]
                ${isActive(item.path) && item.path !== '#menu'
                  ? 'text-emerald-400 bg-emerald-500/10 scale-105'
                  : 'text-slate-400 active:text-slate-200 active:scale-95'
                }
              `}
            >
              {/* Active indicator dot */}
              {isActive(item.path) && item.path !== '#menu' && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
              )}
              <div className={`
                relative p-1.5 rounded-xl transition-all duration-300
                ${isActive(item.path) && item.path !== '#menu' ? 'bg-emerald-500/20' : ''}
              `}>
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`
                text-[10px] font-medium transition-all duration-300
                ${isActive(item.path) && item.path !== '#menu' ? 'text-emerald-400' : ''}
              `}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer Menu - Modern Glass Design */}
      <div 
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-gradient-to-t from-slate-950 via-slate-900 to-slate-800/95
          backdrop-blur-xl rounded-t-[2rem] border-t border-slate-600/50
          shadow-[0_-8px_40px_rgba(0,0,0,0.4)]
          transform transition-all duration-400 ease-out
          ${isDrawerOpen ? 'translate-y-0' : 'translate-y-full'}
          ${hasNotch ? 'pb-8' : 'pb-4'}
        `}
      >
        {/* Drawer Handle */}
        <div className="flex justify-center py-4">
          <div className="w-14 h-1.5 bg-slate-500/60 rounded-full" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Menu</h2>
            <p className="text-xs text-slate-500">Accès rapide aux fonctionnalités</p>
          </div>
          <button 
            onClick={closeDrawer}
            className="p-2.5 rounded-xl bg-slate-700/50 text-slate-400 active:bg-slate-600 transition-all duration-200 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Items */}
        <div className="px-4 space-y-3 max-h-[60vh] overflow-y-auto scroll-touch">
          {drawerItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleDrawerItemClick(item)}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`
                w-full flex items-center gap-4 p-4 rounded-2xl
                transition-all duration-300 active:scale-[0.98]
                ${isActive(item.path)
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800/40 text-slate-300 active:bg-slate-700/60 border border-transparent hover:border-slate-700/50'
                }
              `}
            >
              <div className={`
                p-3 rounded-xl transition-all duration-300
                ${isActive(item.path) 
                  ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/20 shadow-lg shadow-emerald-500/10' 
                  : 'bg-slate-700/50'
                }
              `}>
                {item.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                )}
              </div>
              <ChevronRight className={`
                w-5 h-5 transition-all duration-300
                ${isActive(item.path) ? 'text-emerald-400' : 'text-slate-600'}
              `} />
            </button>
          ))}
        </div>

        {/* App Version */}
        <div className="px-6 pt-6 pb-2 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">Lisa AI v1.0.0</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default MobileNavigation;
