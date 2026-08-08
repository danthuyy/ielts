import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';

import { routes } from '@/app/routes';
import { LoadingScreen } from '@/components/ScreenState';
import {
  getActivitySince,
  getMasteryLevelCounts,
  getOverallStats,
  getTestHistory,
  getUpcomingReviews,
  getWeakWords,
} from '@/lib/progress';
import { MASTERY_LEVELS } from '@/lib/srs';
import { formatDateVi, percent } from '@/lib/utils';
import { Heatmap } from './Heatmap';

/** Cold → warm, so the bar visibly "ripens" from Mới to Thuộc. */
const LEVEL_COLORS = [
  'var(--text-dim)',
  'var(--info)',
  'var(--primary)',
  'var(--warning)',
  'var(--success)',
];

const HISTORY_LIMIT = 8;
const HEATMAP_WEEKS = 26;
const WEAK_LIMIT = 8;
const UPCOMING_DAYS = 14;

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function StatsScreen() {
  const data = useLiveQuery(async () => {
    const [stats, history, activity, weak, upcoming, levels] = await Promise.all([
      getOverallStats(),
      getTestHistory(HISTORY_LIMIT),
      getActivitySince(HEATMAP_WEEKS * 7),
      getWeakWords(WEAK_LIMIT),
      getUpcomingReviews(UPCOMING_DAYS),
      getMasteryLevelCounts(),
    ]);
    return { stats, history, activity, weak, upcoming, levels };
  }, []);

  if (!data) return <LoadingScreen />;

  const { stats, history, activity, weak, upcoming, levels } = data;
  const levelTotal = levels.reduce((sum, count) => sum + count, 0) || 1;
  const masteredPct = percent(stats.mastered, stats.total);
  const learningPct = percent(stats.learning, stats.total);
  const upcomingPeak = Math.max(1, ...upcoming.map((day) => day.count));

  return (
    <div className="page">
      <header className="page-head">
        <h1>Thống kê học tập</h1>
        <span className="page-head__meta">{stats.total} từ</span>
      </header>

      <section className="card donut-card" style={{ marginBottom: 'var(--sp-5)' }}>
        <div
          className="donut"
          style={{
            background: `conic-gradient(var(--success) 0 ${masteredPct}%, var(--warning) 0 ${
              masteredPct + learningPct
            }%, var(--info) 0)`,
          }}
          role="img"
          aria-label={`Đã thuộc ${masteredPct}%, đang học ${learningPct}%`}
        >
          <div className="donut__hole">{masteredPct}%</div>
        </div>

        <div className="legend">
          <div className="legend__item">
            <span className="legend__swatch" style={{ background: 'var(--success)' }} />
            Thuộc ({stats.mastered})
          </div>
          <div className="legend__item">
            <span className="legend__swatch" style={{ background: 'var(--warning)' }} />
            Đang học ({stats.learning})
          </div>
          <div className="legend__item">
            <span className="legend__swatch" style={{ background: 'var(--info)' }} />
            Mới ({stats.newCount})
          </div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 'var(--sp-5)' }}>
        <h2 className="section__label">Cấp độ thuộc</h2>
        <div className="levels">
          {MASTERY_LEVELS.map((label, level) => (
            <div className="level-row" key={label}>
              <span className="level-row__label">{label}</span>
              <span className="level-row__bar">
                <span
                  className="level-row__fill"
                  style={{
                    width: `${(levels[level] ?? 0) === 0 ? 0 : Math.max(3, ((levels[level] ?? 0) / levelTotal) * 100)}%`,
                    background: LEVEL_COLORS[level],
                  }}
                />
              </span>
              <span className="level-row__count">{levels[level] ?? 0}</span>
            </div>
          ))}
        </div>
        <p className="levels__hint">
          Học mix xong một từ → “Gần thuộc”. Ôn đúng lại vào hôm khác (theo lịch Ôn tập) → lên
          “Thuộc”.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 'var(--sp-5)' }}>
        <h2 className="section__label">Hoạt động</h2>
        <Heatmap activity={activity} weeks={HEATMAP_WEEKS} />
      </section>

      <section className="card" style={{ marginBottom: 'var(--sp-5)' }}>
        <h2 className="section__label">Lịch ôn {UPCOMING_DAYS} ngày tới</h2>
        {upcoming.every((day) => day.count === 0) ? (
          <p className="empty">Chưa có từ nào được lên lịch ôn.</p>
        ) : (
          <div className="schedule">
            {upcoming.map((day, index) => {
              const weekday = WEEKDAYS[new Date(`${day.date}T00:00:00`).getDay()] ?? '';
              return (
                <div
                  className="schedule__col"
                  key={day.date}
                  title={`${day.date}: ${day.count} từ`}
                >
                  <span className="schedule__count">{day.count > 0 ? day.count : ''}</span>
                  <span className="schedule__bar">
                    <span
                      className="schedule__fill"
                      style={{
                        height: `${day.count === 0 ? 2 : (day.count / upcomingPeak) * 100}%`,
                      }}
                    />
                  </span>
                  <span className={`schedule__day${index === 0 ? ' schedule__day--today' : ''}`}>
                    {index === 0 ? 'Nay' : weekday}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__header">
          <h2 className="section__label">Từ hay sai</h2>
          {weak.length > 0 && (
            <Link className="btn btn--secondary btn--sm" to={routes.weak()}>
              Luyện lại
            </Link>
          )}
        </div>

        {weak.length === 0 ? (
          <p className="empty">
            Chưa đủ dữ liệu. Một từ chỉ được tính là hay sai sau ít nhất 2 lần trả lời.
          </p>
        ) : (
          <ul className="word-list">
            {weak.map(({ record, accuracy, attempts }) => (
              <li className="weak-row" key={record.id}>
                <Link className="weak-row__main" to={routes.word(record.id)}>
                  <strong className="weak-row__word">{record.word}</strong>
                  <span className="weak-row__meta">
                    đúng {record.correctCount}/{attempts} lần
                  </span>
                </Link>
                <div className="weak-row__gauge" aria-hidden="true">
                  <span
                    className="weak-row__fill"
                    style={{ width: `${Math.round(accuracy * 100)}%` }}
                  />
                </div>
                <span className="weak-row__pct">{Math.round(accuracy * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <h2 className="section__label">Lịch sử kiểm tra</h2>
        {history.length === 0 ? (
          <p className="empty">Chưa có bài kiểm tra nào. Làm thử một bài để xem tiến bộ.</p>
        ) : (
          <ul className="word-list">
            {history.map((entry) => (
              <li className="history-row" key={entry.id ?? entry.date}>
                <div>
                  <p className="history-row__date">{formatDateVi(entry.date)}</p>
                  <p className="history-row__mode">
                    {entry.mode === 'mixed' ? 'Hỗn hợp' : entry.mode} · {entry.total} câu
                  </p>
                </div>
                <span
                  className={`history-row__score history-row__score--${
                    entry.score >= 80 ? 'good' : 'poor'
                  }`}
                >
                  {entry.score}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
