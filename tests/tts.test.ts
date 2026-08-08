import { describe, expect, it } from 'vitest';

import { accentOf, pickAccentVoices } from '@/lib/tts';

const voice = (name: string, lang: string): SpeechSynthesisVoice => ({
  name,
  lang,
  default: false,
  localService: true,
  voiceURI: name,
});

describe('accentOf', () => {
  it('normalises the region to a plain accent code', () => {
    expect(accentOf('en-GB')).toBe('en-GB');
    expect(accentOf('en_gb')).toBe('en-GB');
    expect(accentOf('en-US')).toBe('en-US');
    expect(accentOf('en')).toBe('en');
  });
});

describe('pickAccentVoices', () => {
  it('keeps one voice per accent, best (first) first', () => {
    const picked = pickAccentVoices([
      voice('UK Female', 'en-GB'),
      voice('UK Male', 'en-GB'),
      voice('US One', 'en-US'),
      voice('AU One', 'en-AU'),
    ]);
    expect(picked.map((accent) => accent.code)).toEqual(['en-GB', 'en-US', 'en-AU']);
    // The first UK voice wins its slot, not the second.
    expect(picked[0]?.voice.name).toBe('UK Female');
    expect(picked[0]?.flag).toBe('🇬🇧');
  });

  it('respects the limit', () => {
    const picked = pickAccentVoices(
      [voice('a', 'en-GB'), voice('b', 'en-US'), voice('c', 'en-AU')],
      2,
    );
    expect(picked).toHaveLength(2);
  });

  it('labels an unknown accent with a generic speaker icon', () => {
    const picked = pickAccentVoices([voice('x', 'en-NZ')]);
    expect(picked[0]?.flag).toBe('🔊');
  });
});
