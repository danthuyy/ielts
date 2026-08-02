import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import { getStudyWord } from '@/content/lessons';
import { routes } from '@/app/routes';
import { EmptyState, LoadingScreen } from '@/components/ScreenState';
import { FlashcardSession } from '@/features/study/FlashcardSession';
import { getBookmarked, toggleBookmark } from '@/lib/progress';
import { speak } from '@/lib/tts';
import { YouglishLink } from '@/components/YouglishLink';
import type { StudyWord } from '@/content/schema';

export function BookmarksScreen() {
  const navigate = useNavigate();
  // The study session is started from a snapshot, so un-starring a word mid
  // session cannot shrink the deck under the learner.
  const [session, setSession] = useState<StudyWord[] | null>(null);

  const words = useLiveQuery(async () => {
    const records = await getBookmarked();
    return records
      .map((record) => getStudyWord(record.id))
      .filter((word): word is StudyWord => word !== undefined);
  }, []);

  if (session) {
    return (
      <FlashcardSession
        words={session}
        backTo={routes.bookmarks()}
        finishedMessage={`Bạn đã ôn xong ${session.length} từ đã lưu.`}
      />
    );
  }

  if (!words) return <LoadingScreen />;

  if (words.length === 0) {
    return (
      <EmptyState
        icon="⭐"
        title="Bạn chưa lưu từ nào"
        description="Nhấn vào biểu tượng sao ở mặt thẻ để lưu lại những từ khó."
        action={
          <button className="btn btn--primary" onClick={() => navigate(routes.lessons())}>
            Tới thư viện bài học
          </button>
        }
      />
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <button
            className="icon-btn"
            onClick={() => navigate(routes.settings())}
            aria-label="Quay lại"
          >
            ←
          </button>
          <h1>Từ đã lưu</h1>
        </div>
        <span className="page-head__meta">{words.length} từ</span>
      </header>

      <button
        className="btn btn--primary btn--lg btn--block"
        style={{ marginBottom: 'var(--sp-5)' }}
        onClick={() => setSession(words)}
      >
        Ôn tập từ đã lưu
      </button>

      <ul className="word-list">
        {words.map((word) => (
          <li className="word-row" key={word.id}>
            <Link className="word-row__main" to={routes.word(word.id)}>
              <span className="word-row__head">
                <span className="word-row__word">{word.word}</span>
                <span className="word-row__pos">{word.pos}</span>
              </span>
              <span className="word-row__vi">{word.vi}</span>
            </Link>
            <span className="word-row__side">
              <button
                className="icon-btn"
                onClick={() => speak(word.word)}
                aria-label={`Phát âm ${word.word}`}
              >
                🔊
              </button>
              <YouglishLink word={word.word} />
              <button
                className="icon-btn word-row__star--on"
                onClick={() => void toggleBookmark(word.id)}
                aria-label={`Bỏ lưu ${word.word}`}
              >
                ★
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
