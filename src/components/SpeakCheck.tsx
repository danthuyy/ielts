import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { pronunciationMatches } from '@/lib/pronounce';

/**
 * Optional pronunciation practice: press the mic, say the word, and the browser
 * checks whether what it heard matches. Rendered inside the answer feedback so
 * "practise speaking" sits right next to the word the learner just met — and
 * it renders nothing where the browser has no speech recognition, so it never
 * shows a button that cannot work.
 */
export function SpeakCheck({ target }: { target: string }) {
  const { supported, listening, transcript, error, start, stop } = useSpeechRecognition('en-US');

  // Safari/Firefox have no speech recognition. Rather than vanish — which reads
  // as "the feature is missing" — say why, so the learner knows to use Chrome.
  if (!supported) {
    return (
      <p className="speak-check__unsupported">🎤 Luyện nói cần trình duyệt Chrome hoặc Edge.</p>
    );
  }

  const matched = transcript ? pronunciationMatches(target, transcript) : null;

  return (
    <div className="speak-check">
      <button
        type="button"
        className={`speak-check__btn${listening ? ' speak-check__btn--live' : ''}`}
        onClick={() => (listening ? stop() : start())}
        aria-label={listening ? 'Đang nghe, bấm để dừng' : 'Luyện nói từ này'}
      >
        {listening ? '🔴 Đang nghe…' : '🎤 Luyện nói'}
      </button>

      {matched === true && <span className="speak-check__ok">✅ Phát âm khớp!</span>}
      {matched === false && (
        <span className="speak-check__no">Nghe được: “{transcript}” — thử lại nhé</span>
      )}
      {error === 'not-allowed' && (
        <span className="speak-check__no">Cần cho phép micro trong trình duyệt.</span>
      )}
    </div>
  );
}
