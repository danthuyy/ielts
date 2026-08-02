/**
 * Character-level comparison between what the learner typed and the answer.
 *
 * "Sai rồi" is useless feedback for someone who wrote "recieve": they knew the
 * word, they missed one transposition, and telling them nothing but "wrong"
 * makes them re-derive the whole thing. Marking the exact characters that went
 * wrong turns a failure into a correction.
 */

export type SegmentState =
  /** Right character in the right place. */
  | 'ok'
  /** Wrong character — the learner typed something here, but not this. */
  | 'wrong'
  /** A character the learner typed that does not belong. */
  | 'extra'
  /** A character the learner left out. */
  | 'missing';

export interface Segment {
  char: string;
  state: SegmentState;
}

type Op = 'match' | 'substitute' | 'insert' | 'delete';

/**
 * Levenshtein matrix with a backtrace, so the result says *where* the edits are
 * rather than only how many. Answers are single words, so the O(n·m) cost is
 * irrelevant.
 */
function trace(attempt: string, target: string): { ops: Op[]; distance: number } {
  const n = attempt.length;
  const m = target.length;

  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i += 1) cost[i]![0] = i;
  for (let j = 0; j <= m; j += 1) cost[0]![j] = j;

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const same = attempt[i - 1] === target[j - 1];
      cost[i]![j] = Math.min(
        cost[i - 1]![j]! + 1, // the attempt has a character too many
        cost[i]![j - 1]! + 1, // the attempt is missing a character
        cost[i - 1]![j - 1]! + (same ? 0 : 1),
      );
    }
  }

  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const same = i > 0 && j > 0 && attempt[i - 1] === target[j - 1];
    if (i > 0 && j > 0 && cost[i]![j] === cost[i - 1]![j - 1]! + (same ? 0 : 1)) {
      ops.push(same ? 'match' : 'substitute');
      i -= 1;
      j -= 1;
    } else if (i > 0 && cost[i]![j] === cost[i - 1]![j]! + 1) {
      ops.push('insert');
      i -= 1;
    } else {
      ops.push('delete');
      j -= 1;
    }
  }

  ops.reverse();
  return { ops, distance: cost[n]![m]! };
}

export function editDistance(a: string, b: string): number {
  return trace(a, b).distance;
}

/**
 * The learner's attempt, character by character, marked against the answer.
 *
 * Comparison is case-insensitive because the quiz accepts any casing, but the
 * characters shown are the ones actually typed.
 */
export function compareAnswer(attempt: string, target: string): Segment[] {
  const a = attempt.trim();
  const { ops } = trace(a.toLowerCase(), target.toLowerCase());

  const segments: Segment[] = [];
  let ai = 0;

  for (const op of ops) {
    if (op === 'match') {
      segments.push({ char: a[ai] ?? '', state: 'ok' });
      ai += 1;
    } else if (op === 'substitute') {
      segments.push({ char: a[ai] ?? '', state: 'wrong' });
      ai += 1;
    } else if (op === 'insert') {
      segments.push({ char: a[ai] ?? '', state: 'extra' });
      ai += 1;
    } else {
      // Something was left out; show a slot rather than the missing letter,
      // which would hand over the answer one miss at a time.
      segments.push({ char: '·', state: 'missing' });
    }
  }

  return segments;
}

/**
 * Whether the attempt is close enough that spelling feedback is the useful
 * response, as opposed to "you are thinking of a different word".
 *
 * Scales with length: one slip in "vast" is a quarter of the word, while two in
 * "consternation" is a typo. Anything at half the word or worse is not a near
 * miss no matter how long it is.
 */
export function isNearMiss(attempt: string, target: string): boolean {
  const a = attempt.trim().toLowerCase();
  const b = target.trim().toLowerCase();
  if (!a || a === b) return false;

  // Rounded, not floored: a 7-letter word allows 2 edits, which is what makes
  // "recieve" for "receive" — the archetypal typo — read as a spelling slip.
  const allowed = Math.max(1, Math.round(b.length / 4));
  const distance = editDistance(a, b);
  return distance > 0 && distance <= allowed && distance < b.length / 2;
}

/** How many leading characters the attempt got right, for encouragement. */
export function correctPrefixLength(attempt: string, target: string): number {
  const a = attempt.trim().toLowerCase();
  const b = target.trim().toLowerCase();
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}
