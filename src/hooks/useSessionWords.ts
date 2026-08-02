import { useMemo, useState } from 'react';

import { useSettings } from './useSettings';
import { shuffle } from '@/lib/utils';

/**
 * The word order for one study session.
 *
 * Studying a lesson in file order teaches the order as much as the words — by
 * the third pass the learner recognises "the one after adequate" rather than
 * the word itself. Shuffling per session breaks that.
 *
 * Shuffled exactly once per mount. Re-shuffling on every render would hand the
 * retry queue a new array each time and restart the session.
 *
 * Callers whose order already means something — weakest first, or new words in
 * lesson order — pass `false` and keep it.
 */
export function useSessionWords<T>(words: readonly T[], allowShuffle = true): readonly T[] {
  const { settings } = useSettings();

  // Read once on mount: flipping the setting mid-session must not reorder the
  // queue underneath the learner.
  const [shuffleThisSession] = useState(() => allowShuffle && settings.shuffleWords);

  return useMemo(
    // Re-runs only when the source list itself changes, which means a new session.
    () => (shuffleThisSession ? shuffle(words) : words),
    [words, shuffleThisSession],
  );
}
