/**
 * StatGrid Component
 * Grille de statistiques avec icônes et formatage
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface StatItem {
  id?: string;
  label: string;
  value: number | string;
  format?: 'number' | 'currency' | 'percent' | 'compact';
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan';
  trend?: number;
  suffix?: string;
  prefix?: string;
}

export interface StatGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'bordered';
  className?: string;
}

const colorClasses = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'text-blue-400' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', icon: 'text-green-400' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', icon: 'text-red-400' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'text-purple-400' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: 'text-orange-400' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', icon: 'text-cyan-400' },
};

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const columnClasses = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

const formatValue = (
  value: number | string,
  format?: StatItem['format'],
  locale = 'fr-FR'
): string => {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);
    case 'percent':
      return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1 }).format(value / 100);
    case 'compact':
      return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    default:
      return new Intl.NumberFormat(locale).format(value);
  }
};

export const StatGrid: React.FC<StatGridProps> = ({
  stats,
  columns = 4,
  gap = 'md',
  variant = 'default',
  className = '',
}) => {
  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {stats.map((stat, index) => {
        const color = stat.color || 'blue';
        const colors = colorClasses[color];
        const Icon = stat.icon;

        if (variant === 'compact') {
          return (
            <div
              key={stat.id || index}
              className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg"
            >
              {Icon && (
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <Icon size={18} className={colors.icon} />
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400">{stat.label}</p>
                <p className="text-lg font-semibold text-white">
                  {stat.prefix}{formatValue(stat.value, stat.format)}{stat.suffix}
                </p>
              </div>
            </div>
          );
        }

        if (variant === 'bordered') {
          return (
            <div
              key={stat.id || index}
              className={`p-4 border-l-4 ${colors.bg} border-${color}-500 rounded-r-lg`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{stat.label}</p>
                {Icon && <Icon size={20} className={colors.icon} />}
              </div>
              <p className="text-2xl font-bold text-white mt-2">
                {stat.prefix}{formatValue(stat.value, stat.format)}{stat.suffix}
              </p>
              {stat.trend !== undefined && (
                <p className={`text-xs mt-1 ${stat.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.trend >= 0 ? '+' : ''}{stat.trend}%
                </p>
              )}
            </div>
          );
        }

        // Default variant
        return (
          <div
            key={stat.id || index}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/70 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
              {Icon && (
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <Icon size={18} className={colors.icon} />
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-white">
              {stat.prefix}{formatValue(stat.value, stat.format)}{stat.suffix}
            </p>
            {stat.trend !== undefined && (
              <p className={`text-xs mt-2 ${stat.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stat.trend >= 0 ? '↑' : '↓'} {Math.abs(stat.trend)}% vs période précédente
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatGrid;
