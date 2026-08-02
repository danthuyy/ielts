import { useSyncExternalStore } from 'react';
import { getSyncState, subscribeSync, type SyncState } from '@/lib/sync';

const SERVER_STATE: SyncState = { status: 'idle', message: '', lastSyncedAt: null };

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribeSync, getSyncState, () => SERVER_STATE);
}
