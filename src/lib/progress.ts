import { db, type DailyActivity, type TestResult, type WordProgress } from './db';
import { INITIAL_SRS, type SrsState } from './srs';
import { addDays, toDateKey, todayKey } from './utils';
import { isLegacyKey, parseLegacyKey, wordKey } from './ids';
import { getLesson, LESSONS, TOTAL_WORD_COUNT } from '@/content/lessons';
import type { StudyWord } from '@/content/schema';

/**
 * Everything that reads or writes learner progress goes through here, so the
 * sync layer has exactly one place to hook into and the screens never touch
 * Dexie directly.
 */

type ChangeListener = () => void;
const listeners = new Set<ChangeListener>();

/** Sync subscribes to this; every local write schedules an upload. */
export function onProgressChange(listener: ChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      // A broken subscriber must never break the write that triggered it.
      console.error('progress listener failed', err);
    }
  }
}

function newRecord(word: StudyWord): WordProgress {
  return {
    id: word.id,
    lessonId: word.lessonId,
    word: word.word,
    ...INITIAL_SRS,
    correctCount: 0,
    totalCount: 0,
    bookmarked: 0,
    lastReviewed: null,
  };
}

/** Coerce records that came from v1 or from a remote snapshot into the current shape. */
export function normaliseRecord(raw: Partial<WordProgress> & { id: string }): WordProgress {
  return {
    id: raw.id,
    lessonId: raw.lessonId ?? '',
    word: raw.word ?? '',
    repetitions: Number(raw.repetitions ?? 0),
    interval: Number(raw.interval ?? 0),
    easeFactor: Number(raw.easeFactor ?? INITIAL_SRS.easeFactor),
    nextReview: raw.nextReview ?? todayKey(),
    status: raw.status ?? 'new',
    correctCount: Number(raw.correctCount ?? 0),
    totalCount: Number(raw.totalCount ?? 0),
    // v1 stored a boolean; IndexedDB cannot index those.
    bookmarked: raw.bookmarked ? 1 : 0,
    lastReviewed: raw.lastReviewed ?? null,
  };
}

/**
 * Rewrites pre-2.0 positional keys (`hello_happiness_7`) to content-derived
 * ones (`hello_happiness:aspiration`). Runs after every import as well as on
 * boot, because a remote snapshot can still carry the old keys.
 *
 * A record whose lesson or index no longer exists is dropped: it referred to a
 * word that is no longer in the content, so it can only pollute the counts.
 */
export async function migrateLegacyKeys(): Promise<number> {
  const all = await db.wordProgress.toArray();
  const legacy = all.filter((record) => isLegacyKey(record.id));
  if (legacy.length === 0) return 0;

  const existing = new Set(all.map((record) => record.id));
  const toDelete: string[] = [];
  const toPut: WordProgress[] = [];

  for (const record of legacy) {
    const parsed = parseLegacyKey(record.id);
    const lesson = parsed ? getLesson(parsed.lessonId) : undefined;
    const word = lesson && parsed ? lesson.words[parsed.wordIndex] : undefined;

    toDelete.push(record.id);
    if (!lesson || !word) continue;

    const id = wordKey(lesson.id, word.word);
    // A record already stored under the new key wins — it is the fresher one.
    if (existing.has(id)) continue;

    toPut.push(normaliseRecord({ ...record, id, lessonId: lesson.id, word: word.word }));
    existing.add(id);
  }

  await db.transaction('rw', db.wordProgress, async () => {
    await db.wordProgress.bulkDelete(toDelete);
    await db.wordProgress.bulkPut(toPut);
  });

  return toPut.length;
}

/** Creates a progress row for every word that does not have one yet. */
export async function ensureProgressRecords(): Promise<void> {
  const known = new Set(await db.wordProgress.toCollection().primaryKeys());
  const missing: WordProgress[] = [];

  for (const lesson of LESSONS) {
    for (const word of lesson.words) {
      const id = wordKey(lesson.id, word.word);
      if (known.has(id)) continue;
      missing.push(newRecord({ ...word, id, lessonId: lesson.id }));
    }
  }

  if (missing.length > 0) {
    await db.wordProgress.bulkPut(missing);
  }
}

export async function initProgress(): Promise<void> {
  await db.open();
  await migrateLegacyKeys();
  await ensureProgressRecords();
}

export async function getProgress(id: string): Promise<WordProgress | undefined> {
  return db.wordProgress.get(id);
}

export async function getSrsState(id: string): Promise<SrsState> {
  const record = await getProgress(id);
  if (!record) return { ...INITIAL_SRS };
  return {
    repetitions: record.repetitions,
    interval: record.interval,
    easeFactor: record.easeFactor,
    nextReview: record.nextReview,
    status: record.status,
  };
}

export async function getLessonProgress(lessonId: string): Promise<WordProgress[]> {
  return db.wordProgress.where('lessonId').equals(lessonId).toArray();
}

export async function getAllProgress(): Promise<WordProgress[]> {
  return db.wordProgress.toArray();
}

/** Applies an SRS result and the correct/total counters in one write. */
export async function recordAnswer(
  word: Pick<StudyWord, 'id' | 'lessonId' | 'word'>,
  next: SrsState,
  wasCorrect: boolean,
): Promise<void> {
  const existing = await getProgress(word.id);
  const base = existing ?? newRecord({ ...word } as StudyWord);

  await db.wordProgress.put({
    ...base,
    ...next,
    id: word.id,
    lessonId: word.lessonId,
    word: word.word,
    correctCount: base.correctCount + (wasCorrect ? 1 : 0),
    totalCount: base.totalCount + 1,
    lastReviewed: new Date().toISOString(),
  });
  emitChange();
}

export async function toggleBookmark(id: string): Promise<boolean> {
  const record = await getProgress(id);
  if (!record) return false;
  const bookmarked = record.bookmarked ? 0 : 1;
  await db.wordProgress.update(id, { bookmarked });
  emitChange();
  return bookmarked === 1;
}

export async function getBookmarked(): Promise<WordProgress[]> {
  return db.wordProgress.where('bookmarked').equals(1).toArray();
}

export async function getDueProgress(on: string = todayKey()): Promise<WordProgress[]> {
  const due = await db.wordProgress.where('nextReview').belowOrEqual(on).toArray();
  return due.filter((record) => record.status !== 'new');
}

export interface WeakWord {
  record: WordProgress;
  accuracy: number;
  attempts: number;
}

/**
 * The words this learner actually keeps getting wrong, worst first.
 *
 * Accuracy alone is a poor ranking: a word answered once and missed reads as
 * 0%, which is noise rather than a weakness. `minAttempts` filters that out.
 * Ties break on ease factor — SM-2 pushes it down every time a word lapses, so
 * a lower factor means the word has failed repeatedly, not just recently.
 */
export async function getWeakWords(limit = 20, minAttempts = 2): Promise<WeakWord[]> {
  const records = await getAllProgress();

  return records
    .filter((record) => record.totalCount >= minAttempts && record.status !== 'new')
    .map((record) => ({
      record,
      attempts: record.totalCount,
      accuracy: record.correctCount / record.totalCount,
    }))
    .filter((entry) => entry.accuracy < 1)
    .sort(
      (a, b) =>
        a.accuracy - b.accuracy ||
        a.record.easeFactor - b.record.easeFactor ||
        b.attempts - a.attempts,
    )
    .slice(0, limit);
}

export interface UpcomingDay {
  date: string;
  count: number;
}

/**
 * How many words fall due on each of the next `days` days.
 *
 * Anything already overdue is folded into today — that is where the learner
 * will actually meet it, and showing it under a past date would be misleading.
 */
export async function getUpcomingReviews(days = 14): Promise<UpcomingDay[]> {
  const records = await getAllProgress();
  const today = todayKey();

  const counts = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    counts.set(toDateKey(addDays(new Date(), i)), 0);
  }

  for (const record of records) {
    if (record.status === 'new') continue;
    const bucket = record.nextReview <= today ? today : record.nextReview;
    const current = counts.get(bucket);
    if (current !== undefined) counts.set(bucket, current + 1);
  }

  return [...counts.entries()].map(([date, count]) => ({ date, count }));
}

export interface StatusCounts {
  total: number;
  newCount: number;
  learning: number;
  mastered: number;
}

function countByStatus(records: readonly WordProgress[], total: number): StatusCounts {
  let newCount = 0;
  let learning = 0;
  let mastered = 0;
  for (const record of records) {
    if (record.status === 'new') newCount += 1;
    else if (record.status === 'learning') learning += 1;
    else mastered += 1;
  }
  return { total, newCount, learning, mastered };
}

export async function getOverallStats(): Promise<StatusCounts> {
  const records = await getAllProgress();
  return countByStatus(records, records.length || TOTAL_WORD_COUNT);
}

export async function getLessonStats(lessonId: string): Promise<StatusCounts> {
  const records = await getLessonProgress(lessonId);
  const lesson = getLesson(lessonId);
  return countByStatus(records, lesson?.words.length ?? records.length);
}

export async function saveTestResult(result: Omit<TestResult, 'id' | 'date'>): Promise<void> {
  await db.testHistory.add({ ...result, date: new Date().toISOString() });
  emitChange();
}

export async function getTestHistory(limit = 20): Promise<TestResult[]> {
  return db.testHistory.orderBy('date').reverse().limit(limit).toArray();
}

export async function recordActivity(
  wordsStudied: number,
  wordsCorrect: number,
  mode: string,
): Promise<void> {
  const date = todayKey();
  const existing = await db.dailyActivity.get(date);
  const activity: DailyActivity = existing ?? { date, wordsStudied: 0, wordsCorrect: 0, modes: [] };

  activity.wordsStudied += wordsStudied;
  activity.wordsCorrect += wordsCorrect;
  if (!activity.modes.includes(mode)) activity.modes.push(mode);

  await db.dailyActivity.put(activity);
  emitChange();
}

export async function getActivitySince(days: number): Promise<DailyActivity[]> {
  const start = toDateKey(addDays(new Date(), -(days - 1)));
  return db.dailyActivity.where('date').aboveOrEqual(start).toArray();
}

/**
 * Consecutive days with activity, counting back from today. A gap yesterday
 * still leaves today's streak intact until midnight, which is what learners
 * expect from a streak counter.
 */
export async function getStreak(): Promise<number> {
  const activities = await db.dailyActivity.orderBy('date').reverse().toArray();
  if (activities.length === 0) return 0;

  const active = new Set(activities.filter((a) => a.wordsStudied > 0).map((a) => a.date));
  if (active.size === 0) return 0;

  let cursor = new Date();
  // Not studying *yet* today should not break yesterday's streak.
  if (!active.has(toDateKey(cursor))) cursor = addDays(cursor, -1);

  let streak = 0;
  while (active.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/* ------------------------------------------------------------------ */
/* Snapshot — used by sync and by "xoá tất cả tiến trình"              */
/* ------------------------------------------------------------------ */

export interface Snapshot {
  version: number;
  settings: Record<string, string>;
  wordProgress: WordProgress[];
  testHistory: TestResult[];
  dailyActivity: DailyActivity[];
}

export async function exportProgress(settings: Record<string, string>): Promise<Snapshot> {
  const [wordProgress, testHistory, dailyActivity] = await Promise.all([
    db.wordProgress.toArray(),
    db.testHistory.toArray(),
    db.dailyActivity.toArray(),
  ]);
  return { version: 2, settings, wordProgress, testHistory, dailyActivity };
}

/** Replaces local state wholesale. Callers decide which side wins first. */
export async function importProgress(snapshot: Partial<Snapshot>): Promise<void> {
  await db.transaction('rw', db.wordProgress, db.testHistory, db.dailyActivity, async () => {
    if (Array.isArray(snapshot.wordProgress)) {
      await db.wordProgress.clear();
      await db.wordProgress.bulkPut(snapshot.wordProgress.map(normaliseRecord));
    }
    if (Array.isArray(snapshot.testHistory)) {
      await db.testHistory.clear();
      await db.testHistory.bulkPut(snapshot.testHistory);
    }
    if (Array.isArray(snapshot.dailyActivity)) {
      await db.dailyActivity.clear();
      await db.dailyActivity.bulkPut(snapshot.dailyActivity);
    }
  });

  // A remote snapshot can still hold pre-2.0 keys.
  await migrateLegacyKeys();
  await ensureProgressRecords();
}
