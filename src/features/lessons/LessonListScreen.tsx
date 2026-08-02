import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import { LESSONS } from '@/content/lessons';
import { groupByCategory } from '@/content/categories';
import { routes } from '@/app/routes';
import { getAllProgress } from '@/lib/progress';
import { percent } from '@/lib/utils';
import type { Lesson } from '@/content/schema';

const ALL = 'all';

function matches(lesson: Lesson, categoryLabel: string, query: string): boolean {
  if (!query) return true;
  const haystack = [lesson.title, lesson.description, categoryLabel, ...lesson.tags]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export function LessonListScreen() {
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [query, setQuery] = useState('');

  const masteredByLesson = useLiveQuery(async () => {
    const records = await getAllProgress();
    const counts = new Map<string, { mastered: number; learning: number }>();
    for (const record of records) {
      const entry = counts.get(record.lessonId) ?? { mastered: 0, learning: 0 };
      if (record.status === 'mastered') entry.mastered += 1;
      else if (record.status === 'learning') entry.learning += 1;
      counts.set(record.lessonId, entry);
    }
    return counts;
  }, []);

  const allGroups = useMemo(() => groupByCategory(LESSONS), []);

  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allGroups
      .filter((group) => activeCategory === ALL || group.key === activeCategory)
      .map((group) => ({
        ...group,
        lessons: group.lessons.filter((lesson) => matches(lesson, group.label, needle)),
      }))
      .filter((group) => group.lessons.length > 0);
  }, [allGroups, activeCategory, query]);

  const shownCount = visibleGroups.reduce((sum, group) => sum + group.lessons.length, 0);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Thư viện bài học</h1>
        <span className="page-head__meta">
          {shownCount} bài · {visibleGroups.length} chủ đề
        </span>
      </header>

      <div className="search" style={{ marginBottom: 'var(--sp-4)' }}>
        <span className="search__icon" aria-hidden="true">
          🔍
        </span>
        <input
          className="input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm bài học hoặc chủ đề..."
          aria-label="Tìm bài học"
        />
      </div>

      <div
        className="chip-row"
        style={{ marginBottom: 'var(--sp-6)' }}
        role="group"
        aria-label="Lọc theo chủ đề"
      >
        <button
          className="chip"
          aria-pressed={activeCategory === ALL}
          onClick={() => setActiveCategory(ALL)}
        >
          <span aria-hidden="true">📚</span> Tất cả{' '}
          <span className="chip__count">{LESSONS.length}</span>
        </button>
        {allGroups.map((group) => (
          <button
            className="chip"
            key={group.key}
            aria-pressed={activeCategory === group.key}
            onClick={() => setActiveCategory(group.key)}
          >
            <span aria-hidden="true">{group.icon}</span> {group.label}{' '}
            <span className="chip__count">{group.lessons.length}</span>
          </button>
        ))}
      </div>

      {visibleGroups.length === 0 ? (
        <p className="empty">Không tìm thấy bài học nào khớp với “{query}”.</p>
      ) : (
        visibleGroups.map((group) => (
          <section className="section" key={group.key} style={{ marginBottom: 'var(--sp-6)' }}>
            <h2 className="section__label">
              <span aria-hidden="true">{group.icon}</span> {group.label}
            </h2>
            <div className="tile-grid">
              {group.lessons.map((lesson) => {
                const counts = masteredByLesson?.get(lesson.id) ?? { mastered: 0, learning: 0 };
                const total = lesson.words.length;
                return (
                  <Link className="tile" to={routes.lesson(lesson.id)} key={lesson.id}>
                    <span className="tile__name">{lesson.title}</span>
                    {lesson.description && <span className="tile__meta">{lesson.description}</span>}
                    <span className="tile__meta">
                      {total} từ · thuộc {counts.mastered} · đang học {counts.learning}
                    </span>
                    <span className="progress progress--thin">
                      <span
                        className="progress__fill"
                        style={{ width: `${percent(counts.mastered, total)}%` }}
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
