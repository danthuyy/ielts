import { useMemo } from 'react';

import type { DailyActivity } from '@/lib/db';
import { percent } from '@/lib/utils';

/** Display names and order for the modes that record activity. */
const MODE_LABELS: Record<string, string> = {
  mix: '🎯 Học mix',
  flashcard: '🃏 Flashcard',
  'quiz-type': '⌨️ Điền từ',
  'quiz-listen': '🎧 Nghe viết',
  'quiz-match': '🔗 Nối từ',
  'quiz-choice': '📝 Trắc nghiệm',
  test: '📄 Bài kiểm tra',
  review: '🔁 Ôn tập',
};

function labelOf(mode: string): string {
  return MODE_LABELS[mode] ?? mode;
}

interface Row {
  mode: string;
  studied: number;
  correct: number;
}

/**
 * Accuracy per study mode.
 *
 * A single day-level accuracy figure is not comparable with itself: flashcards
 * are self-graded and land near 100%, while mixed practice counts a miss on
 * every rung of every word, so a heavy mix session drags the average down even
 * when it is the most productive thing the learner did. Split apart, each
 * number means something — and a mode that is genuinely too hard shows up.
 */
export function ModeBreakdown({ activity }: { activity: readonly DailyActivity[] }) {
  const rows = useMemo(() => {
    const totals = new Map<string, Row>();
    for (const day of activity) {
      if (!day.byMode) continue;
      for (const [mode, tally] of Object.entries(day.byMode)) {
        const row = totals.get(mode) ?? { mode, studied: 0, correct: 0 };
        row.studied += tally.studied;
        row.correct += tally.correct;
        totals.set(mode, row);
      }
    }
    return [...totals.values()].filter((row) => row.studied > 0).sort((a, b) => b.studied - a.studied);
  }, [activity]);

  // Older records predate the per-mode breakdown, so there is nothing to show
  // until the learner studies again. Saying so beats an empty box.
  if (rows.length === 0) {
    return (
      <p className="empty">
        Chưa có dữ liệu theo chế độ. Số liệu này bắt đầu được ghi từ các buổi học sau, nên học thêm
        vài buổi là sẽ hiện.
      </p>
    );
  }

  return (
    <div className="mode-rows">
      {rows.map((row) => {
        const rate = percent(row.correct, row.studied);
        return (
          <div className="mode-row" key={row.mode}>
            <span className="mode-row__label">{labelOf(row.mode)}</span>
            <span className="mode-row__bar">
              <span
                className="mode-row__fill"
                style={{
                  width: `${Math.max(3, rate)}%`,
                  background:
                    rate >= 70 ? 'var(--success)' : rate >= 45 ? 'var(--warning)' : 'var(--danger)',
                }}
              />
            </span>
            <span className="mode-row__num">
              {rate}%
              <small>
                {row.correct}/{row.studied}
              </small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
