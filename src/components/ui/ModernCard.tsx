/**
 * Modern Card Components
 * 
 * Composants de cartes modernes avec design glassmorphism
 */

import React from 'react';

interface ModernCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
}

/**
 * Carte de base avec glassmorphism
 */
export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  className = '',
  hover = true,
  gradient = false,
  ...props
}) => {
  return (
    <div
      className={`
        bg-[var(--bg-panel,#1a1a26)]/80 backdrop-blur-xl border border-[var(--border-primary,#2d2d44)]/60 rounded-xl p-6
        ${hover ? 'hover:bg-[var(--bg-hover,rgba(255,255,255,0.06))] hover:border-[var(--border-secondary,#3d3d5c)] transition-all duration-300' : ''}
        ${gradient ? 'bg-gradient-to-br from-[var(--bg-panel,#1a1a26)]/60 to-[var(--bg-deep,#0a0a0f)]/60' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

interface ModernCardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

/**
 * En-tête de carte moderne
 */
export const ModernCardHeader: React.FC<ModernCardHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
}) => {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-3 flex-1">
        {icon && <div className="text-[var(--color-accent,#f5a623)] mt-1">{icon}</div>}
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary,#e8e8f0)]">{title}</h3>
          {subtitle && <p className="text-sm text-[var(--text-muted,#6a6a82)] mt-1">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

interface ModernCardBodyProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Corps de carte moderne
 */
export const ModernCardBody: React.FC<ModernCardBodyProps> = ({
  children,
  className = '',
}) => {
  return <div className={`text-[var(--text-secondary,#9898b0)] ${className}`}>{children}</div>;
};

interface ModernCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Pied de page de carte moderne
 */
export const ModernCardFooter: React.FC<ModernCardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`pt-4 border-t border-[var(--border-primary,#2d2d44)]/60 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'red';
}

/**
 * Carte de statistiques
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'from-[var(--color-accent,#f5a623)]/20 to-[var(--color-accent,#f5a623)]/20 border-[var(--color-accent,#f5a623)]/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30',
  };

  const changeColor = change && change > 0 ? 'text-[var(--color-accent,#f5a623)]' : 'text-[var(--color-error,#ef4444)]';

  return (
    <div
      className={`
        bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6
        backdrop-blur-xl hover:scale-105 transition-transform duration-300
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-[var(--text-muted,#6a6a82)]">{label}</p>
          <p className="text-3xl font-bold text-[var(--text-primary,#e8e8f0)] mt-2">{value}</p>
        </div>
        {icon && <div className="text-2xl opacity-50">{icon}</div>}
      </div>
      {change !== undefined && (
        <p className={`text-sm font-medium ${changeColor}`}>
          {change > 0 ? '+' : ''}{change}% from last month
        </p>
      )}
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}

/**
 * Carte de fonctionnalité - Accessible
 */
export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  onClick,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <button
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={title}
      className="w-full text-left bg-[var(--bg-panel,#1a1a26)]/80 backdrop-blur-xl border border-[var(--border-primary,#2d2d44)]/60 rounded-xl p-6 hover:bg-[var(--bg-hover,rgba(255,255,255,0.06))] hover:border-[var(--color-accent,#f5a623)]/50 transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent,#f5a623)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep,#0a0a0f)]"
    >
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary,#e8e8f0)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-secondary,#9898b0)]">{description}</p>
    </button>
  );
};

export default ModernCard;
