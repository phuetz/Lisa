/**
 * PullToRefresh - Composant pull-to-refresh pour mobile
 * Recharge les conversations quand on tire vers le bas
 */

import { useState, useRef, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export const PullToRefresh = ({ children, onRefresh, threshold = 80 }: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { hapticTap, hapticSuccess } = useMobile();

  const handleTouchStart = (e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    if (diff > 0) {
      // Apply resistance
      const resistance = 0.4;
      setPullDistance(Math.min(diff * resistance, threshold + 40));
    }
  };

  const handleTouchEnd = async () => {
    setIsDragging(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      hapticTap();
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
        hapticSuccess();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        height: '100%',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Pull indicator */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: `translateX(-50%) translateY(${pullDistance - 60}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease',
          opacity: progress,
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 163, 127, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 163, 127, 0.3)',
          }}
        >
          <RefreshCw
            size={20}
            color="#fff"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease',
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}
          />
        </div>
      </div>

      {/* Content with pull effect */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease',
          minHeight: '100%',
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PullToRefresh;
