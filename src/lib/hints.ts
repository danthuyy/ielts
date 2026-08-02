export const HINT_STYLES = ['progressive', 'first', 'meaning', 'off'] as const;
export type HintStyle = (typeof HINT_STYLES)[number];

export const HINT_STYLE_LABEL: Record<HintStyle, string> = {
  progressive: 'Mở dần từng chữ',
  first: 'Chữ cái đầu',
  meaning: 'Nghĩa & phiên âm',
  off: 'Tắt gợi ý',
};

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

/** Counts only maskable characters — spaces and hyphens are never hidden. */
function lettersIn(word: string): number {
  return [...word].filter((char) => !/[^a-zA-Z0-9]/.test(char)).length;
}

/** How many letters a progressive hint shows at each level. */
export function revealedAt(word: string, level: number): number {
  if (level <= 0) return 0;
  const letters = word.length;
  // Level 1 gives the first letter, then roughly a third more each press, and
  // the last level stops one short of simply printing the answer.
  if (level === 1) return 1;
  if (level === 2) return Math.max(2, Math.ceil(letters / 3));
  if (level === 3) return Math.max(3, Math.ceil((letters * 2) / 3));
  return Math.max(1, letters - 1);
}

export interface Hint {
  /** The masked word, or null when this style does not show one. */
  masked: string | null;
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

/** The maximum useful level for a style — pressing beyond this adds nothing. */
export function maxLevel(style: HintStyle): number {
  if (style === 'progressive') return 4;
  if (style === 'off') return 0;
  return 1;
}

export function buildHint(word: HintWord, style: HintStyle, level: number): Hint | null {
  if (style === 'off' || level <= 0) return null;

  const capped = Math.min(level, maxLevel(style));
  const exhausted = capped >= maxLevel(style);

  if (style === 'meaning') {
    return { masked: null, lines: [word.ipa, `${word.vi} (${word.pos})`], exhausted };
  }

  if (style === 'first') {
    return {
      masked: `${maskWithReveal(word.word, 1)}  ·  ${word.word.length} ký tự`,
      lines: [],
      exhausted,
    };
  }

  // progressive
  const revealed = revealedAt(word.word, capped);
  // A short word runs out of letters before it runs out of levels: "vast" is
  // fully hinted at "vas_", so offering another press would reveal nothing.
  const noLettersLeft = revealed >= lettersIn(word.word) - 1;
  const done = exhausted || noLettersLeft;
  return {
    masked: maskWithReveal(word.word, revealed),
    // The last step throws in the phonetics; by then the learner is stuck.
    lines: done ? [word.ipa] : [],
    exhausted: done,
  };
}
