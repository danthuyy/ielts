import { accuracyOf, toneOf, type Counted } from '@/lib/accuracy';

interface Props {
  record?: Counted;
}

/**
 * The hit rate on a single word.
 *
 * Separate from the SRS status badge on purpose: "Đang học" says where the word
 * sits in the schedule, this says how it has actually been going.
 *
 * Hidden until there are enough attempts for the ratio to mean anything.
 */
export function WordAccuracy({ record }: Props) {
  const accuracy = accuracyOf(record);
  if (accuracy === null || !record) return null;

  const tone = toneOf(accuracy);

  return (
    <span
      className={`accuracy accuracy--${tone}`}
      title={`Đúng ${record.correctCount}/${record.totalCount} lần`}
    >
      <span aria-hidden="true">{tone === 'weak' ? '⚠' : '◍'}</span>
      {tone === 'weak' ? 'Hay sai' : `${Math.round(accuracy * 100)}%`}
      <span className="sr-only">
        , đúng {record.correctCount} trên {record.totalCount} lần
      </span>
    </span>
  );
}
