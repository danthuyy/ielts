import type { Hint, HintRung } from '@/lib/hints';

interface Props {
  hint: Hint;
}

const RUNG_LABEL: Record<HintRung['kind'], string> = {
  shape: 'Dạng từ',
  meaning: 'Nghĩa',
  collocation: 'Cụm hay đi kèm',
  example: 'Câu ví dụ',
  note: 'Lưu ý',
  ipa: 'Phiên âm',
  letters: 'Chữ cái',
};

function RungBody({ rung }: { rung: HintRung }) {
  if (rung.kind === 'shape') {
    return (
      <>
        <span className="hint-rung__masked">{rung.masked}</span>
        <span className="hint-rung__meta">
          {rung.length} ký tự · {rung.pos}
        </span>
      </>
    );
  }
  if (rung.kind === 'letters') {
    return <span className="hint-rung__masked">{rung.masked}</span>;
  }
  return <span className="hint-rung__text">{rung.text}</span>;
}

/**
 * The hints revealed so far, oldest first, so the learner can see the context
 * they have already been given rather than only the newest clue.
 */
export function HintLadder({ hint }: Props) {
  return (
    <div className="hint-panel" role="status" aria-live="polite">
      <p className="hint-panel__count">
        Gợi ý {hint.rungs.length}/{hint.available}
      </p>
      <ul className="hint-panel__list">
        {hint.rungs.map((rung, index) => (
          <li className={`hint-rung hint-rung--${rung.kind}`} key={`${rung.kind}-${index}`}>
            <span className="hint-rung__label">{RUNG_LABEL[rung.kind]}</span>
            <span className="hint-rung__body">
              <RungBody rung={rung} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
