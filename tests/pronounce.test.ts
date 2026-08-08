import { describe, expect, it } from 'vitest';

import { normaliseSpoken, pronunciationMatches } from '@/lib/pronounce';

describe('normaliseSpoken', () => {
  it('lowercases, strips punctuation and collapses spaces', () => {
    expect(normaliseSpoken('  Vast! ')).toBe('vast');
    expect(normaliseSpoken('Material  Wealth.')).toBe('material wealth');
  });
});

describe('pronunciationMatches', () => {
  it('accepts an exact match ignoring case and punctuation', () => {
    expect(pronunciationMatches('vast', 'Vast')).toBe(true);
    expect(pronunciationMatches('well-being', 'well being')).toBe(true);
  });

  it('accepts a stray filler word around the target', () => {
    expect(pronunciationMatches('art', 'the art')).toBe(true);
    expect(pronunciationMatches('analyse', 'analyse it')).toBe(true);
  });

  it('accepts a two-word headword heard as its phrase', () => {
    expect(pronunciationMatches('material wealth', 'material wealth please')).toBe(true);
  });

  it('rejects a different word', () => {
    expect(pronunciationMatches('vast', 'fast')).toBe(false);
    expect(pronunciationMatches('art', 'start')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(pronunciationMatches('vast', '')).toBe(false);
    expect(pronunciationMatches('', 'vast')).toBe(false);
  });
});
