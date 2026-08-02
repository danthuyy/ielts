import { useCallback, useMemo, useState } from 'react';

import { demote, gapFor, isGraduated, promote } from '@/lib/mastery';

/**
 * The queue behind mixed practice.
 *
 * Two things make it different from `useRetryQueue`. A word is not finished
 * when it is answered correctly once — it has to climb every rung — and the
 * session works on a small batch at a time rather than the whole lesson, so
 * each word comes round often enough to actually stick before the next one
 * arrives.
 */

/**
 * Words in play at once.
 *
 * Six is small enough that a word comes back while the last attempt is still
 * fresh. Running all twenty-five at once would put a hundred and fifty
 * questions in front of the learner and space each word so far apart that the
 * repetition stops doing any work.
 */
export const BATCH = 6;

export interface MasteryItem<T> {
  item: T;
  level: number;
}

/** What happened to the word that was just answered. */
export interface AnswerOutcome<T> {
  item: T;
  correct: boolean;
  /** True when this answer took the word off the top of the ladder. */
  graduated: boolean;
  /** Times this word was demoted across the whole session. */
  misses: number;
}

export interface MasteryQueue<T> {
  current: MasteryItem<T> | undefined;
  /** One entry per word in the session, for the stacked progress bar. */
  levels: number[];
  total: number;
  graduated: number;
  /** Questions answered so far, counting every repeat. */
  asked: number;
  finished: boolean;
  answer: (correct: boolean) => AnswerOutcome<T> | null;
}

interface State<T> {
  /** Ids waiting their turn, head first. Only words in the current batch. */
  queue: string[];
  /** Words not yet brought into the batch. */
  pool: string[];
  byId: Map<string, T>;
  levels: Map<string, number>;
  misses: Map<string, number>;
  asked: number;
}

function initial<T>(
  items: readonly T[],
  getId: (item: T) => string,
  startLevel: (item: T) => number,
): State<T> {
  const byId = new Map<string, T>();
  const levels = new Map<string, number>();
  const ids: string[] = [];

  for (const item of items) {
    const id = getId(item);
    byId.set(id, item);
    levels.set(id, startLevel(item));
    ids.push(id);
  }

  return {
    queue: ids.slice(0, BATCH),
    pool: ids.slice(BATCH),
    byId,
    levels,
    misses: new Map(),
    asked: 0,
  };
}

export function useMasteryQueue<T>(
  items: readonly T[],
  getId: (item: T) => string,
  startLevel: (item: T) => number,
): MasteryQueue<T> {
  // `items` is memoised by the caller and both callbacks are expected to be
  // stable, so a new identity here means a genuinely new session.
  const seed = useMemo(() => initial(items, getId, startLevel), [items, getId, startLevel]);
  const [state, setState] = useState<State<T>>(seed);
  const [seenSeed, setSeenSeed] = useState(seed);
  if (seenSeed !== seed) {
    setSeenSeed(seed);
    setState(seed);
  }

  const answer = useCallback(
    (correct: boolean): AnswerOutcome<T> | null => {
      const [head, ...rest] = state.queue;
      if (head === undefined) return null;

      const item = state.byId.get(head);
      if (item === undefined) return null;

      const was = state.levels.get(head) ?? 0;
      const level = correct ? promote(was) : demote(was);

      const levels = new Map(state.levels).set(head, level);
      const misses = new Map(state.misses);
      if (!correct) misses.set(head, (misses.get(head) ?? 0) + 1);

      let queue = rest;
      let pool = state.pool;

      if (isGraduated(level)) {
        // A finished word makes room for the next one, which keeps the batch
        // full and the session moving instead of narrowing to one last word
        // asked over and over.
        const [next, ...remaining] = pool;
        if (next !== undefined) {
          queue = [...rest, next];
          pool = remaining;
        }
      } else {
        // Re-inserted rather than appended: the gap is the point, and at the
        // end of the queue a low rung would wait far longer than it should.
        const at = Math.min(gapFor(level), rest.length);
        queue = [...rest.slice(0, at), head, ...rest.slice(at)];
      }

      setState({ ...state, queue, pool, levels, misses, asked: state.asked + 1 });

      return {
        item,
        correct,
        graduated: isGraduated(level),
        misses: misses.get(head) ?? 0,
      };
    },
    [state],
  );

  const head = state.queue[0];
  const current =
    head === undefined
      ? undefined
      : { item: state.byId.get(head) as T, level: state.levels.get(head) ?? 0 };

  const levels = [...state.levels.values()];

  return {
    current,
    levels,
    total: items.length,
    graduated: levels.filter(isGraduated).length,
    asked: state.asked,
    finished: state.queue.length === 0 && items.length > 0,
    answer,
  };
}
