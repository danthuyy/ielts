import { describe, expect, it } from 'vitest';

import { buildHint, buildLadder, effectiveLevel, maskWithReveal } from '@/lib/hints';
import { inflectionPattern, redact, redactCollocation } from '@/lib/redact';

const WORD = {
  word: 'vast',
  vi: 'Khổng lồ, vô cùng lớn',
  ipa: '/vɑːst/',
  pos: 'adj',
  example: 'If they won a vast fortune, they would be back to normal.',
  collocation: 'a vast fortune · vast majority · vast amount',
  note: '',
};

const kinds = (word: typeof WORD, variant: 'type' | 'listen') =>
  buildLadder(word, variant, 'progressive').map((rung) => rung.kind);

describe('redact', () => {
  it('blanks the word out of its own example', () => {
    const out = redact(WORD.example, 'vast');
    expect(out).not.toMatch(/vast/i);
    expect(out).toContain('____');
    expect(out).toContain('fortune');
  });

  it('catches inflected forms', () => {
    expect(redact('Happiness does not correlate with income.', 'correlate')).not.toMatch(
      /correlate/i,
    );
    expect(redact('Happiness correlates strongly with health.', 'correlate')).not.toMatch(
      /correlates/i,
    );
    expect(redact('They were correlating the results.', 'correlate')).not.toMatch(/correlating/i);
  });

  it('handles a two-word headword', () => {
    const out = redact('Their material wealth grew steadily.', 'material wealth');
    expect(out).not.toMatch(/material/i);
    expect(out).toContain('____');
  });

  it('handles a hyphen written as a space and vice versa', () => {
    expect(redact('Our well being matters.', 'well-being')).not.toMatch(/well/i);
    expect(redact('Our well-being matters.', 'well being')).not.toMatch(/well/i);
  });

  it('is case-insensitive', () => {
    expect(redact('Vast fortunes are rare.', 'vast')).not.toMatch(/vast/i);
  });

  it('returns null when the word is not in the sentence', () => {
    // Then it is not a hint about this word and should not take up a rung.
    expect(redact('An unrelated sentence.', 'vast')).toBeNull();
    expect(redact('', 'vast')).toBeNull();
  });
});

describe('redactCollocation', () => {
  it('blanks the word in every entry', () => {
    const out = redactCollocation(WORD.collocation, 'vast');
    expect(out).not.toMatch(/vast/i);
    expect(out?.split('·')).toHaveLength(3);
    expect(out).toContain('fortune');
  });

  it('keeps entries that never contained the word', () => {
    const out = redactCollocation('a vast fortune · sheer scale', 'vast');
    expect(out).toContain('sheer scale');
  });
});

describe('inflectionPattern', () => {
  it('does not match a word that merely contains the stem', () => {
    expect(inflectionPattern('vast').test('devastate')).toBe(false);
  });
});

describe('buildLadder', () => {
  it('gives context before letters, so spelling is not what gets rehearsed', () => {
    const order = kinds(WORD, 'type');
    const firstLetters = order.indexOf('letters');
    expect(order[0]).toBe('shape');
    expect(order.indexOf('collocation')).toBeLessThan(firstLetters);
    expect(order.indexOf('example')).toBeLessThan(firstLetters);
    expect(firstLetters).toBeGreaterThan(2);
  });

  it('reveals no letters on the first rung', () => {
    const first = buildLadder(WORD, 'type', 'progressive')[0];
    expect(first?.kind).toBe('shape');
    if (first?.kind === 'shape') {
      expect(first.masked).not.toMatch(/[a-z]/);
      expect(first.length).toBe(4);
    }
  });

  it('offers the Vietnamese meaning in the listening quiz, where it is not shown', () => {
    expect(kinds(WORD, 'listen')).toContain('meaning');
  });

  it('does not repeat the meaning in the typing quiz, where it is the prompt', () => {
    expect(kinds(WORD, 'type')).not.toContain('meaning');
  });

  it('offers phonetics only where the learner has not already heard the word', () => {
    expect(kinds(WORD, 'type')).toContain('ipa');
    expect(kinds(WORD, 'listen')).not.toContain('ipa');
  });

  it('skips rungs the content cannot fill', () => {
    const bare = { ...WORD, example: '', collocation: '', note: '' };
    const order = kinds(bare, 'type');
    expect(order).not.toContain('example');
    expect(order).not.toContain('collocation');
    expect(order).toContain('shape');
  });

  it('includes the usage note when the content has one', () => {
    expect(kinds({ ...WORD, note: 'Rất ăn điểm trong Writing.' }, 'type')).toContain('note');
  });

  it('never spells out the whole word', () => {
    for (const rung of buildLadder(WORD, 'type', 'progressive')) {
      if (rung.kind === 'letters' || rung.kind === 'shape') {
        expect(rung.masked).toContain('_');
      }
    }
  });

  it('is empty when hints are off', () => {
    expect(buildLadder(WORD, 'type', 'off')).toEqual([]);
  });
});

describe('buildHint', () => {
  it('reveals one more rung per level', () => {
    expect(buildHint(WORD, 'type', 'progressive', 1)?.rungs).toHaveLength(1);
    expect(buildHint(WORD, 'type', 'progressive', 3)?.rungs).toHaveLength(3);
  });

  it('reports exhaustion at the end of the ladder', () => {
    const total = buildLadder(WORD, 'type', 'progressive').length;
    expect(buildHint(WORD, 'type', 'progressive', total)?.exhausted).toBe(true);
    expect(buildHint(WORD, 'type', 'progressive', 1)?.exhausted).toBe(false);
  });

  it('clamps past the end instead of erroring', () => {
    const hint = buildHint(WORD, 'type', 'progressive', 99);
    expect(hint?.rungs.length).toBe(hint?.available);
  });

  it('returns nothing before the first rung, or when off', () => {
    expect(buildHint(WORD, 'type', 'progressive', 0)).toBeNull();
    expect(buildHint(WORD, 'type', 'off', 3)).toBeNull();
  });
});

describe('effectiveLevel', () => {
  it('stays shut after a single miss', () => {
    expect(effectiveLevel(1, 0)).toBe(0);
  });

  it('opens on its own as the misses pile up', () => {
    expect(effectiveLevel(2, 0)).toBe(1);
    expect(effectiveLevel(5, 0)).toBe(4);
  });

  it('honours an explicit request that runs ahead', () => {
    expect(effectiveLevel(1, 2)).toBe(2);
  });
});

describe('maskWithReveal', () => {
  it('keeps word boundaries visible', () => {
    expect(maskWithReveal('material wealth', 1)).toBe('m_______ ______');
    expect(maskWithReveal('well-being', 0)).toBe('____-_____');
  });
});
