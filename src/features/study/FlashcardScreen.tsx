import { Navigate, useParams } from 'react-router-dom';

import { getLesson, studyWordsOf } from '@/content/lessons';
import { routes } from '@/app/routes';
import { Restartable } from '@/components/Restartable';
import { useSessionWords } from '@/hooks/useSessionWords';
import { FlashcardSession } from './FlashcardSession';

export function FlashcardScreen() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const lesson = getLesson(lessonId);
  // Hooks run before the early return, so an unknown lesson still gets a
  // consistent hook order.
  const words = useSessionWords(lesson ? studyWordsOf(lesson) : EMPTY);

  if (!lesson) return <Navigate to={routes.lessons()} replace />;

  return (
    <Restartable>
      {(restart) => (
        <FlashcardSession words={words} backTo={routes.lesson(lesson.id)} onRetry={restart} />
      )}
    </Restartable>
  );
}

const EMPTY: never[] = [];
