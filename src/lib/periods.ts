/**
 * Grouping lessons by the calendar period they were added in, so a learner can
 * study "everything from this week / month / year" as one mixed session rather
 * than opening lessons one at a time.
 *
 * Everything here works on the lesson's `date` string (YYYY-MM-DD) directly,
 * never through `new Date(string)` — parsing an ISO date as a Date pins it to
 * UTC midnight, which then reads back as the previous day in negative-offset
 * timezones and silently files a lesson under the wrong week. Splitting the
 * string keeps the calendar date the author wrote.
 */

export const GRANULARITIES = ['week', 'month', 'year'] as const;
export type Granularity = (typeof GRANULARITIES)[number];

export const GRANULARITY_LABEL: Record<Granularity, string> = {
  week: 'Tuần',
  month: 'Tháng',
  year: 'Năm',
};

const pad = (n: number) => String(n).padStart(2, '0');

const VI_MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
] as const;

export function isGranularity(value: string | undefined): value is Granularity {
  return value !== undefined && (GRANULARITIES as readonly string[]).includes(value);
}

interface Ymd {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/** Split a YYYY-MM-DD string into its parts. Returns null for anything else. */
function parseYmd(dateStr: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/**
 * ISO-8601 week number and its week-year.
 *
 * The week-year is not always the calendar year: the first days of January can
 * belong to the last week of the previous year, and the last days of December
 * to week 1 of the next. The count runs Monday–Sunday and week 1 is the one
 * containing the first Thursday of the year (equivalently, Jan 4th).
 */
export function isoWeek(dateStr: string): { year: number; week: number } | null {
  const ymd = parseYmd(dateStr);
  if (!ymd) return null;

  // A UTC date is only ever used as an arithmetic vehicle here — never rendered
  // — so there is no timezone to leak.
  const date = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day));
  const dayOfWeek = (date.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  // Shift onto the Thursday of this week; its calendar year is the week-year.
  date.setUTCDate(date.getUTCDate() - dayOfWeek + 3);
  const weekYear = date.getUTCFullYear();

  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  const firstDayOfWeek = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayOfWeek + 3);

  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return { year: weekYear, week };
}

/**
 * The stable key a period is addressed by — it goes in the URL, so it must be
 * URL-safe and round-trip exactly.
 *
 *   week  → "2026-W32"
 *   month → "2026-08"
 *   year  → "2026"
 */
export function periodKeyOf(dateStr: string, granularity: Granularity): string | null {
  const ymd = parseYmd(dateStr);
  if (!ymd) return null;

  if (granularity === 'year') return String(ymd.year);
  if (granularity === 'month') return `${ymd.year}-${pad(ymd.month)}`;

  const week = isoWeek(dateStr);
  return week ? `${week.year}-W${pad(week.week)}` : null;
}

/** The Monday (UTC) that opens a given ISO week. */
function isoWeekMonday(weekYear: number, week: number): Date {
  const jan4 = new Date(Date.UTC(weekYear, 0, 4));
  const jan4DayOfWeek = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4DayOfWeek);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

export interface PeriodLabel {
  /** Primary line, e.g. "Tuần 32 · 2026". */
  title: string;
  /** Secondary line: the date range for a week, empty otherwise. */
  range: string;
}

/** Human-readable Vietnamese labels for a period key. */
export function periodLabelOf(key: string, granularity: Granularity): PeriodLabel {
  if (granularity === 'year') {
    return { title: `Năm ${key}`, range: '' };
  }

  if (granularity === 'month') {
    const [year, month] = key.split('-');
    const name = VI_MONTHS[Number(month) - 1] ?? `Tháng ${Number(month)}`;
    return { title: `${name} · ${year}`, range: '' };
  }

  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) return { title: key, range: '' };
  const weekYear = Number(match[1]);
  const week = Number(match[2]);
  const monday = isoWeekMonday(weekYear, week);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const dm = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
  return {
    title: `Tuần ${week} · ${weekYear}`,
    range: `${dm(monday)} – ${dm(sunday)}`,
  };
}

/** The minimum shape `groupByPeriod` needs from a lesson. */
export interface DatedLesson {
  id: string;
  date: string;
  words: readonly unknown[];
}

export interface PeriodGroup {
  key: string;
  granularity: Granularity;
  label: PeriodLabel;
  lessonIds: string[];
  lessonCount: number;
  wordCount: number;
}

/**
 * Bucket lessons into periods of the given granularity, newest first.
 *
 * The keys are zero-padded (`2026-W07`, `2026-03`), so a plain reverse string
 * sort is already chronological — no date parsing needed to order the buckets.
 * A lesson whose date does not parse is skipped rather than crashing the list.
 */
export function groupByPeriod(
  lessons: readonly DatedLesson[],
  granularity: Granularity,
): PeriodGroup[] {
  const buckets = new Map<string, PeriodGroup>();

  for (const lesson of lessons) {
    const key = periodKeyOf(lesson.date, granularity);
    if (key === null) continue;

    let group = buckets.get(key);
    if (!group) {
      group = {
        key,
        granularity,
        label: periodLabelOf(key, granularity),
        lessonIds: [],
        lessonCount: 0,
        wordCount: 0,
      };
      buckets.set(key, group);
    }
    group.lessonIds.push(lesson.id);
    group.lessonCount += 1;
    group.wordCount += lesson.words.length;
  }

  return [...buckets.values()].sort((a, b) => b.key.localeCompare(a.key));
}
