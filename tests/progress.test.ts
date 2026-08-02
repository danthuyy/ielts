import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/lib/db';
import {
  ensureProgressRecords,
  exportProgress,
  getBookmarked,
  getDueProgress,
  getOverallStats,
  getStreak,
  importProgress,
  migrateLegacyKeys,
  recordActivity,
  recordAnswer,
  toggleBookmark,
} from '@/lib/progress';
import { ALL_STUDY_WORDS, LESSONS } from '@/content/lessons';
import { INITIAL_SRS, processAnswer, QUALITY } from '@/lib/srs';
import { addDays, toDateKey, todayKey } from '@/lib/utils';

beforeEach(async () => {
  await db.open();
  await Promise.all([db.wordProgress.clear(), db.testHistory.clear(), db.dailyActivity.clear()]);
});

describe('ensureProgressRecords', () => {
  it('creates one record per word in the content', async () => {
    await ensureProgressRecords();
    expect(await db.wordProgress.count()).toBe(ALL_STUDY_WORDS.length);
  });

  it('is idempotent', async () => {
    await ensureProgressRecords();
    await ensureProgressRecords();
    expect(await db.wordProgress.count()).toBe(ALL_STUDY_WORDS.length);
  });

  it('does not overwrite progress that already exists', async () => {
    await ensureProgressRecords();
    const target = ALL_STUDY_WORDS[0]!;
    await db.wordProgress.update(target.id, { status: 'mastered', repetitions: 9 });

    await ensureProgressRecords();

    const record = await db.wordProgress.get(target.id);
    expect(record?.status).toBe('mastered');
    expect(record?.repetitions).toBe(9);
  });
});

describe('migrateLegacyKeys', () => {
  it('rewrites positional keys to content-derived ones, keeping the history', async () => {
    // Derived from the content rather than hard-coded: a fixed index breaks the
    // moment someone adds a lesson with fewer words, and adding lessons is the
    // main thing this repo exists for. The last index still exercises the
    // positional mapping, which index 0 could pass by accident.
    const lesson = LESSONS[0]!;
    const index = lesson.words.length - 1;
    const word = lesson.words[index]!;

    await db.wordProgress.put({
      id: `${lesson.id}_${index}`,
      lessonId: lesson.id,
      word: word.word,
      ...INITIAL_SRS,
      status: 'mastered',
      repetitions: 7,
      interval: 30,
      correctCount: 5,
      totalCount: 6,
      bookmarked: 1,
      lastReviewed: null,
    });

    const migrated = await migrateLegacyKeys();
    expect(migrated).toBe(1);

    expect(await db.wordProgress.get(`${lesson.id}_${index}`)).toBeUndefined();
    const record = await db.wordProgress.get(
      `${lesson.id}:${word.word.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    );
    expect(record?.repetitions).toBe(7);
    expect(record?.status).toBe('mastered');
    expect(record?.bookmarked).toBe(1);
  });

  it('drops records pointing at words that no longer exist', async () => {
    await db.wordProgress.put({
      id: 'deleted_lesson_0',
      lessonId: 'deleted_lesson',
      word: 'gone',
      ...INITIAL_SRS,
      correctCount: 0,
      totalCount: 0,
      bookmarked: 0,
      lastReviewed: null,
    });

    await migrateLegacyKeys();
    expect(await db.wordProgress.count()).toBe(0);
  });

  it('does nothing when there is nothing to migrate', async () => {
    await ensureProgressRecords();
    expect(await migrateLegacyKeys()).toBe(0);
  });
});

describe('recordAnswer', () => {
  it('stores the schedule and increments the counters', async () => {
    await ensureProgressRecords();
    const word = ALL_STUDY_WORDS[0]!;

    await recordAnswer(word, processAnswer(INITIAL_SRS, QUALITY.good), true);
    await recordAnswer(word, processAnswer(INITIAL_SRS, QUALITY.again), false);

    const record = await db.wordProgress.get(word.id);
    expect(record?.totalCount).toBe(2);
    expect(record?.correctCount).toBe(1);
    expect(record?.lastReviewed).not.toBeNull();
  });
});

describe('bookmarks', () => {
  it('toggles and lists bookmarked words', async () => {
    await ensureProgressRecords();
    const word = ALL_STUDY_WORDS[0]!;

    expect(await toggleBookmark(word.id)).toBe(true);
    expect((await getBookmarked()).map((r) => r.id)).toEqual([word.id]);

    expect(await toggleBookmark(word.id)).toBe(false);
    expect(await getBookmarked()).toEqual([]);
  });
});

describe('getDueProgress', () => {
  it('returns scheduled cards on or before today but never new ones', async () => {
    await ensureProgressRecords();
    const [a, b, c] = ALL_STUDY_WORDS;

    await db.wordProgress.update(a!.id, { status: 'learning', nextReview: '2000-01-01' });
    await db.wordProgress.update(b!.id, { status: 'learning', nextReview: '2999-01-01' });
    await db.wordProgress.update(c!.id, { status: 'new', nextReview: '2000-01-01' });

    const due = await getDueProgress(todayKey());
    expect(due.map((record) => record.id)).toEqual([a!.id]);
  });
});

describe('getStreak', () => {
  it('counts back from today', async () => {
    for (let offset = 0; offset < 3; offset += 1) {
      await db.dailyActivity.put({
        date: toDateKey(addDays(new Date(), -offset)),
        wordsStudied: 5,
        wordsCorrect: 4,
        modes: ['flashcard'],
      });
    }
    expect(await getStreak()).toBe(3);
  });

  it('survives a day that has not been studied yet', async () => {
    await db.dailyActivity.put({
      date: toDateKey(addDays(new Date(), -1)),
      wordsStudied: 5,
      wordsCorrect: 4,
      modes: ['flashcard'],
    });
    expect(await getStreak()).toBe(1);
  });

  it('is zero with no activity', async () => {
    expect(await getStreak()).toBe(0);
  });
});

describe('recordActivity', () => {
  it('accumulates into a single row per day', async () => {
    await recordActivity(3, 2, 'flashcard');
    await recordActivity(2, 2, 'quiz-type');

    const today = await db.dailyActivity.get(todayKey());
    expect(today?.wordsStudied).toBe(5);
    expect(today?.wordsCorrect).toBe(4);
    expect(today?.modes).toEqual(['flashcard', 'quiz-type']);
  });
});

describe('snapshot round trip', () => {
  it('exports and re-imports without losing data', async () => {
    await ensureProgressRecords();
    const word = ALL_STUDY_WORDS[0]!;
    await toggleBookmark(word.id);
    await recordActivity(4, 3, 'flashcard');

    const snapshot = await exportProgress({ dailyGoal: '15' });
    await db.wordProgress.clear();
    await db.dailyActivity.clear();

    await importProgress(snapshot);

    expect(await db.wordProgress.count()).toBe(ALL_STUDY_WORDS.length);
    expect((await db.wordProgress.get(word.id))?.bookmarked).toBe(1);
    expect((await db.dailyActivity.get(todayKey()))?.wordsStudied).toBe(4);
  });

  it('normalises a v1 snapshot that stored bookmarked as a boolean', async () => {
    const word = ALL_STUDY_WORDS[0]!;
    await importProgress({
      wordProgress: [
        {
          id: word.id,
          lessonId: word.lessonId,
          word: word.word,
          ...INITIAL_SRS,
          correctCount: 0,
          totalCount: 0,
          bookmarked: true as unknown as number,
          lastReviewed: null,
        },
      ],
    });

    expect((await db.wordProgress.get(word.id))?.bookmarked).toBe(1);
    expect((await getBookmarked()).map((r) => r.id)).toContain(word.id);
  });

  it('migrates legacy keys carried in from a remote snapshot', async () => {
    const lesson = LESSONS[0]!;
    await importProgress({
      wordProgress: [
        {
          id: `${lesson.id}_0`,
          lessonId: lesson.id,
          word: lesson.words[0]!.word,
          ...INITIAL_SRS,
          status: 'learning',
          correctCount: 1,
          totalCount: 1,
          bookmarked: 0,
          lastReviewed: null,
        },
      ],
    });

    expect(await db.wordProgress.get(`${lesson.id}_0`)).toBeUndefined();
    const stats = await getOverallStats();
    expect(stats.learning).toBe(1);
  });
});
