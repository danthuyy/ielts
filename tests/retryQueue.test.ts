import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRetryQueue } from '@/hooks/useRetryQueue';

interface Item {
  id: string;
}

const getId = (item: Item) => item.id;
const items = (...ids: string[]): Item[] => ids.map((id) => ({ id }));

function setup(list: Item[], gap = 3) {
  return renderHook(() => useRetryQueue(list, getId, gap));
}

describe('useRetryQueue', () => {
  it('walks the list when every answer is right', () => {
    const { result } = setup(items('a', 'b', 'c'));

    expect(result.current.current?.id).toBe('a');
    act(() => result.current.answer(true));
    expect(result.current.current?.id).toBe('b');
    act(() => result.current.answer(true));
    act(() => result.current.answer(true));

    expect(result.current.finished).toBe(true);
    expect(result.current.learned).toBe(3);
    expect(result.current.firstTry).toBe(3);
  });

  it('brings a missed word back instead of dropping it', () => {
    const { result } = setup(items('a', 'b', 'c', 'd', 'e'), 2);

    act(() => result.current.answer(false)); // a wrong
    // Not immediately again — that would be short-term echo, not recall.
    expect(result.current.current?.id).toBe('b');
    act(() => result.current.answer(true));
    act(() => result.current.answer(true)); // c
    expect(result.current.current?.id).toBe('a');
  });

  it('does not finish until every word has been answered correctly', () => {
    const { result } = setup(items('a', 'b'), 1);

    act(() => result.current.answer(false)); // a wrong
    act(() => result.current.answer(true)); // b right
    expect(result.current.finished).toBe(false);
    expect(result.current.current?.id).toBe('a');

    act(() => result.current.answer(true));
    expect(result.current.finished).toBe(true);
    expect(result.current.learned).toBe(2);
  });

  it('scores on first attempt, not on eventual success', () => {
    const { result } = setup(items('a', 'b'), 1);

    act(() => result.current.answer(false));
    act(() => result.current.answer(true)); // b, first try
    act(() => result.current.answer(true)); // a, second try

    expect(result.current.learned).toBe(2);
    expect(result.current.firstTry).toBe(1);
  });

  it('marks a word that has already been missed', () => {
    const { result } = setup(items('a', 'b'), 1);

    expect(result.current.isRetry).toBe(false);
    act(() => result.current.answer(false));
    act(() => result.current.answer(true));
    expect(result.current.current?.id).toBe('a');
    expect(result.current.isRetry).toBe(true);
  });

  it('survives repeated misses of the same word', () => {
    const { result } = setup(items('a'), 3);

    act(() => result.current.answer(false));
    act(() => result.current.answer(false));
    expect(result.current.current?.id).toBe('a');
    expect(result.current.finished).toBe(false);

    act(() => result.current.answer(true));
    expect(result.current.finished).toBe(true);
    expect(result.current.firstTry).toBe(0);
  });

  it('markMissed records a miss without moving the queue', () => {
    const { result } = setup(items('a', 'b'));

    act(() => result.current.markMissed());
    // Still on the same word: the typing quiz keeps you there until you get it.
    expect(result.current.current?.id).toBe('a');
    expect(result.current.isRetry).toBe(true);

    act(() => result.current.answer(true));
    expect(result.current.current?.id).toBe('b');
    // Learned, but it does not count toward the first-try score.
    expect(result.current.learned).toBe(1);
    expect(result.current.firstTry).toBe(0);
  });

  it('markMissed is idempotent within a word', () => {
    const { result } = setup(items('a'));
    act(() => result.current.markMissed());
    act(() => result.current.markMissed());
    act(() => result.current.answer(true));
    expect(result.current.firstTry).toBe(0);
    expect(result.current.learned).toBe(1);
  });

  it('a word answered right after retries does not come back later', () => {
    const { result } = setup(items('a', 'b'), 1);

    act(() => result.current.markMissed());
    act(() => result.current.answer(true)); // eventually got 'a'
    act(() => result.current.answer(true)); // 'b'
    expect(result.current.finished).toBe(true);
  });

  it('reports an empty session as not finished, so no result screen shows', () => {
    const { result } = setup([]);
    expect(result.current.finished).toBe(false);
    expect(result.current.current).toBeUndefined();
  });
});
