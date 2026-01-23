/**
 * useGestures - Advanced Mobile Gesture Hook
 * Provides double-tap, long-press, and swipe detection for mobile
 */

import { useRef, useCallback, useState } from 'react';
import { useMobile } from './useMobile';

interface GestureCallbacks {
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface GestureOptions {
  doubleTapDelay?: number;
  longPressDelay?: number;
  swipeThreshold?: number;
  preventContextMenu?: boolean;
}

interface GestureState {
  isLongPressing: boolean;
  lastTap: number;
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export const useGestures = (
  callbacks: GestureCallbacks,
  options: GestureOptions = {}
) => {
  const {
    doubleTapDelay = 300,
    longPressDelay = 500,
    swipeThreshold = 50,
    preventContextMenu = true,
  } = options;

  const { hapticTap, hapticSuccess } = useMobile();
  
  const [state, setState] = useState<GestureState>({
    isLongPressing: false,
    lastTap: 0,
  });

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStart = useRef<TouchPosition | null>(null);
  const lastTapTime = useRef<number>(0);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touch = 'touches' in e ? e.touches[0] : (e as unknown as Touch);
    
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Start long press timer
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      setState(prev => ({ ...prev, isLongPressing: true }));
      hapticSuccess();
      callbacks.onLongPress?.();
    }, longPressDelay);
  }, [callbacks, longPressDelay, hapticSuccess, clearLongPressTimer]);

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!touchStart.current) return;

    const touch = 'touches' in e ? e.touches[0] : (e as unknown as Touch);
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Cancel long press if moved too much
    if (distance > 10) {
      clearLongPressTimer();
      setState(prev => ({ ...prev, isLongPressing: false }));
    }
  }, [clearLongPressTimer]);

  const handleTouchEnd = useCallback((e: React.TouchEvent | TouchEvent) => {
    clearLongPressTimer();

    if (!touchStart.current) return;

    const touch = 'changedTouches' in e 
      ? e.changedTouches[0] 
      : (e as unknown as Touch);

    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Detect swipes (must be fast enough)
    if (deltaTime < 300) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > swipeThreshold && absX > absY) {
        hapticTap();
        if (deltaX > 0) {
          callbacks.onSwipeRight?.();
        } else {
          callbacks.onSwipeLeft?.();
        }
      } else if (absY > swipeThreshold && absY > absX) {
        hapticTap();
        if (deltaY > 0) {
          callbacks.onSwipeDown?.();
        } else {
          callbacks.onSwipeUp?.();
        }
      } else {
        // Check for double tap
        const now = Date.now();
        if (now - lastTapTime.current < doubleTapDelay) {
          hapticSuccess();
          callbacks.onDoubleTap?.();
          lastTapTime.current = 0;
        } else {
          lastTapTime.current = now;
        }
      }
    }

    touchStart.current = null;
    setState(prev => ({ ...prev, isLongPressing: false }));
  }, [callbacks, swipeThreshold, doubleTapDelay, hapticTap, hapticSuccess, clearLongPressTimer]);

  const handleContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (preventContextMenu) {
      e.preventDefault();
    }
  }, [preventContextMenu]);

  // Bind handlers to an element
  const gestureHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onContextMenu: handleContextMenu,
  };

  return {
    gestureHandlers,
    isLongPressing: state.isLongPressing,
    // Individual handlers for manual binding
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleContextMenu,
  };
};

// ============================================================================
// Specialized Gesture Hooks
// ============================================================================

/**
 * Double-tap to copy text
 */
export const useDoubleTapCopy = (getText: () => string) => {
  const { hapticSuccess } = useMobile();
  const [copied, setCopied] = useState(false);

  const handleDoubleTap = useCallback(async () => {
    const text = getText();
    await navigator.clipboard.writeText(text);
    hapticSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getText, hapticSuccess]);

  const { gestureHandlers } = useGestures({
    onDoubleTap: handleDoubleTap,
  });

  return { gestureHandlers, copied };
};

/**
 * Long-press for context menu
 */
export const useLongPressMenu = <T,>(
  items: Array<{ label: string; action: (data: T) => void; icon?: React.ReactNode }>
) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuData, setMenuData] = useState<T | null>(null);

  const openMenu = useCallback((x: number, y: number, data: T) => {
    setMenuPosition({ x, y });
    setMenuData(data);
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuData(null);
  }, []);

  const handleAction = useCallback((action: (data: T) => void) => {
    if (menuData) {
      action(menuData);
    }
    closeMenu();
  }, [menuData, closeMenu]);

  return {
    menuOpen,
    menuPosition,
    menuData,
    items,
    openMenu,
    closeMenu,
    handleAction,
  };
};

/**
 * Swipe to delete/archive
 */
export const useSwipeActions = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void
) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingLeft, setIsSwipingLeft] = useState(false);
  const [isSwipingRight, setIsSwipingRight] = useState(false);

  const { gestureHandlers } = useGestures({
    onSwipeLeft: () => {
      setIsSwipingLeft(true);
      onSwipeLeft?.();
      setTimeout(() => setIsSwipingLeft(false), 300);
    },
    onSwipeRight: () => {
      setIsSwipingRight(true);
      onSwipeRight?.();
      setTimeout(() => setIsSwipingRight(false), 300);
    },
  });

  return {
    gestureHandlers,
    swipeOffset,
    setSwipeOffset,
    isSwipingLeft,
    isSwipingRight,
  };
};

export default useGestures;
