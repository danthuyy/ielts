/**
 * Sync configuration.
 *
 * `anonKey` is Supabase's *publishable* key. It is safe in a public bundle:
 * row-level security limits it to the single row named by `rowId`. Never put a
 * `secret` / `service_role` key here.
 *
 * `rowId` is the account identity — every device that opens this build shares
 * it, which is why sync needs no login. Changing it orphans the data already
 * stored in the cloud.
 *
 * All four can be overridden at build time (`.env.local`, or repository
 * variables in CI) without touching source.
 */
/**
 * Falls back only when the value is genuinely absent — an empty string counts
 * as "use the default", which is what an unset GitHub Actions variable expands
 * to. `url` deliberately does NOT use this: an empty `url` means "sync off",
 * which is how `.env.local` disables sync during dev.
 */
function orDefault(value: string | undefined, fallback: string): string {
  return value && value.trim() ? value : fallback;
}

export const SYNC_CONFIG = {
  // The central project now lives in the maintainer's own Supabase account
  // (ref yiuqsuxhayuchgcnggoe), so the whole thing is managed from one login.
  url: import.meta.env.VITE_SUPABASE_URL ?? 'https://yiuqsuxhayuchgcnggoe.supabase.co',
  anonKey:
    import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_4_5iVHLXMupT32st-mBM9g_8u4Mi2e_',
  table: orDefault(import.meta.env.VITE_SUPABASE_TABLE, 'sync_state'),
  // Per-person forks override only this, via the VITE_SYNC_ROW_ID Actions
  // variable. Unset there expands to '' in CI, so an empty value must fall back
  // to the default rather than becoming an empty row id.
  rowId: orDefault(import.meta.env.VITE_SYNC_ROW_ID, 'a25f73c1-0c6d-4883-bf06-95c897efddb2'),
} as const;

/**
 * Other learners to show side by side, as `Tên:uuid` pairs in VITE_SYNC_PEERS.
 *
 * Deliberately empty by default, so nothing comparative appears unless it is
 * switched on for a particular build. Ranking siblings can push the younger one
 * to give up rather than try harder, so this stays off until someone decides
 * otherwise — the code is here, the list is not.
 *
 * Note before enabling: the database's row policy is one shared allow-list, so
 * a build that knows another learner's id can also write to it. Fine among
 * siblings, not something to hand to a stranger.
 */
export interface Peer {
  name: string;
  rowId: string;
}

export const SYNC_PEERS: Peer[] = (import.meta.env.VITE_SYNC_PEERS ?? '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const separator = entry.indexOf(':');
    return separator < 0
      ? { name: entry, rowId: entry }
      : { name: entry.slice(0, separator).trim(), rowId: entry.slice(separator + 1).trim() };
  })
  .filter((peer) => peer.name && peer.rowId);

/** Whether this build was given anyone to compare against. */
export function hasPeers(): boolean {
  return SYNC_PEERS.length > 0;
}

export function isSyncConfigured(): boolean {
  return Boolean(SYNC_CONFIG.url && SYNC_CONFIG.anonKey && SYNC_CONFIG.rowId);
}
