import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRetryQueue } from '@/hooks/useRetryQueue';
import { buildHint, maskWithReveal, maxLevel, revealedAt } from '@/lib/hints';

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

describe('maskWithReveal', () => {
  it('reveals the first n letters', () => {
    expect(maskWithReveal('vast', 0)).toBe('____');
    expect(maskWithReveal('vast', 1)).toBe('v___');
    expect(maskWithReveal('vast', 4)).toBe('vast');
  });

  it('keeps spaces and hyphens visible', () => {
    // Hiding the word boundary would be a bigger clue than showing it.
    expect(maskWithReveal('material wealth', 1)).toBe('m_______ ______');
    expect(maskWithReveal('well-being', 0)).toBe('____-_____');
  });
});

describe('revealedAt', () => {
  it('gives one letter at the first level', () => {
    expect(revealedAt('consternation', 1)).toBe(1);
  });

  it('opens up gradually and stops short of the whole word', () => {
    const word = 'consternation';
    const levels = [1, 2, 3, 4].map((level) => revealedAt(word, level));
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(levels.at(-1)).toBeLessThan(word.length);
  });

  it('reveals nothing at level zero', () => {
    expect(revealedAt('vast', 0)).toBe(0);
  });
});

describe('buildHint', () => {
  const word = { word: 'vast', vi: 'khổng lồ', ipa: '/vɑːst/', pos: 'adj' };

  it('returns nothing when hints are off', () => {
    expect(buildHint(word, 'off', 2)).toBeNull();
  });

  it('returns nothing before the first press', () => {
    expect(buildHint(word, 'progressive', 0)).toBeNull();
  });

  it('shows only the first letter and the length in "first" mode', () => {
    const hint = buildHint(word, 'first', 1);
    expect(hint?.masked).toContain('v___');
    expect(hint?.masked).toContain('4');
    expect(hint?.exhausted).toBe(true);
  });

  it('shows the meaning and phonetics in "meaning" mode', () => {
    const hint = buildHint(word, 'meaning', 1);
    expect(hint?.masked).toBeNull();
    expect(hint?.lines).toEqual(['/vɑːst/', 'khổng lồ (adj)']);
  });

  it('opens more letters on each press in progressive mode', () => {
    const first = buildHint({ ...word, word: 'consternation' }, 'progressive', 1);
    const later = buildHint({ ...word, word: 'consternation' }, 'progressive', 3);
    const firstRevealed = (first?.masked ?? '').replace(/_/g, '').length;
    const laterRevealed = (later?.masked ?? '').replace(/_/g, '').length;
    expect(laterRevealed).toBeGreaterThan(firstRevealed);
  });

  it('reports exhaustion at the last level and adds the phonetics', () => {
    const hint = buildHint(word, 'progressive', maxLevel('progressive'));
    expect(hint?.exhausted).toBe(true);
    expect(hint?.lines).toContain('/vɑːst/');
  });

  it('never simply prints the answer', () => {
    const hint = buildHint(word, 'progressive', 99);
    expect(hint?.masked).toContain('_');
  });
});
