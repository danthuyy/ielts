import { createHashRouter, Navigate } from 'react-router-dom';

import { AppShell, StudyLayout } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';

import { HomeScreen } from '@/features/home/HomeScreen';
import { LessonListScreen } from '@/features/lessons/LessonListScreen';
import { LessonDetailScreen } from '@/features/lessons/LessonDetailScreen';
import { FlashcardScreen } from '@/features/study/FlashcardScreen';
import { QuizTypeScreen } from '@/features/quiz/QuizTypeScreen';
import { QuizListenScreen } from '@/features/quiz/QuizListenScreen';
import { QuizMatchScreen } from '@/features/quiz/QuizMatchScreen';
import { QuizChoiceScreen } from '@/features/quiz/QuizChoiceScreen';
import { TestScreen } from '@/features/test/TestScreen';
import { ReviewScreen } from '@/features/review/ReviewScreen';
import { StatsScreen } from '@/features/stats/StatsScreen';
import { BookmarksScreen } from '@/features/bookmarks/BookmarksScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

/**
 * Hash routing: GitHub Pages serves static files only, so a path-based route
 * would 404 on reload. It also keeps the URLs the previous version used.
 */
export const router = createHashRouter([
  {
    element: (
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
    ),
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'lessons', element: <LessonListScreen /> },
      { path: 'lessons/:lessonId', element: <LessonDetailScreen /> },
      { path: 'stats', element: <StatsScreen /> },
      { path: 'bookmarks', element: <BookmarksScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
  {
    element: (
      <ErrorBoundary>
        <StudyLayout />
      </ErrorBoundary>
    ),
    children: [
      { path: 'review', element: <ReviewScreen /> },
      { path: 'study/flashcard/:lessonId', element: <FlashcardScreen /> },
      { path: 'study/type/:lessonId', element: <QuizTypeScreen /> },
      { path: 'study/listen/:lessonId', element: <QuizListenScreen /> },
      { path: 'study/match/:lessonId', element: <QuizMatchScreen /> },
      { path: 'study/choice/:lessonId', element: <QuizChoiceScreen /> },
      { path: 'test/:lessonId', element: <TestScreen /> },
      { path: 'test', element: <TestScreen /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

/** Route builders — screens never hand-assemble a URL. */
export const routes = {
  home: () => '/',
  lessons: () => '/lessons',
  lesson: (lessonId: string) => `/lessons/${encodeURIComponent(lessonId)}`,
  review: () => '/review',
  stats: () => '/stats',
  bookmarks: () => '/bookmarks',
  settings: () => '/settings',
  study: (mode: StudyMode, lessonId: string) => `/study/${mode}/${encodeURIComponent(lessonId)}`,
  test: (lessonId?: string) => (lessonId ? `/test/${encodeURIComponent(lessonId)}` : '/test'),
} as const;

export type StudyMode = 'flashcard' | 'type' | 'listen' | 'match' | 'choice';

export const STUDY_MODES: { mode: StudyMode; icon: string; label: string }[] = [
  { mode: 'flashcard', icon: '🃏', label: 'Flashcard' },
  { mode: 'type', icon: '⌨️', label: 'Điền từ' },
  { mode: 'listen', icon: '🎧', label: 'Nghe viết' },
  { mode: 'match', icon: '🔗', label: 'Nối từ' },
  { mode: 'choice', icon: '📝', label: 'Trắc nghiệm' },
];
