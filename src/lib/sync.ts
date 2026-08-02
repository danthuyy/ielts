import { SYNC_CONFIG, isSyncConfigured } from './config';
import { exportProgress, importProgress, onProgressChange } from './progress';
import { exportSettings, importSettings } from './settings';

/**
 * Cross-device sync against a single Supabase row. Last writer wins, which is
 * enough for one learner on several devices and never silently drops the newer
 * side: a pull only happens when the remote stamp is strictly newer.
 */

const LOCAL_STAMP_KEY = 'ielts_sync_local_updated_at';
const LAST_SYNC_KEY = 'ielts_sync_last_ok';
const PUSH_DELAY_MS = 2000;
const EPOCH = '1970-01-01T00:00:00.000Z';

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'offline' | 'error' | 'disabled';

export interface SyncState {
  status: SyncStatus;
  message: string;
  lastSyncedAt: string | null;
}

type Listener = (state: SyncState) => void;

const listeners = new Set<Listener>();
let state: SyncState = { status: 'idle', message: '', lastSyncedAt: null };

let pushTimer: ReturnType<typeof setTimeout> | undefined;
let pushing = false;
let pendingPush = false;
let started = false;
let detach: Array<() => void> = [];

export function getSyncState(): SyncState {
  return state;
}

export function subscribeSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(status: SyncStatus, message = ''): void {
  state = { status, message, lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY) };
  for (const listener of listeners) listener(state);
}

function endpoint(query = ''): string {
  return `${SYNC_CONFIG.url.replace(/\/+$/, '')}/rest/v1/${SYNC_CONFIG.table}${query}`;
}

function headers(): HeadersInit {
  return {
    apikey: SYNC_CONFIG.anonKey,
    Authorization: `Bearer ${SYNC_CONFIG.anonKey}`,
    'Content-Type': 'application/json',
  };
}

function localStamp(): string {
  return localStorage.getItem(LOCAL_STAMP_KEY) ?? EPOCH;
}

function markSynced(stamp: string): void {
  localStorage.setItem(LOCAL_STAMP_KEY, stamp);
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  setState('ok', 'Đã đồng bộ');
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

interface RemoteRow {
  data: unknown;
  updated_at: string;
}

async function fetchRemote(): Promise<RemoteRow | null> {
  const query = `?id=eq.${encodeURIComponent(SYNC_CONFIG.rowId)}&select=data,updated_at`;
  const response = await fetch(endpoint(query), { headers: headers(), cache: 'no-store' });
  if (!response.ok) throw new Error(`Không tải được dữ liệu (${response.status})`);
  const rows = (await response.json()) as RemoteRow[];
  return rows[0] ?? null;
}

export async function pushNow(): Promise<void> {
  if (!isSyncConfigured()) return;
  if (!navigator.onLine) {
    setState('offline', 'Không có mạng — sẽ đồng bộ lại sau');
    return;
  }
  // A push already in flight would lose whatever changed meanwhile; queue it.
  if (pushing) {
    pendingPush = true;
    return;
  }

  pushing = true;
  setState('syncing', 'Đang lưu...');
  try {
    const data = await exportProgress(exportSettings());
    const updatedAt = new Date().toISOString();
    const response = await fetch(endpoint('?on_conflict=id'), {
      method: 'POST',
      headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: SYNC_CONFIG.rowId, data, updated_at: updatedAt }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 120);
      throw new Error(`Không lưu được (${response.status}) ${detail}`);
    }
    markSynced(updatedAt);
  } catch (err) {
    setState('error', errorMessage(err));
  } finally {
    pushing = false;
    if (pendingPush) {
      pendingPush = false;
      schedulePush();
    }
  }
}

export function schedulePush(): void {
  if (!isSyncConfigured()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushNow();
  }, PUSH_DELAY_MS);
}

/**
 * Pull if the remote copy is newer, otherwise push. Resolves once the local
 * database reflects whichever side won.
 */
export async function reconcile(): Promise<boolean> {
  if (!isSyncConfigured()) {
    setState('disabled', 'Chưa cấu hình đồng bộ');
    return false;
  }
  if (state.status === 'syncing') return false;
  if (!navigator.onLine) {
    setState('offline', 'Không có mạng');
    return false;
  }

  setState('syncing', 'Đang đồng bộ...');
  try {
    const remote = await fetchRemote();
    if (remote && remote.updated_at > localStamp()) {
      const snapshot = remote.data as {
        settings?: Record<string, string>;
        [key: string]: unknown;
      };
      importSettings(snapshot.settings);
      await importProgress(snapshot);
      markSynced(remote.updated_at);
      return true;
    }
    await pushNow();
    return false;
  } catch (err) {
    setState('error', errorMessage(err));
    return false;
  }
}

/** Wires the change hook and the online/visibility triggers, then reconciles once. */
export async function startSync(): Promise<boolean> {
  if (!isSyncConfigured()) {
    setState('disabled', 'Chưa cấu hình đồng bộ');
    return false;
  }
  if (started) return reconcile();
  started = true;

  detach.push(onProgressChange(schedulePush));

  const onOnline = () => void reconcile();
  const onVisible = () => {
    if (document.visibilityState === 'visible') void reconcile();
  };
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  detach.push(() => window.removeEventListener('online', onOnline));
  detach.push(() => document.removeEventListener('visibilitychange', onVisible));

  return reconcile();
}

export function stopSync(): void {
  clearTimeout(pushTimer);
  for (const off of detach) off();
  detach = [];
  started = false;
}

/**
 * Used by "Xoá tất cả tiến trình" so the wipe propagates instead of being
 * undone by the next pull.
 */
export async function pushWipe(): Promise<void> {
  if (!isSyncConfigured()) return;
  localStorage.removeItem(LOCAL_STAMP_KEY);
  await pushNow();
}
