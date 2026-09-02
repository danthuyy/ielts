import { useState } from 'react';
import { Link } from 'react-router-dom';

import { routes } from '@/app/routes';
import { VoiceButtons } from './VoiceButtons';
import { outcomeBuckets, type ReviewRow } from '@/lib/sessionOutcome';

interface Props {
  rows: readonly ReviewRow[];
  /** Rows shown before the "see all" toggle. */
  preview?: number;
}

/**
 * What happened to each word, worst first.
 *
 * A score alone says how the session went but not what to do next; this names
 * the words that actually cost attempts, which is the part worth re-reading.
 * Trimmed to the worst few by default — a full class of 25 turns the result
 * screen into a wall of text nobody reads.
 */
export function SessionReview({ rows, preview = 6 }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;

  const missed = rows.filter((row) => (row.misses ?? 0) > 0 || !row.learned);
  const shown = expanded ? rows : rows.slice(0, preview);
  const hidden = rows.length - shown.length;

  const buckets = outcomeBuckets(rows);

  return (
    <section className="review">
      <h2 className="review__title">Kết quả {rows.length} từ</h2>

      {/* One stacked bar: the question here is how the session split, and a
          part-of-whole reads faster as one bar than as three numbers. Every
          band carries its own count and a legend entry, so the colour is never
          the only thing telling them apart. */}
      <div
        className="outcome"
        role="img"
        aria-label={buckets.map((bucket) => `${bucket.label}: ${bucket.count}`).join(', ')}
      >
        {buckets.map((bucket) => (
          <span
            key={bucket.key}
            className={`outcome__seg outcome__seg--${bucket.key}`}
            style={{ flexGrow: bucket.count }}
          >
            {bucket.count}
          </span>
        ))}
      </div>

      <ul className="outcome__legend">
        {buckets.map((bucket) => (
          <li key={bucket.key}>
            <span className={`outcome__dot outcome__dot--${bucket.key}`} aria-hidden="true" />
            {bucket.label} <strong>{bucket.count}</strong>
          </li>
        ))}
      </ul>

      <h2 className="review__title">
        Từ đã học
        {missed.length > 0 && <span className="review__count">{missed.length} từ còn sai</span>}
      </h2>

      <div className="review__scroll">
        <table className="review__table">
          <thead>
            <tr>
              <th scope="col">Từ</th>
              <th scope="col">Nghĩa</th>
              <th scope="col" className="review__num">
                Sai
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const misses = row.misses ?? 0;
              return (
                <tr
                  key={row.word.id}
                  className={misses > 0 || !row.learned ? 'review__row--missed' : undefined}
                >
                  <td>
                    <span className="review__word">
                      <Link to={routes.word(row.word.id)}>{row.word.word}</Link>
                      <VoiceButtons word={row.word.word} />
                    </span>
                    <span className="review__ipa">{row.word.ipa}</span>
                  </td>
                  <td className="review__vi">{row.word.vi}</td>
                  <td className="review__num">
                    {misses > 0 ? (
                      <span className="review__misses">{misses}</span>
                    ) : row.learned ? (
                      <span className="review__ok" aria-label="Đúng ngay">
                        ✓
                      </span>
                    ) : (
                      <span className="review__misses" aria-label="Chưa thuộc">
                        !
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hidden > 0 && (
        <button className="btn btn--ghost" onClick={() => setExpanded(true)}>
          Xem tất cả {rows.length} từ
        </button>
      )}
    </section>
  );
}
