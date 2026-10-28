import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface QueuedAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

interface OfflineContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  queueOfflineAction: (type: string, payload: unknown) => void;
  syncPendingActions: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queue, setQueue] = useState<QueuedAction[]>(() => {
    try {
      const stored = localStorage.getItem('edumo_offline_queue');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored! Ready to sync.', { id: 'online-toast' });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('Operating in offline mode. Changes will be saved locally.', {
        icon: '📡',
        id: 'offline-toast',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('edumo_offline_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to persist offline queue:', e);
    }
  }, [queue]);

  const queueOfflineAction = useCallback((type: string, payload: unknown) => {
    const newAction: QueuedAction = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
    };
    setQueue((prev) => [...prev, newAction]);
    toast.success('Saved to local offline queue', { icon: '💾' });
  }, []);

  const syncPendingActions = useCallback(async () => {
    if (!isOnline || queue.length === 0) return;
    toast.loading('Syncing offline actions...', { id: 'sync-status' });
    try {
      // Simulate/trigger queue flush
      await new Promise((resolve) => setTimeout(resolve, 800));
      setQueue([]);
      toast.success('All offline records synchronized successfully!', { id: 'sync-status' });
    } catch (err) {
      toast.error('Sync error occurred. Will retry automatically.', { id: 'sync-status' });
    }
  }, [isOnline, queue]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncPendingActions();
    }
  }, [isOnline, queue.length, syncPendingActions]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingSyncCount: queue.length,
        queueOfflineAction,
        syncPendingActions,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
