export const HINT_STYLES = ['progressive', 'first', 'meaning', 'off'] as const;
export type HintStyle = (typeof HINT_STYLES)[number];

export const HINT_STYLE_LABEL: Record<HintStyle, string> = {
  progressive: 'Mở dần: số ký tự → chữ đầu → thêm chữ',
  first: 'Chỉ chữ cái đầu',
  meaning: 'Nghĩa & phiên âm',
  off: 'Tắt gợi ý',
};

/** Counts only maskable characters — spaces and hyphens are never hidden. */
function lettersIn(word: string): number {
  return [...word].filter((char) => !/[^a-zA-Z0-9]/.test(char)).length;
}

/**
 * Reveals the first `revealed` characters and masks the rest.
 *
 * Spaces and hyphens stay visible: "material wealth" masked to "m________ ______"
 * would hide that it is two words, which is a bigger clue than it is worth.
 */
export function maskWithReveal(word: string, revealed: number): string {
  return [...word]
    .map((char, i) => {
      if (/[^a-zA-Z0-9]/.test(char)) return char;
      return i < revealed ? char : '_';
    })
    .join('');
}

/**
 * The progressive ladder. Level 1 deliberately reveals no letters at all — just
 * the shape and length — so the first nudge still leaves the recall to the
 * learner. Handing over a third of the word on the first miss is not a hint,
 * it is the answer arriving in instalments.
 */
export function revealedAt(word: string, level: number): number {
  const letters = lettersIn(word);
  if (level <= 1) return 0;
  if (level === 2) return 1;
  if (level === 3) return Math.max(2, Math.ceil(letters / 3));
  return Math.max(3, Math.ceil((letters * 2) / 3));
}

export interface Hint {
  /** The masked word, or null when this style does not show one. */
  masked: string | null;
  /** Character count, shown from the first level. */
  length: number | null;
  /** Extra lines: IPA, meaning, part of speech. */
  lines: string[];
  /** True when there is nothing further to reveal. */
  exhausted: boolean;
}

export interface HintWord {
  word: string;
  vi: string;
  ipa: string;
  pos: string;
}

export function maxLevel(style: HintStyle): number {
  if (style === 'progressive') return 4;
  if (style === 'off') return 0;
  return 1;
}

/**
 * The level to show, given how many times the learner has missed and how many
 * times they have asked. Repeated misses open the hint on their own — someone
 * stuck on their fourth attempt should not also have to hunt for a button.
 */
export function effectiveLevel(attempts: number, requested: number): number {
  return Math.max(attempts >= 2 ? attempts - 1 : 0, requested);
}

export function buildHint(word: HintWord, style: HintStyle, level: number): Hint | null {
  if (style === 'off' || level <= 0) return null;

  const capped = Math.min(level, maxLevel(style));

  if (style === 'meaning') {
    return {
      masked: null,
      length: null,
      lines: [word.ipa, `${word.vi} (${word.pos})`],
      exhausted: true,
    };
  }

  if (style === 'first') {
    return {
      masked: maskWithReveal(word.word, 1),
      length: word.word.length,
      lines: [],
      exhausted: true,
    };
  }

  const revealed = revealedAt(word.word, capped);
  // A short word runs out of letters before it runs out of levels: "vast" is
  // fully hinted at "vas_", so offering another press would reveal nothing.
  const noLettersLeft = revealed >= lettersIn(word.word) - 1;
  const done = capped >= maxLevel(style) || noLettersLeft;

  return {
    masked: maskWithReveal(word.word, revealed),
    length: word.word.length,
    // The last rung throws in the phonetics; by then the learner is stuck.
    lines: done ? [word.ipa] : [],
    exhausted: done,
  };
}
