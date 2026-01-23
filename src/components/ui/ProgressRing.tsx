/**
 * ProgressRing Component
 * Indicateur de progression circulaire avec animation
 */

import React, { useEffect, useState } from 'react';

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan' | 'gradient';
  thickness?: number;
  showValue?: boolean;
  showLabel?: boolean;
  label?: string;
  animate?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const sizeConfig = {
  sm: { size: 48, fontSize: 'text-xs', strokeWidth: 4 },
  md: { size: 80, fontSize: 'text-lg', strokeWidth: 6 },
  lg: { size: 120, fontSize: 'text-2xl', strokeWidth: 8 },
  xl: { size: 160, fontSize: 'text-3xl', strokeWidth: 10 },
};

const colorConfig = {
  blue: { stroke: '#3b82f6', bg: '#3b82f620' },
  green: { stroke: '#22c55e', bg: '#22c55e20' },
  red: { stroke: '#ef4444', bg: '#ef444420' },
  purple: { stroke: '#a855f7', bg: '#a855f720' },
  orange: { stroke: '#f97316', bg: '#f9731620' },
  cyan: { stroke: '#06b6d4', bg: '#06b6d420' },
  gradient: { stroke: 'url(#progressGradient)', bg: '#3b82f620' },
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'blue',
  thickness,
  showValue = true,
  showLabel = true,
  label,
  animate = true,
  className = '',
  children,
}) => {
  const [animatedValue, setAnimatedValue] = useState(animate ? 0 : value);
  
  const config = sizeConfig[size];
  const colors = colorConfig[color];
  const strokeWidth = thickness || config.strokeWidth;
  const radius = (config.size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, (animatedValue / max) * 100));
  const offset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    if (!animate) {
      setAnimatedValue(value);
      return;
    }

    const duration = 1000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(value, increment * step);
      setAnimatedValue(current);

      if (step >= steps) {
        clearInterval(timer);
        setAnimatedValue(value);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, animate]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={config.size}
        height={config.size}
        viewBox={`0 0 ${config.size} ${config.size}`}
        className="transform -rotate-90"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke={colors.bg}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ? (
          children
        ) : (
          <>
            {showValue && (
              <span className={`font-bold text-white ${config.fontSize}`}>
                {Math.round(percentage)}%
              </span>
            )}
            {showLabel && label && (
              <span className="text-xs text-slate-400 mt-0.5">{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressRing;
