import { useEffect, useState } from 'react';

import { hasPeers } from '@/lib/config';
import { fetchPeerSummaries, type PeerSummary } from '@/lib/peers';

const WINDOW_DAYS = 7;

/**
 * A side-by-side board of everyone learning together.
 *
 * Renders nothing unless the build was given a peer list, which no build has by
 * default — see SYNC_PEERS. Kept deliberately gentle when it is on: totals and
 * days studied, no ranking or podium, because the point is to notice each other
 * rather than to lose to a sibling.
 */
export function PeerBoard({ mine }: { mine: PeerSummary }) {
  const [peers, setPeers] = useState<PeerSummary[] | null>(null);

  useEffect(() => {
    if (!hasPeers()) return;
    let cancelled = false;
    void fetchPeerSummaries(WINDOW_DAYS).then((rows) => {
      if (!cancelled) setPeers(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hasPeers()) return null;

  const rows = [mine, ...(peers ?? [])];
  const peak = Math.max(1, ...rows.map((row) => row.studied ?? 0));

  return (
    <section className="card" style={{ marginBottom: 'var(--sp-5)' }}>
      <h2 className="section__label">Cùng học · {WINDOW_DAYS} ngày qua</h2>
      {peers === null ? (
        <p className="empty">Đang tải...</p>
      ) : (
        <div className="mode-rows">
          {rows.map((row) => (
            <div className="mode-row" key={row.name}>
              <span className="mode-row__label">{row.name}</span>
              <span className="mode-row__bar">
                <span
                  className="mode-row__fill"
                  style={{
                    width: `${Math.max(3, ((row.studied ?? 0) / peak) * 100)}%`,
                    background: 'var(--primary)',
                  }}
                />
              </span>
              <span className="mode-row__num">
                {row.studied === null ? '—' : row.studied}
                <small>{row.studied === null ? 'chưa rõ' : `${row.activeDays} ngày`}</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
