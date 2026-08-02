import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import { getLesson, studyWordsOf } from '@/content/lessons';
import { routes, STUDY_MODES } from '@/app/routes';
import { getLessonProgress } from '@/lib/progress';
import { speak } from '@/lib/tts';
import { YouglishLink } from '@/components/YouglishLink';
import { WordAccuracy } from '@/components/WordAccuracy';
import { isWeak } from '@/lib/accuracy';
import type { WordProgress } from '@/lib/db';
import type { WordStatus } from '@/lib/srs';

const STATUS_LABEL: Record<WordStatus, string> = {
  new: 'Mới',
  learning: 'Đang học',
  mastered: 'Thuộc',
};

type Filter = 'all' | WordStatus | 'weak';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'new', label: 'Mới' },
  { key: 'learning', label: 'Đang học' },
  { key: 'mastered', label: 'Thuộc' },
  // Cuts across the other three: a word can be scheduled as "Thuộc" and still
  // be one that keeps getting missed.
  { key: 'weak', label: 'Hay sai' },
];

export function LessonDetailScreen() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const progressById = useLiveQuery(async () => {
    if (!lesson) return new Map<string, WordProgress>();
    const records = await getLessonProgress(lesson.id);
    return new Map(records.map((record) => [record.id, record]));
  }, [lesson?.id]);

  if (!lesson) return <Navigate to={routes.lessons()} replace />;

  const words = studyWordsOf(lesson);
  const counts = { new: 0, learning: 0, mastered: 0, weak: 0 };
  for (const word of words) {
    const record = progressById?.get(word.id);
    counts[record?.status ?? 'new'] += 1;
    if (isWeak(record)) counts.weak += 1;
  }

  const needle = query.trim().toLowerCase();
  const visible = words.filter((word) => {
    const record = progressById?.get(word.id);
    const status = record?.status ?? 'new';
    if (filter === 'weak' ? !isWeak(record) : filter !== 'all' && status !== filter) return false;
    if (!needle) return true;
    return (
      word.word.toLowerCase().includes(needle) ||
      word.vi.toLowerCase().includes(needle) ||
      word.collocation.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="page">
      <header className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <button
            className="icon-btn"
            onClick={() => navigate(routes.lessons())}
            aria-label="Quay lại"
          >
            ←
          </button>
          <h1>{lesson.title}</h1>
        </div>
        <span className="page-head__meta">{lesson.words.length} từ</span>
      </header>

      <section className="stat-row" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="stat">
          <div className="stat__num" style={{ color: 'var(--info)' }}>
            {counts.new}
          </div>
          <div className="stat__cap">Mới</div>
        </div>
        <div className="stat">
          <div className="stat__num stat__num--learning">{counts.learning}</div>
          <div className="stat__cap">Đang học</div>
        </div>
        <div className="stat">
          <div className="stat__num stat__num--mastered">{counts.mastered}</div>
          <div className="stat__cap">Thuộc</div>
        </div>
      </section>

      <section className="section" style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 className="section__label">Chế độ luyện</h2>
        <div className="mode-grid">
          {STUDY_MODES.map((mode) => (
            <Link className="mode-tile" key={mode.mode} to={routes.study(mode.mode, lesson.id)}>
              <span className="mode-tile__icon" aria-hidden="true">
                {mode.icon}
              </span>
              <span>{mode.label}</span>
            </Link>
          ))}
          <Link className="mode-tile mode-tile--accent" to={routes.test(lesson.id)}>
            <span className="mode-tile__icon" aria-hidden="true">
              📋
            </span>
            <span>Kiểm tra</span>
          </Link>
        </div>
      </section>

      <section className="section">
        <h2 className="section__label">
          Danh sách từ ({visible.length}
          {visible.length !== words.length && ` / ${words.length}`})
        </h2>

        <div className="search" style={{ marginBottom: 'var(--sp-3)' }}>
          <span className="search__icon" aria-hidden="true">
            🔍
          </span>
          <input
            className="input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm trong bài học này..."
            aria-label="Tìm từ trong bài học"
          />
        </div>

        <div
          className="chip-row"
          style={{ marginBottom: 'var(--sp-4)' }}
          role="group"
          aria-label="Lọc theo trạng thái"
        >
          {FILTERS.map((entry) => (
            <button
              className="chip"
              key={entry.key}
              aria-pressed={filter === entry.key}
              onClick={() => setFilter(entry.key)}
            >
              {entry.label}
              <span className="chip__count">
                {entry.key === 'all' ? words.length : counts[entry.key]}
              </span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="empty">Không có từ nào khớp.</p>
        ) : (
          <ul className="word-list">
            {visible.map((word) => {
              const record = progressById?.get(word.id);
              const status = record?.status ?? 'new';
              return (
                <li className="word-row" key={word.id}>
                  {/* The row links to the word page, matching search results,
                      bookmarks and the weak-words table. Speaking the word is
                      its own button rather than the whole row. */}
                  <Link className="word-row__main" to={routes.word(word.id)}>
                    <span className="word-row__head">
                      <span className="word-row__word">{word.word}</span>
                      <span className="word-row__pos">{word.pos}</span>
                    </span>
                    <span className="word-row__vi">{word.vi}</span>
                  </Link>
                  <span className="word-row__side">
                    <WordAccuracy record={record} />
                    <span className={`badge badge--${status}`}>{STATUS_LABEL[status]}</span>
                    {record?.bookmarked ? (
                      <span className="word-row__star word-row__star--on" aria-label="Đã lưu">
                        ★
                      </span>
                    ) : null}
                    <button
                      className="icon-btn"
                      onClick={() => speak(word.word)}
                      aria-label={`Phát âm ${word.word}`}
                    >
                      🔊
                    </button>
                    <YouglishLink word={word.word} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
