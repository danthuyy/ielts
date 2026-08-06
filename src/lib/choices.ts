import { shuffle } from './utils';

/**
 * Multiple-choice options for a word.
 *
 * Two rules the older `ALL_STUDY_WORDS.filter(...).slice(0, 3)` broke, and that
 * made the mix feel like it "kept showing old words":
 *
 * 1. Distractors come from `preferred` — the words in the current session —
 *    first, and only fall back to the wider corpus when a small lesson cannot
 *    field enough of them. Studying a fresh lesson no longer fills every
 *    question with vocabulary from other lessons.
 * 2. No option repeats the answer's spelling *or* its meaning. Two words can
 *    share a Vietnamese gloss ("sự biểu hiện"), and when both landed in the same
 *    question one of the distractors was, in effect, also correct.
 */
export function buildChoiceOptions<T extends { id: string; word: string; vi: string }>(
  target: T,
  preferred: readonly T[],
  fallback: readonly T[],
  count = 4,
): T[] {
  const norm = (value: string) => value.trim().toLowerCase();

  // Seeded with the target so nothing that merely restates it can slip in.
  const usedWords = new Set([norm(target.word)]);
  const usedMeanings = new Set([norm(target.vi)]);
  const distractors: T[] = [];

  const take = (candidates: readonly T[]) => {
    for (const candidate of shuffle(candidates)) {
      if (distractors.length >= count - 1) break;
      const word = norm(candidate.word);
      const meaning = norm(candidate.vi);
      if (usedWords.has(word) || usedMeanings.has(meaning)) continue;
      usedWords.add(word);
      usedMeanings.add(meaning);
      distractors.push(candidate);
    }
  };

  take(preferred);
  // Only reach for the wider corpus when the session itself is too small to
  // fill the options — a 3-word lesson, say.
  if (distractors.length < count - 1) take(fallback);

  return shuffle([target, ...distractors]);
}
