export type Accent = 'uk' | 'us' | 'all';

/**
 * A YouGlish search URL for one word.
 *
 * The built-in speech synthesis gives a single idealised rendering; YouGlish
 * plays the word inside real sentences from real speakers, which is where
 * stress and connected speech actually become learnable.
 *
 * British by default: the lesson content uses British IPA.
 */
export function youglishUrl(word: string, accent: Accent = 'uk'): string {
  const trimmed = word.trim();
  const path = accent === 'all' ? 'english' : `english/${accent}`;
  return `https://youglish.com/pronounce/${encodeURIComponent(trimmed)}/${path}`;
}
