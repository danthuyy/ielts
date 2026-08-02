import { describe, expect, it } from 'vitest';

import { buildCramPlan, daysUntil, describeCountdown } from '@/lib/exam';
import { minutesSinceMidnight, parseTimeOfDay, shouldRemind } from '@/lib/reminder';
import { todayKey } from '@/lib/utils';

describe('daysUntil', () => {
  it('counts whole days forward', () => {
    expect(daysUntil('2026-08-12', '2026-08-02')).toBe(10);
  });

  it('is zero on the day itself', () => {
    expect(daysUntil('2026-08-02', '2026-08-02')).toBe(0);
  });

  it('goes negative once the date has passed', () => {
    expect(daysUntil('2026-07-30', '2026-08-02')).toBe(-3);
  });

  it('is unaffected by a daylight-saving shift', () => {
    // A naive hours/24 calculation returns 30.958… here and floors to 30.
    expect(daysUntil('2026-04-01', '2026-03-01')).toBe(31);
  });
});

describe('buildCramPlan', () => {
  it('spreads the backlog over the days left, rounding up', () => {
    const plan = buildCramPlan('2026-08-12', 95, 0, '2026-08-02');
    expect(plan.daysLeft).toBe(10);
    expect(plan.perDay).toBe(10); // ceil(95 / 10)
    expect(plan.status).toBe('upcoming');
  });

  it('targets the whole backlog on exam day, not a division by zero', () => {
    const plan = buildCramPlan('2026-08-02', 40, 5, '2026-08-02');
    expect(plan.daysLeft).toBe(0);
    expect(plan.perDay).toBe(40);
    expect(plan.status).toBe('today');
  });

  it('marks a date in the past as passed', () => {
    expect(buildCramPlan('2026-07-01', 10, 0, '2026-08-02').status).toBe('passed');
  });

  it('asks for nothing when everything is mastered', () => {
    expect(buildCramPlan('2026-08-12', 0, 0, '2026-08-02').perDay).toBe(0);
  });

  it('carries today’s progress through', () => {
    expect(buildCramPlan('2026-08-12', 50, 7, '2026-08-02').doneToday).toBe(7);
  });
});

describe('describeCountdown', () => {
  it.each([
    [12, 'còn 12 ngày'],
    [0, 'thi hôm nay'],
    [-3, 'đã qua 3 ngày'],
  ])('describes %i as "%s"', (days, expected) => {
    expect(describeCountdown(days)).toBe(expected);
  });
});

describe('parseTimeOfDay', () => {
  it.each([
    ['20:00', 1200],
    ['00:00', 0],
    ['23:59', 1439],
    ['7:05', 425],
  ])('parses %s', (value, expected) => {
    expect(parseTimeOfDay(value)).toBe(expected);
  });

  it.each(['', 'xx:yy', '24:00', '12:60', '1200', '12:0'])('rejects %s', (value) => {
    expect(parseTimeOfDay(value)).toBeNull();
  });
});

describe('minutesSinceMidnight', () => {
  it('converts a clock time', () => {
    expect(minutesSinceMidnight(new Date('2026-08-02T09:30:00'))).toBe(570);
  });
});

describe('shouldRemind', () => {
  const at = (time: string) => new Date(`2026-08-02T${time}:00`);

  it('fires once the target time has arrived', () => {
    expect(shouldRemind('20:00', null, at('20:00'))).toBe(true);
  });

  it('still fires when the tab wakes up late', () => {
    // The point of >= rather than ==: a sleeping laptop must not skip the day.
    expect(shouldRemind('20:00', null, at('23:45'))).toBe(true);
  });

  it('stays quiet before the target time', () => {
    expect(shouldRemind('20:00', null, at('19:59'))).toBe(false);
  });

  it('only fires once a day', () => {
    expect(shouldRemind('20:00', todayKey(), at('21:00'))).toBe(false);
  });

  it('fires again the next day', () => {
    expect(shouldRemind('20:00', '2026-08-01', at('20:30'))).toBe(true);
  });

  it('does nothing with an unparseable time', () => {
    expect(shouldRemind('nope', null, at('23:00'))).toBe(false);
  });
});
