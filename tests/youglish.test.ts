import { describe, expect, it } from 'vitest';
import { youglishUrl } from '@/lib/youglish';

describe('youglishUrl', () => {
  it('defaults to British English, matching the IPA in the content', () => {
    expect(youglishUrl('vast')).toBe('https://youglish.com/pronounce/vast/english/uk');
  });

  it('supports the other accents', () => {
    expect(youglishUrl('vast', 'us')).toBe('https://youglish.com/pronounce/vast/english/us');
    expect(youglishUrl('vast', 'all')).toBe('https://youglish.com/pronounce/vast/english');
  });

  it('encodes multi-word headwords', () => {
    expect(youglishUrl('material wealth')).toBe(
      'https://youglish.com/pronounce/material%20wealth/english/uk',
    );
  });

  it('encodes characters that would otherwise break the path', () => {
    expect(youglishUrl('rock & roll')).toContain('rock%20%26%20roll');
    expect(youglishUrl('a/b')).toContain('a%2Fb');
  });

  it('trims stray whitespace', () => {
    expect(youglishUrl('  vast  ')).toBe('https://youglish.com/pronounce/vast/english/uk');
  });
});
