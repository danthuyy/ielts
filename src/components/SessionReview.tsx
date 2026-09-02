import { useState } from 'react';
import { Link } from 'react-router-dom';

import { routes } from '@/app/routes';
import { VoiceButtons } from './VoiceButtons';
import type { StudyWord } from '@/content/schema';

/** One line of the summary: a word and how the session went for it. */
export interface ReviewRow {
  word: StudyWord;
  /** Times answered wrong. Omit for modes that only know right/wrong once. */
  misses?: number;
  /** False when the word was never answered correctly this session. */
  learned: boolean;
}

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

  return (
    <section className="review">
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
