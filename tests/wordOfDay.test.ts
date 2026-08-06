import { describe, expect, it } from 'vitest';

import { hashString, pickWordOfDay, wordOfDayIndex } from '@/lib/wordOfDay';

describe('hashString', () => {
  it('is deterministic', () => {
    expect(hashString('2026-08-07')).toBe(hashString('2026-08-07'));
  });

  it('gives different dates different hashes', () => {
    expect(hashString('2026-08-07')).not.toBe(hashString('2026-08-08'));
  });

  it('stays within unsigned 32-bit range', () => {
    const h = hashString('anything at all');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('wordOfDayIndex', () => {
  it('always lands inside the list', () => {
    for (const day of ['2026-01-01', '2026-08-07', '2026-12-31']) {
      const idx = wordOfDayIndex(day, 7);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(7);
    }
  });

  it('is stable for the same day', () => {
    expect(wordOfDayIndex('2026-08-07', 100)).toBe(wordOfDayIndex('2026-08-07', 100));
  });

  it('returns 0 for an empty list rather than NaN', () => {
    expect(wordOfDayIndex('2026-08-07', 0)).toBe(0);
  });
});

describe('pickWordOfDay', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  it('picks the same item for the same day', () => {
    expect(pickWordOfDay(items, '2026-08-07')).toBe(pickWordOfDay(items, '2026-08-07'));
  });

  it('returns undefined for an empty list', () => {
    expect(pickWordOfDay([], '2026-08-07')).toBeUndefined();
  });

  it('returns a member of the list', () => {
    expect(items).toContain(pickWordOfDay(items, '2026-08-07'));
  });
});
