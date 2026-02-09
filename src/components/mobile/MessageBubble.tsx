/**
 * MessageBubble - Bulle de message avec double-tap pour copier
 * Animations fluides et feedback haptique
 */

import { useState, useRef, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

interface MessageBubbleProps {
  children: ReactNode;
  content: string;
  isUser?: boolean;
  onCopy?: () => void;
}

export const MessageBubble = ({ children, content, isUser = false, onCopy }: MessageBubbleProps) => {
  const [copied, setCopied] = useState(false);
  const [showCopyHint, setShowCopyHint] = useState(false);
  const lastTapRef = useRef(0);
  const { hapticSuccess, hapticSelection } = useMobile();

  const handleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      copyToClipboard();
    } else {
      // Single tap - show hint briefly
      setShowCopyHint(true);
      setTimeout(() => setShowCopyHint(false), 1500);
    }
    
    lastTapRef.current = now;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      hapticSuccess();
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleLongPress = () => {
    hapticSelection();
    copyToClipboard();
  };

  return (
    <div
      onClick={handleTap}
      onContextMenu={(e) => {
        e.preventDefault();
        handleLongPress();
      }}
      style={{
        position: 'relative',
        cursor: 'pointer',
        WebkitUserSelect: 'text',
        userSelect: 'text',
      }}
    >
      {children}
      
      {/* Copy indicator */}
      {(copied || showCopyHint) && (
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: isUser ? 'auto' : '-8px',
            left: isUser ? '-8px' : 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            backgroundColor: copied ? 'rgba(245, 166, 35, 0.95)' : 'var(--bg-panel, rgba(26,26,38,0.95))',
            borderRadius: 'var(--radius-sm, 4px)',
            color: 'var(--text-primary, #e8e8f0)',
            fontSize: '11px',
            fontWeight: 500,
            transform: 'translateY(-100%)',
            animation: 'fadeIn 0.2s ease',
            zIndex: 10,
          }}
        >
          {copied ? (
            <>
              <Check size={12} />
              Copié !
            </>
          ) : (
            <>
              <Copy size={12} />
              Double-tap pour copier
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-80%); }
          to { opacity: 1; transform: translateY(-100%); }
        }
      `}</style>
    </div>
  );
};

export default MessageBubble;
