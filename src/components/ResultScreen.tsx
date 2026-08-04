import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sticker } from './Sticker';
import { playSfx, type Sfx } from '@/lib/sfx';
import type { StickerName } from '@/lib/stickers';
import { useKeyboard } from '@/hooks/useKeyboard';

interface Props {
  emoji: string;
  title: string;
  score?: { correct: number; total: number };
  details?: { label: string; value: string }[];
  message?: string;
  /** Shown instead of the emoji when the learner has stickers turned on. */
  sticker?: StickerName;
  /** Played once when the screen appears. */
  sound?: Sfx;
  continueTo: string;
  continueLabel?: string;
  /**
   * Starts the same session over without leaving the screen.
   *
   * A poor score is exactly the moment someone wants another go, and sending
   * them back to the lesson page to find the button again is enough friction to
   * end the study session instead.
   */
  onRetry?: () => void;
  retryLabel?: string;
  /** Extra content between the summary and the continue button. */
  children?: ReactNode;
}

/** The shared "you finished" screen for every study mode. */
export function ResultScreen({
  emoji,
  sticker,
  sound,
  title,
  score,
  details,
  message,
  continueTo,
  continueLabel = 'Hoàn thành',
  onRetry,
  retryLabel = 'Học lại',
  children,
}: Props) {
  const navigate = useNavigate();
  const finish = () => navigate(continueTo);

  // Once per arrival, not on every render.
  useEffect(() => {
    if (sound) playSfx(sound);
  }, [sound]);

  // Enter follows the focused button, which is the retry when there is one.
  useKeyboard({ Enter: onRetry ?? finish, Escape: finish });

  return (
    <div className="result">
      {sticker ? (
        <Sticker name={sticker} size="lg" />
      ) : (
        <div className="result__emoji" aria-hidden="true">
          {emoji}
        </div>
      )}
      <h1>{title}</h1>

      {score && (
        <p className="result__score">
          {score.correct} / {score.total}
        </p>
      )}

      {message && <p>{message}</p>}

      {details && details.length > 0 && (
        <div className="result__grid">
          {details.map((detail) => (
            <div className="stat" key={detail.label}>
              <div className="stat__num">{detail.value}</div>
              <div className="stat__cap">{detail.label}</div>
            </div>
          ))}
        </div>
      )}

      {children}

      <div className="result__actions">
        {onRetry && (
          <button className="btn btn--primary btn--lg" onClick={onRetry} autoFocus>
            🔁 {retryLabel}
          </button>
        )}
        {/* Leaving is the secondary action when a retry is on offer: after a
            rough score, going again is the more likely intent. */}
        <button
          className={`btn btn--lg ${onRetry ? 'btn--secondary' : 'btn--primary'}`}
          onClick={finish}
          autoFocus={!onRetry}
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
