/**
 * Timeline Component
 * Affiche des événements chronologiques avec statuts
 */

import React from 'react';
import { Check, Clock, Circle, AlertCircle } from 'lucide-react';

export interface TimelineItem {
  id?: string;
  date: string | Date;
  title: string;
  description?: string;
  status?: 'completed' | 'current' | 'pending' | 'error';
  icon?: React.ReactNode;
  metadata?: Record<string, string>;
}

export interface TimelineProps {
  items: TimelineItem[];
  orientation?: 'vertical' | 'horizontal';
  showConnectors?: boolean;
  animate?: boolean;
  className?: string;
}

const statusConfig = {
  completed: {
    icon: Check,
    bg: 'bg-green-500',
    border: 'border-green-500',
    text: 'text-green-400',
    line: 'bg-green-500',
  },
  current: {
    icon: Clock,
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    text: 'text-blue-400',
    line: 'bg-slate-600',
  },
  pending: {
    icon: Circle,
    bg: 'bg-slate-700',
    border: 'border-slate-600',
    text: 'text-slate-400',
    line: 'bg-slate-700',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-500',
    border: 'border-red-500',
    text: 'text-red-400',
    line: 'bg-red-500/50',
  },
};

const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const Timeline: React.FC<TimelineProps> = ({
  items,
  orientation = 'vertical',
  showConnectors = true,
  animate = true,
  className = '',
}) => {
  if (orientation === 'horizontal') {
    return (
      <div className={`flex items-start overflow-x-auto pb-4 ${className}`}>
        {items.map((item, index) => {
          const status = item.status || 'pending';
          const config = statusConfig[status];
          const StatusIcon = item.icon ? () => <>{item.icon}</> : config.icon;
          const isLast = index === items.length - 1;

          return (
            <div
              key={item.id || index}
              className={`flex flex-col items-center min-w-[160px] ${animate ? 'animate-fadeIn' : ''}`}
              style={{ animationDelay: animate ? `${index * 100}ms` : '0ms' }}
            >
              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${config.bg} border-2 ${config.border}
                ${status === 'current' ? 'ring-4 ring-blue-500/30' : ''}
              `}>
                <StatusIcon size={20} className="text-white" />
              </div>

              {/* Connector */}
              {showConnectors && !isLast && (
                <div className={`h-1 w-full mt-5 -mb-5 ${config.line}`} />
              )}

              {/* Content */}
              <div className="mt-3 text-center px-2">
                <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                <h4 className="text-sm font-medium text-white mt-1">{item.title}</h4>
                {item.description && (
                  <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {items.map((item, index) => {
        const status = item.status || 'pending';
        const config = statusConfig[status];
        const StatusIcon = item.icon ? () => <>{item.icon}</> : config.icon;
        const isLast = index === items.length - 1;

        return (
          <div
            key={item.id || index}
            className={`flex gap-4 ${!isLast ? 'pb-6' : ''} ${animate ? 'animate-fadeIn' : ''}`}
            style={{ animationDelay: animate ? `${index * 100}ms` : '0ms' }}
          >
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shrink-0
                ${config.bg} border-2 ${config.border}
                ${status === 'current' ? 'ring-4 ring-blue-500/30' : ''}
              `}>
                <StatusIcon size={18} className="text-white" />
              </div>

              {/* Connector line */}
              {showConnectors && !isLast && (
                <div className={`w-0.5 flex-1 mt-2 ${config.line}`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-medium text-white">{item.title}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg}/20 ${config.text}`}>
                  {status === 'completed' ? 'Terminé' :
                   status === 'current' ? 'En cours' :
                   status === 'error' ? 'Erreur' : 'En attente'}
                </span>
              </div>
              
              <p className="text-xs text-slate-500 mt-1">{formatDate(item.date)}</p>
              
              {item.description && (
                <p className="text-sm text-slate-400 mt-2">{item.description}</p>
              )}

              {item.metadata && Object.keys(item.metadata).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(item.metadata).map(([key, value]) => (
                    <span key={key} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
                      {key}: <span className="text-slate-300">{value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
