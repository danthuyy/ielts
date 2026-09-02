import type { StudyWord } from '@/content/schema';

/** One line of the summary: a word and how the session went for it. */
export interface ReviewRow {
  word: StudyWord;
  /** Times answered wrong. Omit for modes that only know right/wrong once. */
  misses?: number;
  /** False when the word was never answered correctly this session. */
  learned: boolean;
}

export interface OutcomeBucket {
  key: 'clean' | 'missed' | 'unlearned';
  label: string;
  count: number;
}

/**
 * How a session split, as three bands.
 *
 * Three, not four: splitting "wrong once" from "wrong often" put red beside
 * amber, a pair hard to tell apart in light mode even with full colour vision,
 * and it said nothing the miss count in the table does not already say.
 * Empty bands are dropped so a clean sweep shows one green bar, not two slivers.
 */
export function outcomeBuckets(rows: readonly ReviewRow[]): OutcomeBucket[] {
  const missesOf = (row: ReviewRow) => row.misses ?? 0;
  return (
    [
      {
        key: 'clean',
        label: 'Đúng ngay',
        count: rows.filter((row) => row.learned && missesOf(row) === 0).length,
      },
      {
        key: 'missed',
        label: 'Có sai',
        count: rows.filter((row) => row.learned && missesOf(row) > 0).length,
      },
      {
        key: 'unlearned',
        label: 'Chưa thuộc',
        count: rows.filter((row) => !row.learned).length,
      },
    ] as OutcomeBucket[]
  ).filter((bucket) => bucket.count > 0);
}
