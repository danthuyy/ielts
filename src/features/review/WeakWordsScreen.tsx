import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { routes } from '@/app/routes';
import { Restartable } from '@/components/Restartable';
import { EmptyState, LoadingScreen } from '@/components/ScreenState';
import { getStudyWord } from '@/content/lessons';
import { FlashcardSession } from '@/features/study/FlashcardSession';
import { getWeakWords } from '@/lib/progress';
import type { StudyWord } from '@/content/schema';

const SESSION_SIZE = 20;

/**
 * Drills the words this learner keeps getting wrong, worst first.
 *
 * Deliberately separate from review: the SRS schedule optimises for retention
 * over time and will not surface a stubborn word until it falls due, which is
 * no help the evening before a test.
 */
export function WeakWordsScreen() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<StudyWord[] | null>(null);

  // Loaded once — grading a card changes its accuracy, and a live query would
  // reorder the queue underneath the learner mid-session.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const weak = await getWeakWords(SESSION_SIZE);
      const words = weak
        .map((entry) => getStudyWord(entry.record.id))
        .filter((word): word is StudyWord => word !== undefined);
      if (!cancelled) setQueue(words);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (queue === null) return <LoadingScreen />;

  if (queue.length === 0) {
    return (
      <EmptyState
        icon="🎯"
        title="Chưa có từ yếu nào"
        description={
          <>
            Từ chỉ được coi là yếu sau ít nhất 2 lần trả lời.
            <br />
            Học và làm quiz thêm để app biết bạn hay sai từ nào.
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
          words={queue}
          backTo={routes.stats()}
          finishedMessage={`Bạn đã luyện lại ${queue.length} từ hay sai.`}
          onRetry={restart}
        />
      )}
    </Restartable>
  );
}
