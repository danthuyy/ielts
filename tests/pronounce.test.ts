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

  it('accepts a British/American spelling variant of the same word', () => {
    // en-US recognition spells a British headword the American way even when
    // the learner says it perfectly.
    expect(pronunciationMatches('maximise', 'maximize')).toBe(true);
    expect(pronunciationMatches('organise', 'organize')).toBe(true);
    expect(pronunciationMatches('analyse', 'analyze')).toBe(true);
    expect(pronunciationMatches('organisation', 'organization')).toBe(true);
    expect(pronunciationMatches('colour', 'color')).toBe(true);
    // ...and the same fold in a stray-filler phrase.
    expect(pronunciationMatches('maximise', 'to maximize it')).toBe(true);
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
