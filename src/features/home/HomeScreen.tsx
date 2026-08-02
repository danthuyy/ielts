import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import { LESSONS } from '@/content/lessons';
import { categoryOf } from '@/content/categories';
import { routes, STUDY_MODES } from '@/app/routes';
import { useSettings } from '@/hooks/useSettings';
import { LoadingScreen } from '@/components/ScreenState';
import { Sticker } from '@/components/Sticker';
import {
  countNewWords,
  countStudiedToday,
  countUnmastered,
  getActivitySince,
  getDueProgress,
  getLessonStats,
  getOverallStats,
  getStreak,
} from '@/lib/progress';
import { buildCramPlan, describeCountdown } from '@/lib/exam';
import { addDays, percent, toDateKey } from '@/lib/utils';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;

function greeting(hour: number): string {
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function todayLabel(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${WEEKDAYS[now.getDay()]}, ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

interface Day {
  key: string;
  label: string;
  isToday: boolean;
  studied: number;
}

/** Seven columns ending today, so the chart never collapses on a quiet week. */
function lastSevenDays(activity: { date: string; wordsStudied: number }[]): Day[] {
  const byDate = new Map(activity.map((entry) => [entry.date, entry.wordsStudied]));
  const days: Day[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = addDays(new Date(), -offset);
    const key = toDateKey(date);
    days.push({
      key,
      label: WEEKDAYS[date.getDay()] ?? '',
      isToday: offset === 0,
      studied: byDate.get(key) ?? 0,
    });
  }
  return days;
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const data = useLiveQuery(async () => {
    const [stats, streak, due, activity, unmastered, doneToday] = await Promise.all([
      getOverallStats(),
      getStreak(),
      getDueProgress(),
      getActivitySince(7),
      countUnmastered(),
      countStudiedToday(),
    ]);
    const newCount = await countNewWords();
    const lessonStats = await Promise.all(
      LESSONS.map(async (lesson) => ({ lesson, stats: await getLessonStats(lesson.id) })),
    );
    return {
      stats,
      streak,
      dueCount: due.length,
      activity,
      lessonStats,
      unmastered,
      doneToday,
      newCount,
    };
  }, []);

  if (!data) return <LoadingScreen />;

  const { stats, streak, dueCount, activity, lessonStats, unmastered, doneToday, newCount } = data;
  const cram = settings.examDate ? buildCramPlan(settings.examDate, unmastered, doneToday) : null;
  const days = lastSevenDays(activity);
  const studiedToday = days[days.length - 1]?.studied ?? 0;
  const goalPercent = percent(studiedToday, settings.dailyGoal);
  const peak = Math.max(...days.map((day) => day.studied), settings.dailyGoal, 1);
  const nothingDue = dueCount === 0;
  const now = new Date();

  return (
    <div className="page">
      <header className="page-head page-head--greeting">
        {settings.showStickers && (
          <Sticker name={now.getHours() < 18 ? 'morning' : 'night'} size="sm" />
        )}
        <div>
          <h1>{greeting(now.getHours())}!</h1>
          <span className="page-head__meta">{todayLabel(now)}</span>
        </div>
      </header>

      <div className="home-grid">
        <div className="home-col">
          {cram && cram.status !== 'passed' && (
            <section className="card cram-card">
              <div className="cram-card__head">
                <span className="cram-card__label">Kỳ thi</span>
                <span className="cram-card__countdown">{describeCountdown(cram.daysLeft)}</span>
              </div>
              <p className="cram-card__target">
                {cram.remaining === 0
                  ? 'Bạn đã thuộc hết số từ hiện có.'
                  : `Cần ${cram.perDay} từ/ngày để kịp ${cram.remaining} từ còn lại`}
              </p>
              {cram.remaining > 0 && (
                <>
                  <span className="progress progress--thin">
                    <span
                      className="progress__fill"
                      style={{ width: `${percent(cram.doneToday, cram.perDay)}%` }}
                    />
                  </span>
                  <p className="cram-card__today">
                    Hôm nay: {cram.doneToday}/{cram.perDay} từ
                  </p>
                </>
              )}
            </section>
          )}

          <section className={`card due-card${nothingDue ? ' due-card--empty' : ''}`}>
            <div>
              <p className="due-card__count">
                {nothingDue ? 'Không có từ cần ôn' : `${dueCount} từ cần ôn`}
              </p>
              <p className="due-card__sub">
                {nothingDue
                  ? newCount > 0
                    ? `Còn ${newCount} từ chưa gặp bao giờ.`
                    : 'Bạn đã gặp qua mọi từ hiện có.'
                  : 'Ôn đúng hạn là cách nhớ lâu nhất.'}
              </p>
            </div>
            <div className="due-card__actions">
              {!nothingDue && (
                <button className="btn" onClick={() => navigate(routes.review())}>
                  Ôn tập ngay
                </button>
              )}
              {newCount > 0 && (
                <button
                  className={nothingDue ? 'btn' : 'btn btn--ghost-on-accent'}
                  onClick={() => navigate(routes.newWords())}
                >
                  Học {Math.min(settings.dailyGoal, newCount)} từ mới
                </button>
              )}
              {nothingDue && newCount === 0 && (
                <button className="btn" onClick={() => navigate(routes.lessons())}>
                  Thư viện bài học
                </button>
              )}
            </div>
          </section>

          <section className="section">
            <h2 className="section__label">Chủ đề</h2>
            {lessonStats.length > 0 ? (
              <div className="tile-grid">
                {lessonStats.map(({ lesson, stats: lessonStat }) => {
                  const category = categoryOf(lesson);
                  const total = lesson.words.length;
                  return (
                    <Link className="tile" to={routes.lesson(lesson.id)} key={lesson.id}>
                      <span className="tile__icon" aria-hidden="true">
                        {category.icon}
                      </span>
                      <span className="tile__name">{lesson.title}</span>
                      <span className="tile__meta">
                        {category.label} · {total} từ · thuộc {lessonStat.mastered}
                      </span>
                      <span className="progress progress--thin">
                        <span
                          className="progress__fill"
                          style={{ width: `${percent(lessonStat.mastered, total)}%` }}
                        />
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="empty">Chưa có bài học nào.</p>
            )}
          </section>

          <section className="section">
            <h2 className="section__label">Luyện nhanh</h2>
            {LESSONS[0] && (
              <Link className="mode-hero" to={routes.study('mix', LESSONS[0].id)}>
                <span className="mode-hero__icon" aria-hidden="true">
                  🎯
                </span>
                <span className="mode-hero__text">
                  <strong>Học mix</strong>
                  <span>Trộn nhiều dạng, khó dần, lặp tới khi thuộc hết</span>
                </span>
                <span className="mode-hero__go" aria-hidden="true">
                  →
                </span>
              </Link>
            )}
            <div className="mode-grid">
              {STUDY_MODES.filter((mode) => mode.mode !== 'match' && mode.mode !== 'mix').map(
                (mode) => (
                  <Link
                    className="mode-tile"
                    key={mode.mode}
                    to={LESSONS[0] ? routes.study(mode.mode, LESSONS[0].id) : routes.lessons()}
                  >
                    <span className="mode-tile__icon" aria-hidden="true">
                      {mode.icon}
                    </span>
                    <span>{mode.label}</span>
                  </Link>
                ),
              )}
            </div>
          </section>
        </div>

        <div className="home-col">
          <section className="card">
            <div className="streak">
              <span className="streak__flame" aria-hidden="true">
                {streak > 0 ? '🔥' : '🌱'}
              </span>
              <div>
                <p className="streak__num">{streak} ngày</p>
                <p className="streak__cap">chuỗi học liên tục</p>
              </div>
            </div>

            <div className="goal">
              <div className="goal__row">
                <span>Mục tiêu hôm nay</span>
                <span>
                  {studiedToday}/{settings.dailyGoal} từ
                </span>
              </div>
              <div
                className="progress progress--thin"
                role="progressbar"
                aria-valuenow={goalPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Tiến độ mục tiêu hôm nay"
              >
                <div className="progress__fill" style={{ width: `${goalPercent}%` }} />
              </div>
            </div>
          </section>

          <section className="stat-row">
            <div className="stat">
              <div className="stat__num">{stats.total}</div>
              <div className="stat__cap">Tổng từ</div>
            </div>
            <div className="stat">
              <div className="stat__num stat__num--learning">{stats.learning}</div>
              <div className="stat__cap">Đang học</div>
            </div>
            <div className="stat">
              <div className="stat__num stat__num--mastered">{stats.mastered}</div>
              <div className="stat__cap">Đã thuộc</div>
            </div>
          </section>

          <section className="card section">
            <h2 className="section__label">Hoạt động 7 ngày</h2>
            <div className="chart">
              {days.map((day) => (
                <div
                  className={`chart__col${day.isToday ? ' chart__col--today' : ''}`}
                  key={day.key}
                  title={`${day.key}: ${day.studied} từ`}
                >
                  <div className="chart__bar">
                    <div
                      className="chart__fill"
                      style={{
                        height:
                          day.studied === 0
                            ? '3%'
                            : `${Math.max(8, Math.round((day.studied / peak) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="chart__day">{day.label}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
