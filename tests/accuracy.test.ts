import { describe, expect, it } from 'vitest';

import { accuracyOf, isWeak, toneOf } from '@/lib/accuracy';

describe('accuracyOf', () => {
  it('withholds a rate until there are enough attempts', () => {
    expect(accuracyOf({ correctCount: 0, totalCount: 1 })).toBeNull();
    expect(accuracyOf({ correctCount: 1, totalCount: 1 })).toBeNull();
  });

  it('returns nothing for a word never answered', () => {
    expect(accuracyOf(undefined)).toBeNull();
    expect(accuracyOf({ correctCount: 0, totalCount: 0 })).toBeNull();
  });

  it('is the share of answers that were right', () => {
    expect(accuracyOf({ correctCount: 3, totalCount: 4 })).toBe(0.75);
  });
});

describe('isWeak', () => {
  it('flags a word missed more often than not', () => {
    expect(isWeak({ correctCount: 1, totalCount: 4 })).toBe(true);
  });

  it('does not flag one built on a single unlucky answer', () => {
    expect(isWeak({ correctCount: 0, totalCount: 1 })).toBe(false);
  });

  it('leaves a word that is mostly right alone', () => {
    expect(isWeak({ correctCount: 3, totalCount: 4 })).toBe(false);
  });
});

describe('toneOf', () => {
  it('separates struggling, middling and solid', () => {
    expect(toneOf(0.4)).toBe('weak');
    expect(toneOf(0.7)).toBe('mixed');
    expect(toneOf(0.9)).toBe('strong');
  });

  it('treats the boundaries as belonging to the better band', () => {
    expect(toneOf(0.6)).toBe('mixed');
    expect(toneOf(0.85)).toBe('strong');
  });
});
