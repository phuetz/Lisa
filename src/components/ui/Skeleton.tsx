/**
 * Skeleton Component
 * Loading placeholder avec animation
 */

import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = ({ 
  className, 
  variant = 'rectangular',
  animation = 'pulse' 
}: SkeletonProps) => {
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-[#2a2a2a] via-[#333333] to-[#2a2a2a] bg-[length:200%_100%]',
    none: '',
  };

  return (
    <div 
      className={cn(
        'bg-[#2a2a2a]',
        variants[variant],
        animations[animation],
        className
      )}
    />
  );
};

export default Skeleton;
