import { useMemo } from 'react';

import type { DailyActivity } from '@/lib/db';
import { addDays, toDateKey } from '@/lib/utils';

const WEEKDAY_LABELS = ['CN', '', 'T3', '', 'T5', '', 'T7'];
const MONTH_LABELS = [
  'Th1',
  'Th2',
  'Th3',
  'Th4',
  'Th5',
  'Th6',
  'Th7',
  'Th8',
  'Th9',
  'Th10',
  'Th11',
  'Th12',
];

/** Five buckets, scaled to the learner's own best day rather than a fixed count. */
function levelOf(studied: number, peak: number): 0 | 1 | 2 | 3 | 4 {
  if (studied <= 0) return 0;
  const ratio = studied / Math.max(peak, 1);
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

interface Cell {
  date: string;
  studied: number;
  level: number;
}

export interface HeatmapProps {
  activity: readonly DailyActivity[];
  weeks?: number;
}

/**
 * A GitHub-style contribution grid, laid out in columns of seven so each row is
 * a weekday. The window starts on a Sunday, otherwise the rows drift and the
 * weekday labels stop meaning anything.
 */
export function Heatmap({ activity, weeks = 26 }: HeatmapProps) {
  const columns = useMemo(() => {
    const byDate = new Map(activity.map((entry) => [entry.date, entry.wordsStudied]));
    const peak = Math.max(1, ...activity.map((entry) => entry.wordsStudied));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = addDays(today, 6 - today.getDay()); // Saturday of this week
    const start = addDays(end, -(weeks * 7 - 1)); // a Sunday

    const cells: Cell[] = [];
    for (let i = 0; i < weeks * 7; i += 1) {
      const day = addDays(start, i);
      const date = toDateKey(day);
      const studied = day > today ? -1 : (byDate.get(date) ?? 0);
      cells.push({ date, studied, level: studied <= 0 ? 0 : levelOf(studied, peak) });
    }

    const grouped: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) grouped.push(cells.slice(i, i + 7));
    return grouped;
  }, [activity, weeks]);

  // A label above the first column of each month, like GitHub's.
  const monthLabels = columns.map((column, index) => {
    const first = column[0];
    if (!first) return '';
    const month = Number(first.date.slice(5, 7)) - 1;
    const prev = columns[index - 1]?.[0];
    const prevMonth = prev ? Number(prev.date.slice(5, 7)) - 1 : -1;
    return month !== prevMonth ? (MONTH_LABELS[month] ?? '') : '';
  });

  const total = columns.flat().reduce((sum, cell) => sum + Math.max(0, cell.studied), 0);
  const activeDays = columns.flat().filter((cell) => cell.studied > 0).length;

  return (
    <div className="heatmap">
      <p className="heatmap__summary">
        {total} từ trong {activeDays} ngày học, {weeks} tuần gần đây
      </p>

      <div className="heatmap__scroll">
        <div className="heatmap__grid-wrap">
          <div className="heatmap__months" aria-hidden="true">
            {monthLabels.map((label, index) => (
              <span key={index} className="heatmap__month">
                {label}
              </span>
            ))}
          </div>

          <div className="heatmap__body">
            <div className="heatmap__weekdays" aria-hidden="true">
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={index} className="heatmap__weekday">
                  {label}
                </span>
              ))}
            </div>

            <div
              className="heatmap__grid"
              role="img"
              aria-label={`Hoạt động ${weeks} tuần gần đây: ${total} từ trong ${activeDays} ngày`}
            >
              {columns.map((column, columnIndex) => (
                <div className="heatmap__col" key={columnIndex}>
                  {column.map((cell) => (
                    <span
                      key={cell.date}
                      className={`heatmap__cell heatmap__cell--l${cell.level}${
                        cell.studied < 0 ? ' heatmap__cell--future' : ''
                      }`}
                      title={cell.studied < 0 ? cell.date : `${cell.date}: ${cell.studied} từ`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="heatmap__legend" aria-hidden="true">
        <span>Ít</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className={`heatmap__cell heatmap__cell--l${level}`} />
        ))}
        <span>Nhiều</span>
      </div>
    </div>
  );
}
