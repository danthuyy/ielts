import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import { routes } from '@/app/routes';
import { GRAMMAR } from '@/content/grammar';
import { getTestHistory } from '@/lib/progress';

/**
 * The grammar track, in teaching order.
 *
 * Each row carries the learner's best score so far, so the list doubles as the
 * record of what is done — grammar has no spaced repetition behind it, and
 * without a mark every lesson looks equally unfinished.
 */
export function GrammarListScreen() {
  const best = useLiveQuery(async () => {
    const history = await getTestHistory(200);
    const scores = new Map<string, number>();
    for (const entry of history) {
      if (entry.mode !== 'grammar') continue;
      scores.set(entry.lessonId, Math.max(scores.get(entry.lessonId) ?? 0, entry.score));
    }
    return scores;
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Ngữ pháp cơ bản</h1>
        <span className="page-head__meta">{GRAMMAR.length} bài</span>
      </header>

      {GRAMMAR.length === 0 ? (
        <p className="empty">Chưa có bài ngữ pháp nào.</p>
      ) : (
        <>
          <p className="grammar__intro">
            Học lần lượt từ trên xuống — mỗi bài dựa trên bài trước. Đọc phần giải thích rồi làm bài
            tập; làm sai cũng không mất gì, cứ đọc lại rồi thử tiếp.
          </p>

          <ul className="grammar-list">
            {GRAMMAR.map((lesson, index) => {
              const score = best?.get(lesson.id);
              return (
                <li key={lesson.id}>
                  <Link className="grammar-row" to={routes.grammarLesson(lesson.id)}>
                    <span className="grammar-row__num">{index + 1}</span>
                    <span className="grammar-row__main">
                      <strong className="grammar-row__title">{lesson.title}</strong>
                      <span className="grammar-row__summary">{lesson.summary}</span>
                    </span>
                    {score === undefined ? (
                      <span className="grammar-row__score grammar-row__score--new">chưa học</span>
                    ) : (
                      <span
                        className={`grammar-row__score grammar-row__score--${
                          score >= 70 ? 'good' : 'poor'
                        }`}
                      >
                        {score}%
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
