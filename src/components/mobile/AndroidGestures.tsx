/**
 * AndroidGestures - Gestes natifs Android
 * Back swipe, pull gestures, and haptic feedback
 */

import { useEffect, useCallback } from 'react';
import { useMobile } from '../../hooks/useMobile';

interface UseAndroidGesturesOptions {
  onBack?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
}

export const useAndroidGestures = ({
  onBack,
  onSwipeLeft,
  onSwipeRight,
  enabled = true
}: UseAndroidGesturesOptions = {}) => {
  const { hapticTap } = useMobile();

  // Handle Android hardware back button
  useEffect(() => {
    if (!enabled || !onBack) return;

    const handleBackButton = (e: PopStateEvent) => {
      e.preventDefault();
      hapticTap();
      onBack();
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [enabled, onBack, hapticTap]);

  // Touch gesture detection
  const createSwipeHandler = useCallback((element: HTMLElement | null) => {
    if (!element || !enabled) return;

    let startX = 0;
    let startY = 0;
    const threshold = 50;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = endY - startY;

      // Horizontal swipe (ignore if mostly vertical)
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
        if (diffX > 0 && onSwipeRight) {
          hapticTap();
          onSwipeRight();
        } else if (diffX < 0 && onSwipeLeft) {
          hapticTap();
          onSwipeLeft();
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onSwipeLeft, onSwipeRight, hapticTap]);

  return { createSwipeHandler };
};

// Edge swipe detector for Android-style navigation
export const useEdgeSwipe = (onEdgeSwipe: () => void, edge: 'left' | 'right' = 'left') => {
  const { hapticTap } = useMobile();

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const edgeThreshold = 30; // pixels from edge
    const swipeThreshold = 100;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = Math.abs(endY - startY);

      // Check if started from edge
      const startedFromEdge = edge === 'left' 
        ? startX < edgeThreshold 
        : startX > window.innerWidth - edgeThreshold;

      // Horizontal swipe from edge
      if (startedFromEdge && diffY < 50) {
        if (edge === 'left' && diffX > swipeThreshold) {
          hapticTap();
          onEdgeSwipe();
        } else if (edge === 'right' && diffX < -swipeThreshold) {
          hapticTap();
          onEdgeSwipe();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onEdgeSwipe, edge, hapticTap]);
};

export default { useAndroidGestures, useEdgeSwipe };
