/**
 * ScrollToBottom - Bouton flottant pour scroller vers le bas
 * Apparaît quand l'utilisateur n'est pas en bas de la conversation
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

interface ScrollToBottomProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  threshold?: number;
}

export const ScrollToBottom = ({ containerRef, threshold = 100 }: ScrollToBottomProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { hapticTap } = useMobile();

  const checkScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    setIsVisible(distanceFromBottom > threshold);
  }, [containerRef, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScroll);
    checkScroll();

    return () => container.removeEventListener('scroll', checkScroll);
  }, [containerRef, checkScroll]);

  const scrollToBottom = () => {
    hapticTap();
    setUnreadCount(0);
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  // Increment unread when new messages arrive and not at bottom
  useEffect(() => {
    if (isVisible) {
      setUnreadCount(prev => prev + 1);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToBottom}
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: 'rgba(16, 163, 127, 0.95)',
        border: 'none',
        boxShadow: '0 4px 20px rgba(16, 163, 127, 0.4)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isVisible ? 'scale(1)' : 'scale(0)',
        zIndex: 50,
      }}
    >
      <ChevronDown size={24} color="#fff" />
      
      {/* Unread badge */}
      {unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '20px',
            height: '20px',
            borderRadius: '10px',
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 6px',
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default ScrollToBottom;
