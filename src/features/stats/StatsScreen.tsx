import { useLiveQuery } from 'dexie-react-hooks';

import { LoadingScreen } from '@/components/ScreenState';
import { getOverallStats, getTestHistory } from '@/lib/progress';
import { formatDateVi, percent } from '@/lib/utils';

const HISTORY_LIMIT = 8;

export function StatsScreen() {
  const data = useLiveQuery(async () => {
    const [stats, history] = await Promise.all([getOverallStats(), getTestHistory(HISTORY_LIMIT)]);
    return { stats, history };
  }, []);

  if (!data) return <LoadingScreen />;

  const { stats, history } = data;
  const masteredPct = percent(stats.mastered, stats.total);
  const learningPct = percent(stats.learning, stats.total);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Thống kê học tập</h1>
        <span className="page-head__meta">{stats.total} từ</span>
      </header>

      <section className="card donut-card" style={{ marginBottom: 'var(--sp-6)' }}>
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
