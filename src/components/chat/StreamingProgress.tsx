/**
 * StreamingProgress - Shows detailed streaming progress with token estimation
 */

import React, { useState, useEffect } from 'react';
import type { StreamingStage } from '../../hooks/useAIChat';

interface StreamingProgressProps {
  stage: StreamingStage;
  content?: string;
  startTime?: number;
  className?: string;
}

interface ProgressStats {
  tokensGenerated: number;
  tokensPerSecond: number;
  elapsedTime: number;
}

// Simple token estimation (roughly 4 chars per token for English)
const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

export const StreamingProgress: React.FC<StreamingProgressProps> = ({
  stage,
  content = '',
  startTime,
  className = ''
}) => {
  const [stats, setStats] = useState<ProgressStats>({
    tokensGenerated: 0,
    tokensPerSecond: 0,
    elapsedTime: 0
  });

  useEffect(() => {
    if (stage !== 'generating' || !startTime) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = (now - startTime) / 1000;
      const tokens = estimateTokens(content);
      const tps = elapsedSeconds > 0 ? tokens / elapsedSeconds : 0;

      setStats({
        tokensGenerated: tokens,
        tokensPerSecond: Math.round(tps * 10) / 10,
        elapsedTime: Math.round(elapsedSeconds * 10) / 10
      });
    }, 100);

    return () => clearInterval(interval);
  }, [stage, content, startTime]);

  if (stage === 'idle' || stage === 'complete') {
    return null;
  }

  return (
    <div className={`flex items-center gap-4 px-3 py-2 bg-gray-800/30 rounded-lg text-xs ${className}`}>
      {/* Stage indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          stage === 'thinking' ? 'bg-purple-500 animate-pulse' :
          stage === 'searching' ? 'bg-blue-500 animate-pulse' :
          'bg-green-500 animate-pulse'
        }`} />
        <span className="text-gray-400 capitalize">{stage}</span>
      </div>

      {/* Stats when generating */}
      {stage === 'generating' && (
        <>
          <div className="h-3 w-px bg-gray-600" />

          <div className="flex items-center gap-1 text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{stats.elapsedTime}s</span>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span>~{stats.tokensGenerated} tokens</span>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{stats.tokensPerSecond} t/s</span>
          </div>
        </>
      )}

      {/* Searching indicator */}
      {stage === 'searching' && (
        <span className="text-blue-400">
          Looking through memories...
        </span>
      )}

      {/* Thinking indicator */}
      {stage === 'thinking' && (
        <span className="text-purple-400">
          Processing your request...
        </span>
      )}
    </div>
  );
};

export default StreamingProgress;
