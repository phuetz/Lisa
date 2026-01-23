/**
 * DataCard Component
 * Affiche des KPIs/métriques avec animations et sparklines
 */

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface DataCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percent' | 'compact';
  locale?: string;
  currency?: string;
  trend?: string | number;
  trendDirection?: 'up' | 'down' | 'neutral';
  sparkline?: number[];
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan';
  loading?: boolean;
  animate?: boolean;
  subtitle?: string;
  className?: string;
}

const colorClasses = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', spark: '#3b82f6' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', spark: '#22c55e' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', spark: '#ef4444' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', spark: '#a855f7' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', spark: '#f97316' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', spark: '#06b6d4' },
};

const formatValue = (
  value: number,
  format: DataCardProps['format'] = 'number',
  locale = 'fr-FR',
  currency = 'EUR'
): string => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
    case 'percent':
      return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1 }).format(value / 100);
    case 'compact':
      return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    default:
      return new Intl.NumberFormat(locale).format(value);
  }
};

const Sparkline: React.FC<{ data: number[]; color: string; width?: number; height?: number }> = ({
  data,
  color,
  width = 80,
  height = 24,
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  previousValue,
  format = 'number',
  locale = 'fr-FR',
  currency = 'EUR',
  trend,
  trendDirection,
  sparkline,
  icon,
  color = 'blue',
  loading = false,
  animate = true,
  subtitle,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);
  const colors = colorClasses[color];

  // Animation du compteur
  useEffect(() => {
    if (!animate || loading) {
      setDisplayValue(value);
      return;
    }

    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(value, increment * step);
      setDisplayValue(current);

      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, animate, loading]);

  // Calcul automatique du trend
  const calculatedTrend = trend ?? (previousValue ? ((value - previousValue) / previousValue) * 100 : undefined);
  const numericTrend = typeof calculatedTrend === 'number' ? calculatedTrend : parseFloat(String(calculatedTrend) || '0');
  const direction = trendDirection ?? (calculatedTrend !== undefined ? (numericTrend > 0 ? 'up' : numericTrend < 0 ? 'down' : 'neutral') : undefined);

  const TrendIcon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const trendColor = direction === 'up' ? 'text-green-400' : direction === 'down' ? 'text-red-400' : 'text-slate-400';

  if (loading) {
    return (
      <div className={`bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-5 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-1/2" />
          <div className="h-8 bg-slate-700 rounded w-3/4" />
          <div className="h-3 bg-slate-700 rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className={`
      bg-slate-800/50 backdrop-blur-xl border ${colors.border} rounded-xl p-5
      hover:bg-slate-800/70 transition-all duration-300 group
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <div className={`${colors.text}`}>{icon}</div>}
          <span className="text-sm font-medium text-slate-400">{title}</span>
        </div>
        {sparkline && (
          <Sparkline data={sparkline} color={colors.spark} />
        )}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {formatValue(displayValue, format, locale, currency)}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Trend */}
        {calculatedTrend !== undefined && (
          <div className={`flex items-center gap-1 ${trendColor} text-sm font-medium`}>
            <TrendIcon size={16} />
            <span>{typeof calculatedTrend === 'number' ? `${calculatedTrend > 0 ? '+' : ''}${calculatedTrend.toFixed(1)}%` : calculatedTrend}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataCard;
