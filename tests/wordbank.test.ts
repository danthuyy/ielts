import { describe, expect, it } from 'vitest';

import { buildTiles, chunkWord, isAssembled, lettersOf } from '@/lib/wordbank';

describe('lettersOf', () => {
  it('drops the punctuation the rung does not test', () => {
    expect(lettersOf('well-being')).toBe('wellbeing');
    expect(lettersOf('material wealth')).toBe('materialwealth');
  });
});

describe('chunkWord', () => {
  it('rebuilds the word exactly', () => {
    for (const word of ['vast', 'autonomy', 'consternation', 'life expectancy', 'well-being']) {
      expect(chunkWord(word).join('')).toBe(lettersOf(word));
    }
  });

  it('lands on a handful of pieces whatever the length', () => {
    for (const word of ['vast', 'autonomy', 'consternation', 'life expectancy']) {
      const pieces = chunkWord(word).length;
      expect(pieces).toBeGreaterThanOrEqual(2);
      expect(pieces).toBeLessThanOrEqual(5);
    }
  });

  it('never leaves a single letter dangling at the end', () => {
    for (let length = 4; length <= 20; length += 1) {
      const chunks = chunkWord('a'.repeat(length));
      expect(chunks.at(-1)!.length).toBeGreaterThan(1);
    }
  });

  it('leaves a very short word alone', () => {
    expect(chunkWord('on')).toEqual(['on']);
  });
});

describe('buildTiles', () => {
  const others = ['consternation', 'resilient', 'benchmark', 'depression', 'nutrition'];

  it('contains every piece needed to spell the word', () => {
    const tiles = buildTiles('autonomy', others);
    const remaining = [...tiles];
    for (const piece of chunkWord('autonomy')) {
      const at = remaining.indexOf(piece);
      expect(at).toBeGreaterThanOrEqual(0);
      remaining.splice(at, 1);
    }
  });

  it('adds decoys, so the tray is not just the answer', () => {
    const tiles = buildTiles('autonomy', others);
    expect(tiles.length).toBeGreaterThan(chunkWord('autonomy').length);
  });

  it('never repeats a piece the answer already needs', () => {
    const tiles = buildTiles('autonomy', others);
    const answer = chunkWord('autonomy');
    for (const piece of new Set(answer)) {
      const inTray = tiles.filter((tile) => tile === piece).length;
      const inAnswer = answer.filter((tile) => tile === piece).length;
      expect(inTray).toBe(inAnswer);
    }
  });

  it('still works when there is nothing to draw decoys from', () => {
    const tiles = buildTiles('autonomy', []);
    expect(tiles.join('').length).toBe(lettersOf('autonomy').length);
  });
});

describe('isAssembled', () => {
  it('accepts the pieces in the right order', () => {
    expect(isAssembled(chunkWord('autonomy'), 'autonomy')).toBe(true);
  });

  it('rejects the right pieces in the wrong order', () => {
    expect(isAssembled([...chunkWord('autonomy')].reverse(), 'autonomy')).toBe(false);
  });

  it('does not ask the learner to remember the space', () => {
    expect(isAssembled(chunkWord('material wealth'), 'material wealth')).toBe(true);
  });

  it('rejects an unfinished word', () => {
    expect(isAssembled(chunkWord('autonomy').slice(0, 2), 'autonomy')).toBe(false);
  });
});
