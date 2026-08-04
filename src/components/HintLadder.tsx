import { useEffect, useRef } from 'react';

import { YouglishLink } from './YouglishLink';
import { speakSlow } from '@/lib/tts';
import type { Hint, HintRung } from '@/lib/hints';

interface Props {
  hint: Hint;
}

const RUNG_LABEL: Record<HintRung['kind'], string> = {
  audio: 'Nghe từ',
  shape: 'Dạng từ',
  meaning: 'Nghĩa',
  collocation: 'Cụm hay đi kèm',
  example: 'Câu ví dụ',
  note: 'Lưu ý',
  ipa: 'Phiên âm',
  letters: 'Chữ cái',
  youglish: 'Video thật',
};

function RungBody({ rung }: { rung: HintRung }) {
  if (rung.kind === 'audio') {
    return (
      <button
        type="button"
        className="btn btn--secondary hint-rung__speak"
        onClick={() => speakSlow(rung.word)}
        aria-label={`Nghe lại từ này`}
      >
        <span aria-hidden="true">🔊</span> Nghe lại
      </button>
    );
  }
  if (rung.kind === 'youglish') {
    return (
      <span className="hint-rung__youglish">
        <YouglishLink word={rung.word} variant="full" />
        <span className="hint-rung__meta">
          Xem người bản xứ nói từ này trong video thật, để nhớ cả ngữ điệu lẫn cách dùng.
        </span>
      </span>
    );
  }
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
  const audio = hint.rungs.find((rung) => rung.kind === 'audio');
  const spokenFor = useRef<string | null>(null);

  // Plays the moment the rung is handed over — asking for a hint and then
  // having to find a button to hear it wastes the beat where the learner is
  // actually listening. Guarded by word so later rungs do not replay it.
  useEffect(() => {
    if (!audio || spokenFor.current === audio.word) return;
    spokenFor.current = audio.word;
    speakSlow(audio.word);
  }, [audio]);

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
