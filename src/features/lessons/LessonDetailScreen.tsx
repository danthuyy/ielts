import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import { getLesson, studyWordsOf } from '@/content/lessons';
import { routes, STUDY_MODES } from '@/app/routes';
import { getLessonProgress } from '@/lib/progress';
import { speak } from '@/lib/tts';
import type { WordStatus } from '@/lib/srs';

const STATUS_LABEL: Record<WordStatus, string> = {
  new: 'Mới',
  learning: 'Đang học',
  mastered: 'Thuộc',
};

export function LessonDetailScreen() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);

  const progressById = useLiveQuery(async () => {
    if (!lesson) return new Map<string, { status: WordStatus; bookmarked: number }>();
    const records = await getLessonProgress(lesson.id);
    return new Map(records.map((record) => [record.id, record]));
  }, [lesson?.id]);

  if (!lesson) return <Navigate to={routes.lessons()} replace />;

  const words = studyWordsOf(lesson);
  const counts = { new: 0, learning: 0, mastered: 0 };
  for (const word of words) {
    counts[progressById?.get(word.id)?.status ?? 'new'] += 1;
  }

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
        <h2 className="section__label">Danh sách từ ({lesson.words.length})</h2>
        <ul className="word-list">
          {words.map((word) => {
            const record = progressById?.get(word.id);
            const status = record?.status ?? 'new';
            return (
              <li key={word.id}>
                <button
                  className="word-row"
                  onClick={() => speak(word.word)}
                  aria-label={`Phát âm ${word.word}`}
                >
                  <span>
                    <span className="word-row__head">
                      <span className="word-row__word">{word.word}</span>
                      <span className="word-row__pos">{word.pos}</span>
                    </span>
                    <span className="word-row__vi">{word.vi}</span>
                  </span>
                  <span className="word-row__side">
                    <span className={`badge badge--${status}`}>{STATUS_LABEL[status]}</span>
                    <span
                      className={`word-row__star${record?.bookmarked ? ' word-row__star--on' : ''}`}
                      aria-hidden="true"
                    >
                      ★
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
