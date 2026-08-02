import type { Segment } from '@/lib/diff';

interface Props {
  segments: Segment[];
}

const STATE_LABEL: Record<Segment['state'], string> = {
  ok: 'đúng',
  wrong: 'sai',
  extra: 'thừa',
  missing: 'thiếu',
};

/**
 * The learner's own attempt, marked character by character.
 *
 * Shows what they typed, not the answer: the point is "you had it, this letter
 * slipped", which only works if the correct word stays hidden.
 */
export function AnswerDiff({ segments }: Props) {
  const spoken = segments
    .map((segment) =>
      segment.state === 'ok' ? segment.char : `${segment.char} ${STATE_LABEL[segment.state]}`,
    )
    .join(', ');

  return (
    <p className="answer-diff" aria-label={`Bạn đã gõ: ${spoken}`}>
      {segments.map((segment, index) => (
        <span
          className={`answer-diff__char answer-diff__char--${segment.state}`}
          key={`${segment.char}-${index}`}
          aria-hidden="true"
        >
          {segment.char === ' ' ? '\u00a0' : segment.char}
        </span>
      ))}
    </p>
  );
}
