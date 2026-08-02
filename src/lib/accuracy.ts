/**
 * How a single word has actually been going, as opposed to where the SRS has
 * scheduled it. The two disagree often enough to be worth showing separately:
 * a word can sit at a long interval and still be one the learner keeps missing.
 */

/** Attempts needed before a ratio means anything. One answer is not a rate. */
export const MIN_ATTEMPTS = 2;
/** Below this the word is called out as one to come back to. */
export const WEAK = 0.6;
/** At or above this it is holding up. */
export const STRONG = 0.85;

export interface Counted {
  correctCount: number;
  totalCount: number;
}

export function accuracyOf(record?: Counted): number | null {
  if (!record || record.totalCount < MIN_ATTEMPTS) return null;
  return record.correctCount / record.totalCount;
}

export function isWeak(record?: Counted): boolean {
  const accuracy = accuracyOf(record);
  return accuracy !== null && accuracy < WEAK;
}

export type AccuracyTone = 'weak' | 'mixed' | 'strong';

export function toneOf(accuracy: number): AccuracyTone {
  if (accuracy < WEAK) return 'weak';
  return accuracy >= STRONG ? 'strong' : 'mixed';
}
