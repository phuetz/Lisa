/**
 * BeautifulSidebar.tsx
 * 
 * Barre latérale de navigation moderne avec effets visuels époustouflants
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, MessageSquare, Eye, Ear,
  Workflow, Settings, Wrench, Monitor, ChevronLeft,
  ChevronRight, Sparkles, Bot, Bell
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
  isNew?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard-beautiful' },
  { label: 'Chat', icon: MessageSquare, href: '/chat', badge: 3 },
  { label: 'Agents', icon: Bot, href: '/agents-beautiful', isNew: true },
  { label: 'Vision', icon: Eye, href: '/vision-beautiful' },
  { label: 'Audio', icon: Ear, href: '/audio-beautiful' },
  { label: 'Workflows', icon: Workflow, href: '/workflows-beautiful' },
  { label: 'Système', icon: Monitor, href: '/system-beautiful' },
  { label: 'Outils', icon: Wrench, href: '/tools' },
  { label: 'Paramètres', icon: Settings, href: '/settings-beautiful' },
];

export const BeautifulSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const location = useLocation();

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen z-50
        bg-slate-950/80 backdrop-blur-2xl
        border-r border-slate-800/50
        transition-all duration-300 ease-out
        ${isCollapsed ? 'w-20' : 'w-72'}
      `}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-800/50">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-xl font-bold text-white">Lisa</h1>
              <p className="text-xs text-slate-500">Assistant Intelligent</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            const isHovered = hoveredItem === item.label;

            return (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200 group
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }
                  `}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full" />
                  )}

                  {/* Icon */}
                  <div className={`
                    p-2 rounded-lg transition-all duration-200
                    ${isActive ? 'bg-blue-500/20 text-blue-400' : 'group-hover:bg-slate-700/50'}
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Label */}
                  {!isCollapsed && (
                    <span className="flex-1 font-medium">{item.label}</span>
                  )}

                  {/* Badge */}
                  {item.badge && !isCollapsed && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-blue-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}

                  {/* New Badge */}
                  {item.isNew && !isCollapsed && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full">
                      NEW
                    </span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && isHovered && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 rounded-lg shadow-xl z-50 whitespace-nowrap">
                      <span className="text-white font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-blue-500 text-white rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-slate-800/50">
        {/* User Profile */}
        <div className={`
          flex items-center gap-3 p-3 rounded-xl
          bg-slate-800/30 hover:bg-slate-800/50 transition-colors cursor-pointer
          ${isCollapsed ? 'justify-center' : ''}
        `}>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold">U</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Utilisateur</p>
              <p className="text-xs text-slate-500 truncate">En ligne</p>
            </div>
          )}
          {!isCollapsed && (
            <button className="p-2 text-slate-400 hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`
            mt-4 w-full flex items-center justify-center gap-2 p-3 rounded-xl
            text-slate-400 hover:text-white hover:bg-slate-800/50
            transition-all duration-200
          `}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default BeautifulSidebar;
