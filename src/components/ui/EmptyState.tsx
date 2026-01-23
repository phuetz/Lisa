/**
 * EmptyState Component
 * État vide élégant avec icône, titre, description et action
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

const sizeConfig = {
  sm: { icon: 32, title: 'text-base', desc: 'text-sm', padding: 'py-6 px-4' },
  md: { icon: 48, title: 'text-lg', desc: 'text-sm', padding: 'py-12 px-6' },
  lg: { icon: 64, title: 'text-xl', desc: 'text-base', padding: 'py-16 px-8' },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
  children,
}) => {
  const config = sizeConfig[size];

  return (
    <div className={`
      flex flex-col items-center justify-center text-center
      ${config.padding}
      ${className}
    `}>
      {/* Icon */}
      <div className="mb-4 p-4 bg-slate-800/50 rounded-full">
        <Icon size={config.icon} className="text-slate-500" />
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-white ${config.title}`}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={`text-slate-400 mt-2 max-w-md ${config.desc}`}>
          {description}
        </p>
      )}

      {/* Custom content */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {secondaryAction.icon && <secondaryAction.icon size={16} />}
              {secondaryAction.label}
            </button>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${action.variant === 'secondary'
                  ? 'text-slate-300 bg-slate-800 hover:bg-slate-700'
                  : 'text-white bg-blue-600 hover:bg-blue-500'
                }
              `}
            >
              {action.icon && <action.icon size={16} />}
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
