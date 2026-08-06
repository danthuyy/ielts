import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import { LESSONS, studyWordsOf } from '@/content/lessons';
import { routes } from '@/app/routes';
import { Restartable } from '@/components/Restartable';
import { LoadingScreen } from '@/components/ScreenState';
import { getLessonProgress } from '@/lib/progress';
import { isGranularity, periodKeyOf } from '@/lib/periods';
import { MixSession } from './MixSession';
import type { StudyWord } from '@/content/schema';
import type { WordStatus } from '@/lib/srs';

/**
 * Mixed practice over every word added during one calendar period.
 *
 * The lesson-scoped mix reaches this same engine; the only difference is the
 * seed — here the word set is every lesson whose date lands in the chosen week,
 * month or year, so a learner can drill "this whole week" in one sitting.
 */
export function MixPeriodScreen() {
  const { granularity, periodKey } = useParams<{ granularity: string; periodKey: string }>();

  // Which lessons — and therefore which words — belong to this period. Derived
  // from the content, so it is stable across renders and safe to key effects on.
  const { words, lessonIds } = useMemo(() => {
    if (!isGranularity(granularity) || !periodKey) {
      return { words: [] as StudyWord[], lessonIds: [] as string[] };
    }
    const lessons = LESSONS.filter((lesson) => periodKeyOf(lesson.date, granularity) === periodKey);
    return {
      words: lessons.flatMap((lesson) => [...studyWordsOf(lesson)]),
      lessonIds: lessons.map((lesson) => lesson.id),
    };
  }, [granularity, periodKey]);

  const statuses = useLiveQuery(async () => {
    const perLesson = await Promise.all(lessonIds.map((id) => getLessonProgress(id)));
    return new Map(perLesson.flat().map((record) => [record.id, record.status]));
  }, [lessonIds.join(',')]);

  if (!isGranularity(granularity) || !periodKey) {
    return <Navigate to={routes.periodPicker()} replace />;
  }
  // No lesson falls in this period — nothing to study, so send the learner back
  // to pick one that does rather than showing an empty session.
  if (words.length === 0) return <Navigate to={routes.periodPicker()} replace />;
  if (statuses === undefined) return <LoadingScreen />;

  const statusMap: Map<string, WordStatus> = statuses;

  // Keyed on the period so switching periods starts a fresh session instead of
  // reusing the queue with a different word set.
  return (
    <Restartable key={`${granularity}:${periodKey}`}>
      {(restart) => (
        <MixSession
          words={words}
          statuses={statusMap}
          backTo={routes.periodPicker()}
          onRetry={restart}
          source="mix-period"
        />
      )}
    </Restartable>
  );
}
