import { Outlet, useParams } from 'react-router-dom';
import { NavBar } from './NavBar';
import { LESSONS } from '@/content/lessons';
import { LessonGate } from '@/components/LessonGate';

/** Layout for the tabbed screens. Study screens render outside it, full-bleed. */
export function AppShell() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Bỏ qua điều hướng
      </a>
      <NavBar />
      <main className="shell__main" id="main">
        <Outlet />
      </main>
    </div>
  );
}

/** Layout for full-screen study modes: no nav, no page chrome. */
export function StudyLayout() {
  const { lessonId } = useParams();
  const lesson = lessonId ? LESSONS.find((entry) => entry.id === lessonId) : undefined;
  const words = lesson ? lesson.words.map((word) => word.word) : [];
  return (
    <main className="shell__main" id="main" style={{ height: '100%' }}>
      {/* Keyed by session so opening a different lesson re-runs the warm-up and
          shows a fresh idiom, rather than reusing the first one's ready state. */}
      <LessonGate key={lessonId ?? 'session'} words={words}>
        <Outlet />
      </LessonGate>
    </main>
  );
}
