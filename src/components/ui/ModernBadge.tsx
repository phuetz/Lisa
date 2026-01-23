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
      ? 'border-slate-500 text-slate-300'
      : 'bg-slate-500/20 text-slate-300',
    primary: outline
      ? 'border-blue-500 text-blue-400'
      : 'bg-blue-500/20 text-blue-400',
    success: outline
      ? 'border-green-500 text-green-400'
      : 'bg-green-500/20 text-green-400',
    warning: outline
      ? 'border-yellow-500 text-yellow-400'
      : 'bg-yellow-500/20 text-yellow-400',
    danger: outline
      ? 'border-red-500 text-red-400'
      : 'bg-red-500/20 text-red-400',
    info: outline
      ? 'border-cyan-500 text-cyan-400'
      : 'bg-cyan-500/20 text-cyan-400',
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
            ${status === 'active' ? 'bg-green-400 animate-pulse' : ''}
            ${status === 'error' ? 'bg-red-400 animate-pulse' : ''}
            ${status === 'pending' ? 'bg-yellow-400 animate-pulse' : ''}
            ${status === 'inactive' ? 'bg-slate-400' : ''}
            ${status === 'success' ? 'bg-green-400' : ''}
          `}
        />
      )}
      {config.label}
    </ModernBadge>
  );
}
