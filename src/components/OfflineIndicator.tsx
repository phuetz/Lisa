/**
 * OfflineIndicator - Shows offline status and pending sync items
 */

import React, { useState, useEffect } from 'react';
import { offlineService } from '../services/offlineService';
import { offlineStorageService } from '../services/offlineStorageService';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

interface SyncStats {
  pendingMessages: number;
  pendingActions: number;
  cachedResponses: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState<SyncStats>({
    pendingMessages: 0,
    pendingActions: 0,
    cachedResponses: 0
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Subscribe to connection changes
    const unsubscribe = offlineService.onConnectionChange((online) => {
      setIsOnline(online);
    });

    // Load initial stats
    loadStats();

    // Refresh stats periodically
    const interval = setInterval(loadStats, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadStats = async () => {
    try {
      const storageStats = await offlineStorageService.getStorageStats();
      const pendingMessages = offlineService.pendingCount;

      setStats({
        pendingMessages,
        pendingActions: storageStats.pendingActions,
        cachedResponses: storageStats.cachedResponses
      });
    } catch (error) {
      console.error('[OfflineIndicator] Failed to load stats:', error);
    }
  };

  const handleSync = async () => {
    if (isOnline) {
      await offlineService.syncPendingMessages();
      await loadStats();
    }
  };

  // Don't show if online and no pending items
  const hasPendingItems = stats.pendingMessages > 0 || stats.pendingActions > 0;
  if (isOnline && !hasPendingItems && !showDetails) {
    return null;
  }

  return (
    <div className={`offline-indicator ${className}`}>
      {/* Status Badge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          isOnline
            ? hasPendingItems
              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
        }`}
      >
        {/* Status Icon */}
        <span className={`w-2 h-2 rounded-full ${
          isOnline
            ? hasPendingItems ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
            : 'bg-red-400 animate-pulse'
        }`} />

        {/* Status Text */}
        <span>
          {isOnline
            ? hasPendingItems
              ? `Syncing (${stats.pendingMessages + stats.pendingActions})`
              : 'Online'
            : 'Offline'}
        </span>

        {/* Expand Icon */}
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="absolute top-full mt-2 right-0 w-64 p-4 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
          <h4 className="text-sm font-semibold text-gray-200 mb-3">Sync Status</h4>

          {/* Connection Status */}
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-400">Connection</span>
            <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
              {isOnline ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Pending Messages */}
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-400">Pending Messages</span>
            <span className={stats.pendingMessages > 0 ? 'text-yellow-400' : 'text-gray-500'}>
              {stats.pendingMessages}
            </span>
          </div>

          {/* Pending Actions */}
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-400">Pending Actions</span>
            <span className={stats.pendingActions > 0 ? 'text-yellow-400' : 'text-gray-500'}>
              {stats.pendingActions}
            </span>
          </div>

          {/* Cached Responses */}
          <div className="flex items-center justify-between mb-4 text-sm">
            <span className="text-gray-400">Cached Responses</span>
            <span className="text-blue-400">{stats.cachedResponses}</span>
          </div>

          {/* Sync Button */}
          {isOnline && hasPendingItems && (
            <button
              onClick={handleSync}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync Now
            </button>
          )}

          {/* Offline Message */}
          {!isOnline && (
            <div className="text-xs text-gray-400 bg-gray-700/50 rounded p-2">
              Messages will be sent automatically when you're back online.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
