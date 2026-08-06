import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import { routes } from '@/app/routes';
import { EmptyState, LoadingScreen } from '@/components/ScreenState';
import { getLesson, getStudyWord } from '@/content/lessons';
import { getProgress, toggleBookmark } from '@/lib/progress';
import { formatDateVi, percent } from '@/lib/utils';
import { speak } from '@/lib/tts';
import { YouglishLink } from '@/components/YouglishLink';

const STATUS_LABEL = {
  new: 'Mới',
  learning: 'Đang học',
  mastered: 'Đã thuộc',
} as const;

/** Everything known about one word, in one place. */
export function WordDetailScreen() {
  const { wordId } = useParams<{ wordId: string }>();
  const navigate = useNavigate();

  const word = wordId ? getStudyWord(decodeURIComponent(wordId)) : undefined;
  const lesson = word ? getLesson(word.lessonId) : undefined;

  const progress = useLiveQuery(
    async () => (word ? ((await getProgress(word.id)) ?? null) : null),
    [word?.id],
  );

  if (!word) {
    return (
      <EmptyState
        icon="🔍"
        title="Không tìm thấy từ này"
        description="Từ có thể đã bị đổi tên hoặc gỡ khỏi nội dung."
        action={
          <button className="btn btn--primary btn--lg" onClick={() => navigate(routes.lessons())}>
            Thư viện bài học
          </button>
        }
      />
    );
  }

  if (progress === undefined) return <LoadingScreen />;

  const accuracy =
    progress && progress.totalCount > 0
      ? percent(progress.correctCount, progress.totalCount)
      : null;

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="word-detail__title">{word.word}</h1>
        <button
          type="button"
          className={`flashcard__bookmark${progress?.bookmarked ? ' flashcard__bookmark--on' : ''}`}
          aria-pressed={Boolean(progress?.bookmarked)}
          aria-label={progress?.bookmarked ? 'Bỏ lưu từ này' : 'Lưu từ này'}
          onClick={() => void toggleBookmark(word.id)}
        >
          {progress?.bookmarked ? '⭐' : '☆'}
        </button>
      </header>

      <section className="card" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="word-detail__head">
          <div>
            <p className="word-detail__ipa">
              {word.ipa} <span className="word-detail__pos">{word.pos}</span>
            </p>
            <p className="word-detail__vi">{word.vi}</p>
          </div>
          <div className="word-detail__actions">
            <button
              type="button"
              className="flashcard__speak"
              aria-label={`Phát âm ${word.word}`}
              onClick={() => speak(word.word)}
            >
              🔊
            </button>
            <YouglishLink word={word.word} variant="full" />
          </div>
        </div>

        {word.collocation && (
          <div className="flashcard__box">
            <p className="flashcard__box-title">Collocation</p>
            <p className="flashcard__collocation">{word.collocation}</p>
          </div>
        )}
        {word.synonyms && (
          <div className="flashcard__box">
            <p className="flashcard__box-title">Từ đồng nghĩa</p>
            <p className="flashcard__synonyms">{word.synonyms}</p>
          </div>
        )}
        {word.example && (
          <div className="flashcard__box">
            <p className="flashcard__box-title">Example</p>
            <p className="flashcard__example">{word.example}</p>
          </div>
        )}
        {word.note && (
          <div className="flashcard__box flashcard__box--note">
            <p className="flashcard__box-title">Lưu ý</p>
            <p className="flashcard__note">{word.note}</p>
          </div>
        )}
      </section>

      <section className="stat-row" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="stat">
          <div className="stat__num">{progress ? STATUS_LABEL[progress.status] : '—'}</div>
          <div className="stat__cap">Trạng thái</div>
        </div>
        <div className="stat">
          <div className="stat__num">{accuracy === null ? '—' : `${accuracy}%`}</div>
          <div className="stat__cap">
            {progress && progress.totalCount > 0
              ? `đúng ${progress.correctCount}/${progress.totalCount}`
              : 'chưa trả lời'}
          </div>
        </div>
        <div className="stat">
          <div className="stat__num">{progress?.interval ?? 0}</div>
          <div className="stat__cap">ngày giãn cách</div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 'var(--sp-5)' }}>
        <h2 className="section__label">Lịch ôn</h2>
        <dl className="detail-list">
          <div>
            <dt>Lần ôn tới</dt>
            <dd>{progress?.nextReview ? formatDateVi(progress.nextReview) : '—'}</dd>
          </div>
          <div>
            <dt>Lần cuối trả lời</dt>
            <dd>{progress?.lastReviewed ? formatDateVi(progress.lastReviewed) : 'chưa lần nào'}</dd>
          </div>
          <div>
            <dt>Số lần đúng liên tiếp</dt>
            <dd>{progress?.repetitions ?? 0}</dd>
          </div>
          <div>
            {/* Ease factor is the SM-2 dial that decides how fast the gap grows;
                showing it makes "why is this word back again" answerable. */}
            <dt>Hệ số dễ</dt>
            <dd>{progress ? progress.easeFactor.toFixed(2) : '—'}</dd>
          </div>
        </dl>
      </section>

      {lesson && (
        <Link className="btn btn--secondary btn--block" to={routes.lesson(lesson.id)}>
          Xem bài học: {lesson.title}
        </Link>
      )}
    </div>
  );
}
