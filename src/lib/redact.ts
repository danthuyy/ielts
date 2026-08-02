/**
 * Hides a headword inside its own example sentence or collocation.
 *
 * The example is the single most useful hint there is — "If they won a ___
 * fortune, they would be back to their previous level of happiness" makes the
 * learner reach for the word through meaning rather than through spelling. It
 * is also completely useless as a hint if the word is still sitting in it.
 */

const BLANK = ' ____ ';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Matches the headword plus the inflections it actually appears as: correlate /
 * correlates / correlated / correlating, vast / vaster.
 *
 * Deliberately greedy about suffixes. Over-hiding a related word costs the
 * learner a little context; under-hiding leaves the answer in plain sight.
 */
export function inflectionPattern(word: string): RegExp {
  // Split on hyphens too: the content may write "well-being" while the
  // sentence writes "well being", and both have to be caught.
  const tokens = word
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean);
  if (tokens.length === 0) return /(?!)/;

  const parts = tokens.map((token, index) => {
    const isLast = index === tokens.length - 1;
    // Drop a trailing "e" so "correlate" also covers "correlating".
    const stem = isLast ? token.replace(/e$/i, '') : token;
    return escapeRegex(stem) + (isLast ? '[a-zà-ỹ]{0,4}' : '');
  });

  // Hyphens in the source may be spaces in the sentence, and vice versa.
  return new RegExp(`\\b${parts.join('[\\s-]+')}`, 'gi');
}

/**
 * Replaces every appearance of the word with a blank.
 *
 * Returns null when the word does not appear at all — then the sentence is not
 * a hint about this word, it is just a sentence, and showing it would waste a
 * rung of the ladder.
 */
export function redact(text: string, word: string): string | null {
  if (!text.trim()) return null;

  const pattern = inflectionPattern(word);
  if (!pattern.test(text)) return null;

  pattern.lastIndex = 0;
  return text.replace(pattern, BLANK).replace(/\s+/g, ' ').trim();
}

/**
 * Collocations are stored as "a vast fortune · vast majority · vast amount".
 * Each entry is redacted separately so one non-matching entry cannot drop the
 * rest, and entries that never contained the word are kept as-is — they are
 * still usage information.
 */
export function redactCollocation(collocation: string, word: string): string | null {
  const entries = collocation
    .split('·')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return null;

  return entries.map((entry) => redact(entry, word) ?? entry).join(' · ');
}
