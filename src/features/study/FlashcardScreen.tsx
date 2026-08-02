import { Navigate, useParams } from 'react-router-dom';

import { getLesson, studyWordsOf } from '@/content/lessons';
import { routes } from '@/app/routes';
import { FlashcardSession } from './FlashcardSession';

export function FlashcardScreen() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const lesson = getLesson(lessonId);

  if (!lesson) return <Navigate to={routes.lessons()} replace />;

  return <FlashcardSession words={studyWordsOf(lesson)} backTo={routes.lesson(lesson.id)} />;
}
