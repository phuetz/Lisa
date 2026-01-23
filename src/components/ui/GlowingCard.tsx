/**
 * GlowingCard.tsx
 * 
 * Cartes avec effets de lueur et animations spectaculaires
 */

import React, { useState, useRef, memo } from 'react';
import type { LucideIcon } from 'lucide-react';

interface GlowingCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'cyan' | 'emerald' | 'rose' | 'amber';
  intensity?: 'low' | 'medium' | 'high';
  hover3D?: boolean;
  onClick?: () => void;
}

const glowColors = {
  blue: {
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
    gradient: 'from-blue-500/10 to-transparent',
    text: 'text-blue-400',
  },
  purple: {
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
    gradient: 'from-purple-500/10 to-transparent',
    text: 'text-purple-400',
  },
  cyan: {
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/20',
    gradient: 'from-cyan-500/10 to-transparent',
    text: 'text-cyan-400',
  },
  emerald: {
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    gradient: 'from-emerald-500/10 to-transparent',
    text: 'text-emerald-400',
  },
  rose: {
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/20',
    gradient: 'from-rose-500/10 to-transparent',
    text: 'text-rose-400',
  },
  amber: {
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    gradient: 'from-amber-500/10 to-transparent',
    text: 'text-amber-400',
  },
};

/**
 * Carte avec effet de lueur
 */
export const GlowingCard: React.FC<GlowingCardProps> = memo(function GlowingCard({
  children,
  className = '',
  glowColor = 'blue',
  intensity = 'medium',
  hover3D = false,
  onClick,
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const colors = glowColors[glowColor];
  const shadowIntensity = {
    low: 'shadow-lg',
    medium: 'shadow-xl',
    high: 'shadow-2xl',
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !hover3D) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setMousePosition({ x, y });
  };

  const transform = hover3D && isHovered
    ? `perspective(1000px) rotateY(${(mousePosition.x - 0.5) * 10}deg) rotateX(${(0.5 - mousePosition.y) * 10}deg)`
    : '';

  return (
    <div
      ref={cardRef}
      className={`
        relative overflow-hidden rounded-2xl border ${colors.border}
        bg-slate-900/60 backdrop-blur-xl
        ${shadowIntensity[intensity]} ${colors.glow}
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:border-opacity-50
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{ transform }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePosition({ x: 0.5, y: 0.5 });
      }}
      onClick={onClick}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} pointer-events-none`} />
      
      {/* Spotlight effect */}
      {hover3D && isHovered && (
        <div
          className="absolute pointer-events-none transition-opacity duration-300"
          style={{
            left: `${mousePosition.x * 100}%`,
            top: `${mousePosition.y * 100}%`,
            width: '200px',
            height: '200px',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 p-6">
        {children}
      </div>

      {/* Bottom glow line */}
      <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current ${colors.text} to-transparent opacity-30`} />
    </div>
  );
});

interface GlowingStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'blue' | 'purple' | 'cyan' | 'emerald' | 'rose' | 'amber';
}

/**
 * Carte de statistique avec effet de lueur
 */
export const GlowingStatCard: React.FC<GlowingStatCardProps> = memo(function GlowingStatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'blue',
}) {
  const colors = glowColors[color];

  return (
    <GlowingCard glowColor={color} intensity="medium" hover3D>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend.direction === 'up' ? 'text-emerald-400' :
              trend.direction === 'down' ? 'text-rose-400' : 'text-slate-400'
            }`}>
              <span>{trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-slate-500">vs last week</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.gradient} ${colors.text}`}>
          <Icon size={24} />
        </div>
      </div>
    </GlowingCard>
  );
});

interface GlowingActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  color?: 'blue' | 'purple' | 'cyan' | 'emerald' | 'rose' | 'amber';
  badge?: string;
}

/**
 * Carte d'action avec effet de lueur
 */
export const GlowingActionCard: React.FC<GlowingActionCardProps> = memo(function GlowingActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  color = 'blue',
  badge,
}) {
  const colors = glowColors[color];

  return (
    <GlowingCard glowColor={color} intensity="low" hover3D onClick={onClick}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.gradient} ${colors.text} shrink-0`}>
          <Icon size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{title}</h3>
            {badge && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.text} bg-current/10`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 line-clamp-2">{description}</p>
        </div>
        <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
          →
        </div>
      </div>
    </GlowingCard>
  );
});

export default GlowingCard;
