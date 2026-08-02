import { getSetting, setSetting } from './settings';
import { toDateKey, todayKey } from './utils';

/**
 * Exam countdown.
 *
 * The SRS schedule optimises for remembering a word forever, which is the wrong
 * objective when there is a fixed date. Once a date is set, the app can say how
 * many words a day are left to cover and surface the ones that will still be
 * shaky by then.
 */

export function getExamDate(): string | null {
  const raw = getSetting('examDate');
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function setExamDate(date: string | null): void {
  setSetting('examDate', date ?? '');
}

/** Whole days from today to the exam. Negative once it has passed. */
export function daysUntil(examDate: string, from: string = todayKey()): number {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${examDate}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export interface CramPlan {
  examDate: string;
  daysLeft: number;
  /** Words not yet at "mastered". */
  remaining: number;
  /** Words to cover per day to finish everything before the date. */
  perDay: number;
  /** Already covered today, against that target. */
  doneToday: number;
  status: 'upcoming' | 'today' | 'passed';
}

export function buildCramPlan(
  examDate: string,
  remaining: number,
  doneToday: number,
  from: string = todayKey(),
): CramPlan {
  const daysLeft = daysUntil(examDate, from);
  const status = daysLeft > 0 ? 'upcoming' : daysLeft === 0 ? 'today' : 'passed';

  // On exam day, and after it, spreading over "days left" is meaningless — the
  // honest target is everything that is still not mastered.
  const perDay = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;

  return { examDate, daysLeft, remaining, perDay, doneToday, status };
}

/** A friendly countdown: "còn 12 ngày", "hôm nay", "đã qua 3 ngày". */
export function describeCountdown(daysLeft: number): string {
  if (daysLeft > 0) return `còn ${daysLeft} ngày`;
  if (daysLeft === 0) return 'thi hôm nay';
  return `đã qua ${Math.abs(daysLeft)} ngày`;
}

/** The soonest date a learner can sensibly pick — tomorrow. */
export function minimumExamDate(from: Date = new Date()): string {
  const next = new Date(from);
  next.setDate(next.getDate() + 1);
  return toDateKey(next);
}
