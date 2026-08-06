import { redact, redactCollocation } from './redact';

export const HINT_STYLES = ['progressive', 'first', 'meaning', 'off'] as const;
export type HintStyle = (typeof HINT_STYLES)[number];

export const HINT_STYLE_LABEL: Record<HintStyle, string> = {
  progressive: 'Mở dần: ngữ cảnh trước, chữ cái sau',
  first: 'Chỉ chữ cái đầu',
  meaning: 'Nghĩa & phiên âm',
  off: 'Tắt gợi ý',
};

export interface HintWord {
  word: string;
  vi: string;
  ipa: string;
  pos: string;
  example?: string;
  collocation?: string;
  synonyms?: string;
  note?: string;
}

export type HintRung =
  /**
   * The word, spoken. Plays as soon as it is handed over, and can be replayed.
   *
   * First on the ladder because hearing a word is how it gets remembered as a
   * word rather than as a row of letters — the learner who hears "autonomy" is
   * being asked to spell something they now recognise, which is a far more
   * useful exercise than guessing at it from a masked outline.
   */
  | { kind: 'audio'; word: string }
  /** Word shape and part of speech — narrows the field, reveals no letters. */
  | { kind: 'shape'; masked: string; length: number; pos: string }
  /** Vietnamese meaning. */
  | { kind: 'meaning'; text: string }
  /** Near-synonyms — a meaning-level nudge toward the word. */
  | { kind: 'synonym'; text: string }
  /** A collocation with the word itself blanked out. */
  | { kind: 'collocation'; text: string }
  /** The example sentence with the word blanked out. */
  | { kind: 'example'; text: string }
  /** A usage tip from the content. */
  | { kind: 'note'; text: string }
  | { kind: 'ipa'; text: string }
  | { kind: 'letters'; masked: string }
  /**
   * Real speakers using the word, on YouGlish. Last, and deliberately so: it
   * leaves the app, so it is what is left once everything in the app has been
   * offered.
   */
  | { kind: 'youglish'; word: string };

/**
 * The spoken rung, unless the quiz just played the word anyway.
 *
 * A listening quiz opens by reading the word out and offers a replay key, so
 * handing it over again as a hint would spend a rung on something the learner
 * already has.
 */
function audioRung(word: HintWord, variant: 'type' | 'listen'): HintRung[] {
  return variant === 'listen' ? [] : [{ kind: 'audio', word: word.word }];
}

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
 * The ladder, in the order the rungs are handed over.
 *
 * Meaning and context come first, letters last, and that ordering is the whole
 * point. A hint that opens the spelling teaches the shape of the word; a hint
 * that shows the sentence it lives in with a gap where it belongs makes the
 * learner retrieve it the way they will have to in the exam. Revealing letters
 * first is how a vocabulary app accidentally trains rote spelling.
 */
export function buildLadder(
  word: HintWord,
  variant: 'type' | 'listen',
  style: HintStyle,
  /**
   * How many leading characters the learner has already typed correctly at some
   * point in this turn. Letter hints start above it: offering "a_______" to
   * someone who has already written "autom..." is not a hint, it is a step
   * backwards, and it makes the button look broken.
   */
  known = 0,
): HintRung[] {
  if (style === 'off') return [];

  if (style === 'meaning') {
    return [
      ...audioRung(word, variant),
      { kind: 'meaning', text: `${word.vi} (${word.pos})` },
      ...(word.synonyms ? ([{ kind: 'synonym', text: word.synonyms }] as const) : []),
      { kind: 'ipa', text: word.ipa },
      { kind: 'youglish', word: word.word },
    ];
  }

  if (style === 'first') {
    const revealed = Math.max(1, known + 1);
    // Nothing left to give: they already have everything but the last letter,
    // and that last letter is the answer.
    if (revealed > lettersIn(word.word) - 1) return [];
    return [
      {
        kind: 'shape',
        masked: maskWithReveal(word.word, revealed),
        length: word.word.length,
        pos: word.pos,
      },
    ];
  }

  const rungs: HintRung[] = [
    ...audioRung(word, variant),
    {
      kind: 'shape',
      masked: maskWithReveal(word.word, 0),
      length: word.word.length,
      pos: word.pos,
    },
  ];

  // Listening quizzes never show the meaning, so it belongs early. The typing
  // quiz already has it as the prompt, and repeating it would waste a rung.
  if (variant === 'listen') {
    rungs.push({ kind: 'meaning', text: `${word.vi} (${word.pos})` });
  }

  // A meaning-level nudge: the synonyms point at the word without spelling any
  // of it, so it sits above the letter rungs but below the raw meaning.
  if (word.synonyms) rungs.push({ kind: 'synonym', text: word.synonyms });

  const collocation = word.collocation ? redactCollocation(word.collocation, word.word) : null;
  if (collocation) rungs.push({ kind: 'collocation', text: collocation });

  const example = word.example ? redact(word.example, word.word) : null;
  if (example) rungs.push({ kind: 'example', text: example });

  if (word.note) rungs.push({ kind: 'note', text: word.note });

  // The sound only helps once they are reaching for a specific word, and in the
  // listening quiz they have already heard it.
  if (variant === 'type') rungs.push({ kind: 'ipa', text: word.ipa });

  // Letters last, and never all of them. Each step has to beat what the learner
  // has already shown they know, or the rung tells them nothing.
  const letters = lettersIn(word.word);
  const steps = [1, Math.max(2, Math.ceil(letters / 3)), Math.max(3, Math.ceil((letters * 2) / 3))];
  let previous = known;
  for (const step of steps) {
    const reveal = Math.max(step, known + 1);
    if (reveal <= previous || reveal > letters - 1) continue;
    rungs.push({ kind: 'letters', masked: maskWithReveal(word.word, reveal) });
    previous = reveal;
  }

  // Last, because it leaves the app: everything the app itself can offer comes
  // first.
  rungs.push({ kind: 'youglish', word: word.word });

  return rungs;
}

export interface Hint {
  /** Every rung revealed so far, in order. */
  rungs: HintRung[];
  /** True when there is nothing further to reveal. */
  exhausted: boolean;
  /** Total rungs available, for "gợi ý 2/6". */
  available: number;
}

export function buildHint(
  word: HintWord,
  variant: 'type' | 'listen',
  style: HintStyle,
  level: number,
  known = 0,
): Hint | null {
  if (level <= 0) return null;
  const ladder = buildLadder(word, variant, style, known);
  if (ladder.length === 0) return null;

  const shown = Math.min(level, ladder.length);
  return {
    rungs: ladder.slice(0, shown),
    exhausted: shown >= ladder.length,
    available: ladder.length,
  };
}

/**
 * The level to show, given how many times the learner has missed and how many
 * times they have asked. Repeated misses open the ladder on their own — someone
 * stuck on a fourth attempt should not also have to hunt for a button.
 */
export function effectiveLevel(attempts: number, requested: number): number {
  return Math.max(attempts >= 2 ? attempts - 1 : 0, requested);
}
