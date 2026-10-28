import React from 'react';
import { useOffline } from '../../contexts/OfflineContext';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingSyncCount, syncPendingActions } = useOffline();

  if (isOnline && pendingSyncCount === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-warning-600/90 to-amber-600/90 text-white px-4 py-2 text-xs flex items-center justify-between shadow-md transition-all">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
        <span>
          {!isOnline
            ? 'Operating offline. Changes are saved locally on your device.'
            : 'Online. Pending local items waiting to sync.'}
        </span>
        {pendingSyncCount > 0 && (
          <span className="bg-black/30 px-2 py-0.5 rounded-full font-semibold">
            {pendingSyncCount} queued
          </span>
        )}
      </div>
      {isOnline && pendingSyncCount > 0 && (
        <Button
          size="sm"
          variant="secondary"
          onClick={syncPendingActions}
          leftIcon={<RefreshCw className="w-3 h-3" />}
          className="!py-1 !text-2xs"
        >
          Sync Now
        </Button>
      )}
    </div>
  );
};
