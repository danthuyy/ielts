import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getStudyWord } from '@/content/lessons';
import { routes } from '@/app/routes';
import { Restartable } from '@/components/Restartable';
import { EmptyState, LoadingScreen } from '@/components/ScreenState';
import { FlashcardSession } from '@/features/study/FlashcardSession';
import { useSessionWords } from '@/hooks/useSessionWords';
import { getDueProgress } from '@/lib/progress';
import type { StudyWord } from '@/content/schema';

export function ReviewScreen() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<StudyWord[] | null>(null);

  // Loaded once, deliberately: grading a card pushes it out of the due set, so
  // a live query would shrink the list mid-session and reset the session.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const records = await getDueProgress();
      const words = records
        .map((record) => getStudyWord(record.id))
        // A record whose word no longer exists in the content is skipped
        // rather than rendered as a blank card.
        .filter((word): word is StudyWord => word !== undefined);
      if (!cancelled) setQueue(words);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const words = useSessionWords(queue ?? EMPTY);

  if (queue === null) return <LoadingScreen />;

  if (queue.length === 0) {
    return (
      <EmptyState
        icon="🎉"
        title="Tuyệt vời!"
        description={
          <>
            Bạn đã hoàn thành việc ôn tập hôm nay.
            <br />
            Hãy học thêm bài mới nhé!
          </>
        }
        action={
          <button className="btn btn--primary btn--lg" onClick={() => navigate(routes.lessons())}>
            Thư viện bài học
          </button>
        }
      />
    );
  }

  return (
    <Restartable>
      {(restart) => (
        <FlashcardSession
          words={words}
          backTo={routes.home()}
          finishedMessage={`Bạn đã ôn xong ${queue.length} từ đến hạn.`}
          onRetry={restart}
        />
      )}
    </Restartable>
  );
}

const EMPTY: StudyWord[] = [];
