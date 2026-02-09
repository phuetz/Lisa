import { Wifi, WifiOff, Menu } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useEffect, useState } from 'react';

interface TopBarProps {
  onMobileMenuToggle?: () => void;
  showMobileMenu?: boolean;
}

export function TopBar({ onMobileMenuToggle, showMobileMenu }: TopBarProps) {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header
      role="banner"
      style={{
        height: '48px',
        minHeight: '48px',
        padding: '0 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {/* Mobile menu button */}
      {showMobileMenu && (
        <button
          onClick={onMobileMenuToggle}
          className="chat-icon-btn"
          aria-label="Menu"
          style={{ padding: '8px' }}
        >
          <Menu size={20} />
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* Status indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {online ? (
          <>
            <Badge color="green">
              <Wifi size={12} />
              En ligne
            </Badge>
          </>
        ) : (
          <Badge color="red">
            <WifiOff size={12} />
            Hors ligne
          </Badge>
        )}
      </div>
    </header>
  );
}
