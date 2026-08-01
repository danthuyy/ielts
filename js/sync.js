import { SYNC_CONFIG, isSyncConfigured } from './config.js';
import { Store } from './store.js';

const LOCAL_STAMP_KEY = 'ielts_sync_local_updated_at';
const LAST_SYNC_KEY = 'ielts_sync_last_ok';
const PUSH_DELAY_MS = 2000;

export const Sync = {
  status: 'idle', // idle | syncing | ok | offline | error | disabled
  message: '',
  listeners: new Set(),
  _pushTimer: null,
  _pushing: false,
  _pendingPush: false,

  onStatus(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  setStatus(status, message = '') {
    this.status = status;
    this.message = message;
    for (const fn of this.listeners) {
      try { fn(status, message); } catch { /* a broken listener must not stop sync */ }
    }
  },

  lastSyncedAt() {
    return localStorage.getItem(LAST_SYNC_KEY);
  },

  localStamp() {
    return localStorage.getItem(LOCAL_STAMP_KEY) || '1970-01-01T00:00:00.000Z';
  },

  headers() {
    return {
      'apikey': SYNC_CONFIG.anonKey,
      'Authorization': `Bearer ${SYNC_CONFIG.anonKey}`,
      'Content-Type': 'application/json'
    };
  },

  endpoint(query = '') {
    return `${SYNC_CONFIG.url.replace(/\/+$/, '')}/rest/v1/${SYNC_CONFIG.table}${query}`;
  },

  // Wire the store's change hook and do the first reconcile.
  async start() {
    if (!isSyncConfigured()) {
      this.setStatus('disabled', 'Chưa cấu hình đồng bộ');
      return;
    }
    Store.onChange = () => this.schedulePush();
    window.addEventListener('online', () => this.reconcile());
    // Coming back to the app on another device should pick up remote changes.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.reconcile();
    });
    await this.reconcile();
  },

  // Whoever wrote last wins. Single user, so this is enough and never
  // silently drops the newer side.
  async reconcile() {
    if (!isSyncConfigured() || this.status === 'syncing') return;
    if (!navigator.onLine) {
      this.setStatus('offline', 'Không có mạng');
      return;
    }
    this.setStatus('syncing', 'Đang đồng bộ...');
    try {
      const remote = await this.fetchRemote();
      const localStamp = this.localStamp();

      if (remote && remote.updated_at > localStamp) {
        await Store.importAll(remote.data);
        localStorage.setItem(LOCAL_STAMP_KEY, remote.updated_at);
        this.markSynced();
        window.dispatchEvent(new CustomEvent('sync:pulled'));
      } else {
        await this.pushNow();
      }
    } catch (err) {
      this.setStatus('error', err.message);
    }
  },

  async fetchRemote() {
    const res = await fetch(
      this.endpoint(`?id=eq.${encodeURIComponent(SYNC_CONFIG.rowId)}&select=data,updated_at`),
      { headers: this.headers(), cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Không tải được dữ liệu (${res.status})`);
    const rows = await res.json();
    return rows[0] || null;
  },

  schedulePush() {
    if (!isSyncConfigured()) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this.pushNow(), PUSH_DELAY_MS);
  },

  async pushNow() {
    if (!isSyncConfigured()) return;
    if (!navigator.onLine) {
      this.setStatus('offline', 'Không có mạng — sẽ đồng bộ lại sau');
      return;
    }
    // A push in flight would lose whatever changed meanwhile; queue instead.
    if (this._pushing) {
      this._pendingPush = true;
      return;
    }
    this._pushing = true;
    this.setStatus('syncing', 'Đang lưu...');
    try {
      const data = await Store.exportAll();
      const updatedAt = new Date().toISOString();
      const res = await fetch(this.endpoint('?on_conflict=id'), {
        method: 'POST',
        headers: {
          ...this.headers(),
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({ id: SYNC_CONFIG.rowId, data, updated_at: updatedAt })
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Không lưu được (${res.status}) ${detail.slice(0, 120)}`);
      }
      localStorage.setItem(LOCAL_STAMP_KEY, updatedAt);
      this.markSynced();
    } catch (err) {
      this.setStatus('error', err.message);
    } finally {
      this._pushing = false;
      if (this._pendingPush) {
        this._pendingPush = false;
        this.schedulePush();
      }
    }
  },

  markSynced() {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, now);
    this.setStatus('ok', 'Đã đồng bộ');
  },

  // Used by "Xóa tất cả tiến trình" so the wipe propagates instead of
  // being undone by the next pull.
  async clearRemote() {
    if (!isSyncConfigured()) return;
    localStorage.removeItem(LOCAL_STAMP_KEY);
    await this.pushNow();
  }
};
