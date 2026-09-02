/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_TABLE?: string;
  readonly VITE_SYNC_ROW_ID?: string;
  /** Which learner this build is for; scopes private lessons. Empty = admin. */
  readonly VITE_LEARNER?: string;
  /** Optional "Tên:uuid" pairs, comma separated, for the side-by-side board. */
  readonly VITE_SYNC_PEERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Short commit hash of this build, injected by vite.config.ts. */
declare const __BUILD_ID__: string;
