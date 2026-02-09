import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-accent)',
    color: '#0a0a0f',
    border: '1px solid transparent',
    fontWeight: 600,
  },
  secondary: {
    backgroundColor: 'var(--bg-panel)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
};

const hoverVariantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: { backgroundColor: 'var(--color-accent-hover)' },
  secondary: { borderColor: 'var(--text-tertiary)', backgroundColor: 'var(--bg-panel)' },
  ghost: { backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' },
  danger: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-md)' },
  md: { padding: '8px 16px', fontSize: '14px', borderRadius: 'var(--radius-lg)' },
  lg: { padding: '12px 24px', fontSize: '16px', borderRadius: 'var(--radius-lg)' },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, icon, disabled, children, style, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          transition: 'background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          ...variantStyles[variant],
          ...sizeStyles[size],
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            const hoverStyle = hoverVariantStyles[variant];
            Object.assign(e.currentTarget.style, hoverStyle);
          }
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          if (!isDisabled) {
            const baseStyle = variantStyles[variant];
            Object.assign(e.currentTarget.style, {
              backgroundColor: baseStyle.backgroundColor,
              borderColor: baseStyle.border?.replace('1px solid ', '') || 'transparent',
              color: baseStyle.color,
            });
          }
          onMouseLeave?.(e);
        }}
        {...props}
      >
        {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
