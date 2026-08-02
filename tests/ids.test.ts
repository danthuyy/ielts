import { describe, expect, it } from 'vitest';
import { isLegacyKey, parseLegacyKey, slugifyWord, wordKey } from '@/lib/ids';

describe('slugifyWord', () => {
  it.each([
    ['vast', 'vast'],
    ['material wealth', 'material-wealth'],
    ['dwell on', 'dwell-on'],
    ['well-being', 'well-being'],
    ['Life Expectancy', 'life-expectancy'],
    ['  padded  ', 'padded'],
  ])('slugifies %s to %s', (input, expected) => {
    expect(slugifyWord(input)).toBe(expected);
  });
});

describe('wordKey', () => {
  it('namespaces the slug by lesson', () => {
    expect(wordKey('hello_happiness', 'material wealth')).toBe('hello_happiness:material-wealth');
  });

  it('is stable regardless of the word position', () => {
    expect(wordKey('a_lesson', 'vast')).toBe(wordKey('a_lesson', 'Vast'));
  });
});

describe('legacy keys', () => {
  it('recognises the pre-2.0 positional format', () => {
    expect(isLegacyKey('hello_happiness_12')).toBe(true);
    expect(isLegacyKey('hello_happiness:vast')).toBe(false);
    expect(isLegacyKey('hello_happiness')).toBe(false);
  });

  it('splits a positional key into lesson and index', () => {
    expect(parseLegacyKey('hello_happiness_12')).toEqual({
      lessonId: 'hello_happiness',
      wordIndex: 12,
    });
  });

  it('returns null when there is no trailing index', () => {
    expect(parseLegacyKey('hello_happiness')).toBeNull();
  });
});
