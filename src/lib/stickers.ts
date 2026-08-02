/**
 * The sticker set, mapped to the moments it reacts to.
 *
 * Files live in public/stickers, so they are referenced through BASE_URL — the
 * production build serves from /ielts/ and a hard-coded path would 404 there.
 */

export type StickerName =
  | 'correct'
  | 'wrong'
  | 'perfect'
  | 'sorry'
  | 'cry'
  | 'wow'
  | 'love'
  | 'remind'
  | 'morning'
  | 'night';

/** Alt text matters here: the sticker is the feedback, not decoration. */
const ALT: Record<StickerName, string> = {
  correct: 'Duyệt!',
  wrong: 'Ủa???',
  perfect: 'Ngầu chưa nè',
  sorry: 'Xin lỗi nhoa',
  cry: 'Huhu',
  wow: 'Wow!',
  love: 'Iu quá',
  remind: 'Tôi nhắc em!',
  morning: 'Chào buổi sáng!',
  night: 'Gút nai',
};

export function stickerUrl(name: StickerName): string {
  return `${import.meta.env.BASE_URL}stickers/${name}.png`;
}

export function stickerAlt(name: StickerName): string {
  return ALT[name];
}

/**
 * The sticker for a finished session.
 *
 * Thresholds, not a gradient: the learner should be able to tell what they got
 * and why. Anything above 90% first-try is a clean run; below half means the
 * session was genuinely hard, and the set has a sticker for that which commiserates
 * rather than scolds.
 */
export function resultSticker(firstTry: number, total: number): StickerName {
  if (total === 0) return 'wow';
  const ratio = firstTry / total;
  if (ratio >= 1) return 'perfect';
  if (ratio >= 0.9) return 'love';
  if (ratio >= 0.7) return 'wow';
  if (ratio >= 0.4) return 'sorry';
  return 'cry';
}

/** A short line to go with it, in the same voice as the stickers. */
export function resultLine(firstTry: number, total: number): string {
  if (total === 0) return '';
  const ratio = firstTry / total;
  if (ratio >= 1) return 'Đúng hết ngay lần đầu.';
  if (ratio >= 0.9) return 'Gần như hoàn hảo.';
  if (ratio >= 0.7) return 'Khá lắm, còn vài từ cần ôn thêm.';
  if (ratio >= 0.4) return 'Bài này khó, ôn lại là nhớ thôi.';
  return 'Từ bài này còn lạ. Cứ học lại, lần sau sẽ khác.';
}
