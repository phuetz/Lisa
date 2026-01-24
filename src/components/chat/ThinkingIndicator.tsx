/**
 * ThinkingIndicator - Shows the current AI processing stage
 * Displays different animations and labels based on the streaming stage
 */

import React from 'react';
import type { StreamingStage } from '../../hooks/useAIChat';

interface ThinkingIndicatorProps {
  stage: StreamingStage;
  ragContext?: string | null;
  className?: string;
}

const stageConfig: Record<StreamingStage, { label: string; icon: string; color: string }> = {
  idle: { label: '', icon: '', color: '' },
  thinking: { label: 'Thinking...', icon: 'brain', color: 'text-purple-400' },
  searching: { label: 'Searching memories...', icon: 'search', color: 'text-blue-400' },
  generating: { label: 'Generating response...', icon: 'sparkles', color: 'text-green-400' },
  complete: { label: 'Complete', icon: 'check', color: 'text-green-500' }
};

const IconComponent: React.FC<{ icon: string; className?: string }> = ({ icon, className }) => {
  switch (icon) {
    case 'brain':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case 'search':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    case 'check':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5 13l4 4L19 7" />
        </svg>
      );
    default:
      return null;
  }
};

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  stage,
  ragContext,
  className = ''
}) => {
  if (stage === 'idle') {
    return null;
  }

  const config = stageConfig[stage];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700 ${className}`}>
      <div className={`flex-shrink-0 ${config.color}`}>
        <div className="relative">
          <IconComponent icon={config.icon} className="w-5 h-5" />
          {stage !== 'complete' && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-current rounded-full animate-ping" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
          {stage !== 'complete' && (
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>

        {/* RAG Context Preview */}
        {stage === 'searching' && ragContext && (
          <div className="mt-2 text-xs text-gray-400">
            <span className="text-blue-400">Found relevant context:</span>
            <p className="mt-1 line-clamp-2 opacity-75">{ragContext}</p>
          </div>
        )}

        {/* Progress indicator */}
        {stage !== 'complete' && stage !== 'idle' && (
          <div className="mt-2 w-full bg-gray-700 rounded-full h-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stage === 'thinking' ? 'w-1/4 bg-purple-500' :
                stage === 'searching' ? 'w-1/2 bg-blue-500' :
                stage === 'generating' ? 'w-3/4 bg-green-500 animate-pulse' : 'w-full bg-green-500'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ThinkingIndicator;
