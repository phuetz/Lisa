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
        bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6
        ${hover ? 'hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-300' : ''}
        ${gradient ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50' : ''}
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
        {icon && <div className="text-blue-400 mt-1">{icon}</div>}
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
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
  return <div className={`text-slate-300 ${className}`}>{children}</div>;
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
    <div className={`pt-4 border-t border-slate-700/50 flex items-center justify-between ${className}`}>
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
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30',
  };

  const changeColor = change && change > 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div
      className={`
        bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6
        backdrop-blur-xl hover:scale-105 transition-transform duration-300
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
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
      className="w-full text-left bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/70 hover:border-blue-500/50 transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
    >
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-300">{description}</p>
    </button>
  );
};

export default ModernCard;
