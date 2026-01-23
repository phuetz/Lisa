/**
 * 📱 MobileLayout Component
 * 
 * Layout responsive avec support safe-area pour iOS/Android.
 * Intègre la navigation mobile et les gestes tactiles.
 */

import React, { useEffect } from 'react';
import { usePlatform, useStatusBar, useHaptics } from '../../hooks/usePlatform';

interface MobileLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
  headerClassName?: string;
  footerClassName?: string;
  contentClassName?: string;
  onPullToRefresh?: () => Promise<void>;
}

export function MobileLayout({
  children,
  header,
  footer,
  showHeader = true,
  showFooter = false,
  className = '',
  headerClassName = '',
  footerClassName = '',
  contentClassName = '',
  onPullToRefresh,
}: MobileLayoutProps) {
  const { isNative, hasNotch, isAndroid, isOnline } = usePlatform();
  const { setStyle, setBackgroundColor } = useStatusBar();
  const { vibrate } = useHaptics();

  // Configure status bar on mount
  useEffect(() => {
    if (isNative) {
      setStyle('dark');
      if (isAndroid) {
        setBackgroundColor('#1a1a2e');
      }
    }
  }, [isNative, isAndroid, setStyle, setBackgroundColor]);

  // Pull to refresh handler
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const touchStartY = React.useRef(0);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onPullToRefresh || !contentRef.current) return;
    if (contentRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!onPullToRefresh || !contentRef.current || isRefreshing) return;
    if (contentRef.current.scrollTop === 0) {
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY > 0) {
        setPullDistance(Math.min(deltaY * 0.5, 100));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!onPullToRefresh || isRefreshing) return;
    
    if (pullDistance > 60) {
      setIsRefreshing(true);
      vibrate('medium');
      try {
        await onPullToRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  return (
    <div
      className={`
        min-h-screen flex flex-col bg-slate-900 text-white
        ${hasNotch ? 'safe-all' : ''}
        ${className}
      `}
    >
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-amber-500 text-black text-center py-1 text-sm font-medium safe-top">
          Hors ligne
        </div>
      )}

      {/* Header */}
      {showHeader && header && (
        <header
          className={`
            sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800
            ${hasNotch && !isOnline ? '' : 'safe-top'}
            ${headerClassName}
          `}
        >
          {header}
        </header>
      )}

      {/* Pull to refresh indicator */}
      {onPullToRefresh && pullDistance > 0 && (
        <div
          className="flex items-center justify-center bg-slate-800 transition-all duration-150"
          style={{ height: pullDistance }}
        >
          <div
            className={`
              w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full
              ${isRefreshing ? 'animate-spin' : ''}
            `}
            style={{
              transform: `rotate(${pullDistance * 3.6}deg)`,
              opacity: pullDistance / 60,
            }}
          />
        </div>
      )}

      {/* Main content */}
      <main
        ref={contentRef}
        className={`
          flex-1 overflow-y-auto scroll-touch scrollbar-hide
          ${contentClassName}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </main>

      {/* Footer / Bottom navigation */}
      {showFooter && footer && (
        <footer
          className={`
            sticky bottom-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800
            safe-bottom
            ${footerClassName}
          `}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}

/**
 * Mobile Header Component
 */
interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  className?: string;
}

export function MobileHeader({
  title,
  subtitle,
  leftAction,
  rightAction,
  className = '',
}: MobileHeaderProps) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${className}`}>
      <div className="flex items-center gap-3">
        {leftAction && <div className="flex-shrink-0">{leftAction}</div>}
        <div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
    </div>
  );
}

/**
 * Mobile Bottom Navigation
 */
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface MobileBottomNavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function MobileBottomNav({
  items,
  activeId,
  onSelect,
  className = '',
}: MobileBottomNavProps) {
  const { vibrate } = useHaptics();

  const handleSelect = (id: string) => {
    vibrate('light');
    onSelect(id);
  };

  return (
    <nav className={`flex items-center justify-around py-2 ${className}`}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => handleSelect(item.id)}
          className={`
            flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all
            ${activeId === item.id
              ? 'text-emerald-400'
              : 'text-slate-400 hover:text-slate-300'
            }
          `}
        >
          <div className="relative">
            {item.icon}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

/**
 * Mobile Card Component
 */
interface MobileCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  pressable?: boolean;
}

export function MobileCard({
  children,
  onClick,
  className = '',
  pressable = false,
}: MobileCardProps) {
  const { vibrate } = useHaptics();

  const handleClick = () => {
    if (onClick) {
      if (pressable) vibrate('light');
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50
        ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * Mobile Action Button (FAB)
 */
interface MobileFABProps {
  icon: React.ReactNode;
  onClick: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  className?: string;
}

export function MobileFAB({
  icon,
  onClick,
  label,
  position = 'bottom-right',
  className = '',
}: MobileFABProps) {
  const { vibrate } = useHaptics();
  const { hasNotch } = usePlatform();

  const handleClick = () => {
    vibrate('medium');
    onClick();
  };

  const positionClasses = {
    'bottom-right': 'right-4',
    'bottom-center': 'left-1/2 -translate-x-1/2',
    'bottom-left': 'left-4',
  };

  return (
    <button
      onClick={handleClick}
      className={`
        fixed z-50 flex items-center gap-2 px-4 py-3 rounded-full
        bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-medium
        shadow-lg shadow-emerald-500/25 active:scale-95 transition-transform
        ${positionClasses[position]}
        ${hasNotch ? 'bottom-24' : 'bottom-20'}
        ${className}
      `}
      aria-label={label}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

export default MobileLayout;
