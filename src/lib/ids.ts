/**
 * Progress keys.
 *
 * The old app keyed progress by position — `hello_happiness_7`. Inserting or
 * reordering a word in a published lesson therefore silently reassigned every
 * later word's history, which makes editing content dangerous. Keys are now
 * derived from the headword itself, so content can be reordered and extended
 * freely; only renaming or deleting a word orphans its progress.
 */

/** "material wealth" -> "material-wealth", "dwell on" -> "dwell-on" */
export function slugifyWord(word: string): string {
  // Headwords are English, so anything outside [a-z0-9] is a separator.
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function wordKey(lessonId: string, word: string): string {
  return `${lessonId}:${slugifyWord(word)}`;
}

/** Matches the pre-2.0 positional key, e.g. "hello_happiness_12". */
const LEGACY_KEY = /^(.+)_(\d+)$/;

export function parseLegacyKey(id: string): { lessonId: string; wordIndex: number } | null {
  const match = LEGACY_KEY.exec(id);
  if (!match) return null;
  const [, lessonId, index] = match;
  if (!lessonId || index === undefined) return null;
  return { lessonId, wordIndex: Number(index) };
}

export function isLegacyKey(id: string): boolean {
  return !id.includes(':') && LEGACY_KEY.test(id);
}
