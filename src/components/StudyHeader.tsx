import { useNavigate } from 'react-router-dom';
import { ProgressBar } from './ProgressBar';
import { VoicePicker } from './VoicePicker';

interface Props {
  /** 0-based index of the current item. */
  index: number;
  total: number;
  backTo: string;
  showVoicePicker?: boolean;
  /** Share of answers right so far, 0-1; colours the bar. */
  accuracy?: number;
  children?: React.ReactNode;
}

export function StudyHeader({
  index,
  total,
  backTo,
  showVoicePicker = true,
  accuracy,
  children,
}: Props) {
  const navigate = useNavigate();

  return (
    <header className="study-header">
      <button className="icon-btn" onClick={() => navigate(backTo)} aria-label="Quay lại">
        ←
      </button>
      <ProgressBar
        value={index}
        max={total}
        label="Tiến độ bài luyện"
        {...(accuracy === undefined ? {} : { accuracy })}
        pulseOnGrow
      />
      {children}
      {showVoicePicker && <VoicePicker />}
      <span className="study-header__count">
        {Math.min(index + 1, total)}/{total}
      </span>
    </header>
  );
}
