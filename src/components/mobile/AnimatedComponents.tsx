/**
 * Animated Components for Mobile
 * Composants avec animations fluides pour une meilleure UX mobile
 */

import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from 'react';

// ============================================================================
// Fade In Animation
// ============================================================================

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

export const FadeIn = ({ children, delay = 0, duration = 300, style }: FadeInProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity ${duration}ms ease, transform ${duration}ms ease`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// Slide In Animation
// ============================================================================

type SlideDirection = 'left' | 'right' | 'up' | 'down';

interface SlideInProps {
  children: ReactNode;
  direction?: SlideDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  style?: CSSProperties;
}

export const SlideIn = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 300,
  distance = 20,
  style,
}: SlideInProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getTransform = () => {
    if (visible) return 'translate(0, 0)';
    switch (direction) {
      case 'left': return `translateX(${distance}px)`;
      case 'right': return `translateX(-${distance}px)`;
      case 'up': return `translateY(${distance}px)`;
      case 'down': return `translateY(-${distance}px)`;
    }
  };

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: getTransform(),
        transition: `opacity ${duration}ms ease, transform ${duration}ms ease`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// Scale In Animation
// ============================================================================

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  initialScale?: number;
  style?: CSSProperties;
}

export const ScaleIn = ({
  children,
  delay = 0,
  duration = 200,
  initialScale = 0.9,
  style,
}: ScaleInProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : `scale(${initialScale})`,
        transition: `opacity ${duration}ms ease, transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// Staggered List Animation
// ============================================================================

interface StaggeredListProps {
  children: ReactNode[];
  staggerDelay?: number;
  initialDelay?: number;
  animation?: 'fade' | 'slide' | 'scale';
}

export const StaggeredList = ({
  children,
  staggerDelay = 50,
  initialDelay = 0,
  animation = 'fade',
}: StaggeredListProps) => {
  const AnimationComponent = animation === 'slide' ? SlideIn : animation === 'scale' ? ScaleIn : FadeIn;

  return (
    <>
      {children.map((child, index) => (
        <AnimationComponent key={index} delay={initialDelay + index * staggerDelay}>
          {child}
        </AnimationComponent>
      ))}
    </>
  );
};

// ============================================================================
// Pulse Animation (for loading states)
// ============================================================================

interface PulseProps {
  children: ReactNode;
  active?: boolean;
  style?: CSSProperties;
}

export const Pulse = ({ children, active = true, style }: PulseProps) => {
  return (
    <div
      style={{
        animation: active ? 'pulse 1.5s ease-in-out infinite' : 'none',
        ...style,
      }}
    >
      {children}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Skeleton Loader
// ============================================================================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
}

export const Skeleton = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
}: SkeletonProps) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#2d2d2d',
        backgroundImage: 'linear-gradient(90deg, #2d2d2d 0%, #3d3d3d 50%, #2d2d2d 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Message Animation (for chat bubbles)
// ============================================================================

interface MessageAnimationProps {
  children: ReactNode;
  isUser?: boolean;
  style?: CSSProperties;
}

export const MessageAnimation = ({ children, isUser = false, style }: MessageAnimationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay for smooth appearance
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible 
          ? 'translateX(0) scale(1)' 
          : `translateX(${isUser ? '20px' : '-20px'}) scale(0.95)`,
        transition: 'opacity 200ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// Ripple Effect (for buttons)
// ============================================================================

interface RippleButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
}

export const RippleButton = ({ children, onClick, disabled, style }: RippleButtonProps) => {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);

    onClick?.();
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            transform: 'translate(-50%, -50%)',
            animation: 'ripple 600ms ease-out',
            pointerEvents: 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes ripple {
          0% {
            width: 4px;
            height: 4px;
            opacity: 1;
          }
          100% {
            width: 200px;
            height: 200px;
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
};

// ============================================================================
// Bounce Animation (for notifications, badges)
// ============================================================================

interface BounceProps {
  children: ReactNode;
  active?: boolean;
  style?: CSSProperties;
}

export const Bounce = ({ children, active = true, style }: BounceProps) => {
  return (
    <div
      style={{
        animation: active ? 'bounce 0.5s ease' : 'none',
        ...style,
      }}
    >
      {children}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-8px); }
          50% { transform: translateY(-4px); }
          75% { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default {
  FadeIn,
  SlideIn,
  ScaleIn,
  StaggeredList,
  Pulse,
  Skeleton,
  MessageAnimation,
  RippleButton,
  Bounce,
};
