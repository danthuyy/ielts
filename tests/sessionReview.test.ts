import { describe, expect, it } from 'vitest';

import { outcomeBuckets, type ReviewRow } from '@/lib/sessionOutcome';
import type { StudyWord } from '@/content/schema';

const word = (id: string): StudyWord =>
  ({ id, word: id, pos: 'n', ipa: '/x/', vi: id, lessonId: 'l' }) as unknown as StudyWord;

const row = (id: string, learned: boolean, misses?: number): ReviewRow => ({
  word: word(id),
  learned,
  ...(misses === undefined ? {} : { misses }),
});

describe('outcomeBuckets', () => {
  it('splits a session into clean, missed and unlearned', () => {
    const buckets = outcomeBuckets([
      row('a', true, 0),
      row('b', true, 0),
      row('c', true, 3),
      row('d', false, 2),
    ]);

    expect(buckets.map((bucket) => [bucket.key, bucket.count])).toEqual([
      ['clean', 2],
      ['missed', 1],
      ['unlearned', 1],
    ]);
  });

  it('drops empty bands so a clean sweep is one bar', () => {
    const buckets = outcomeBuckets([row('a', true, 0), row('b', true, 0)]);

    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({ key: 'clean', count: 2 });
  });

  it('counts a word with no miss data as clean once learned', () => {
    // Modes that only know "was it ever missed" pass no count at all.
    const buckets = outcomeBuckets([row('a', true), row('b', false)]);

    expect(buckets.map((bucket) => bucket.key)).toEqual(['clean', 'unlearned']);
  });

  it('never counts a word twice', () => {
    const rows = [row('a', true, 0), row('b', true, 1), row('c', false, 5), row('d', false)];
    const total = outcomeBuckets(rows).reduce((sum, bucket) => sum + bucket.count, 0);

    expect(total).toBe(rows.length);
  });

  it('has nothing to show for an empty session', () => {
    expect(outcomeBuckets([])).toEqual([]);
  });
});
