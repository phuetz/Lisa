/**
 * Avatar Component
 * Avatar pour utilisateur et assistant
 */

import { cn } from '../../utils/cn';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  gradient?: boolean;
}

const sizes = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl',
};

export const Avatar = ({ 
  src, 
  alt, 
  fallback, 
  size = 'md', 
  className,
  gradient = false
}: AvatarProps) => {
  return (
    <div 
      className={cn(
        'rounded-full flex items-center justify-center overflow-hidden flex-shrink-0',
        sizes[size],
        gradient && 'bg-gradient-to-r from-blue-500 to-purple-500',
        !gradient && !src && 'bg-[#2a2a2a]',
        className
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span className="font-medium text-white">
          {fallback || '?'}
        </span>
      )}
    </div>
  );
};

export default Avatar;
