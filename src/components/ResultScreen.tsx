import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboard } from '@/hooks/useKeyboard';

interface Props {
  emoji: string;
  title: string;
  score?: { correct: number; total: number };
  details?: { label: string; value: string }[];
  message?: string;
  continueTo: string;
  continueLabel?: string;
  /** Extra content between the summary and the continue button. */
  children?: ReactNode;
}

/** The shared "you finished" screen for every study mode. */
export function ResultScreen({
  emoji,
  title,
  score,
  details,
  message,
  continueTo,
  continueLabel = 'Hoàn thành',
  children,
}: Props) {
  const navigate = useNavigate();
  const finish = () => navigate(continueTo);

  useKeyboard({ Enter: finish, Escape: finish });

  return (
    <div className="result">
      <div className="result__emoji" aria-hidden="true">
        {emoji}
      </div>
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

      <button className="btn btn--primary btn--lg" onClick={finish} autoFocus>
        {continueLabel}
      </button>
    </div>
  );
}
