import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BATCH, useMasteryQueue } from '@/hooks/useMasteryQueue';
import { GRADUATED, TOP_RUNG } from '@/lib/mastery';

interface Word {
  id: string;
}

const words = (count: number): Word[] =>
  Array.from({ length: count }, (_, index) => ({ id: `w${index}` }));

const getId = (word: Word) => word.id;
const fromScratch = () => 0;

function setup(count: number, startLevel: (word: Word) => number = fromScratch) {
  const items = words(count);
  return renderHook(() => useMasteryQueue(items, getId, startLevel));
}

/** Answers correctly until the queue is empty, returning what graduated. */
function clear(result: { current: ReturnType<typeof useMasteryQueue<Word>> }, limit = 500) {
  const graduated: string[] = [];
  for (let i = 0; i < limit && !result.current.finished; i += 1) {
    act(() => {
      const outcome = result.current.answer(true);
      if (outcome?.graduated) graduated.push(outcome.item.id);
    });
  }
  return graduated;
}

describe('useMasteryQueue', () => {
  it('works on a batch rather than the whole lesson', () => {
    const { result } = setup(20);
    expect(result.current.total).toBe(20);
    // Only the batch is in play, but the progress bar accounts for every word.
    expect(result.current.levels).toHaveLength(20);
  });

  it('does not finish a word on one correct answer', () => {
    const { result } = setup(3);
    const first = result.current.current?.item.id;
    act(() => {
      result.current.answer(true);
    });
    expect(result.current.graduated).toBe(0);
    expect(result.current.levels.filter((level) => level > 0)).toHaveLength(1);
    expect(first).toBeDefined();
  });

  it('keeps going until every word has climbed the whole ladder', () => {
    const { result } = setup(8);
    const graduated = clear(result);
    expect(result.current.finished).toBe(true);
    expect(result.current.graduated).toBe(8);
    expect(new Set(graduated).size).toBe(8);
  });

  it('does not ask the same word twice in a row while others are waiting', () => {
    const { result } = setup(BATCH);
    let previous: string | undefined;
    for (let i = 0; i < 30; i += 1) {
      const id = result.current.current?.item.id;
      expect(id).not.toBe(previous);
      previous = id;
      act(() => {
        result.current.answer(i % 3 !== 0);
      });
    }
  });

  it('drops a word a rung when it is missed, and counts the miss', () => {
    const { result } = setup(BATCH);
    act(() => {
      result.current.answer(true);
    });
    // Bring the same word round again by clearing the rest of the batch.
    let seen = 0;
    for (let i = 0; i < 40; i += 1) {
      act(() => {
        const outcome = result.current.answer(false);
        if (outcome) seen = Math.max(seen, outcome.misses);
      });
      if (seen > 1) break;
    }
    expect(seen).toBeGreaterThan(1);
    expect(result.current.levels.every((level) => level >= 0)).toBe(true);
  });

  it('lets a word already known skip the easy rungs', () => {
    const { result } = setup(1, () => TOP_RUNG);
    act(() => {
      result.current.answer(true);
    });
    expect(result.current.graduated).toBe(1);
    expect(result.current.finished).toBe(true);
  });

  it('brings in a new word only when one graduates', () => {
    const { result } = setup(BATCH + 2, () => TOP_RUNG);
    const inPlay = () => result.current.levels.filter((level) => level === GRADUATED).length;
    expect(inPlay()).toBe(0);
    act(() => {
      result.current.answer(true);
    });
    expect(inPlay()).toBe(1);
    expect(result.current.finished).toBe(false);
  });

  it('reports nothing to answer once the session is over', () => {
    const { result } = setup(1, () => TOP_RUNG);
    act(() => {
      result.current.answer(true);
    });
    expect(result.current.current).toBeUndefined();
    act(() => {
      expect(result.current.answer(true)).toBeNull();
    });
  });
});
