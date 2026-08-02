import Dexie, { type Table } from 'dexie';
import type { WordStatus } from './srs';

/**
 * Local database. Table names and record shapes are deliberately unchanged from
 * v1 so an existing install — and the snapshot already sitting in Supabase —
 * keeps working. Only the primary key changed; see `migrateLegacyKeys`.
 */

export interface WordProgress {
  /** `<lessonId>:<word-slug>` — see lib/ids.ts. */
  id: string;
  lessonId: string;
  word: string;
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReview: string;
  status: WordStatus;
  correctCount: number;
  totalCount: number;
  /** Stored as 0/1: IndexedDB cannot index booleans. */
  bookmarked: number;
  lastReviewed: string | null;
}

export interface TestResult {
  id?: number;
  date: string;
  lessonId: string;
  mode: string;
  score: number;
  total: number;
  duration: number;
  words: string[];
}

export interface DailyActivity {
  /** YYYY-MM-DD, local time. */
  date: string;
  wordsStudied: number;
  wordsCorrect: number;
  modes: string[];
}

export class VocabDatabase extends Dexie {
  wordProgress!: Table<WordProgress, string>;
  testHistory!: Table<TestResult, number>;
  dailyActivity!: Table<DailyActivity, string>;

  constructor(name = 'IELTSVocabDB') {
    super(name);

    this.version(1).stores({
      wordProgress: '&id, lessonId, status, nextReview, bookmarked',
      testHistory: '++id, date, lessonId, mode',
      dailyActivity: '&date',
    });

    // v2 keeps the same indexes; the primary keys are rewritten by
    // migrateLegacyKeys(), which needs lesson content and so cannot run inside
    // a Dexie upgrade callback.
    this.version(2).stores({
      wordProgress: '&id, lessonId, status, nextReview, bookmarked',
      testHistory: '++id, date, lessonId, mode',
      dailyActivity: '&date',
    });
  }
}

export const db = new VocabDatabase();
