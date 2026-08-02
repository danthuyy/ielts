import { describe, expect, it } from 'vitest';
import {
  addDays,
  clamp,
  formatClock,
  formatDateVi,
  isAnswerCorrect,
  maskWord,
  percent,
  shuffle,
  toDateKey,
} from '@/lib/utils';

describe('shuffle', () => {
  it('does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it('keeps every element', () => {
    const result = shuffle([1, 2, 3, 4, 5]);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('toDateKey', () => {
  it('uses local time, not UTC', () => {
    // 23:30 local on the 31st must stay the 31st even when UTC has rolled over.
    const date = new Date(2026, 0, 31, 23, 30);
    expect(toDateKey(date)).toBe('2026-01-31');
  });

  it('zero-pads month and day', () => {
    expect(toDateKey(new Date(2026, 8, 5))).toBe('2026-09-05');
  });
});

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(toDateKey(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
  });

  it('goes backwards', () => {
    expect(toDateKey(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
  });
});

describe('formatDateVi', () => {
  it('renders day/month/year', () => {
    expect(formatDateVi('2026-08-01')).toBe('01/08/2026');
    expect(formatDateVi('2026-08-01T10:20:30.000Z')).toBe('01/08/2026');
  });

  it('passes unparseable input through', () => {
    expect(formatDateVi('')).toBe('');
    expect(formatDateVi(null)).toBe('');
  });
});

describe('formatClock', () => {
  it.each([
    [0, '00:00'],
    [59, '00:59'],
    [61, '01:01'],
    [600, '10:00'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});

describe('maskWord', () => {
  it('keeps the first letter and hides the rest', () => {
    expect(maskWord('vast')).toBe('v _ _ _');
  });

  it('leaves a single-letter word alone', () => {
    expect(maskWord('a')).toBe('a');
  });
});

describe('isAnswerCorrect', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(isAnswerCorrect('  Vast ', 'vast')).toBe(true);
  });

  it('rejects a different word', () => {
    expect(isAnswerCorrect('fast', 'vast')).toBe(false);
  });

  it('rejects an empty answer', () => {
    expect(isAnswerCorrect('', 'vast')).toBe(false);
  });
});

describe('percent and clamp', () => {
  it('rounds a percentage', () => {
    expect(percent(1, 3)).toBe(33);
  });

  it('guards division by zero', () => {
    expect(percent(5, 0)).toBe(0);
  });

  it('clamps to the range', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(50, 0, 100)).toBe(50);
  });
});
