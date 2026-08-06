import { Navigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import { getLesson, studyWordsOf } from '@/content/lessons';
import { routes } from '@/app/routes';
import { Restartable } from '@/components/Restartable';
import { LoadingScreen } from '@/components/ScreenState';
import { getLessonProgress } from '@/lib/progress';
import { MixSession } from './MixSession';
import type { WordStatus } from '@/lib/srs';

export function MixSessionScreen() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const lesson = getLesson(lessonId);

  const statuses = useLiveQuery(async () => {
    if (!lesson) return new Map<string, WordStatus>();
    const records = await getLessonProgress(lesson.id);
    return new Map(records.map((record) => [record.id, record.status]));
  }, [lesson?.id]);

  if (!lesson) return <Navigate to={routes.lessons()} replace />;
  if (statuses === undefined) return <LoadingScreen />;

  // Keyed on the lesson so switching lessons starts a genuinely new session
  // rather than reusing the queue with different words.
  return (
    <Restartable key={lesson.id}>
      {(restart) => (
        <MixSession
          words={studyWordsOf(lesson)}
          statuses={statuses}
          backTo={routes.lesson(lesson.id)}
          onRetry={restart}
        />
      )}
    </Restartable>
  );
}
