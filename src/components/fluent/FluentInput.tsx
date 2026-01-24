/**
 * FluentInput - Input style Microsoft Fluent Design
 * Underline style avec label flottant
 */

import React, { forwardRef, useState, useId } from 'react';
import { fluentMotion, fluentBorderRadius, fluentColors, fluentTypography, fluentSpacing } from '../../styles/fluentTokens';

export interface FluentInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: boolean;
  errorMessage?: string;
  variant?: 'underline' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const FluentInput = forwardRef<HTMLInputElement, FluentInputProps>(
  (
    {
      label,
      helperText,
      error = false,
      errorMessage,
      variant = 'underline',
      size = 'medium',
      startIcon,
      endIcon,
      fullWidth = false,
      disabled,
      value,
      defaultValue,
      className = '',
      style,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const id = useId();
    const inputId = props.id || `fluent-input-${id}`;
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value !== undefined ? Boolean(value) : Boolean(defaultValue);
    const isFloating = isFocused || hasValue;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const sizeStyles = {
      small: {
        height: '32px',
        fontSize: fluentTypography.sizes.caption,
        padding: '0 8px',
        labelSize: fluentTypography.sizes.caption2,
      },
      medium: {
        height: '40px',
        fontSize: fluentTypography.sizes.body,
        padding: '0 12px',
        labelSize: fluentTypography.sizes.caption,
      },
      large: {
        height: '48px',
        fontSize: fluentTypography.sizes.subtitle,
        padding: '0 16px',
        labelSize: fluentTypography.sizes.body2,
      },
    };

    const currentSize = sizeStyles[size];
    const accentColor = error ? fluentColors.semantic.error : `var(--color-accent, ${fluentColors.primary.light})`;
    const borderColor = error
      ? fluentColors.semantic.error
      : isFocused
        ? accentColor
        : `var(--color-border, ${fluentColors.neutral.divider})`;

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      display: 'inline-flex',
      flexDirection: 'column',
      width: fullWidth ? '100%' : 'auto',
      minWidth: '200px',
      fontFamily: fluentTypography.fontFamily,
      ...style,
    };

    const wrapperStyle: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: currentSize.height,
      background:
        variant === 'filled'
          ? `var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover})`
          : 'transparent',
      borderRadius:
        variant === 'underline' ? `${fluentBorderRadius.medium} ${fluentBorderRadius.medium} 0 0` : fluentBorderRadius.medium,
      border: variant === 'outlined' ? `1px solid ${borderColor}` : 'none',
      borderBottom: variant !== 'outlined' ? `2px solid ${borderColor}` : undefined,
      transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
    };

    const labelStyle: React.CSSProperties = {
      position: 'absolute',
      left: startIcon ? '36px' : '12px',
      top: isFloating ? '4px' : '50%',
      transform: isFloating ? 'none' : 'translateY(-50%)',
      fontSize: isFloating ? currentSize.labelSize : currentSize.fontSize,
      color: isFocused
        ? accentColor
        : error
          ? fluentColors.semantic.error
          : `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
      pointerEvents: 'none',
      transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
      fontWeight: isFloating ? 500 : 400,
    };

    const inputStyle: React.CSSProperties = {
      flex: 1,
      height: '100%',
      padding: currentSize.padding,
      paddingTop: label && isFloating ? '14px' : undefined,
      paddingLeft: startIcon ? '36px' : undefined,
      paddingRight: endIcon ? '36px' : undefined,
      fontSize: currentSize.fontSize,
      fontFamily: 'inherit',
      color: `var(--color-text-primary, ${fluentColors.neutral.text})`,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      width: '100%',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'text',
    };

    const iconStyle: React.CSSProperties = {
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      color: `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
    };

    const helperStyle: React.CSSProperties = {
      marginTop: fluentSpacing.xs,
      fontSize: fluentTypography.sizes.caption,
      color: error
        ? fluentColors.semantic.error
        : `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
    };

    return (
      <div className={`fluent-input-container ${className}`} style={containerStyle}>
        <div style={wrapperStyle}>
          {startIcon && <span style={{ ...iconStyle, left: '8px' }}>{startIcon}</span>}
          {label && (
            <label htmlFor={inputId} style={labelStyle}>
              {label}
            </label>
          )}
          <input
            ref={ref}
            id={inputId}
            className="fluent-input"
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={inputStyle}
            aria-invalid={error}
            aria-describedby={helperText || errorMessage ? `${inputId}-helper` : undefined}
            {...props}
          />
          {endIcon && <span style={{ ...iconStyle, right: '8px' }}>{endIcon}</span>}
        </div>
        {(helperText || errorMessage) && (
          <span id={`${inputId}-helper`} style={helperStyle}>
            {error ? errorMessage : helperText}
          </span>
        )}
      </div>
    );
  }
);

FluentInput.displayName = 'FluentInput';

export default FluentInput;
