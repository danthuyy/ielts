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
export const SYNC_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL ?? 'https://nwbgobapbyuavwljygec.supabase.co',
  anonKey:
    import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_537EfMMlWgKHjIL3kEvslA_SwS063k6',
  table: import.meta.env.VITE_SUPABASE_TABLE ?? 'sync_state',
  rowId: import.meta.env.VITE_SYNC_ROW_ID ?? 'a25f73c1-0c6d-4883-bf06-95c897efddb2',
} as const;

export function isSyncConfigured(): boolean {
  return Boolean(SYNC_CONFIG.url && SYNC_CONFIG.anonKey && SYNC_CONFIG.rowId);
}
