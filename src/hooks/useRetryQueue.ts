import { useCallback, useMemo, useState } from 'react';

/**
 * A study queue that does not let a missed word disappear.
 *
 * The old behaviour walked the word list once: answer wrong, see the correct
 * answer for a second, and never meet that word again for the rest of the
 * session. You could finish a quiz having learned nothing about exactly the
 * words you did not know.
 *
 * A wrong answer now goes back into the queue a few places later — far enough
 * that it is recall rather than short-term echo, close enough to still be in
 * the same sitting. The session ends only when every word has been answered
 * correctly at least once.
 */

/** Places to skip before a missed word comes round again. */
const RETRY_GAP = 3;

export interface RetryQueue<T> {
  current: T | undefined;
  /** Distinct words answered correctly so far. */
  learned: number;
  /** Distinct words in the session. */
  total: number;
  /** Words answered correctly on the very first attempt — the honest score. */
  firstTry: number;
  /** How many are still waiting to come back round. */
  remaining: number;
  /** True once every word has been answered correctly. */
  finished: boolean;
  /** True when this word has already been missed in this session. */
  isRetry: boolean;
  /** Every word that was answered wrong at least once, for the end summary. */
  review: { item: T; missed: boolean; learned: boolean }[];
  answer: (correct: boolean) => void;
  /**
   * Records a wrong attempt without advancing, for modes that keep the learner
   * on the same word until they get it. Feeds the first-try score.
   */
  markMissed: () => void;
  reset: () => void;
}

interface State<T> {
  queue: T[];
  learned: Set<string>;
  missed: Set<string>;
}

function initial<T>(items: readonly T[]): State<T> {
  return { queue: [...items], learned: new Set(), missed: new Set() };
}

export function useRetryQueue<T>(
  items: readonly T[],
  getId: (item: T) => string,
  retryGap: number = RETRY_GAP,
): RetryQueue<T> {
  const seed = useMemo(() => initial(items), [items]);
  const [state, setState] = useState<State<T>>(seed);

  // `items` is memoised by callers, so a change means a genuinely new session.
  const [seenSeed, setSeenSeed] = useState(seed);
  if (seenSeed !== seed) {
    setSeenSeed(seed);
    setState(seed);
  }

  const answer = useCallback(
    (correct: boolean) => {
      setState((prev) => {
        const [head, ...rest] = prev.queue;
        if (head === undefined) return prev;
        const id = getId(head);

        if (correct) {
          return {
            queue: rest,
            learned: new Set(prev.learned).add(id),
            missed: prev.missed,
          };
        }

        // Re-insert rather than append: at the end of a long queue the word
        // would not come back before the learner loses the thread.
        const at = Math.min(retryGap, rest.length);
        const queue = [...rest.slice(0, at), head, ...rest.slice(at)];
        return { queue, learned: prev.learned, missed: new Set(prev.missed).add(id) };
      });
    },
    [getId, retryGap],
  );

  const markMissed = useCallback(() => {
    setState((prev) => {
      const head = prev.queue[0];
      if (head === undefined) return prev;
      const id = getId(head);
      if (prev.missed.has(id)) return prev;
      return { ...prev, missed: new Set(prev.missed).add(id) };
    });
  }, [getId]);

  const reset = useCallback(() => setState(initial(items)), [items]);

  const current = state.queue[0];

  return {
    current,
    learned: state.learned.size,
    total: items.length,
    firstTry: [...state.learned].filter((id) => !state.missed.has(id)).length,
    remaining: state.queue.length,
    finished: state.queue.length === 0 && items.length > 0,
    isRetry: current !== undefined && state.missed.has(getId(current)),
    // Missed words first: those are the ones worth another look.
    review: items
      .map((item) => ({
        item,
        missed: state.missed.has(getId(item)),
        learned: state.learned.has(getId(item)),
      }))
      .sort((a, b) => Number(b.missed) - Number(a.missed)),
    answer,
    markMissed,
    reset,
  };
}
