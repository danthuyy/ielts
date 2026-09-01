import { useMemo, useState } from 'react';

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

/** What the squares count. Both come from the same daily record. */
const METRICS = [
  { key: 'studied', label: 'Từ đã học', noun: 'từ' },
  { key: 'correct', label: 'Từ trả lời đúng', noun: 'từ đúng' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

/** Five buckets, scaled to the learner's own best day rather than a fixed count. */
function levelOf(value: number, peak: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0) return 0;
  const ratio = value / Math.max(peak, 1);
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

interface Cell {
  date: string;
  value: number;
  level: number;
}

/** Days studied in an unbroken run ending today (or yesterday, still alive). */
function streakOf(dates: ReadonlySet<string>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = dates.has(toDateKey(today)) ? today : addDays(today, -1);
  let run = 0;
  while (dates.has(toDateKey(cursor))) {
    run += 1;
    cursor = addDays(cursor, -1);
  }
  return run;
}

function formatDay(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

export interface HeatmapProps {
  activity: readonly DailyActivity[];
  weeks?: number;
}

/**
 * A GitHub-style contribution grid, laid out in columns of seven so each row is
 * a weekday. The window starts on a Sunday, otherwise the rows drift and the
 * weekday labels stop meaning anything.
 *
 * The squares can count either words seen or words answered correctly: the two
 * together show effort against accuracy, which a single number hides — a heavy
 * day of mostly-wrong answers looks identical to a good one otherwise.
 */
export function Heatmap({ activity, weeks = 26 }: HeatmapProps) {
  const [metric, setMetric] = useState<MetricKey>('studied');
  const active = METRICS.find((entry) => entry.key === metric) ?? METRICS[0];

  const { columns, total, activeDays, best, streak, studiedTotal, correctTotal } = useMemo(() => {
    const valueOf = (entry: DailyActivity) =>
      metric === 'correct' ? entry.wordsCorrect : entry.wordsStudied;
    const byDate = new Map(activity.map((entry) => [entry.date, valueOf(entry)]));
    const peak = Math.max(1, ...activity.map(valueOf));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = addDays(today, 6 - today.getDay()); // Saturday of this week
    const start = addDays(end, -(weeks * 7 - 1)); // a Sunday

    const cells: Cell[] = [];
    for (let i = 0; i < weeks * 7; i += 1) {
      const day = addDays(start, i);
      const date = toDateKey(day);
      const value = day > today ? -1 : (byDate.get(date) ?? 0);
      cells.push({ date, value, level: value <= 0 ? 0 : levelOf(value, peak) });
    }

    const grouped: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) grouped.push(cells.slice(i, i + 7));

    const seen = cells.filter((cell) => cell.value > 0);
    const bestCell = seen.reduce<Cell | null>(
      (top, cell) => (top === null || cell.value > top.value ? cell : top),
      null,
    );
    const inWindow = new Set(cells.map((cell) => cell.date));
    const studiedDays = new Set(
      activity.filter((entry) => entry.wordsStudied > 0).map((entry) => entry.date),
    );
    const windowed = activity.filter((entry) => inWindow.has(entry.date));

    return {
      columns: grouped,
      total: seen.reduce((sum, cell) => sum + cell.value, 0),
      activeDays: seen.length,
      best: bestCell,
      streak: streakOf(studiedDays),
      studiedTotal: windowed.reduce((sum, entry) => sum + entry.wordsStudied, 0),
      correctTotal: windowed.reduce((sum, entry) => sum + entry.wordsCorrect, 0),
    };
  }, [activity, weeks, metric]);

  // A label above the first column of each month, like GitHub's.
  const monthLabels = columns.map((column, index) => {
    const first = column[0];
    if (!first) return '';
    const month = Number(first.date.slice(5, 7)) - 1;
    const prev = columns[index - 1]?.[0];
    const prevMonth = prev ? Number(prev.date.slice(5, 7)) - 1 : -1;
    return month !== prevMonth ? (MONTH_LABELS[month] ?? '') : '';
  });

  const accuracy = studiedTotal > 0 ? Math.round((correctTotal / studiedTotal) * 100) : 0;
  const perDay = activeDays > 0 ? Math.round(total / activeDays) : 0;

  return (
    <div className="heatmap">
      <div className="heatmap__toolbar">
        <div className="segmented segmented--sm" role="group" aria-label="Đếm theo">
          {METRICS.map((entry) => (
            <button
              key={entry.key}
              aria-pressed={metric === entry.key}
              onClick={() => setMetric(entry.key)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="heatmap__stats">
        <div className="heatmap__stat">
          <span className="heatmap__stat-num">{total}</span>
          <span className="heatmap__stat-cap">{active.noun}</span>
        </div>
        <div className="heatmap__stat">
          <span className="heatmap__stat-num">{activeDays}</span>
          <span className="heatmap__stat-cap">ngày có học</span>
        </div>
        <div className="heatmap__stat">
          <span className="heatmap__stat-num">{perDay}</span>
          <span className="heatmap__stat-cap">TB mỗi ngày</span>
        </div>
        <div className="heatmap__stat">
          <span className="heatmap__stat-num">{streak}</span>
          <span className="heatmap__stat-cap">chuỗi hiện tại</span>
        </div>
      </div>

      <p className="heatmap__summary">
        {weeks} tuần gần đây: <strong>{studiedTotal}</strong> từ đã học,{' '}
        <strong>{correctTotal}</strong> đúng ({accuracy}%)
        {best ? (
          <>
            {' · cao nhất '}
            <strong>{best.value}</strong> {active.noun} ngày {formatDay(best.date)}
          </>
        ) : null}
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
              aria-label={`Hoạt động ${weeks} tuần gần đây: ${total} ${active.noun} trong ${activeDays} ngày`}
            >
              {columns.map((column, columnIndex) => (
                <div className="heatmap__col" key={columnIndex}>
                  {column.map((cell) => (
                    <span
                      key={cell.date}
                      className={`heatmap__cell heatmap__cell--l${cell.level}${
                        cell.value < 0 ? ' heatmap__cell--future' : ''
                      }`}
                      title={
                        cell.value < 0 ? cell.date : `${cell.date}: ${cell.value} ${active.noun}`
                      }
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
