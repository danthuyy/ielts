import { describe, expect, it } from 'vitest';
import { translateLegacyHash } from '@/app/legacyHash';

describe('translateLegacyHash', () => {
  it.each([
    ['#lesson-detail/hello_happiness', '/lessons/hello_happiness'],
    ['#flashcard/hello_happiness', '/study/flashcard/hello_happiness'],
    ['#quiz-type/hello_happiness', '/study/type/hello_happiness'],
    ['#quiz-listen/hello_happiness', '/study/listen/hello_happiness'],
    ['#quiz-match/hello_happiness', '/study/match/hello_happiness'],
    ['#quiz-choice/hello_happiness', '/study/choice/hello_happiness'],
    ['#test/hello_happiness', '/test/hello_happiness'],
    ['#lessons', '/lessons'],
    ['#review', '/review'],
    ['#stats', '/stats'],
    ['#settings', '/settings'],
    ['#bookmarks', '/bookmarks'],
    ['#home', '/'],
  ])('maps %s to %s', (legacy, expected) => {
    expect(translateLegacyHash(legacy)).toBe(expected);
  });

  it('sends a screen that needs an id but has none to the library', () => {
    expect(translateLegacyHash('#lesson-detail')).toBe('/lessons');
    expect(translateLegacyHash('#flashcard')).toBe('/lessons');
  });

  it('leaves current-style URLs alone', () => {
    expect(translateLegacyHash('#/lessons/hello_happiness')).toBeNull();
    expect(translateLegacyHash('#/')).toBeNull();
    expect(translateLegacyHash('')).toBeNull();
    expect(translateLegacyHash('#')).toBeNull();
  });

  it('ignores an unknown legacy screen', () => {
    expect(translateLegacyHash('#no-such-screen/x')).toBeNull();
  });

  it('round-trips an id that needs encoding', () => {
    expect(translateLegacyHash('#lesson-detail/a%20b')).toBe('/lessons/a%20b');
  });
});
