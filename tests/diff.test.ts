import { describe, expect, it } from 'vitest';

import { compareAnswer, correctPrefixLength, editDistance, isNearMiss } from '@/lib/diff';

const render = (attempt: string, target: string) =>
  compareAnswer(attempt, target)
    .map((segment) => `${segment.char}:${segment.state}`)
    .join(' ');

describe('editDistance', () => {
  it.each([
    ['vast', 'vast', 0],
    ['vas', 'vast', 1],
    ['vasty', 'vast', 1],
    ['vest', 'vast', 1],
    ['recieve', 'receive', 2],
    ['', 'vast', 4],
  ])('%s vs %s is %i', (a, b, expected) => {
    expect(editDistance(a, b)).toBe(expected);
  });
});

describe('compareAnswer', () => {
  it('marks every character right when the answer is right', () => {
    expect(render('vast', 'vast')).toBe('v:ok a:ok s:ok t:ok');
  });

  it('marks the single wrong letter, not the whole word', () => {
    expect(render('vest', 'vast')).toBe('v:ok e:wrong s:ok t:ok');
  });

  it('marks a character the learner left out', () => {
    expect(render('vst', 'vast')).toBe('v:ok ·:missing s:ok t:ok');
  });

  it('marks a character the learner added', () => {
    expect(render('vaast', 'vast')).toContain('a:extra');
  });

  it('never leaks the missing letter itself', () => {
    const segments = compareAnswer('cnsternation', 'consternation');
    const missing = segments.filter((segment) => segment.state === 'missing');
    expect(missing).toHaveLength(1);
    expect(missing[0]?.char).toBe('·');
  });

  it('ignores casing, since the quiz accepts any casing', () => {
    expect(render('VAST', 'vast')).toBe('V:ok A:ok S:ok T:ok');
  });

  it('handles a two-word answer', () => {
    const segments = compareAnswer('material welth', 'material wealth');
    expect(segments.some((segment) => segment.state === 'missing')).toBe(true);
    expect(segments.filter((segment) => segment.state === 'ok').length).toBeGreaterThan(10);
  });

  it('marks everything wrong when the attempt is a different word', () => {
    const segments = compareAnswer('xyz', 'vast');
    expect(segments.every((segment) => segment.state !== 'ok')).toBe(true);
  });
});

describe('isNearMiss', () => {
  it('treats one slip in a long word as a near miss', () => {
    expect(isNearMiss('consternaton', 'consternation')).toBe(true);
    expect(isNearMiss('recieve', 'receive')).toBe(true);
  });

  it('treats one slip in a short word as a near miss too', () => {
    expect(isNearMiss('vest', 'vast')).toBe(true);
  });

  it('is not a near miss when the learner typed another word', () => {
    expect(isNearMiss('enormous', 'vast')).toBe(false);
    expect(isNearMiss('xyz', 'vast')).toBe(false);
  });

  it('is not a near miss when the answer is exactly right', () => {
    expect(isNearMiss('vast', 'vast')).toBe(false);
  });

  it('is not a near miss for an empty attempt', () => {
    expect(isNearMiss('', 'vast')).toBe(false);
    expect(isNearMiss('   ', 'vast')).toBe(false);
  });

  it('allows more slack in a longer word', () => {
    // Two edits: fine in a 13-letter word, not in a 4-letter one.
    expect(isNearMiss('consternaton', 'consternation')).toBe(true);
    expect(isNearMiss('vt', 'vast')).toBe(false);
  });
});

describe('correctPrefixLength', () => {
  it('counts the leading characters that match', () => {
    expect(correctPrefixLength('conster', 'consternation')).toBe(7);
    expect(correctPrefixLength('xonster', 'consternation')).toBe(0);
    expect(correctPrefixLength('', 'vast')).toBe(0);
  });
});
