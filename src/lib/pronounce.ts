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

export function pronunciationMatches(target: string, heard: string): boolean {
  const t = normaliseSpoken(target);
  const h = normaliseSpoken(heard);
  if (!t || !h) return false;
  if (t === h) return true;
  // Whole-word containment both ways: the padding stops "art" from matching
  // inside "start" while still accepting "the art" for target "art".
  const padded = (s: string) => ` ${s} `;
  return padded(h).includes(padded(t)) || padded(t).includes(padded(h));
}
