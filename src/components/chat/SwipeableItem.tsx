/**
 * SwipeableItem - Composant mobile pour swipe-to-delete
 * Utilisé pour les conversations dans la sidebar mobile
 */

import { useState, useRef, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete: () => void;
  deleteThreshold?: number;
}

export const SwipeableItem = ({ 
  children, 
  onDelete, 
  deleteThreshold = 80 
}: SwipeableItemProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diff = startXRef.current - currentX;
    
    // Only allow swipe left (positive diff)
    if (diff > 0) {
      setTranslateX(Math.min(diff, deleteThreshold + 20));
    } else {
      setTranslateX(0);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (translateX >= deleteThreshold) {
      // Trigger delete
      setTranslateX(deleteThreshold);
      setTimeout(() => {
        onDelete();
        setTranslateX(0);
      }, 150);
    } else {
      // Snap back
      setTranslateX(0);
    }
  };

  const deleteOpacity = Math.min(translateX / deleteThreshold, 1);
  const showDelete = translateX > 20;

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        overflow: 'hidden',
        borderRadius: '8px',
        marginBottom: '2px'
      }}
    >
      {/* Delete background */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: `${deleteThreshold}px`,
          backgroundColor: `rgba(239, 68, 68, ${deleteOpacity})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: showDelete ? 1 : 0,
          transition: isDragging ? 'none' : 'opacity 0.2s ease'
        }}
      >
        <Trash2 
          size={20} 
          style={{ 
            color: '#fff',
            transform: `scale(${0.8 + deleteOpacity * 0.4})`,
            transition: isDragging ? 'none' : 'transform 0.2s ease'
          }} 
        />
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          backgroundColor: '#171717',
          position: 'relative',
          zIndex: 1
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableItem;
