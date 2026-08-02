import { clamp } from '@/lib/utils';

interface Props {
  value: number;
  max?: number;
  label?: string;
  variant?: 'default' | 'success' | 'thin';
}

export function ProgressBar({ value, max = 100, label, variant = 'default' }: Props) {
  const pct = clamp(max > 0 ? (value / max) * 100 : 0, 0, 100);
  const className = [
    'progress',
    variant === 'success' && 'progress--success',
    variant === 'thin' && 'progress--thin',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...(label ? { 'aria-label': label } : {})}
    >
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
