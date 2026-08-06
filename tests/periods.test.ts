import { describe, expect, it } from 'vitest';

import {
  groupByPeriod,
  isGranularity,
  isoWeek,
  periodKeyOf,
  periodLabelOf,
  type DatedLesson,
} from '@/lib/periods';

describe('isoWeek', () => {
  it('numbers a mid-year week', () => {
    // 2026-08-06 is a Thursday in ISO week 32.
    expect(isoWeek('2026-08-06')).toEqual({ year: 2026, week: 32 });
  });

  it('files early January into the previous week-year when it belongs there', () => {
    // 2021-01-01 is a Friday; ISO week 53 of 2020.
    expect(isoWeek('2021-01-01')).toEqual({ year: 2020, week: 53 });
  });

  it('files late December into week 1 of the next year when it belongs there', () => {
    // 2018-12-31 is a Monday; ISO week 1 of 2019.
    expect(isoWeek('2018-12-31')).toEqual({ year: 2019, week: 1 });
  });

  it('returns null for a malformed date', () => {
    expect(isoWeek('not-a-date')).toBeNull();
  });
});

describe('periodKeyOf', () => {
  it('builds a zero-padded week key', () => {
    expect(periodKeyOf('2026-02-10', 'week')).toBe('2026-W07');
  });

  it('builds a month key', () => {
    expect(periodKeyOf('2026-08-01', 'month')).toBe('2026-08');
  });

  it('builds a year key', () => {
    expect(periodKeyOf('2026-08-01', 'year')).toBe('2026');
  });

  it('returns null for a malformed date', () => {
    expect(periodKeyOf('2026/08/01', 'month')).toBeNull();
  });

  it('keys days in the same ISO week identically regardless of weekday', () => {
    // Mon 2026-08-03 … Sun 2026-08-09 are all ISO week 32.
    const keys = ['2026-08-03', '2026-08-06', '2026-08-09'].map((d) => periodKeyOf(d, 'week'));
    expect(new Set(keys)).toEqual(new Set(['2026-W32']));
  });
});

describe('periodLabelOf', () => {
  it('labels a year', () => {
    expect(periodLabelOf('2026', 'year')).toEqual({ title: 'Năm 2026', range: '' });
  });

  it('labels a month with the Vietnamese month name', () => {
    expect(periodLabelOf('2026-08', 'month')).toEqual({ title: 'Tháng 8 · 2026', range: '' });
  });

  it('labels a week with its Monday–Sunday range', () => {
    expect(periodLabelOf('2026-W32', 'week')).toEqual({
      title: 'Tuần 32 · 2026',
      range: '03/08 – 09/08',
    });
  });
});

describe('isGranularity', () => {
  it('accepts the known values', () => {
    expect(isGranularity('week')).toBe(true);
    expect(isGranularity('month')).toBe(true);
    expect(isGranularity('year')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isGranularity('decade')).toBe(false);
    expect(isGranularity(undefined)).toBe(false);
  });
});

describe('groupByPeriod', () => {
  const lessons: DatedLesson[] = [
    { id: 'a', date: '2026-08-06', words: [1, 2, 3] }, // week 32, Aug, 2026
    { id: 'b', date: '2026-08-04', words: [1, 2] }, // week 32, Aug, 2026
    { id: 'c', date: '2026-07-20', words: [1] }, // week 30, Jul, 2026
    { id: 'd', date: '2025-12-15', words: [1, 2, 3, 4] }, // 2025
  ];

  it('buckets lessons of the same week together and sums their words', () => {
    const groups = groupByPeriod(lessons, 'week');
    const week32 = groups.find((g) => g.key === '2026-W32');
    expect(week32?.lessonIds.sort()).toEqual(['a', 'b']);
    expect(week32?.lessonCount).toBe(2);
    expect(week32?.wordCount).toBe(5);
  });

  it('orders buckets newest first', () => {
    const weeks = groupByPeriod(lessons, 'week').map((g) => g.key);
    expect(weeks).toEqual(['2026-W32', '2026-W30', '2025-W51']);
  });

  it('groups by month', () => {
    const months = groupByPeriod(lessons, 'month');
    expect(months.map((g) => g.key)).toEqual(['2026-08', '2026-07', '2025-12']);
    expect(months.find((g) => g.key === '2026-08')?.wordCount).toBe(5);
  });

  it('groups by year', () => {
    const years = groupByPeriod(lessons, 'year');
    expect(years.map((g) => g.key)).toEqual(['2026', '2025']);
    expect(years.find((g) => g.key === '2026')?.lessonCount).toBe(3);
  });

  it('skips lessons with an unparseable date rather than throwing', () => {
    const groups = groupByPeriod([{ id: 'x', date: 'bogus', words: [1] }], 'month');
    expect(groups).toEqual([]);
  });
});
