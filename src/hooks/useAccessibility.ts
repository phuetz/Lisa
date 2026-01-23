/**
 * ♿ Accessibility Hook - Gestion de l'accessibilité
 * Focus management, keyboard navigation, screen reader support
 */

import { useRef, useEffect, useCallback } from 'react';

interface UseAccessibilityOptions {
  trapFocus?: boolean;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  onEscape?: () => void;
}

export function useAccessibility(options: UseAccessibilityOptions = {}) {
  const { trapFocus = false, autoFocus = false, restoreFocus = true, onEscape } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store previous focus on mount
  useEffect(() => {
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [restoreFocus]);

  // Auto focus first focusable element
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      const focusable = getFocusableElements(containerRef.current);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }, [autoFocus]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && onEscape) {
      onEscape();
      return;
    }

    if (trapFocus && event.key === 'Tab' && containerRef.current) {
      const focusable = getFocusableElements(containerRef.current);
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [trapFocus, onEscape]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  return { containerRef };
}

// Get all focusable elements within a container
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

// Hook for skip links
export function useSkipLink(targetId: string) {
  const handleClick = useCallback(() => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, [targetId]);

  return { handleClick };
}

// Hook for live region announcements
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = document.getElementById('lisa-live-region');
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }, []);

  return { announce };
}

// Hook for reduced motion preference
export function useReducedMotion(): boolean {
  const mediaQuery = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)') 
    : null;
  
  return mediaQuery?.matches ?? false;
}

// Hook for high contrast preference
export function useHighContrast(): boolean {
  const mediaQuery = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-contrast: high)')
    : null;
  
  return mediaQuery?.matches ?? false;
}

// Accessibility utilities
export const a11y = {
  // Generate unique IDs for form elements
  generateId: (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Create aria-describedby string from multiple IDs
  describeBy: (...ids: (string | undefined)[]) => ids.filter(Boolean).join(' ') || undefined,
  
  // Check if element is visible
  isVisible: (element: HTMLElement): boolean => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  },
};
