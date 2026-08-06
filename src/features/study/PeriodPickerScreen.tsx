import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { LESSONS } from '@/content/lessons';
import { routes } from '@/app/routes';
import { EmptyState } from '@/components/ScreenState';
import { GRANULARITIES, GRANULARITY_LABEL, groupByPeriod, type Granularity } from '@/lib/periods';

/**
 * "Study a whole week / month / year at once."
 *
 * Picks a granularity, then lists the periods that actually have lessons in
 * them, newest first. Choosing one starts a mixed session over every word added
 * in that period — the same engine a single lesson uses, just seeded with a
 * wider net.
 */
export function PeriodPickerScreen() {
  const [granularity, setGranularity] = useState<Granularity>('week');

  const groups = useMemo(() => groupByPeriod(LESSONS, granularity), [granularity]);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Học theo kỳ</h1>
        <span className="page-head__meta">
          Trộn tất cả từ đã thêm trong một tuần, một tháng hay cả năm
        </span>
      </header>

      <div
        className="segmented"
        role="group"
        aria-label="Chọn khoảng thời gian"
        style={{ marginBottom: 'var(--sp-4)' }}
      >
        {GRANULARITIES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={granularity === value}
            onClick={() => setGranularity(value)}
          >
            {GRANULARITY_LABEL[value]}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="Chưa có bài học nào"
          description="Thêm bài học rồi quay lại để học trộn theo tuần, tháng hoặc năm."
          action={
            <Link className="btn btn--primary btn--lg" to={routes.lessons()}>
              Thư viện bài học
            </Link>
          }
        />
      ) : (
        <div className="tile-grid">
          {groups.map((group) => (
            <Link className="tile" key={group.key} to={routes.periodMix(granularity, group.key)}>
              <span className="tile__icon" aria-hidden="true">
                {granularity === 'week' ? '📅' : granularity === 'month' ? '🗓️' : '📆'}
              </span>
              <span className="tile__name">{group.label.title}</span>
              <span className="tile__meta">
                {group.label.range && `${group.label.range} · `}
                {group.lessonCount} bài · {group.wordCount} từ
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
