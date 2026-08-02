import { beforeEach, describe, expect, it } from 'vitest';

import { db, type WordProgress } from '@/lib/db';
import { getUpcomingReviews, getWeakWords } from '@/lib/progress';
import { INITIAL_SRS } from '@/lib/srs';
import { addDays, toDateKey, todayKey } from '@/lib/utils';

beforeEach(async () => {
  await db.open();
  await db.wordProgress.clear();
});

function record(overrides: Partial<WordProgress> & { id: string }): WordProgress {
  return {
    lessonId: 'hello_happiness',
    word: overrides.id.split(':')[1] ?? 'x',
    ...INITIAL_SRS,
    status: 'learning',
    correctCount: 0,
    totalCount: 0,
    bookmarked: 0,
    lastReviewed: null,
    ...overrides,
  };
}

describe('getWeakWords', () => {
  it('ranks the least accurate word first', async () => {
    await db.wordProgress.bulkPut([
      record({ id: 'l:good', correctCount: 9, totalCount: 10 }), // 90%
      record({ id: 'l:awful', correctCount: 1, totalCount: 10 }), // 10%
      record({ id: 'l:middling', correctCount: 5, totalCount: 10 }), // 50%
    ]);

    const weak = await getWeakWords();
    expect(weak.map((entry) => entry.record.id)).toEqual(['l:awful', 'l:middling', 'l:good']);
    expect(weak[0]?.accuracy).toBeCloseTo(0.1);
  });

  it('ignores words with too few attempts to judge', async () => {
    await db.wordProgress.bulkPut([
      record({ id: 'l:once', correctCount: 0, totalCount: 1 }),
      record({ id: 'l:twice', correctCount: 0, totalCount: 2 }),
    ]);

    const weak = await getWeakWords();
    expect(weak.map((entry) => entry.record.id)).toEqual(['l:twice']);
  });

  it('ignores never-missed words and untouched new words', async () => {
    await db.wordProgress.bulkPut([
      record({ id: 'l:perfect', correctCount: 6, totalCount: 6 }),
      record({ id: 'l:fresh', status: 'new', correctCount: 0, totalCount: 4 }),
    ]);

    expect(await getWeakWords()).toEqual([]);
  });

  it('breaks accuracy ties on ease factor, so repeated lapses rank higher', async () => {
    await db.wordProgress.bulkPut([
      record({ id: 'l:steady', correctCount: 2, totalCount: 4, easeFactor: 2.5 }),
      record({ id: 'l:lapsing', correctCount: 2, totalCount: 4, easeFactor: 1.4 }),
    ]);

    const weak = await getWeakWords();
    expect(weak.map((entry) => entry.record.id)).toEqual(['l:lapsing', 'l:steady']);
  });

  it('honours the limit', async () => {
    await db.wordProgress.bulkPut(
      Array.from({ length: 10 }, (_, i) =>
        record({ id: `l:w${i}`, correctCount: 1, totalCount: 4 }),
      ),
    );

    expect(await getWeakWords(3)).toHaveLength(3);
  });
});

describe('getUpcomingReviews', () => {
  it('returns one bucket per day, starting today', async () => {
    const upcoming = await getUpcomingReviews(7);
    expect(upcoming).toHaveLength(7);
    expect(upcoming[0]?.date).toBe(todayKey());
    expect(upcoming[6]?.date).toBe(toDateKey(addDays(new Date(), 6)));
  });

  it('counts words on the day they fall due', async () => {
    const inThree = toDateKey(addDays(new Date(), 3));
    await db.wordProgress.bulkPut([
      record({ id: 'l:a', nextReview: inThree }),
      record({ id: 'l:b', nextReview: inThree }),
    ]);

    const upcoming = await getUpcomingReviews(7);
    expect(upcoming.find((day) => day.date === inThree)?.count).toBe(2);
  });

  it('folds overdue words into today rather than hiding them in the past', async () => {
    await db.wordProgress.put(
      record({ id: 'l:overdue', nextReview: toDateKey(addDays(new Date(), -9)) }),
    );

    const upcoming = await getUpcomingReviews(7);
    expect(upcoming[0]?.count).toBe(1);
  });

  it('excludes words that have never been studied', async () => {
    await db.wordProgress.put(record({ id: 'l:new', status: 'new', nextReview: todayKey() }));

    const upcoming = await getUpcomingReviews(7);
    expect(upcoming.every((day) => day.count === 0)).toBe(true);
  });

  it('drops words scheduled beyond the window', async () => {
    await db.wordProgress.put(
      record({ id: 'l:far', nextReview: toDateKey(addDays(new Date(), 40)) }),
    );

    const upcoming = await getUpcomingReviews(7);
    expect(upcoming.every((day) => day.count === 0)).toBe(true);
  });
});
