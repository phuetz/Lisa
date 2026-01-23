/**
 * useOffline Hook
 * Hook React pour la gestion du mode hors-ligne
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineService } from '../services/offlineService';

interface UseOfflineReturn {
  isOnline: boolean;
  isOffline: boolean;
  pendingCount: number;
  queueMessage: (conversationId: string, content: string) => string;
  syncPendingMessages: () => Promise<void>;
  clearQueue: () => void;
}

export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(offlineService.isOnline);
  const [pendingCount, setPendingCount] = useState(offlineService.pendingCount);

  useEffect(() => {
    const unsubscribe = offlineService.onConnectionChange((online) => {
      setIsOnline(online);
      setPendingCount(offlineService.pendingCount);
    });

    return unsubscribe;
  }, []);

  const queueMessage = useCallback((conversationId: string, content: string) => {
    const id = offlineService.queueMessage(conversationId, content);
    setPendingCount(offlineService.pendingCount);
    return id;
  }, []);

  const syncPendingMessages = useCallback(async () => {
    await offlineService.syncPendingMessages();
    setPendingCount(offlineService.pendingCount);
  }, []);

  const clearQueue = useCallback(() => {
    offlineService.clearQueue();
    setPendingCount(0);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    pendingCount,
    queueMessage,
    syncPendingMessages,
    clearQueue,
  };
}

export default useOffline;
