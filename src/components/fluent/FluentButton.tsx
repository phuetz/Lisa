/**
 * FluentButton - Bouton style Microsoft Fluent Design
 * Inspiré d'Office 365
 */

import React, { forwardRef, useCallback, useRef, useState } from 'react';
import { fluentMotion, fluentBorderRadius, fluentColors, fluentTypography } from '../../styles/fluentTokens';

export interface FluentButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  fullWidth?: boolean;
}

const FluentButton = forwardRef<HTMLButtonElement, FluentButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      icon,
      iconPosition = 'start',
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = '',
      onMouseMove,
      style,
      ...props
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [mousePos, setMousePos] = useState({ x: '50%', y: '50%' });

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePos({ x: `${x}%`, y: `${y}%` });
        onMouseMove?.(e);
      },
      [onMouseMove]
    );

    const sizeStyles = {
      small: {
        padding: '4px 12px',
        fontSize: fluentTypography.sizes.caption,
        minHeight: '28px',
        gap: '4px',
      },
      medium: {
        padding: '8px 16px',
        fontSize: fluentTypography.sizes.body,
        minHeight: '36px',
        gap: '8px',
      },
      large: {
        padding: '12px 24px',
        fontSize: fluentTypography.sizes.subtitle,
        minHeight: '44px',
        gap: '10px',
      },
    };

    const variantStyles = {
      primary: {
        background: `var(--color-accent, ${fluentColors.primary.light})`,
        color: '#ffffff',
        border: 'none',
        hoverBg: `var(--color-accent-hover, ${fluentColors.primary.hover})`,
        activeBg: fluentColors.primary.pressed,
      },
      secondary: {
        background: `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
        color: `var(--color-text-primary, ${fluentColors.neutral.text})`,
        border: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
        hoverBg: `var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover})`,
        activeBg: fluentColors.neutral.divider,
      },
      subtle: {
        background: 'transparent',
        color: `var(--color-text-primary, ${fluentColors.neutral.text})`,
        border: 'none',
        hoverBg: `var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover})`,
        activeBg: fluentColors.neutral.divider,
      },
      outline: {
        background: 'transparent',
        color: `var(--color-accent, ${fluentColors.primary.light})`,
        border: `1px solid var(--color-accent, ${fluentColors.primary.light})`,
        hoverBg: `var(--color-accent-muted, ${fluentColors.primary.subtle})`,
        activeBg: fluentColors.primary.subtle,
      },
      danger: {
        background: fluentColors.semantic.error,
        color: '#ffffff',
        border: 'none',
        hoverBg: fluentColors.semantic.errorDark,
        activeBg: '#a4262c',
      },
    };

    const currentSize = sizeStyles[size];
    const currentVariant = variantStyles[variant];
    const isDisabled = disabled || loading;

    const buttonStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: currentSize.gap,
      padding: currentSize.padding,
      fontSize: currentSize.fontSize,
      fontFamily: fluentTypography.fontFamily,
      fontWeight: fluentTypography.weights.semibold,
      minHeight: currentSize.minHeight,
      width: fullWidth ? '100%' : 'auto',
      borderRadius: fluentBorderRadius.medium,
      background: currentVariant.background,
      color: currentVariant.color,
      border: currentVariant.border,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.5 : 1,
      transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
      position: 'relative',
      overflow: 'hidden',
      outline: 'none',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      '--mouse-x': mousePos.x,
      '--mouse-y': mousePos.y,
      ...style,
    } as React.CSSProperties;

    return (
      <button
        ref={ref || buttonRef}
        className={`fluent-button fluent-reveal fluent-focus-visible ${className}`}
        disabled={isDisabled}
        onMouseMove={handleMouseMove}
        style={buttonStyle}
        {...props}
      >
        {loading && (
          <span
            className="fluent-spinner"
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              position: iconPosition === 'start' ? 'relative' : 'absolute',
            }}
          />
        )}
        {!loading && icon && iconPosition === 'start' && (
          <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && icon && iconPosition === 'end' && (
          <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
        )}
        <style>{`
          .fluent-button:hover:not(:disabled) {
            background: ${currentVariant.hoverBg} !important;
            box-shadow: var(--fluent-shadow-hover, 0 4px 8px rgba(0,0,0,0.08));
          }
          .fluent-button:active:not(:disabled) {
            background: ${currentVariant.activeBg} !important;
            transform: scale(0.98);
          }
          .fluent-button:focus-visible {
            outline: 2px solid var(--color-accent, ${fluentColors.primary.light});
            outline-offset: 2px;
          }
        `}</style>
      </button>
    );
  }
);

FluentButton.displayName = 'FluentButton';

export default FluentButton;
