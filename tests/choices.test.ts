import { describe, expect, it } from 'vitest';

import { buildChoiceOptions } from '@/lib/choices';

interface W {
  id: string;
  word: string;
  vi: string;
}

const w = (word: string, vi: string): W => ({ id: `${word}:${vi}`, word, vi });

describe('buildChoiceOptions', () => {
  const target = w('ancestral', 'thuộc tổ tiên');

  it('always includes the target', () => {
    const options = buildChoiceOptions(target, [w('a', '1'), w('b', '2'), w('c', '3')], []);
    expect(options.map((o) => o.word)).toContain('ancestral');
  });

  it('returns `count` options when enough distinct words exist', () => {
    const preferred = [w('a', '1'), w('b', '2'), w('c', '3'), w('d', '4')];
    expect(buildChoiceOptions(target, preferred, [], 4)).toHaveLength(4);
  });

  it('draws distractors from the preferred pool before the fallback', () => {
    const preferred = [w('a', '1'), w('b', '2'), w('c', '3')];
    const fallback = [w('z', '9')];
    const words = buildChoiceOptions(target, preferred, fallback, 4).map((o) => o.word);
    expect(words).not.toContain('z');
    expect(new Set(words)).toEqual(new Set(['ancestral', 'a', 'b', 'c']));
  });

  it('tops up from the fallback when the preferred pool is too small', () => {
    const preferred = [w('a', '1')];
    const fallback = [w('y', '8'), w('z', '9')];
    const options = buildChoiceOptions(target, preferred, fallback, 4);
    expect(options).toHaveLength(4);
    expect(options.map((o) => o.word)).toContain('a');
  });

  it('never repeats the target meaning in a distractor', () => {
    // Two different words that mean the same thing as the target.
    const preferred = [w('manifest', 'thuộc tổ tiên'), w('display', 'thuộc tổ tiên'), w('a', '1')];
    const options = buildChoiceOptions(target, preferred, [], 4);
    const meanings = options.map((o) => o.vi);
    expect(meanings.filter((m) => m === 'thuộc tổ tiên')).toHaveLength(1);
  });

  it('never puts two options with the same meaning together', () => {
    const preferred = [w('a', 'same'), w('b', 'same'), w('c', 'other')];
    const options = buildChoiceOptions(target, preferred, [], 4);
    const meanings = options.map((o) => o.vi);
    expect(new Set(meanings).size).toBe(meanings.length);
  });

  it('does not invent options when nothing distinct is available', () => {
    // Every candidate collides with the target's word or meaning.
    const preferred = [w('ancestral', 'khác'), w('x', 'thuộc tổ tiên')];
    const options = buildChoiceOptions(target, preferred, [], 4);
    expect(options).toHaveLength(1);
    expect(options[0]?.word).toBe('ancestral');
  });
});
