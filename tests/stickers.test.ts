import { describe, expect, it } from 'vitest';

import { resultLine, resultSticker, stickerAlt, stickerUrl } from '@/lib/stickers';

describe('resultSticker', () => {
  it('celebrates a flawless session', () => {
    expect(resultSticker(10, 10)).toBe('perfect');
  });

  it('scales down through the set as the score drops', () => {
    expect(resultSticker(9, 10)).toBe('love');
    expect(resultSticker(7, 10)).toBe('wow');
    expect(resultSticker(5, 10)).toBe('sorry');
    expect(resultSticker(1, 10)).toBe('cry');
  });

  it('commiserates rather than scolds at the bottom', () => {
    // The bottom of the ladder is the crying sticker, not the angry one.
    expect(resultSticker(0, 10)).toBe('cry');
  });

  it('does not divide by zero on an empty session', () => {
    expect(resultSticker(0, 0)).toBe('wow');
    expect(resultLine(0, 0)).toBe('');
  });
});

describe('resultLine', () => {
  it('matches the sticker it appears beside', () => {
    expect(resultLine(10, 10)).toMatch(/ngay lần đầu/);
    expect(resultLine(0, 10)).toMatch(/lần sau/);
  });
});

describe('stickerUrl', () => {
  it('goes through the base path, so production under /ielts/ resolves', () => {
    expect(stickerUrl('correct')).toBe(`${import.meta.env.BASE_URL}stickers/correct.png`);
  });
});

describe('stickerAlt', () => {
  it('describes the sticker, since it is the feedback and not decoration', () => {
    expect(stickerAlt('correct')).toBe('Duyệt!');
    expect(stickerAlt('wrong')).toBe('Ủa???');
  });
});
