import { addDays, toDateKey, todayKey } from './utils';

/** SM-2 answer grades, as surfaced in the UI. */
export const QUALITY = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
} as const;

export type Quality = 1 | 2 | 3 | 4 | 5;

export type WordStatus = 'new' | 'learning' | 'mastered';

/** The SM-2 fields of a progress record — everything the algorithm reads or writes. */
export interface SrsState {
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReview: string;
  status: WordStatus;
}

export const INITIAL_SRS: SrsState = {
  repetitions: 0,
  interval: 0,
  easeFactor: 2.5,
  nextReview: todayKey(),
  status: 'new',
};

const MIN_EASE_FACTOR = 1.3;
/**
 * "Mastered" after three successful reviews. The old rule also required a
 * 21-day interval, which meant a word took *four* correct sittings to count —
 * so a learner who plainly knew a lesson still saw almost nothing marked
 * "thuộc". Three spaced reviews is a standard graduation bar and matches what
 * the learner feels; the graduated mastery levels below show the steps along
 * the way so progress is never invisible.
 */
const MASTERY_REPETITIONS = 3;

/**
 * SuperMemo-2. A grade below 3 resets the repetition count and puts the card
 * back into learning; the ease factor always moves, which is what makes the
 * schedule adapt to how hard a given word is for this learner.
 */
export function processAnswer(state: SrsState, quality: Quality): SrsState {
  let { repetitions, interval, status } = state;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
    status = 'learning';
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * state.easeFactor);
    repetitions += 1;
    if (status === 'new') status = 'learning';
  }

  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    state.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (status === 'learning' && repetitions >= MASTERY_REPETITIONS) {
    status = 'mastered';
  }

  return {
    repetitions,
    interval,
    easeFactor,
    status,
    nextReview: nextReviewDate(interval),
  };
}

export function nextReviewDate(intervalDays: number, from: Date = new Date()): string {
  return toDateKey(addDays(from, intervalDays));
}

export function isDue(
  state: Pick<SrsState, 'nextReview' | 'status'>,
  on: string = todayKey(),
): boolean {
  return state.status !== 'new' && state.nextReview <= on;
}

/**
 * Named steps from "just met" to "known". A single "mastered / not" flag hides
 * all the progress in between, which reads as "I know these but it says I don't"
 * — so mastery is shown as a 0–4 level instead, one step per successful review,
 * with the SRS "mastered" status as the top step.
 */
export const MASTERY_LEVELS = ['Mới', 'Mới học', 'Đang nhớ', 'Gần thuộc', 'Thuộc'] as const;
export const MASTERY_LEVEL_COUNT = MASTERY_LEVELS.length;

export function masteryLevel(record: { status: WordStatus; repetitions: number }): number {
  if (record.status === 'mastered') return 4;
  if (record.status === 'new') return 0;
  if (record.repetitions <= 0) return 1;
  if (record.repetitions === 1) return 2;
  return 3;
}
