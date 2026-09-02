import { SYNC_CONFIG, SYNC_PEERS, hasPeers, isSyncConfigured } from './config';
import type { DailyActivity } from './db';
import { addDays, toDateKey } from './utils';

/**
 * Reading other learners' progress, for an optional side-by-side board.
 *
 * Dormant unless the build was given a peer list (see SYNC_PEERS) — with none
 * configured nothing here ever runs, which is the intended default: comparing
 * siblings can discourage the one who is behind more than it spurs them on.
 */
export interface PeerSummary {
  name: string;
  /** Words studied over the window, or null if the row could not be read. */
  studied: number | null;
  correct: number;
  activeDays: number;
  lastActive: string | null;
}

interface RemoteShape {
  data?: { dailyActivity?: DailyActivity[] };
}

function summarise(name: string, activity: DailyActivity[], days: number): PeerSummary {
  const since = toDateKey(addDays(new Date(), -(days - 1)));
  const window = activity.filter((entry) => entry.date >= since);
  const active = window.filter((entry) => entry.wordsStudied > 0);
  return {
    name,
    studied: window.reduce((sum, entry) => sum + entry.wordsStudied, 0),
    correct: window.reduce((sum, entry) => sum + entry.wordsCorrect, 0),
    activeDays: active.length,
    lastActive: active.length > 0 ? (active[active.length - 1]?.date ?? null) : null,
  };
}

/** Fetch each configured peer's recent activity. Failures degrade to nulls. */
export async function fetchPeerSummaries(days = 7): Promise<PeerSummary[]> {
  if (!hasPeers() || !isSyncConfigured()) return [];

  const results = await Promise.all(
    SYNC_PEERS.map(async (peer): Promise<PeerSummary> => {
      const query = `?id=eq.${encodeURIComponent(peer.rowId)}&select=data`;
      try {
        const response = await fetch(`${SYNC_CONFIG.url}/rest/v1/${SYNC_CONFIG.table}${query}`, {
          headers: {
            apikey: SYNC_CONFIG.anonKey,
            Authorization: `Bearer ${SYNC_CONFIG.anonKey}`,
          },
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(String(response.status));
        const rows = (await response.json()) as RemoteShape[];
        const activity = rows[0]?.data?.dailyActivity ?? [];
        return summarise(peer.name, activity, days);
      } catch {
        // A peer that cannot be read is shown as unknown rather than as zero,
        // which would falsely read as "they did nothing".
        return { name: peer.name, studied: null, correct: 0, activeDays: 0, lastActive: null };
      }
    }),
  );
  return results;
}
