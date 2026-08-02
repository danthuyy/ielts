import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { routes } from '@/app/routes';
import { EmptyState, LoadingScreen } from '@/components/ScreenState';
import { getStudyWord } from '@/content/lessons';
import { FlashcardSession } from '@/features/study/FlashcardSession';
import { useSettings } from '@/hooks/useSettings';
import { getNewWords } from '@/lib/progress';
import type { StudyWord } from '@/content/schema';

/**
 * Introduces exactly as many unseen words as the daily goal allows.
 *
 * Flashcards rather than a quiz: the learner has never met these words, so
 * asking them to type one would only teach them that they do not know it.
 */
export function NewWordsScreen() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [queue, setQueue] = useState<StudyWord[] | null>(null);

  const goal = settings.dailyGoal;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const records = await getNewWords(goal);
      const words = records
        .map((record) => getStudyWord(record.id))
        .filter((word): word is StudyWord => word !== undefined);
      if (!cancelled) setQueue(words);
    })();
    return () => {
      cancelled = true;
    };
  }, [goal]);

  if (queue === null) return <LoadingScreen />;

  if (queue.length === 0) {
    return (
      <EmptyState
        icon="🌱"
        title="Hết từ mới rồi"
        description="Bạn đã gặp qua tất cả từ hiện có. Thêm bài học mới để học tiếp."
        action={
          <button className="btn btn--primary btn--lg" onClick={() => navigate(routes.lessons())}>
            Thư viện bài học
          </button>
        }
      />
    );
  }

  return (
    <FlashcardSession
      words={queue}
      backTo={routes.home()}
      finishedMessage={`Bạn đã học ${queue.length} từ mới. Chúng sẽ quay lại theo lịch ôn.`}
    />
  );
}
