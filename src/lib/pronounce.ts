/**
 * Deciding whether what the speech engine heard counts as the target word.
 *
 * Speech recognition is noisy: it lowercases, drops punctuation, sometimes adds
 * a filler word, and for a two-word headword ("material wealth") may return a
 * short phrase. So the match is deliberately lenient — exact after
 * normalisation, or one string contains the other as a whole word/phrase —
 * rather than a strict equality that would reject a correct pronunciation over
 * a stray "the".
 */

export function normaliseSpoken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fold British/American spelling variants onto one form.
 *
 * The engine runs on en-US, so a word authored the British way ("maximise")
 * comes back spelled the American way ("maximize") even when the learner says
 * it perfectly. Folding both sides to the same shape keeps that from reading as
 * a wrong pronunciation. It is applied symmetrically, so it can only ever make
 * the match more forgiving — never match two genuinely different words.
 */
function foldVariants(value: string): string {
  return value
    .replace(/isation\b/g, 'ization')
    .replace(/ise\b/g, 'ize')
    .replace(/yse\b/g, 'yze')
    .replace(/our\b/g, 'or');
}

export function pronunciationMatches(target: string, heard: string): boolean {
  const t = foldVariants(normaliseSpoken(target));
  const h = foldVariants(normaliseSpoken(heard));
  if (!t || !h) return false;
  if (t === h) return true;
  // Whole-word containment both ways: the padding stops "art" from matching
  // inside "start" while still accepting "the art" for target "art".
  const padded = (s: string) => ` ${s} `;
  return padded(h).includes(padded(t)) || padded(t).includes(padded(h));
}
