/**
 * The mastery ladder behind the mixed-practice mode.
 *
 * Every other mode asks one kind of question for a whole session. This one
 * gives each *word* a rung and picks the question from the rung, so a word the
 * learner half-knows gets an easy question and a word they have nailed gets a
 * hard one — in the same sitting, interleaved.
 *
 * The rungs run from recognition to production, which is the order those two
 * abilities actually arrive in. Picking the meaning out of four options is
 * something you can do long before you can produce the word from nothing.
 */

import { QUALITY, type Quality, type WordStatus } from './srs';

export const RUNGS = [
  'choice-en',
  'choice-vi',
  'listen-choice',
  'assemble',
  'type',
  'listen',
] as const;

export type Rung = (typeof RUNGS)[number];

export const TOP_RUNG = RUNGS.length - 1;
/** One past the top rung: the word is done for this session. */
export const GRADUATED = RUNGS.length;

export const RUNG_LABEL: Record<Rung, string> = {
  'choice-en': 'Nhận mặt từ',
  'choice-vi': 'Nhớ dạng tiếng Anh',
  'listen-choice': 'Nghe và nhận ra',
  assemble: 'Ghép chữ cái',
  type: 'Viết lại',
  listen: 'Nghe và viết',
};

export function rungAt(level: number): Rung {
  return RUNGS[Math.min(Math.max(level, 0), TOP_RUNG)] as Rung;
}

/**
 * How far ahead a word is re-queued after being answered at a given level.
 *
 * It widens as the word climbs, and that is the point. Meeting a word again
 * immediately tests nothing but short-term echo; the effort of reaching further
 * back is what builds a memory that survives the session. Early rungs stay
 * close so a word the learner is still finding their feet on does not vanish.
 */
const GAPS = [2, 3, 4, 6, 8, 10];

export function gapFor(level: number): number {
  return GAPS[Math.min(Math.max(level, 0), GAPS.length - 1)] as number;
}

/**
 * Where a word joins the ladder, given what the schedule already knows.
 *
 * Starting everything at zero would march the learner through "which of these
 * four means 'vast'" for words they have known for a fortnight, and that is how
 * a mode like this becomes a chore people skip.
 */
export function startingLevel(status: WordStatus | undefined): number {
  if (status === 'mastered') return 3;
  if (status === 'learning') return 1;
  return 0;
}

/** A wrong answer drops one rung, never to the bottom. */
export function demote(level: number): number {
  return Math.max(0, level - 1);
}

export function promote(level: number): number {
  return Math.min(GRADUATED, level + 1);
}

export function isGraduated(level: number): boolean {
  return level >= GRADUATED;
}

/**
 * The single SRS grade a word earns from the whole session.
 *
 * Grading every question would let one sitting either bury a word or declare it
 * mastered, because the mode asks about each word six to fifteen times. One
 * grade per word, decided by how much trouble it gave, keeps the schedule
 * meaning what it says.
 */
export function sessionQuality(misses: number): Quality {
  if (misses === 0) return QUALITY.easy;
  if (misses <= 2) return QUALITY.good;
  if (misses <= 4) return QUALITY.hard;
  return 2;
}

/** Counts of words sitting at each rung, for the stacked progress bar. */
export function levelHistogram(levels: readonly number[]): number[] {
  const counts = new Array<number>(RUNGS.length + 1).fill(0);
  for (const level of levels) {
    const at = Math.min(Math.max(level, 0), RUNGS.length);
    counts[at] = (counts[at] ?? 0) + 1;
  }
  return counts;
}

/**
 * How far through the ladder the whole session is, 0–1.
 *
 * Counts rungs climbed rather than words finished, so the bar moves on the
 * first correct answer instead of staying at zero until something graduates.
 */
export function ladderProgress(levels: readonly number[]): number {
  if (levels.length === 0) return 0;
  const climbed = levels.reduce((total, level) => total + Math.min(level, RUNGS.length), 0);
  return climbed / (levels.length * RUNGS.length);
}
