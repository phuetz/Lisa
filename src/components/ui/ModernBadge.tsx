import type { ReactNode } from 'react';

interface ModernBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  outline?: boolean;
  pulse?: boolean;
}

export function ModernBadge({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  outline = false,
  pulse = false,
}: ModernBadgeProps) {
  const variants = {
    default: outline
      ? 'border-[var(--border-secondary,#555)] text-[var(--text-secondary,#b4b4b4)]'
      : 'bg-[var(--bg-secondary,#2d2d2d)] text-[var(--text-secondary,#b4b4b4)]',
    primary: outline
      ? 'border-[var(--color-brand,#10a37f)] text-[var(--color-brand,#10a37f)]'
      : 'bg-[var(--color-brand,#10a37f)]/20 text-[var(--color-brand,#10a37f)]',
    success: outline
      ? 'border-green-600 text-green-400'
      : 'bg-green-500/20 text-green-400',
    warning: outline
      ? 'border-[var(--color-warning,#f59e0b)] text-[var(--color-warning,#f59e0b)]'
      : 'bg-[var(--color-warning,#f59e0b)]/20 text-[var(--color-warning,#f59e0b)]',
    danger: outline
      ? 'border-[var(--color-error,#ef4444)] text-[var(--color-error,#ef4444)]'
      : 'bg-[var(--color-error,#ef4444)]/20 text-[var(--color-error,#ef4444)]',
    info: outline
      ? 'border-[var(--color-info,#3b82f6)] text-[var(--color-info,#3b82f6)]'
      : 'bg-[var(--color-info,#3b82f6)]/20 text-[var(--color-info,#3b82f6)]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium
        ${variants[variant]}
        ${sizes[size]}
        ${rounded ? 'rounded-full' : 'rounded'}
        ${outline ? 'border' : ''}
        ${pulse ? 'animate-pulse' : ''}
        transition-all duration-200
      `}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'success';
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const statusConfig = {
    active: { color: 'green', label: 'Actif' },
    inactive: { color: 'slate', label: 'Inactif' },
    pending: { color: 'yellow', label: 'En attente' },
    error: { color: 'red', label: 'Erreur' },
    success: { color: 'green', label: 'Succès' },
  };

  const config = statusConfig[status];

  const variantMap: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    green: 'success',
    slate: 'default',
    yellow: 'warning',
    red: 'danger',
  };

  return (
    <ModernBadge variant={variantMap[config.color] || 'default'} size="sm" rounded>
      {showDot && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full mr-1.5
            ${status === 'active' ? 'bg-[var(--color-brand,#10a37f)] animate-pulse' : ''}
            ${status === 'error' ? 'bg-[var(--color-error,#ef4444)] animate-pulse' : ''}
            ${status === 'pending' ? 'bg-[var(--color-warning,#f59e0b)] animate-pulse' : ''}
            ${status === 'inactive' ? 'bg-[var(--text-muted,#666)]' : ''}
            ${status === 'success' ? 'bg-[var(--color-brand,#10a37f)]' : ''}
          `}
        />
      )}
      {config.label}
    </ModernBadge>
  );
}
