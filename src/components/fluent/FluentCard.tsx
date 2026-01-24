/**
 * FluentCard - Carte style Microsoft Fluent Design
 * Surface élevée avec ombres douces
 */

import React, { forwardRef, useCallback, useState } from 'react';
import { fluentMotion, fluentBorderRadius, fluentColors, fluentElevation, fluentSpacing } from '../../styles/fluentTokens';

export interface FluentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outlined' | 'filled';
  interactive?: boolean;
  selected?: boolean;
  padding?: 'none' | 'small' | 'medium' | 'large';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const FluentCard = forwardRef<HTMLDivElement, FluentCardProps>(
  (
    {
      variant = 'elevated',
      interactive = false,
      selected = false,
      padding = 'medium',
      header,
      footer,
      children,
      className = '',
      onMouseMove,
      style,
      ...props
    },
    ref
  ) => {
    const [mousePos, setMousePos] = useState({ x: '50%', y: '50%' });

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!interactive) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePos({ x: `${x}%`, y: `${y}%` });
        onMouseMove?.(e);
      },
      [interactive, onMouseMove]
    );

    const paddingStyles = {
      none: '0',
      small: fluentSpacing.s,
      medium: fluentSpacing.l,
      large: fluentSpacing.xxl,
    };

    const variantStyles = {
      elevated: {
        background: `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
        border: 'none',
        boxShadow: `var(--fluent-shadow-rest, ${fluentElevation.rest})`,
      },
      outlined: {
        background: `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
        border: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
        boxShadow: 'none',
      },
      filled: {
        background: `var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover})`,
        border: 'none',
        boxShadow: 'none',
      },
    };

    const currentVariant = variantStyles[variant];

    const cardStyle: React.CSSProperties = {
      background: currentVariant.background,
      border: currentVariant.border,
      boxShadow: selected
        ? `0 0 0 2px var(--color-accent, ${fluentColors.primary.light})`
        : currentVariant.boxShadow,
      borderRadius: fluentBorderRadius.large,
      overflow: 'hidden',
      transition: `all ${fluentMotion.duration.normal} ${fluentMotion.easing.standard}`,
      cursor: interactive ? 'pointer' : 'default',
      position: 'relative',
      '--mouse-x': mousePos.x,
      '--mouse-y': mousePos.y,
      ...style,
    } as React.CSSProperties;

    const bodyStyle: React.CSSProperties = {
      padding: paddingStyles[padding],
    };

    const headerStyle: React.CSSProperties = {
      padding: `${fluentSpacing.m} ${paddingStyles[padding]}`,
      borderBottom: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
      fontWeight: 600,
    };

    const footerStyle: React.CSSProperties = {
      padding: `${fluentSpacing.m} ${paddingStyles[padding]}`,
      borderTop: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
      background: `var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover})`,
    };

    return (
      <div
        ref={ref}
        className={`fluent-card ${interactive ? 'fluent-reveal fluent-card-interactive' : ''} ${className}`}
        onMouseMove={handleMouseMove}
        style={cardStyle}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {header && <div style={headerStyle}>{header}</div>}
        <div style={bodyStyle}>{children}</div>
        {footer && <div style={footerStyle}>{footer}</div>}
        <style>{`
          .fluent-card-interactive:hover {
            box-shadow: var(--fluent-shadow-hover, ${fluentElevation.hover}) !important;
            transform: translateY(-1px);
          }
          .fluent-card-interactive:active {
            transform: translateY(0);
            box-shadow: var(--fluent-shadow-rest, ${fluentElevation.rest}) !important;
          }
          .fluent-card-interactive:focus-visible {
            outline: 2px solid var(--color-accent, ${fluentColors.primary.light});
            outline-offset: 2px;
          }
        `}</style>
      </div>
    );
  }
);

FluentCard.displayName = 'FluentCard';

export default FluentCard;
