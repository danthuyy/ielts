/**
 * The letter tiles for the "ghép chữ" rung.
 *
 * This rung exists to bridge the biggest gap on the ladder. Going straight from
 * picking one of four meanings to typing a word from nothing asks the learner
 * to do two new things at once — recall the word and spell it. Assembling it
 * from pieces keeps the recall and removes the spelling, so the step is one
 * step.
 */

import { shuffle } from './utils';

/** Letters only: whether "well-being" has a hyphen is not what this rung tests. */
export function lettersOf(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Splits a word into pieces.
 *
 * Sized to land at three to five pieces whatever the length. Single letters
 * would turn a thirteen-letter word into a spelling bee with thirteen taps,
 * and two pieces would make it a coin toss.
 */
export function chunkSize(word: string): number {
  return Math.max(2, Math.ceil(lettersOf(word).length / 4));
}

function sliceEvery(letters: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < letters.length; i += size) out.push(letters.slice(i, i + size));
  return out;
}

export function chunkWord(word: string): string[] {
  const letters = lettersOf(word);
  if (letters.length <= 3) return [letters];

  const chunks = sliceEvery(letters, chunkSize(word));

  // A trailing piece of one letter is a giveaway — it can only go at the end.
  // Fold it into the piece before it.
  const last = chunks.at(-1);
  if (chunks.length > 1 && last && last.length === 1) {
    chunks[chunks.length - 2] += last;
    chunks.pop();
  }

  return chunks;
}

/**
 * The tray: the word's own pieces plus a few from other words, shuffled.
 *
 * Decoys that happen to match one of the real pieces are dropped — two
 * identical tiles make the puzzle feel broken when one of them refuses to
 * complete the word.
 */
export function buildTiles(word: string, others: readonly string[], decoys = 3): string[] {
  const chunks = chunkWord(word);
  // Cut from the target's own grid, not from however the other word happens to
  // split up. A decoy of a different length is no decoy at all — it announces
  // itself the moment the learner counts letters.
  const size = chunkSize(word);
  const taken = new Set(chunks);

  const candidates: string[] = [];
  for (const other of shuffle([...others])) {
    for (const piece of sliceEvery(lettersOf(other), size)) {
      if (piece.length === size && !taken.has(piece)) {
        taken.add(piece);
        candidates.push(piece);
      }
    }
    if (candidates.length >= decoys) break;
  }

  return shuffle([...chunks, ...candidates.slice(0, decoys)]);
}

/** Whether the pieces placed so far spell the word. */
export function isAssembled(placed: readonly string[], word: string): boolean {
  return placed.join('') === lettersOf(word);
}
